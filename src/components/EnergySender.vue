<template>
  <div class="energy-sender">
    <!-- 1. API Key 区域 -->
    <div class="api-key-section">
      <div v-if="!apiKey" class="input-mode">
        <input 
          v-model="apiKeyInput" 
          type="text"
          placeholder="请输入 API Key" 
          @keyup.enter="saveApiKey"
        />
        <button @click="saveApiKey">确认</button>
      </div>
      <div v-else class="display-mode">
        <span>API Key: {{ maskedKey }}</span>
        <button @click="changeApiKey">更换</button>
      </div>
    </div>

    <!-- 2. 余额信息区域 -->
    <div v-if="apiKey" class="balance-section">
      <div class="info-card">
        <label>可用笔数</label>
        <span class="value highlight">{{ availableOrders }} 笔</span>
      </div>
      <div class="info-card">
        <label>单笔成本</label>
        <span class="value">{{ costPerOrder.toFixed(2) }} TRX</span>
      </div>
    </div>

    <!-- 3. 发送区域 -->
    <div v-if="apiKey" class="send-section">
      <input 
        v-model="receiveAddress" 
        placeholder="输入接收能量的地址（TRC20）"
        :disabled="sending"
      />
      <button 
        @click="handleSendEnergy" 
        :disabled="sending || !receiveAddress"
        :class="{ loading: sending }"
      >
        {{ sending ? '发送中...' : '发送能量' }}
      </button>
    </div>

    <!-- 4. 消息列表 -->
    <div v-if="apiKey" class="message-list">
      <h3>发送记录</h3>
      <div 
        v-for="msg in messages" 
        :key="msg.id"
        :class="['message-item', msg.status]"
      >
        <div class="msg-header">
          <span class="time">{{ formatTime(msg.timestamp) }}</span>
          <span :class="['status', msg.status]">
            {{ msg.status === 'success' ? '✓ 成功' : msg.status === 'pending' ? '⏳ 验证中...' : '✗ 失败' }}
          </span>
        </div>
        <div class="msg-address">{{ msg.address }}</div>
        <div v-if="msg.error" class="msg-error">{{ msg.error }}</div>
      </div>
      <div v-if="messages.length === 0" class="empty">
        暂无发送记录
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { getBalance, sendEnergy } from '../api/energy'

// ========== 配置 ==========
const ENERGY_AMOUNT = 130000   // 固定能量数量
const RENT_TIME = 1            // 租用时长（小时）
const RES_LOCK = 0             // 0: 不锁定, 1: 锁定
const COST_PER_ORDER = 6       // 单笔预估成本（TRX）

// ========== 状态 ==========
const apiKey = ref<string>('')
const apiKeyInput = ref<string>('')
const availableOrders = ref<number>(0)  // 可用笔数（从接口获取）
const receiveAddress = ref<string>('')
const sending = ref<boolean>(false)

interface Message {
  id: string
  timestamp: number
  address: string
  status: 'success' | 'failed' | 'pending'
  error?: string
}

const messages = ref<Message[]>([])

// ========== 计算属性 ==========
const maskedKey = computed(() => {
  if (!apiKey.value || apiKey.value.length < 8) return '****'
  return apiKey.value.slice(0, 4) + '****' + apiKey.value.slice(-4)
})

const costPerOrder = computed(() => COST_PER_ORDER)

// ========== API Key 管理 ==========
const saveApiKey = () => {
  if (!apiKeyInput.value.trim()) {
    alert('请输入 API Key')
    return
  }
  apiKey.value = apiKeyInput.value.trim()
  localStorage.setItem('trx_api_key', apiKey.value)
  apiKeyInput.value = ''
  
  // 立即查询余额
  fetchBalance()
  startBalanceRefresh()
}

const changeApiKey = () => {
  if (confirm('确定要更换 API Key 吗？')) {
    apiKey.value = ''
    localStorage.removeItem('trx_api_key')
    stopBalanceRefresh()
  }
}

const loadApiKey = () => {
  const stored = localStorage.getItem('trx_api_key')
  if (stored) {
    apiKey.value = stored
    fetchBalance()
    startBalanceRefresh()
  }
}

// ========== 余额查询 ==========
const fetchBalance = async () => {
  if (!apiKey.value) return
  
  try {
    const response = await getBalance(apiKey.value)
    
    if (response.code === 1) {
      const data = response.data
      // data 是可用笔数（字符串格式）
      availableOrders.value = typeof data === 'string' 
        ? parseInt(data) || 0
        : typeof data === 'number'
        ? data
        : 0
    } else {
      console.error('余额查询失败:', response.msg)
      // 如果是 API Key 错误，清除缓存
      if (response.msg.includes('APIKEY')) {
        alert('API Key 无效，请重新输入')
        changeApiKey()
      }
    }
  } catch (error) {
    console.error('查询余额失败:', error)
  }
}

// 定时刷新余额（每10秒）
let balanceTimer: number | undefined
const startBalanceRefresh = () => {
  balanceTimer = setInterval(fetchBalance, 10000)
}

const stopBalanceRefresh = () => {
  if (balanceTimer) clearInterval(balanceTimer)
}

// ========== 能量发送 ==========
let oldEnergy = 0  // 存储发送前的能量值

// 查询地址能量
const queryAddressEnergy = async (address: string): Promise<number> => {
  try {
    const response = await axios.post('/api/energy', { address })
    console.log('能量查询响应:', response.data)
    
    // 正确解析返回格式：{ code: 1, data: { energy: xxx } }
    if (response.data && response.data.code === 1 && response.data.data) {
      const energy = response.data.data.energy
      if (typeof energy === 'number') {
        return energy
      }
    }
    return 0
  } catch (error) {
    console.error('查询地址能量失败:', error)
    return 0
  }
}

// 验证能量是否到账
const verifyEnergyReceived = async (address: string, msgId: string): Promise<void> => {
  let attempts = 0
  const maxAttempts = 60  // 最多查询60次（60秒）
  let isVerifying = true  // 验证状态标记
  
  const checkEnergy = async (): Promise<void> => {
    if (!isVerifying) return  // 如果已经验证完成，停止查询
    
    attempts++
    const currentEnergy = await queryAddressEnergy(address)
    console.log(`第${attempts}次查询 - 当前能量: ${currentEnergy}, 旧能量: ${oldEnergy}, 差值: ${currentEnergy - oldEnergy}`)
    
    // 检查是否到账
    if (currentEnergy > oldEnergy && currentEnergy - oldEnergy >= 129000) {
      // 能量到账成功
      isVerifying = false  // 停止验证
      console.log('✅ 能量验证成功！')
      
      const msgIndex = messages.value.findIndex(m => m.id === msgId)
      if (msgIndex !== -1) {
        const msg = messages.value[msgIndex]
        if (msg) {
          msg.status = 'success'
          saveMessages()
        }
      }
      return
    }
    
    // 超过最大尝试次数
    if (attempts >= maxAttempts) {
      isVerifying = false  // 停止验证
      console.log('❌ 验证超时')
      
      const msgIndex = messages.value.findIndex(m => m.id === msgId)
      if (msgIndex !== -1) {
        const msg = messages.value[msgIndex]
        if (msg) {
          msg.status = 'failed'
          msg.error = '验证超时，请手动检查'
          saveMessages()
        }
      }
      return
    }
    
    // 继续查询
    setTimeout(() => checkEnergy(), 1000)
  }
  
  checkEnergy()
}

const handleSendEnergy = async () => {
  if (!receiveAddress.value.trim()) {
    alert('请输入接收地址')
    return
  }
  
  // 地址格式验证（简单校验）
  if (!/^T[A-Za-z1-9]{33}$/.test(receiveAddress.value.trim())) {
    alert('地址格式不正确，请输入有效的 TRC20 地址')
    return
  }
  
  if (availableOrders.value < 1) {
    alert('可用笔数不足，无法发送')
    return
  }
  
  sending.value = true
  const address = receiveAddress.value.trim()
  
  try {
    // 1. 先查询发送前的能量（重要！）
    oldEnergy = await queryAddressEnergy(address)
    console.log('发送前能量:', oldEnergy)
    
    // 2. 再发送能量请求
    const response = await sendEnergy(
      apiKey.value,
      address,
      ENERGY_AMOUNT,
      RENT_TIME,
      RES_LOCK
    )
    
    if (response.code === 1) {
      // 3. 发送成功，创建待验证的消息记录
      const msgId = Date.now().toString()
      const msg: Message = {
        id: msgId,
        timestamp: Date.now(),
        address: address,
        status: 'pending'
      }
      
      // 添加到消息列表
      messages.value.unshift(msg)
      
      // 只保留最近20条
      if (messages.value.length > 20) {
        messages.value = messages.value.slice(0, 20)
      }
      
      // 保存到本地
      saveMessages()
      
      // 4. 开始验证能量到账（使用之前查询的 oldEnergy）
      verifyEnergyReceived(address, msgId)
      
      // 清空输入框并刷新余额
      receiveAddress.value = ''
      setTimeout(fetchBalance, 1000)
    } else {
      // 发送失败
      const msg: Message = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        address: address,
        status: 'failed',
        error: response.msg || '发送失败'
      }
      messages.value.unshift(msg)
      saveMessages()
    }
    
  } catch (error: any) {
    const msg: Message = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      address: address,
      status: 'failed',
      error: error.message || '网络请求失败'
    }
    messages.value.unshift(msg)
    saveMessages()
  } finally {
    sending.value = false
  }
}

// ========== 消息持久化 ==========
const saveMessages = () => {
  localStorage.setItem('energy_messages', JSON.stringify(messages.value))
}

const loadMessages = () => {
  const stored = localStorage.getItem('energy_messages')
  if (stored) {
    try {
      messages.value = JSON.parse(stored)
    } catch {
      messages.value = []
    }
  }
}

// ========== 工具函数 ==========
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// ========== 生命周期 ==========
onMounted(() => {
  loadApiKey()
  loadMessages()
})

onUnmounted(() => {
  stopBalanceRefresh()
})
</script>

<style scoped>
.energy-sender {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

/* API Key 区域 */
.api-key-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.input-mode, .display-mode {
  display: flex;
  align-items: center;
  gap: 12px;
}

.input-mode input, .display-mode span {
  flex: 1;
}

.input-mode input {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
}

.display-mode span {
  color: white;
  font-family: monospace;
  font-size: 14px;
}

.api-key-section button {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.api-key-section button:hover {
  background: #fff;
}

/* 余额信息区域 */
.balance-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.info-card {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
}

.info-card label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.info-card .value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.info-card .value.highlight {
  color: #52c41a;
  font-size: 24px;
}

/* 发送区域 */
.send-section {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.send-section input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 12px;
  box-sizing: border-box;
}

.send-section input:focus {
  outline: none;
  border-color: #667eea;
}

.send-section button {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.send-section button:hover:not(:disabled) {
  opacity: 0.9;
}

.send-section button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-section button.loading {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.98);
  }
}

/* 消息列表 */
.message-list h3 {
  font-size: 16px;
  margin-bottom: 12px;
  color: #333;
}

.message-item {
  background: white;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  border-left: 4px solid transparent;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.message-item.success {
  border-left-color: #52c41a;
}

.message-item.pending {
  border-left-color: #faad14;
}

.message-item.failed {
  border-left-color: #ff4d4f;
}

.msg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.msg-header .time {
  font-size: 12px;
  color: #999;
}

.msg-header .status {
  font-size: 12px;
  font-weight: 600;
}

.msg-header .status.success {
  color: #52c41a;
}

.msg-header .status.failed {
  color: #ff4d4f;
}

.msg-address {
  font-family: monospace;
  font-size: 13px;
  color: #333;
  word-break: break-all;
  margin-bottom: 4px;
}

.msg-order {
  font-size: 12px;
  color: #1890ff;
  margin-top: 4px;
}

.msg-error {
  font-size: 12px;
  color: #ff4d4f;
  margin-top: 4px;
}

.msg-cost {
  font-size: 12px;
  color: #faad14;
  margin-top: 4px;
}

.empty {
  text-align: center;
  padding: 40px;
  color: #999;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .energy-sender {
    padding: 12px;
  }
  
  .balance-section {
    grid-template-columns: 1fr;
  }
  
  .info-card .value.highlight {
    font-size: 20px;
  }
}
</style>

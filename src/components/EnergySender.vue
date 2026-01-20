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
      
      <!-- 充值地址 -->
      <div v-if="apiKey && rechargeAddress" class="recharge-address">
        <label>充值地址</label>
        <div class="address-box">
          <span class="address-text">{{ rechargeAddress }}</span>
          <!-- TronLink 环境下显示充值按钮，其他环境显示复制按钮 -->
          <button 
            v-if="tronLinkConnected" 
            class="recharge-btn" 
            @click="handleRecharge" 
            title="使用 TronLink 充值"
          >
            充值
          </button>
          <button 
            v-else 
            class="copy-btn" 
            @click="copyAddress" 
            title="复制地址"
          >
            复制
          </button>
        </div>
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
      <!-- TronLink 连接状态 -->
      <div v-if="tronLinkConnected" class="tronlink-status">
        <span class="status-dot"></span>
        <span class="status-text">TronLink 已连接</span>
        <span class="wallet-address">{{ tronLinkAddress.slice(0, 6) }}...{{ tronLinkAddress.slice(-6) }}</span>
      </div>
      
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
        @click="fillAddress(msg.address)"
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

    <!-- 5. 回到顶部按钮 -->
    <button 
      v-if="showBackToTop" 
      class="back-to-top"
      @click="scrollToTop"
      title="回到顶部"
    >
      ↑
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { getBalance, sendEnergy } from '../api/energy'

// ========== TypeScript 类型声明 ==========
declare global {
  interface Window {
    tronWeb?: {
      defaultAddress?: {
        base58?: string
      }
      ready?: boolean
      trx?: {
        sendTransaction: (to: string, amount: number) => Promise<any>
      }
    }
    tronLink?: {
      request: (args: { method: string }) => Promise<{ code: number }>
    }
  }
}

// ========== 配置 ==========
const ENERGY_AMOUNT = 130000   // 固定能量数量
const RENT_TIME = 1            // 租用时长（小时）
const RES_LOCK = 0             // 0: 不锁定, 1: 锁定
const COST_PER_ORDER = 6       // 单笔预估成本（TRX）

// ========== 状态 ==========
const apiKey = ref<string>('')
const apiKeyInput = ref<string>('')
const rechargeAddress = ref<string>('')  // 充值地址
const availableOrders = ref<number>(0)  // 可用笔数（介接口获取）
const receiveAddress = ref<string>('')
const sending = ref<boolean>(false)
const tronLinkConnected = ref<boolean>(false)  // TronLink 连接状态
const tronLinkAddress = ref<string>('')        // TronLink 地址

interface Message {
  id: string
  timestamp: number
  address: string
  status: 'success' | 'failed' | 'pending'
  error?: string
}

const messages = ref<Message[]>([])
const showBackToTop = ref<boolean>(false)

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
      
      // 保存充值地址（从 msg 字段获取）
      if (response.msg && response.msg.length > 0) {
        rechargeAddress.value = response.msg
      }
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

// ========== TronLink 钱包集成 ==========
// 检测 TronLink 是否可用
const detectTronLink = async () => {
  // 检查 window.tronWeb 是否存在
  if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
    tronLinkConnected.value = true
    tronLinkAddress.value = window.tronWeb.defaultAddress.base58
    console.log('TronLink 已连接:', tronLinkAddress.value)
    
    // 自动填充地址（如果输入框为空）
    if (!receiveAddress.value) {
      receiveAddress.value = tronLinkAddress.value
    }
    return true
  }
  return false
}

// 监听 TronLink 账户变化
const watchTronLinkAccount = () => {
  if (window.tronWeb) {
    // 监听账户变化
    setInterval(() => {
      if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
        const newAddress = window.tronWeb.defaultAddress.base58
        if (newAddress !== tronLinkAddress.value) {
          tronLinkAddress.value = newAddress
          tronLinkConnected.value = true
          console.log('TronLink 账户变更:', newAddress)
          
          // 更新接收地址（如果是之前的钱包地址）
          if (receiveAddress.value === '' || receiveAddress.value === tronLinkAddress.value) {
            receiveAddress.value = newAddress
          }
        }
      } else if (tronLinkConnected.value) {
        // TronLink 断开连接
        tronLinkConnected.value = false
        tronLinkAddress.value = ''
        console.log('TronLink 已断开')
      }
    }, 1000)  // 每秒检查一次
  }
}

// ========== 能量发送 ==========

// 查询地址能量
const queryAddressEnergy = async (address: string): Promise<number> => {
  try {
    const response = await axios.post('/api/energy', { address })
    console.log('能量查询响应:', response.data)
    
    // 正确解析返回格式：{ code: 1, data: { energy: xxx } }
    if (response.data && response.data.code === 1 && response.data.data) {
      const energy = response.data.data.energy
      // energy 可能是字符串或数字，统一转换为数字
      const energyNum = typeof energy === 'string' ? parseInt(energy, 10) : energy
      if (typeof energyNum === 'number' && !isNaN(energyNum)) {
        console.log('解析能量值:', energyNum)
        return energyNum
      }
    }
    console.warn('能量解析失败，返回0')
    return 0
  } catch (error) {
    console.error('查询地址能量失败:', error)
    return 0
  }
}

// 验证能量是否到账
const verifyEnergyReceived = async (address: string, msgId: string, baseEnergy: number): Promise<void> => {
  let attempts = 0
  const maxAttempts = 60  // 最多查询60次（60秒）
  let isVerifying = true  // 验证状态标记
  
  console.log(`🔍 开始验证 - 基准能量: ${baseEnergy}`)
  
  const checkEnergy = async (): Promise<void> => {
    if (!isVerifying) return  // 如果已经验证完成，停止查询
    
    attempts++
    const currentEnergy = await queryAddressEnergy(address)
    const diff = currentEnergy - baseEnergy
    console.log(`第${attempts}次查询 - 当前: ${currentEnergy}, 基准: ${baseEnergy}, 差值: ${diff}`)
    
    // 检查是否到账：差值 >= 129000
    if (diff >= 129000) {
      // 能量到账成功
      isVerifying = false  // 停止验证
      console.log(`✅ 能量验证成功！差值: ${diff}`)
      
      // 使用 Vue 响应式方式更新状态
      const msgIndex = messages.value.findIndex(m => m.id === msgId)
      if (msgIndex !== -1) {
        const currentMsg = messages.value[msgIndex]
        if (currentMsg) {
          messages.value[msgIndex] = {
            ...currentMsg,
            status: 'success' as const
          }
          saveMessages()
          console.log('✅ 状态已更新为 success')
        }
      }
      return
    }
    
    // 超过最大尝试次数
    if (attempts >= maxAttempts) {
      isVerifying = false  // 停止验证
      console.log(`❌ 验证超时（60秒）- 最终差值: ${diff}`)
      
      const msgIndex = messages.value.findIndex(m => m.id === msgId)
      if (msgIndex !== -1) {
        const currentMsg = messages.value[msgIndex]
        if (currentMsg) {
          messages.value[msgIndex] = {
            ...currentMsg,
            status: 'failed' as const,
            error: `验证超时（60秒），能量差值: ${diff}`
          }
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
    const baseEnergy = await queryAddressEnergy(address)
    console.log('发送前能量:', baseEnergy)
    
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
      
      // 只保留最近100条
      if (messages.value.length > 100) {
        messages.value = messages.value.slice(0, 100)
      }
      
      // 保存到本地
      saveMessages()
      
      // 4. 开始验证能量到账（使用刚查询的 baseEnergy 作为基准）
      verifyEnergyReceived(address, msgId, baseEnergy)
      
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
      
      // 页面加载时，将所有“验证中”的记录标记为超时
      messages.value.forEach(msg => {
        if (msg.status === 'pending') {
          msg.status = 'failed'
          msg.error = '页面刷新，验证中断，请手动检查'
        }
      })
      saveMessages()
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

// 填充地址到输入框
const fillAddress = (address: string) => {
  receiveAddress.value = address
  // 滚动到发送区域
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// 复制地址
const copyAddress = async () => {
  if (!rechargeAddress.value) return
  
  try {
    await navigator.clipboard.writeText(rechargeAddress.value)
    alert('地址已复制到剪贴板')
  } catch (error) {
    // 降级方案：使用 textarea
    const textarea = document.createElement('textarea')
    textarea.value = rechargeAddress.value
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      alert('地址已复制到剪贴板')
    } catch (e) {
      alert('复制失败，请手动复制')
    }
    document.body.removeChild(textarea)
  }
}

// 处理充值（TronLink 环境）
const handleRecharge = async () => {
  if (!window.tronWeb || !window.tronWeb.trx || !tronLinkConnected.value) {
    alert('请先连接 TronLink 钱包')
    return
  }
  
  if (!rechargeAddress.value) {
    alert('充值地址不存在')
    return
  }
  
  // 弹窗输入充值数量
  const amountStr = prompt('请输入充值数量（TRX）：', '100')
  
  if (!amountStr) {
    return  // 用户取消
  }
  
  const amount = parseFloat(amountStr)
  
  if (isNaN(amount) || amount <= 0) {
    alert('请输入有效的充值数量')
    return
  }
  
  try {
    console.log(`准备充值 ${amount} TRX 到 ${rechargeAddress.value}`)
    
    // 调用 TronLink 转账
    const transaction = await window.tronWeb.trx.sendTransaction(
      rechargeAddress.value,
      amount * 1000000  // TRX 转 sun（1 TRX = 1,000,000 sun）
    )
    
    console.log('交易成功:', transaction)
    
    if (transaction && transaction.result) {
      alert(`充值成功！\n数量: ${amount} TRX\n交易哈希: ${transaction.txid || transaction.transaction?.txID || ''}`)
      // 刷新余额
      setTimeout(() => fetchBalance(), 2000)
    } else {
      alert('充值失败，请重试')
    }
  } catch (error: any) {
    console.error('充值失败:', error)
    
    if (error === 'Confirmation declined by user') {
      alert('您取消了交易')
    } else {
      alert(`充值失败: ${error.message || '未知错误'}`)
    }
  }
}

// 滚动到顶部
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// 监听滚动事件
const handleScroll = () => {
  showBackToTop.value = window.scrollY > 300
}

// ========== 生命周期 ==========
onMounted(() => {
  loadApiKey()
  loadMessages()
  window.addEventListener('scroll', handleScroll)
  
  // 初始化 TronLink
  setTimeout(() => {
    detectTronLink()
    watchTronLinkAccount()
  }, 500)  // 等待 TronLink 加载
})

onUnmounted(() => {
  stopBalanceRefresh()
  window.removeEventListener('scroll', handleScroll)
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
  font-size: 16px;
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

/* 充值地址 */
.recharge-address {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.recharge-address label {
  display: block;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  margin-bottom: 8px;
  font-weight: 500;
}

.address-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.15);
  padding: 10px 12px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.address-text {
  flex: 1;
  color: white;
  font-family: monospace;
  font-size: 13px;
  word-break: break-all;
  line-height: 1.4;
}

.copy-btn {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #667eea;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.copy-btn:hover {
  background: white;
  transform: translateY(-1px);
}

.copy-btn:active {
  transform: translateY(0);
}

/* 充值按钮 */
.recharge-btn {
  padding: 6px 16px !important;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: white !important;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.recharge-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  background: linear-gradient(135deg, #7c8fef 0%, #8a5db7 100%) !important;
}

.recharge-btn:active {
  transform: translateY(0);
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

/* TronLink 连接状态 */
.tronlink-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 8px;
  margin-bottom: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #fff;
  border-radius: 50%;
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-text {
  font-size: 13px;
  font-weight: 600;
  color: white;
}

.wallet-address {
  margin-left: auto;
  font-family: monospace;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 10px;
  border-radius: 6px;
}

.send-section input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
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
  cursor: pointer;
  transition: all 0.2s;
}

.message-item:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  background: #f8f9fa;
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

/* 回到顶部按钮 */
.back-to-top {
  position: fixed;
  bottom: 40px;
  right: 40px;
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-to-top:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.back-to-top:active {
  transform: translateY(-2px);
}

/* 响应式设计 */
/* 移动端竖屏 (宽度 < 480px) */
@media (max-width: 480px) {
  .energy-sender {
    padding: 10px;
  }
  
  .api-key-section {
    padding: 16px;
  }
  
  .balance-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  
  .info-card {
    padding: 12px;
  }
  
  .info-card label {
    font-size: 11px;
  }
  
  .info-card .value {
    font-size: 16px;
  }
  
  .info-card .value.highlight {
    font-size: 20px;
  }
  
  .send-section {
    padding: 16px;
  }
  
  .send-section input {
    padding: 10px 12px;
  }
  
  .send-section button {
    padding: 12px;
    font-size: 15px;
  }
  
  .message-list h3 {
    font-size: 16px;
  }
  
  .message-item {
    padding: 12px;
  }
  
  .msg-address {
    font-size: 12px;
  }
  
  .back-to-top {
    bottom: 16px;
    right: 16px;
    width: 44px;
    height: 44px;
    font-size: 18px;
  }
}

/* 移动端横屏 (480px < 宽度 < 768px) */
@media (min-width: 481px) and (max-width: 768px) {
  .energy-sender {
    padding: 12px;
  }
  
  .balance-section {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .info-card .value.highlight {
    font-size: 22px;
  }
  
  .back-to-top {
    bottom: 20px;
    right: 20px;
    width: 45px;
    height: 45px;
    font-size: 20px;
  }
}

/* 平板设备 (768px < 宽度 < 1024px) */
@media (min-width: 769px) and (max-width: 1024px) {
  .energy-sender {
    max-width: 700px;
    margin: 0 auto;
  }
  
  .balance-section {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 桌面端大屏幕 (宽度 > 1200px) */
@media (min-width: 1200px) {
  .energy-sender {
    max-width: 800px;
    margin: 0 auto;
  }
  
  .balance-section {
    gap: 20px;
  }
  
  .info-card {
    padding: 20px;
  }
  
  .send-section {
    padding: 24px;
  }
}

/* 横屏时的特殊优化 */
@media (max-height: 600px) and (orientation: landscape) {
  .app-header h1 {
    font-size: 20px;
    margin-bottom: 4px;
  }
  
  .app-header p {
    font-size: 12px;
  }
  
  .balance-section {
    margin-bottom: 12px;
  }
  
  .info-card {
    padding: 10px;
  }
  
  .send-section {
    padding: 12px;
  }
  
  .message-list {
    max-height: 300px;
    overflow-y: auto;
  }
}
</style>

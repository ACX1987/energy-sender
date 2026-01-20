import axios from 'axios'

// 使用本地 API 代理，隐藏 trx.ceo 域名
const API_BASE_URL = '/api'

export interface BalanceResponse {
  code: number
  msg: string
  time: string
  data: string  // 可用笔数（字符串格式）
}

export interface SendEnergyResponse {
  code: number
  msg: string
  data: {
    orderId: string
    balance: number
    orderMoney: number
  } | null
}

/**
 * 查询可用笔数
 */
export async function getBalance(apiKey: string): Promise<BalanceResponse> {
  const response = await axios.post<BalanceResponse>(
    `${API_BASE_URL}/balance`,
    { apikey: apiKey },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
  
  return response.data
}

/**
 * 发送能量
 */
export async function sendEnergy(
  apiKey: string,
  receiveAddress: string,
  energyAmount: number = 130000,
  rentTime: number = 1,
  resLock: number = 0
): Promise<SendEnergyResponse> {
  const response = await axios.post<SendEnergyResponse>(
    `${API_BASE_URL}/send`,
    {
      apikey: apiKey,
      receiveAddress: receiveAddress,
      energyAmount: energyAmount,
      rentTime: rentTime,
      resLock: resLock
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
  
  return response.data
}

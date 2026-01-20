import axios from 'axios'

const API_BASE_URL = 'https://www.trx.ceo'

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
  const params = new URLSearchParams()
  params.append('apikey', apiKey)
  
  const response = await axios.post<BalanceResponse>(
    `${API_BASE_URL}/api/user/getBalancebykey`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
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
    `${API_BASE_URL}/api/v1/payk`,
    {
      key: apiKey,
      resType: 'ENERGY',
      payNums: energyAmount.toString(),
      rentTime: rentTime.toString(),
      resLock: resLock.toString(),
      receiveAddress: receiveAddress
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
  
  return response.data
}

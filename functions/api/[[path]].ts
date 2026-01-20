/**
 * Cloudflare Pages Functions
 * API 代理 - 转发请求到 trx.ceo API
 */

interface Env {
  // 可以在 Cloudflare Dashboard 中设置环境变量
}

const TRX_API_BASE = 'https://www.trx.ceo'

export const onRequest = async (context: { request: Request; env: Env }) => {
  const { request } = context
  const url = new URL(request.url)
  
  // 获取路径，例如 /api/balance 或 /api/send
  const apiPath = url.pathname.replace('/api/', '')
  
  // CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  }

  try {
    let targetUrl = ''
    let requestInit: RequestInit = {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
      }
    }

    // 根据不同的 API 路径转发
    if (apiPath === 'balance') {
      // 查询余额
      const body = await request.json() as { apikey: string }
      
      const params = new URLSearchParams()
      params.append('apikey', body.apikey)
      
      targetUrl = `${TRX_API_BASE}/api/user/getBalancebykey`
      requestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params
      }
    } else if (apiPath === 'send') {
      // 发送能量
      const body = await request.json() as {
        apikey: string
        receiveAddress: string
        energyAmount: number
        rentTime: number
        resLock: number
      }
      
      targetUrl = `${TRX_API_BASE}/api/v1/payk`
      requestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: body.apikey,
          resType: 'ENERGY',
          payNums: body.energyAmount.toString(),
          rentTime: body.rentTime.toString(),
          resLock: body.resLock.toString(),
          receiveAddress: body.receiveAddress
        })
      }
    } else {
      return new Response(JSON.stringify({ error: 'Invalid API path' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }

    // 转发请求到 trx.ceo
    const response = await fetch(targetUrl, requestInit)
    const data = await response.text()

    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: 'Proxy error', 
      message: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

const IpfsHttpClient = require('ipfs-http-client')
const https = require('https')
const {toString} = require('uint8arrays/to-string')
const fetch = require('node-fetch')

const browserCloudflareHeaders = {
  'Host': 'pubsubprovider.xyz',
  'Connection': 'Keep-Alive',
  'Accept-Encoding': 'gzip',
  'CF-IPCountry': 'T1',
  'X-Forwarded-For': '185.220.101.61',
  'CF-RAY': '70fcf1315bc67284-HAM',
  'Content-Length': '0',
  'X-Forwarded-Proto': 'https',
  'CF-Visitor': '{"scheme":"https"}',
  'sec-ch-ua': '',
  'sec-ch-ua-mobile': '?0',
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/90.0.4430.212 Safari/537.36',
  'accept': '*/*',
  'sec-fetch-site': 'cross-site',
  'sec-fetch-mode': 'cors',
  'sec-fetch-dest': 'empty',
  'referer': 'http://localhost:4172/',
  'accept-language': 'en-US',
  'CF-Connecting-IP': '185.220.101.61',
  'CDN-Loop': 'cloudflare'
}

// const agent = new https.Agent({keepAlive: true, maxSockets: 99999})
const url = 'http://localhost:8080/api/v0'

;(async () => {
  const res = await fetch(`${url}/pubsub/sub?arg=ucGxlYmJpdCB0ZXN0OQ`, {method: 'POST', headers: browserCloudflareHeaders})
  console.log(res)
  const text = await res.text()
  console.log(text)
})()

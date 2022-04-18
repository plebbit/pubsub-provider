const IpfsHttpClient = require('ipfs-http-client')
const https = require('https')
const ProxyAgent = require('https-proxy-agent')

// const agent = new ProxyAgent('http://user:pass@111.111.111.111:8080')
const agent = new https.Agent({keepAlive: true, maxSockets: 99999})
const url = 'https://pubsubprovider.xyz/api/v0'
const client = IpfsHttpClient.create({agent, url})

;(async () => {
  const res = await client.pubsub.subscribe('plebbit test')
  console.log(res)
  setInterval(async () => {
    const res = await client.pubsub.publish('plebbit test', Buffer.from(new Date().toISOString()))
    console.log(res)
  }, 1000)
})()

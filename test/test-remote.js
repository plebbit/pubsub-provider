const IpfsHttpClient = require('ipfs-http-client')
const https = require('https')
const ProxyAgent = require('https-proxy-agent')
const {toString} = require('uint8arrays/to-string')

// const agent = new ProxyAgent('http://user:pass@111.111.111.111:8000')
const agent = new https.Agent({keepAlive: true, maxSockets: 99999})
const url = 'https://pubsubprovider.xyz/api/v0'
const ipfsClient = IpfsHttpClient.create({agent, url})

;(async () => {
  const onMessageReceived = (message) => {
    console.log(`received message from ${message.from}:`, toString(message.data))
  }
  await ipfsClient.pubsub.subscribe('plebbit test', onMessageReceived)
  setInterval(async () => {
    const message = new Date().toISOString()
    try {
      await ipfsClient.pubsub.publish('plebbit test', Buffer.from(message))
      console.log('published message:', message)
    }
    catch (e) {
      console.log(e)
    }
  }, 1000)
})()

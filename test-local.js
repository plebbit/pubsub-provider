const IpfsHttpClient = require('ipfs-http-client')
const http = require('http')
const {toString} = require('uint8arrays/to-string')

const agent = new http.Agent({keepAlive: true, maxSockets: 99999})
const url = 'http://localhost:8080/api/v0'
const client = IpfsHttpClient.create({agent, url})

;(async () => {
  const onMessageReceived = (message) => {
    console.log(`received message from ${message.from}:`, toString(message.data))
  }
  await client.pubsub.subscribe('plebbit test', onMessageReceived)
  setInterval(async () => {
    const message = new Date().toISOString()
    try {
      await client.pubsub.publish('plebbit test', Buffer.from(message))
      console.log('published message:', message)
    }
    catch (e) {
      console.log(e)
    }
  }, 1000)
})()

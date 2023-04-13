const IpfsHttpClient = require('ipfs-http-client')
const http = require('http')
const {toString} = require('uint8arrays/to-string')

const agent = new http.Agent({keepAlive: true, maxSockets: 99999})
const url = 'http://localhost:8000/api/v0'
const ipfsClient = IpfsHttpClient.create({agent, url})

const pubsubTopic = 'plebbit test'

;(async () => {
  const topics = 10
  let i =  0
  while (i++ < topics) {
    const currentPubsubTopic = pubsubTopic + i
    const onMessageReceived = (message) => {
      console.log(`received message from ${message.from} in ${currentPubsubTopic}:`, toString(message.data))
    }
    await ipfsClient.pubsub.subscribe(currentPubsubTopic, onMessageReceived)
    const messageSent = currentPubsubTopic + ' ' + new Date().toISOString()
  }
})()

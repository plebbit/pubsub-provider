const IpfsHttpClient = require('ipfs-http-client')
const http = require('http')
const {toString} = require('uint8arrays/to-string')
const ProxyAgent = require('https-proxy-agent')

let agent = new http.Agent({keepAlive: true, maxSockets: 99999})
try {
  const proxyUrl = require('./proxy-url')
  agent = new ProxyAgent(proxyUrl)
}
catch (e) {}
const url = 'https://pubsubprovider.xyz/api/v0'
const ipfsClient = IpfsHttpClient.create({agent, url})

const pubsubTopics = ['QmbdJpNU6cAgSXHjUNnSBrUZGBtStKPkdwKyiffqRy1x6c']

;(async () => {
  for (const currentPubsubTopic of pubsubTopics) {
    const onMessageReceived = (message) => {
      console.log(`${new Date().toISOString()}: received message from ${message.from} in ${currentPubsubTopic}:`, toString(message.data))
    }
    await ipfsClient.pubsub.subscribe(currentPubsubTopic, onMessageReceived)
    console.log(`${new Date().toISOString()}: subscribed to ${currentPubsubTopic}`)
    const messageSent = currentPubsubTopic + ' ' + new Date().toISOString()
  }
})()

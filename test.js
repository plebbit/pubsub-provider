const IpfsHttpClient = require('ipfs-http-client')
const http = require('http')

const agent = new http.Agent({keepAlive: true, maxSockets: 99999})
const url = 'http://localhost:8080/api/v0'
const client = IpfsHttpClient.create({agent, url})

;(async () => {
  const res = await client.pubsub.subscribe('plebbit test')
  console.log(res)
  setInterval(async () => {
    const res = await client.pubsub.publish('plebbit test', Buffer.from(new Date().toISOString()))
    console.log(res)
  }, 1000)
})()

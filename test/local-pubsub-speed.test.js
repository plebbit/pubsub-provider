const IpfsHttpClient = require('ipfs-http-client')
const {toString} = require('uint8arrays/to-string')
const {Buffer} = require('buffer')

const url = 'http://localhost:4023/api/v0'
const ipfsClient = IpfsHttpClient.create(url)

let lastTimestamp
const getTime = () => {
  if (!lastTimestamp) {
    lastTimestamp = Date.now()
    return '+0ms'
  }
  const time = Date.now() - lastTimestamp
  lastTimestamp = Date.now()
  return '+' + time + 'ms'
}

describe.skip('local pubsub speed', () => {
  it('local pubsub speed', async() => {
    setInterval(async () => {
      // reset time 
      getTime()

      let times = 3

      while (times--) {
        console.log(getTime(), 'new loop')
        console.log('')

        console.log('before subscribe')
        let onMessageReceived
        const onMessageReceivedPromise = new Promise(resolve => {
          onMessageReceived = (message) => {
            console.log(getTime(), `received message`)
            resolve()
          }
        })
        await ipfsClient.pubsub.subscribe('plebbit test', onMessageReceived)
        console.log(getTime(), 'after subscribe')
        console.log('')

        const message = 'test message'
        getTime()
        console.log('before publish')
        await ipfsClient.pubsub.publish('plebbit test', Buffer.from(message))
        console.log(getTime(), 'after publish')
        await onMessageReceivedPromise
        console.log('')

        getTime()
        console.log('before unsubscribe')
        await ipfsClient.pubsub.unsubscribe('plebbit test')
        console.log(getTime(), 'after unsubscribe')
        console.log('')
      }
    }, 3000)

    await new Promise(r => {})
  })
})

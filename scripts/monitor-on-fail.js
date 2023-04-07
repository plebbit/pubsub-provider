// add telegram bot credentials in ../telegram-bot
const telegramBot = require('../telegram-bot')
const {Telegram} = require('telegraf')
const telegram = new Telegram(telegramBot.botToken)
const rebootServer = require('./reboot-server')

const isDownMessage = () => 'pubsub provider is down ' + new Date().toISOString()
const rebootedMessage = () => 'pubsub provider server rebooted ' + new Date().toISOString()

const onFail = async () => {
  try {
    await telegram.sendMessage(telegramBot.chatId, isDownMessage())
  }
  catch (e) {
    console.log(e)
  }

  try {
    await rebootServer()
    await telegram.sendMessage(telegramBot.chatId, rebootedMessage())
  }
  catch (e) {
    await telegram.sendMessage(telegramBot.chatId, `failed rebooting server: ${e.message.slice(0, 400)}`)
  }
}

module.exports = onFail

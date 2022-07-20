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

  await rebootServer()
  await telegram.sendMessage(telegramBot.chatId, rebootedMessage())
}

module.exports = onFail

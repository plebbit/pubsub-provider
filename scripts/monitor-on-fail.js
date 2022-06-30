// add telegram bot credentials in ../telegram-bot
const telegramBot = require('../telegram-bot')
const {Telegram} = require('telegraf')
const telegram = new Telegram(telegramBot.botToken)

const message = () => 'pubsub provider is down ' + new Date().toISOString()

const onFail = async () => {
  await telegram.sendMessage(telegramBot.chatId, message())
}

module.exports = onFail

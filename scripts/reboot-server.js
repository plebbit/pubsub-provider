const puppeteer = require('puppeteer')
const path = require('path')
const assert = require('assert')
const {username, password, loginUrl, rebootUrl} = require('../server-info')

assert(username && typeof username === 'string', `server info username '${username}' invalid`)
assert(password && typeof password === 'string', `server info password '${password}' invalid`)
assert(loginUrl && typeof loginUrl === 'string', `server info loginUrl '${loginUrl}' invalid`)
assert(rebootUrl && typeof rebootUrl === 'string', `server info rebootUrl '${rebootUrl}' invalid`)

const puppeteerOptions = {
  // headless: false,
  args:[
    `--user-data-dir=${path.resolve(__dirname, '..', 'chrome-profile')}`,
    '--no-sandbox'
  ]
}
const timeout = 120000
const rebootTimeout = 600000

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

let browser, page
const browserRebootServer = async () => {
  // go to login page
  console.log('going to login page')
  try {
    await page.goto(loginUrl, {waitFor: 'networkidle2', timeout})
  }
  catch (e) {
    console.log(e.message)
  }

  await page.waitForFunction(() => 
    !!document.querySelector('[name=username]') || !!document.body?.textContent?.match('Logged in as:')
  , {timeout})
  console.log('login page loaded')

  // log in if not logged in
  if (await page.evaluate(() => !document.body?.textContent?.match('Logged in as:'))) {
    console.log('not logged in yet')

    // enter creds
    await page.type('[name=username]', username)
    await page.type('[name=password]', password)
    await page.click('[name=rememberme]')
    await sleep(5000)
    console.log('creds entered')

    // login
    await page.click('button#login')
    await page.waitForFunction(() => !!document.body?.textContent?.match('Logged in as:'), {timeout})
  }
  console.log('logged in')

  // go to reboot url
  console.log('going to reboot url')
  try {
    await page.goto(rebootUrl, {waitFor: 'networkidle2', timeout: rebootTimeout})
  }
  catch (e) {
    console.log(e.message)
  }
  await page.waitForFunction(() => 
    !!document.body?.textContent?.match('Action Completed Successfully!'),
    {timeout: rebootTimeout}
  )
  console.log('reboot successful')
}

const rebootServer = async () => {
  browser = await puppeteer.launch(puppeteerOptions)
  page = await browser.newPage()

  try {
    await browserRebootServer()
  }
  catch (e) {
    throw e
  }
  finally {
    await browser.close()
  }
}

module.exports = rebootServer

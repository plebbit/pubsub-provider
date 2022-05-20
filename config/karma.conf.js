// you can add "CHROME_BIN=/usr/bin/chromium" to .env file
// to not have to type it every time
require('dotenv').config()

// same as .mocharc.js
const mochaConfig = {
  timeout: 10 * 60 * 1000,
}

// possible to add flags when launching the browser
const CustomChrome = {
  base: 'ChromeHeadless',
  flags: ['--disable-web-security'],
  debug: true,
}

const DebugChrome = {
  base: 'Chrome',
  flags: ['--disable-web-security', '--auto-open-devtools-for-tabs'],
  debug: true,
}

// choose which browser you prefer
const browsers = [
  // 'FirefoxHeadless',
  'CustomChrome',
  // 'DebugChrome'
]

// add firefox during CI
if (process.env.CI) {
  browsers.push('FirefoxHeadless')
}

// inject browser code before each test file
let codeToInjectBefore = ''

// inject debug env variable to be able to do `DEBUG=plebbit:* npm run test`
if (process.env.DEBUG) {
  codeToInjectBefore += `
      localStorage.debug = "${process.env.DEBUG.replaceAll(`"`, '')}";
    `
}

module.exports = function (config) {
  config.set({
    // chai adds "expect" matchers
    frameworks: ['mocha', 'chai', 'webpack'],
    client: {
      mocha: mochaConfig,
    },
    plugins: [
      require('karma-webpack'),
      require('karma-chrome-launcher'),
      require('karma-firefox-launcher'),
      require('karma-mocha'),
      require('karma-chai'),
      require('karma-spec-reporter'),
      injectCodeBeforePlugin,
    ],

    basePath: '../',
    files: [
      // the tests are first compiled from typescript to dist/node/test
      // then they are compiled to browser with webpack to dist/browser/test
      // you must run `npm run tsc:watch` and `npm run webpack:watch` to use the karma tests
      'test/**/*.test.js',
    ],
    exclude: [],

    preprocessors: {
      // bundle all require() found in tests
      'test/**/*.test.js': [ 'webpack' ],
      // inject code to run before each test
      '**/*.js': ['inject-code-before'],
    },

    // no webpack config needed
    webpack: {},

    // chrome with disabled security
    customLaunchers: {CustomChrome, DebugChrome},

    // list of browsers to run the tests in
    browsers,

    // don't watch, run once and exit
    singleRun: true,
    autoWatch: false,

    // how the test logs are displayed
    reporters: ['spec'],

    port: 4172,
    colors: true,
    logLevel: config.LOG_INFO,
    browserNoActivityTimeout: mochaConfig.timeout
  })
}

function injectCodeBeforeFactory() {
  return (content, file, done) => done(codeToInjectBefore + content)
}

const injectCodeBeforePlugin = {
  'preprocessor:inject-code-before': ['factory', injectCodeBeforeFactory],
}

const ethers = require('ethers')
const chainProviderUrl = process.env.ETH_PROVIDER_URL

const resolveEnsTxtRecord = async (ensName, txtRecordName) => {
  try {
    let ethProvider
    if (chainProviderUrl) {
      ethProvider = new ethers.JsonRpcProvider(chainProviderUrl)
    }
    else {
      ethProvider = ethers.getDefaultProvider()
    }
    const resolver = await ethProvider.getResolver(ensName)
    if (!resolver) {
      throw Error(`ethProvider.getResolver returned '${resolver}', can't get text record`)
    }
    const txtRecordResult = await resolver.getText(txtRecordName)
    return txtRecordResult
  }
  catch (e) {
    e.message = `failed ens resolve '${ensName}' '${txtRecordName}': ${e.message}`
    throw e
  }
}

module.exports = {resolveEnsTxtRecord}

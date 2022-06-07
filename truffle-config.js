const HDWalletProvider = require("@truffle/hdwallet-provider");
require('dotenv').config();

module.exports = {
  // Uncommenting the defaults below
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  //
  networks: {
    mumbai: {
      provider: () => new HDWalletProvider(process.env.mnemonic, `https://rpc-mumbai.maticvigil.com`),
      network_id: 80001,
      confirmations: 2,
      timeoutBlocks: 5000,
      skipDryRun: true
    },
    matic: {
      provider: () => new HDWalletProvider(process.env.mnemonic, `https://rpc-mainnet.maticvigil.com`),
      network_id: 137,
      confirmations: 2,
      timeoutBlocks: 5000,
      skipDryRun: true
    },
  },
  mocha: {
    timeout: 100000
  },
  compilers: {
    solc: {
      version: "0.8.14",
      settings: {          // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200
        },
        //evmVersion: "byzantium"
      }
    },
  },
  plugins: [
    'truffle-plugin-verify'
  ],
  api_keys: {
    polygonscan: process.env.polyscan_api_key,
  },
};

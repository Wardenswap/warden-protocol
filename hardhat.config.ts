require('dotenv').config()
import { task } from "hardhat/config"
import "@nomiclabs/hardhat-waffle"
import "solidity-coverage"
import { HardhatUserConfig } from "hardhat/config"
import "hardhat-typechain"

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    version: '0.5.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000
      }
    }
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.MAINNET_FORK_URL as string,
        blockNumber: 11945200
      }
    }
  },
  typechain: {
    outDir: './typechain',
    target: 'ethers-v5'
  },
}

export default config

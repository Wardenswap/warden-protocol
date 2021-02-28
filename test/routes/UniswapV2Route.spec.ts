import { ethers, waffle } from 'hardhat'
// import { BigNumber, bigNumberify } from 'hardhat'
import { Signer, utils, Contract, BigNumber } from 'ethers'
import { expect } from 'chai'
// import chai from "chai"
// import { solidity } from "ethereum-waffle"

// chai.use(solidity)

describe('UniswapV2TradingRoute', function() {
  const provider = waffle.provider
  const [wallet1, wallet2, wallet3, wallet4, other] = provider.getWallets()

  before(async function() {
    const Route = await ethers.getContractFactory('UniswapV2TradingRoute')
    this.route = await Route.deploy()
    await this.route.deployed()

    this.daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    this.ethAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
    this.mkrAddress = '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2'
  })

  it('Should initial data correctly', async function() {
    expect(await this.route.owner()).to.properAddress
    expect(await this.route.router()).to.properAddress
    expect(await this.route.etherERC20()).to.properAddress
    expect(await this.route.wETH()).to.properAddress

    expect(await this.route.owner()).to.equal(wallet1.address)
    expect(await this.route.router()).to.equal('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D')
    expect(await this.route.etherERC20()).to.equal(this.ethAddress)
    expect(await this.route.wETH()).to.equal('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
    expect(await this.route.amountOutMin()).to.equal('1')
    expect(await this.route.deadline()).to.equal(ethers.constants.MaxUint256)
  })

  it('Should trade 1 ETH -> DAI correctly', async function() {
    const etherAmount = utils.parseEther('1')
    const outAmount: BigNumber = await this.route.getDestinationReturnAmount(this.ethAddress, this.daiAddress, etherAmount)
    console.log('1 ETH -> ? DAI', utils.formatUnits(outAmount, 18))

    let overrides = {
      value: etherAmount
    }
    await expect(this.route.trade(
      this.ethAddress,
      this.daiAddress,
      etherAmount,
      overrides
    )).to.emit(this.route, 'Trade')
    .withArgs(this.ethAddress, etherAmount, this.daiAddress, outAmount)
  })

  it('Should trade 1 ETH -> MKR correctly', async function() {
    const etherAmount = utils.parseEther('1')
    const outAmount: BigNumber = await this.route.getDestinationReturnAmount(this.ethAddress, this.mkrAddress, etherAmount)
    console.log('1 ETH -> ? MKR', utils.formatUnits(outAmount, 18))

    let overrides = {
      value: etherAmount
    }
    await expect(this.route.trade(
      this.ethAddress,
      this.mkrAddress,
      etherAmount,
      overrides
    )).to.emit(this.route, 'Trade')
    .withArgs(this.ethAddress, etherAmount, this.mkrAddress, outAmount)
  })
})

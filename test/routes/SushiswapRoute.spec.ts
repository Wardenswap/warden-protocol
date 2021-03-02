import { ethers, waffle, network } from 'hardhat'
import hre from 'hardhat'
// import { BigNumber, bigNumberify } from 'hardhat'
import { Signer, utils, Contract, BigNumber } from 'ethers'
import { expect } from 'chai'
import ERC20Abi from '../helpers/erc20Abi.json'
import WhaleAddresses from '../helpers/whaleAddresses.json'

describe('SushiswapV2TradingRoute', function() {
  const provider = waffle.provider
  const [wallet1, wallet2, wallet3, wallet4, other] = provider.getWallets()

  before(async function() {
    const Route = await ethers.getContractFactory('SushiswapV2TradingRoute')
    this.route = await Route.deploy()
    await this.route.deployed()

    this.ethAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
    this.daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    this.sushiAddress = '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2'
    this.usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    this.usdtAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7'

    this.dai = await ethers.getContractAt(ERC20Abi, this.daiAddress)
    this.sushi = await ethers.getContractAt(ERC20Abi, this.sushiAddress)
    this.usdc = await ethers.getContractAt(ERC20Abi, this.usdcAddress)
    this.usdt = await ethers.getContractAt(ERC20Abi, this.usdtAddress)

    this.trader = await ethers.provider.getSigner(WhaleAddresses.binance7)

    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [WhaleAddresses.binance7]}
    )
  })

  it('Should initial data correctly', async function() {
    expect(await this.route.router()).to.properAddress
    expect(await this.route.etherERC20()).to.properAddress
    expect(await this.route.wETH()).to.properAddress

    expect(await this.route.router()).to.equal('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F')
    expect(await this.route.etherERC20()).to.equal(this.ethAddress)
    expect(await this.route.wETH()).to.equal('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
    expect(await this.route.amountOutMin()).to.equal('1')
    expect(await this.route.deadline()).to.equal(ethers.constants.MaxUint256)
  })

  it('Should emit Trade event properly', async function () {
    const amountIn = utils.parseEther('1')
    let amountOut: BigNumber = await this.route.getDestinationReturnAmount(this.ethAddress, this.daiAddress, amountIn)

    await expect(await this.route.trade(
      this.ethAddress,
      this.daiAddress,
      amountIn,
      {
        value: amountIn
      }
    ))
    .to.emit(this.route, 'Trade')
    .withArgs(this.ethAddress, amountIn, this.daiAddress, amountOut)
  })

  it('Should trade 1 ETH -> DAI correctly', async function() {
    const amountIn = utils.parseEther('1')
    let amountOut: BigNumber = await this.route.getDestinationReturnAmount(this.ethAddress, this.daiAddress, amountIn)
    console.log('1 ETH -> ? DAI', utils.formatUnits(amountOut, 18))

    await expect(() => this.route.trade(
      this.ethAddress,
      this.daiAddress,
      amountIn,
      {
        value: amountIn
      }
    ))
    .to.changeTokenBalance(this.dai, wallet1, amountOut)

    await expect(() =>  this.route.trade(
      this.ethAddress,
      this.daiAddress,
      amountIn,
      {
        value: amountIn
      }
    ))
    .to.changeEtherBalance(wallet1, '-1000000000000000000')
  })

  it('Should not allow trade 1 ETH -> DAI when provide incorrect amount int', async function() {
    await expect(this.route.trade(
      this.ethAddress,
      this.daiAddress,
      utils.parseEther('1'),
      {
        value: utils.parseEther('0.5')
      }
    ))
    .to.revertedWith('source amount mismatch')

    await expect(this.route.trade(
      this.ethAddress,
      this.daiAddress,
      utils.parseEther('0.5'),
      {
        value: utils.parseEther('1')
      }
    ))
    .to.revertedWith('source amount mismatch')
  })

  it('Should not allow trade 1 MKR -> ETH if balance is not enough', async function() {
    const amountIn = utils.parseEther('1')

    await expect(this.route.trade(
      this.sushiAddress,
      this.ethAddress,
      amountIn
    ))
    .to.be.reverted
  })

  it('Should trade 100 USDC -> USDT correctly', async function() {
    const amountIn = utils.parseUnits('100', 6)
    let amountOut: BigNumber = await this.route.getDestinationReturnAmount(this.usdcAddress, this.usdtAddress, amountIn)
    console.log('100 USDC -> ? USDT', utils.formatUnits(amountOut, 18))

    await this.usdc.connect(this.trader).approve(this.route.address, ethers.constants.MaxUint256)
    await expect(() =>  this.route.connect(this.trader).trade(
      this.usdcAddress,
      this.usdtAddress,
      amountIn
    ))
    .to.changeTokenBalance(this.usdt, this.trader, amountOut)

    await expect(() =>  this.route.connect(this.trader).trade(
      this.usdcAddress,
      this.usdtAddress,
      amountIn
    ))
    .to.changeTokenBalance(this.usdc, this.trader, '-100000000')
  })

  it('Should trade 1 SUSHI -> ETH correctly', async function() {
    const amountIn = utils.parseEther('1')
    let amountOut: BigNumber = await this.route.getDestinationReturnAmount(this.sushiAddress, this.ethAddress, amountIn)
    console.log('1 SUSHI -> ? ETH', utils.formatUnits(amountOut, 18))

    await this.sushi.connect(this.trader).approve(this.route.address, ethers.constants.MaxUint256)
    await expect(() =>  this.route.connect(this.trader).trade(
      this.sushiAddress,
      this.ethAddress,
      amountIn
    ))
    .to.changeEtherBalance(this.trader, amountOut)

    await expect(() =>  this.route.connect(this.trader).trade(
      this.sushiAddress,
      this.ethAddress,
      amountIn
    ))
    .to.changeTokenBalance(this.sushi, this.trader, '-1000000000000000000')
  })

  it('Should get rate properly', async function() {
    const amountIn = utils.parseEther('1')
    expect(await this.route.getDestinationReturnAmount(this.ethAddress, this.daiAddress, amountIn))
    .to.not.equal(0)

    expect(await this.route.getDestinationReturnAmount(this.sushiAddress, this.ethAddress, amountIn))
    .to.not.equal(0)

    expect(await this.route.getDestinationReturnAmount(this.usdcAddress, this.usdtAddress, utils.parseUnits('100', 6)))
    .to.not.equal(0)
  })

  it('Should not allow trade 1 MKR -> MKR', async function() {
    const amountIn = utils.parseEther('1')

    await expect(this.route.trade(
      this.sushiAddress,
      this.sushiAddress,
      amountIn
    ))
    .to.be.revertedWith('destination token can not be source token')
  })

  it('Should not get rate if source and destination token are the same', async function() {
    const amountIn = utils.parseEther('100')

    await expect(this.route.getDestinationReturnAmount(this.sushiAddress, this.sushiAddress, amountIn))
    .to.revertedWith('destination token can not be source token')
  })
})

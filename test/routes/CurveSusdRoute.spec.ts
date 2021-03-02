import { ethers, waffle, network } from 'hardhat'
import hre from 'hardhat'
// import { BigNumber, bigNumberify } from 'hardhat'
import { Signer, utils, Contract, BigNumber } from 'ethers'
import { expect } from 'chai'
import ERC20Abi from '../helpers/erc20Abi.json'
import WhaleAddresses from '../helpers/whaleAddresses.json'

describe('CurveSusdTradingRoute', function() {
  const provider = waffle.provider
  const [wallet1, wallet2, wallet3, wallet4, other] = provider.getWallets()

  before(async function() {
    const Route = await ethers.getContractFactory('CurveSusdTradingRoute')
    this.route = await Route.deploy()
    await this.route.deployed()

    this.ethAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
    this.daiAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    this.usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    this.usdtAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    this.susdAddress = '0x57Ab1ec28D129707052df4dF418D58a2D46d5f51'
    this.mkrAddress = '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2'

    this.dai = await ethers.getContractAt(ERC20Abi, this.daiAddress)
    this.usdc = await ethers.getContractAt(ERC20Abi, this.usdcAddress)
    this.usdt = await ethers.getContractAt(ERC20Abi, this.usdtAddress)
    this.susd = await ethers.getContractAt(ERC20Abi, this.susdAddress)
    this.mkr = await ethers.getContractAt(ERC20Abi, this.mkrAddress)

    this.trader = await ethers.provider.getSigner(WhaleAddresses.a16zAddress)
    this.trader2 = await ethers.provider.getSigner(WhaleAddresses.binance8)

    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [WhaleAddresses.a16zAddress]}
    )
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [WhaleAddresses.binance8]}
    )
  })

  it('Should initial data correctly', async function() {
    expect(await this.route.susdPool()).to.properAddress
    expect(await this.route.dai()).to.properAddress
    expect(await this.route.usdc()).to.properAddress
    expect(await this.route.usdt()).to.properAddress
    expect(await this.route.susd()).to.properAddress

    expect(await this.route.susdPool()).to.equal('0xA5407eAE9Ba41422680e2e00537571bcC53efBfD')
    expect(await this.route.dai()).to.equal(this.daiAddress)
    expect(await this.route.usdc()).to.equal(this.usdcAddress)
    expect(await this.route.usdt()).to.equal(this.usdtAddress)
    expect(await this.route.susd()).to.equal(this.susdAddress)
  })

  it('Should get rate properly', async function() {
    const daiToUsdcAmount = await this.route.getDestinationReturnAmount(this.daiAddress, this.usdcAddress, utils.parseUnits('100', 18))
    const daiToUsdcAmountInBase = utils.formatUnits(daiToUsdcAmount, 6)
    console.log({ daiToUsdcAmountInBase })
    expect(parseFloat(daiToUsdcAmountInBase))
    .to.closeTo(100, 5)

    const usdcToUsdtAmount = await this.route.getDestinationReturnAmount(this.usdcAddress, this.usdtAddress, utils.parseUnits('100', 6))
    const usdcToUsdtAmountInBase = utils.formatUnits(usdcToUsdtAmount, 6)
    console.log({ usdcToUsdtAmountInBase })
    expect(parseFloat(usdcToUsdtAmountInBase))
    .to.closeTo(100, 5)

    const susdToDaiAmount = await this.route.getDestinationReturnAmount(this.susdAddress, this.daiAddress, utils.parseUnits('100', 18))
    const susdToDaiAmountInBase = utils.formatUnits(susdToDaiAmount, 18)
    console.log({ susdToDaiAmountInBase })
    expect(parseFloat(susdToDaiAmountInBase))
    .to.closeTo(100, 5)
  })

  it('Should not allow trade 100 DAI -> USDC if balance is not enough', async function () {
    const amountIn = utils.parseEther('100')

    await this.dai.connect(this.trader).approve(this.route.address, ethers.constants.MaxUint256)
    await expect(this.route.connect(this.trader).trade(
      this.daiAddress,
      this.usdcAddress,
      amountIn
    ))
    .to.revertedWith('Dai/insufficient-balance')
  })

  it('Should emit Trade event properly', async function () {
    const amountIn = utils.parseEther('100')
    let amountOut: BigNumber = await this.route.getDestinationReturnAmount(this.daiAddress, this.usdcAddress, amountIn)

    await this.dai.connect(this.trader2).approve(this.route.address, ethers.constants.MaxUint256)
    await expect(await this.route.connect(this.trader2).trade(
      this.daiAddress,
      this.usdcAddress,
      amountIn
    ))
    .to.emit(this.route, 'Trade')
    .withArgs(this.daiAddress, amountIn, this.usdcAddress, amountOut)
  })

  it('Should trade 100 DAI -> USDC correctly', async function() {
    const amountIn = utils.parseEther('100')
    let amountOut: BigNumber = await this.route.getDestinationReturnAmount(this.daiAddress, this.usdcAddress, amountIn)
    console.log('100 DAI -> ? USDC', utils.formatUnits(amountOut, 6))

    await this.dai.connect(this.trader2).approve(this.route.address, ethers.constants.MaxUint256)
    await expect(() =>  this.route.connect(this.trader2).trade(
      this.daiAddress,
      this.usdcAddress,
      amountIn
    ))
    .to.changeTokenBalance(this.usdc, this.trader2, amountOut.sub(1))

    await expect(() =>  this.route.connect(this.trader2).trade(
      this.daiAddress,
      this.usdcAddress,
      amountIn
    ))
    .to.changeTokenBalance(this.dai, this.trader2, '-100000000000000000000')
  })

  it('Should not allow trade unsupported tokens', async function() {
    const amountIn = utils.parseEther('100')

    await this.mkr.connect(this.trader).approve(this.route.address, ethers.constants.MaxUint256)
    await expect(this.route.connect(this.trader).trade(
      this.mkrAddress,
      this.usdcAddress,
      amountIn
    ))
    .to.revertedWith('tokens\'re not supported!')

    await this.usdc.connect(this.trader).approve(this.route.address, ethers.constants.MaxUint256)
    await expect(this.route.connect(this.trader).trade(
      this.usdcAddress,
      this.mkrAddress,
      utils.parseUnits('100', 6)
    ))
    .to.revertedWith('tokens\'re not supported!')
  })

  it('Should not allow trade 1 USDC -> USDC', async function() {
    const amountIn = utils.parseEther('100')

    await this.usdc.connect(this.trader).approve(this.route.address, ethers.constants.MaxUint256)
    await expect(this.route.connect(this.trader).trade(
      this.usdcAddress,
      this.usdcAddress,
      amountIn
    ))
    .to.revertedWith('destination token can not be source token')
  })

  it('Should not get rate if source and destination token are the same', async function() {
    const amountIn = utils.parseEther('100')

    await expect(this.route.getDestinationReturnAmount(this.usdcAddress, this.usdcAddress, amountIn))
    .to.revertedWith('destination token can not be source token')
  })

  it('Should not get rate if tokens are not unsupported', async function() {
    await expect(this.route.getDestinationReturnAmount(this.mkrAddress, this.usdcAddress, utils.parseUnits('100', 18)))
    .to.revertedWith('tokens\'re not supported!')

    await expect(this.route.getDestinationReturnAmount(this.usdcAddress, this.mkrAddress, utils.parseUnits('100', 6)))
    .to.revertedWith('tokens\'re not supported!')
  })
})

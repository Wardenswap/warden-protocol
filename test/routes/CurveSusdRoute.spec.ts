import { ethers, waffle, network } from 'hardhat'
import hre from 'hardhat'
// import { BigNumber, bigNumberify } from 'hardhat'
import { Signer, utils, Contract, BigNumber } from 'ethers'
import { expect } from 'chai'
import ERC20Abi from '../helpers/erc20Abi.json'
import WhaleAddresses from '../helpers/whaleAddresses.json'
import { main as Assets } from '../helpers/assets'

describe('CurveSusdTradingRoute', function() {
  const provider = waffle.provider
  const [wallet1, wallet2, wallet3, wallet4, other] = provider.getWallets()

  before(async function() {
    const Route = await ethers.getContractFactory('CurveSusdTradingRoute')
    this.route = await Route.deploy()
    await this.route.deployed()

    this.dai = await ethers.getContractAt(ERC20Abi, Assets.DAI.address)
    this.usdc = await ethers.getContractAt(ERC20Abi, Assets.USDC.address)
    this.usdt = await ethers.getContractAt(ERC20Abi, Assets.USDT.address)
    this.susd = await ethers.getContractAt(ERC20Abi, Assets.SUSD.address)
    this.mkr = await ethers.getContractAt(ERC20Abi, Assets.MKR.address)

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
    expect(await this.route.dai()).to.equal(Assets.DAI.address)
    expect(await this.route.usdc()).to.equal(Assets.USDC.address)
    expect(await this.route.usdt()).to.equal(Assets.USDT.address)
    expect(await this.route.susd()).to.equal(Assets.SUSD.address)
  })

  it('Should get rate properly', async function() {
    const daiToUsdcAmount = await this.route.getDestinationReturnAmount(Assets.DAI.address, Assets.USDC.address, utils.parseUnits('100', 18))
    const daiToUsdcAmountInBase = utils.formatUnits(daiToUsdcAmount, 6)
    console.log({ daiToUsdcAmountInBase })
    expect(parseFloat(daiToUsdcAmountInBase))
    .to.closeTo(100, 5)

    const usdcToUsdtAmount = await this.route.getDestinationReturnAmount(Assets.USDC.address, Assets.USDT.address, utils.parseUnits('100', 6))
    const usdcToUsdtAmountInBase = utils.formatUnits(usdcToUsdtAmount, 6)
    console.log({ usdcToUsdtAmountInBase })
    expect(parseFloat(usdcToUsdtAmountInBase))
    .to.closeTo(100, 5)

    const susdToDaiAmount = await this.route.getDestinationReturnAmount(Assets.SUSD.address, Assets.DAI.address, utils.parseUnits('100', 18))
    const susdToDaiAmountInBase = utils.formatUnits(susdToDaiAmount, 18)
    console.log({ susdToDaiAmountInBase })
    expect(parseFloat(susdToDaiAmountInBase))
    .to.closeTo(100, 5)
  })

  it('Should not allow trade 100 DAI -> USDC if balance is not enough', async function () {
    const amountIn = utils.parseEther('100')

    await this.dai.connect(this.trader).approve(this.route.address, ethers.constants.MaxUint256)
    await expect(this.route.connect(this.trader).trade(
      Assets.DAI.address,
      Assets.USDC.address,
      amountIn
    ))
    .to.revertedWith('Dai/insufficient-balance')
  })

  it('Should emit Trade event properly', async function () {
    const amountIn = utils.parseEther('100')
    let amountOut: BigNumber = await this.route.getDestinationReturnAmount(Assets.DAI.address, Assets.USDC.address, amountIn)

    await this.dai.connect(this.trader2).approve(this.route.address, ethers.constants.MaxUint256)
    await expect(await this.route.connect(this.trader2).trade(
      Assets.DAI.address,
      Assets.USDC.address,
      amountIn
    ))
    .to.emit(this.route, 'Trade')
    .withArgs(Assets.DAI.address, amountIn, Assets.USDC.address, amountOut)
  })

  it('Should trade 100 DAI -> USDC correctly', async function() {
    const amountIn = utils.parseEther('100')
    let amountOut: BigNumber = await this.route.getDestinationReturnAmount(Assets.DAI.address, Assets.USDC.address, amountIn)
    console.log('100 DAI -> ? USDC', utils.formatUnits(amountOut, 6))

    await this.dai.connect(this.trader2).approve(this.route.address, ethers.constants.MaxUint256)
    await expect(() =>  this.route.connect(this.trader2).trade(
      Assets.DAI.address,
      Assets.USDC.address,
      amountIn
    ))
    .to.changeTokenBalance(this.usdc, this.trader2, amountOut.sub(1))

    await expect(() =>  this.route.connect(this.trader2).trade(
      Assets.DAI.address,
      Assets.USDC.address,
      amountIn
    ))
    .to.changeTokenBalance(this.dai, this.trader2, '-100000000000000000000')
  })

  it('Should not allow trade unsupported tokens', async function() {
    const amountIn = utils.parseEther('100')

    await this.mkr.connect(this.trader).approve(this.route.address, ethers.constants.MaxUint256)
    await expect(this.route.connect(this.trader).trade(
      Assets.MKR.address,
      Assets.USDC.address,
      amountIn
    ))
    .to.revertedWith('tokens\'re not supported!')

    await this.usdc.connect(this.trader).approve(this.route.address, ethers.constants.MaxUint256)
    await expect(this.route.connect(this.trader).trade(
      Assets.USDC.address,
      Assets.MKR.address,
      utils.parseUnits('100', 6)
    ))
    .to.revertedWith('tokens\'re not supported!')
  })

  it('Should not allow trade 1 USDC -> USDC', async function() {
    const amountIn = utils.parseEther('100')

    await this.usdc.connect(this.trader).approve(this.route.address, ethers.constants.MaxUint256)
    await expect(this.route.connect(this.trader).trade(
      Assets.USDC.address,
      Assets.USDC.address,
      amountIn
    ))
    .to.revertedWith('destination token can not be source token')
  })

  it('Should not get rate if source and destination token are the same', async function() {
    const amountIn = utils.parseEther('100')

    await expect(this.route.getDestinationReturnAmount(Assets.USDC.address, Assets.USDC.address, amountIn))
    .to.revertedWith('destination token can not be source token')
  })

  it('Should not get rate if tokens are not unsupported', async function() {
    await expect(this.route.getDestinationReturnAmount(Assets.MKR.address, Assets.USDC.address, utils.parseUnits('100', 18)))
    .to.revertedWith('tokens\'re not supported!')

    await expect(this.route.getDestinationReturnAmount(Assets.USDC.address, Assets.MKR.address, utils.parseUnits('100', 6)))
    .to.revertedWith('tokens\'re not supported!')
  })
})

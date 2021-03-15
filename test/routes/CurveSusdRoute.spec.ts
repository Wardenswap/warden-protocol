import { ethers, waffle, network } from 'hardhat'
import hre from 'hardhat'
// import { BigNumber, bigNumberify } from 'hardhat'
import { Signer, utils, Contract, BigNumber } from 'ethers'
import { expect } from 'chai'
import ERC20Abi from '../helpers/erc20Abi.json'
import WhaleAddresses from '../helpers/whaleAddresses.json'
import { main as Assets } from '../helpers/assets'
import { CurveSusdRoute } from '../../typechain/CurveSusdRoute'
import { IERC20 } from '../../typechain/IERC20'
import '@openzeppelin/test-helpers'

describe('CurveSusdRoute', () => {
  let route: CurveSusdRoute
  let dai: IERC20
  let usdc: IERC20
  let usdt: IERC20
  let susd: IERC20
  let mkr: IERC20

  let trader1: Signer
  let trader2: Signer
  let trader3: Signer

  const provider = waffle.provider
  const [wallet1, wallet2, wallet3, wallet4, other] = provider.getWallets()

  beforeEach(async () => {
    const Route = await ethers.getContractFactory('CurveSusdRoute')
    route = await Route.deploy() as CurveSusdRoute
    await route.deployed()

    dai = await ethers.getContractAt(ERC20Abi, Assets.DAI.address) as IERC20
    usdc = await ethers.getContractAt(ERC20Abi, Assets.USDC.address) as IERC20
    usdt = await ethers.getContractAt(ERC20Abi, Assets.USDT.address) as IERC20
    susd = await ethers.getContractAt(ERC20Abi, Assets.SUSD.address) as IERC20
    mkr = await ethers.getContractAt(ERC20Abi, Assets.MKR.address) as IERC20

    trader1 = await ethers.provider.getSigner(WhaleAddresses.a16zAddress)
    trader2 = await ethers.provider.getSigner(WhaleAddresses.binance7)
    trader3 = await ethers.provider.getSigner(WhaleAddresses.binance8)

    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [WhaleAddresses.a16zAddress]}
    )
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [WhaleAddresses.binance8]}
    )
  })

  it('Should initial data correctly', async () => {
    expect(await route.susdPool()).to.properAddress
    expect(await route.dai()).to.properAddress
    expect(await route.usdc()).to.properAddress
    expect(await route.usdt()).to.properAddress
    expect(await route.susd()).to.properAddress

    expect(await route.susdPool()).to.equal('0xA5407eAE9Ba41422680e2e00537571bcC53efBfD')
    expect(await route.dai()).to.equal(Assets.DAI.address)
    expect(await route.usdc()).to.equal(Assets.USDC.address)
    expect(await route.usdt()).to.equal(Assets.USDT.address)
    expect(await route.susd()).to.equal(Assets.SUSD.address)
  })

  it('Should get rate properly', async () => {
    const daiToUsdcAmount = await route.getDestinationReturnAmount(Assets.DAI.address, Assets.USDC.address, utils.parseUnits('100', 18))
    const daiToUsdcAmountInBase = utils.formatUnits(daiToUsdcAmount, 6)
    console.log({ daiToUsdcAmountInBase })
    expect(parseFloat(daiToUsdcAmountInBase))
    .to.closeTo(100, 5)

    const usdcToUsdtAmount = await route.getDestinationReturnAmount(Assets.USDC.address, Assets.USDT.address, utils.parseUnits('100', 6))
    const usdcToUsdtAmountInBase = utils.formatUnits(usdcToUsdtAmount, 6)
    console.log({ usdcToUsdtAmountInBase })
    expect(parseFloat(usdcToUsdtAmountInBase))
    .to.closeTo(100, 5)

    const susdToDaiAmount = await route.getDestinationReturnAmount(Assets.SUSD.address, Assets.DAI.address, utils.parseUnits('100', 18))
    const susdToDaiAmountInBase = utils.formatUnits(susdToDaiAmount, 18)
    console.log({ susdToDaiAmountInBase })
    expect(parseFloat(susdToDaiAmountInBase))
    .to.closeTo(100, 5)
  })

  describe('Allowlist traders', async () => {
    beforeEach(async () => {
      await route.addWhitelisted(await trader1.getAddress())
      await route.addWhitelisted(await trader2.getAddress())
      await route.addWhitelisted(await trader3.getAddress())
    })

    it('Should not allow trade 100 DAI -> USDC if balance is not enough', async function () {
      const amountIn = utils.parseEther('100')
  
      await dai.connect(trader1).approve(route.address, ethers.constants.MaxUint256)
      await expect(route.connect(trader1).trade(
        Assets.DAI.address,
        Assets.USDC.address,
        amountIn
      ))
      .to.revertedWith('SafeERC20: low-level call failed')
    })
  
    it('Should emit Trade event properly', async function () {
      const amountIn = utils.parseEther('100')
      let amountOut: BigNumber = await route.getDestinationReturnAmount(Assets.DAI.address, Assets.USDC.address, amountIn)
  
      await dai.connect(trader3).approve(route.address, ethers.constants.MaxUint256)
      await expect(await route.connect(trader3).trade(
        Assets.DAI.address,
        Assets.USDC.address,
        amountIn
      ))
      .to.emit(route, 'Trade')
      .withArgs(Assets.DAI.address, amountIn, Assets.USDC.address, amountOut)
    })
  
    it('Should trade 100 DAI -> USDC correctly', async () => {
      const amountIn = utils.parseEther('100')
      let amountOut: BigNumber = await route.getDestinationReturnAmount(Assets.DAI.address, Assets.USDC.address, amountIn)
      console.log('100 DAI -> ? USDC', utils.formatUnits(amountOut, 6))
  
      await dai.connect(trader3).approve(route.address, ethers.constants.MaxUint256)
      await expect(() =>  route.connect(trader3).trade(
        Assets.DAI.address,
        Assets.USDC.address,
        amountIn
      ))
      .to.changeTokenBalance(usdc, trader3, amountOut.sub(1))
  
      await expect(() =>  route.connect(trader3).trade(
        Assets.DAI.address,
        Assets.USDC.address,
        amountIn
      ))
      .to.changeTokenBalance(dai, trader3, '-100000000000000000000')
    })
  
    it('Should not allow trade unsupported tokens', async () => {
      const amountIn = utils.parseEther('100')
  
      await mkr.connect(trader1).approve(route.address, ethers.constants.MaxUint256)
      await expect(route.connect(trader1).trade(
        Assets.MKR.address,
        Assets.USDC.address,
        amountIn
      ))
      .to.revertedWith('tokens\'re not supported!')
  
      await usdc.connect(trader1).approve(route.address, ethers.constants.MaxUint256)
      await expect(route.connect(trader1).trade(
        Assets.USDC.address,
        Assets.MKR.address,
        utils.parseUnits('100', 6)
      ))
      .to.revertedWith('tokens\'re not supported!')
    })
  
    it('Should not allow trade 1 USDC -> USDC', async () => {
      const amountIn = utils.parseEther('100')
  
      await usdc.connect(trader1).approve(route.address, ethers.constants.MaxUint256)
      await expect(route.connect(trader1).trade(
        Assets.USDC.address,
        Assets.USDC.address,
        amountIn
      ))
      .to.revertedWith('destination token can not be source token')
    })
  
    it('Should not get rate if source and destination token are the same', async () => {
      const amountIn = utils.parseEther('100')
  
      await expect(route.getDestinationReturnAmount(Assets.USDC.address, Assets.USDC.address, amountIn))
      .to.revertedWith('destination token can not be source token')
    })
  
    it('Should not get rate if tokens are not unsupported', async () => {
      await expect(route.getDestinationReturnAmount(Assets.MKR.address, Assets.USDC.address, utils.parseUnits('100', 18)))
      .to.revertedWith('tokens\'re not supported!')
  
      await expect(route.getDestinationReturnAmount(Assets.USDC.address, Assets.MKR.address, utils.parseUnits('100', 6)))
      .to.revertedWith('tokens\'re not supported!')
    })
  })

  it('Should not trade without allowlist', async () => {
    const amountIn = utils.parseEther('100')
  
    await usdc.connect(trader1).approve(route.address, ethers.constants.MaxUint256)
    await expect(route.connect(trader1).trade(
      Assets.USDC.address,
      Assets.USDC.address,
      amountIn
    ))
    .to.revertedWith('WhitelistedRole: caller does not have the Whitelisted role')
  })
})

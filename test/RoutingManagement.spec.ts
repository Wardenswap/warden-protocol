import { ethers, waffle, network } from 'hardhat'
import hre from 'hardhat'
// import { BigNumber, bigNumberify } from 'hardhat'
import { Signer, utils, Contract, BigNumber } from 'ethers'
import { expect } from 'chai'
import ERC20Abi from './helpers/erc20Abi.json'
import WhaleAddresses from './helpers/whaleAddresses.json'
import { main as Assets } from './helpers/assets'
import { UNISWAP_ROUTER_ADDRESS, WETH_ADDRESS } from './constants'

describe('RoutingManagement', function() {
  const provider = waffle.provider
  const [wallet1, wallet2, wallet3, wallet4, other] = provider.getWallets()

  beforeEach(async function() {
    this.manager = await (await ethers.getContractFactory('RoutingManagement')).deploy()
    await this.manager.deployed()

    this.uniswapRoute = await (await ethers.getContractFactory('UniswapV2Route')).deploy(
      UNISWAP_ROUTER_ADDRESS,
      WETH_ADDRESS
    )
    await this.uniswapRoute.deployed()

    this.sushiswapRoute = await (await ethers.getContractFactory('SushiswapRoute')).deploy()
    await this.sushiswapRoute.deployed()

    this.curveRoute = await (await ethers.getContractFactory('CurveSusdRoute')).deploy()
    await this.curveRoute.deployed()

    this.dai = await ethers.getContractAt(ERC20Abi, Assets.DAI.address)
    this.mkr = await ethers.getContractAt(ERC20Abi, Assets.MKR.address)

    this.trader = await ethers.provider.getSigner(WhaleAddresses.a16zAddress)

    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [WhaleAddresses.a16zAddress]}
    )
  })

  it('Should initial data correctly', async function() {
    expect(await this.manager.allRoutesLength()).to.equal(0)
    expect(await this.manager.owner()).to.equal(wallet1.address)
  })

  it('Should add trading routes properly', async function() {
    // Uniswap
    await expect(this.manager.addTradingRoute('Uniswap', this.uniswapRoute.address))
    .to.emit(this.manager, 'AddedTradingRoute')
    .withArgs(wallet1.address, 'Uniswap', this.uniswapRoute.address, 0)

    expect(await this.manager.allRoutesLength()).to.equal(1)

    // Sushiswap
    await expect(this.manager.addTradingRoute('Sushiswap', this.sushiswapRoute.address))
    .to.emit(this.manager, 'AddedTradingRoute')
    .withArgs(wallet1.address, 'Sushiswap', this.sushiswapRoute.address, 1)

    expect(await this.manager.allRoutesLength()).to.equal(2)

    // Curve
    await expect(this.manager.addTradingRoute('Curve', this.curveRoute.address))
    .to.emit(this.manager, 'AddedTradingRoute')
    .withArgs(wallet1.address, 'Curve', this.curveRoute.address, 2)
  })

  it('Should not allow adding route if not owner', async function() {
    await expect(this.manager.connect(wallet2).addTradingRoute('Uniswap', this.uniswapRoute.address))
    .to.revertedWith('caller is not the owner')
  })

  describe('Deploy trading routes', function() {
    beforeEach(async function() {
      // Uniswap
      await this.manager.addTradingRoute('Uniswap', this.uniswapRoute.address)
      this.uniswapIndex = 0

      // Sushiswap
      await this.manager.addTradingRoute('Sushiswap', this.sushiswapRoute.address)
      this.sushiswapIndex = 1

      // Curve
      await this.manager.addTradingRoute('Curve', this.curveRoute.address)
      this.curveIndex = 2
    })

    it('Should deploy properly', async function() {
      expect(await this.manager.allRoutesLength()).to.equal(3)

      expect(await this.manager.isTradingRouteEnabled(this.uniswapIndex)).to.eq(true)
      expect(await this.manager.isTradingRouteEnabled(this.sushiswapIndex)).to.eq(true)
      expect(await this.manager.isTradingRouteEnabled(this.curveIndex)).to.eq(true)

      expect((await this.manager.tradingRoutes(0)).name).to.equal('Uniswap')
      expect((await this.manager.tradingRoutes(0)).enable).to.be.true
      expect((await this.manager.tradingRoutes(0)).route).to.equal(this.uniswapRoute.address)

      expect((await this.manager.tradingRoutes(1)).name).to.equal('Sushiswap')
      expect((await this.manager.tradingRoutes(1)).enable).to.be.true
      expect((await this.manager.tradingRoutes(1)).route).to.equal(this.sushiswapRoute.address)

      expect((await this.manager.tradingRoutes(2)).name).to.equal('Curve')
      expect((await this.manager.tradingRoutes(2)).enable).to.be.true
      expect((await this.manager.tradingRoutes(2)).route).to.equal(this.curveRoute.address)
    })

    it('Should disable / re-enable trading route correctly', async function() {
      await expect(this.manager.disableTradingRoute(this.uniswapIndex))
      .to.emit(this.manager, 'DisabledTradingRoute')
      .withArgs(wallet1.address, 'Uniswap', this.uniswapRoute.address, this.uniswapIndex)

      expect(await this.manager.isTradingRouteEnabled(this.uniswapIndex)).to.eq(false)
      await expect(this.manager.enableTradingRoute(this.uniswapIndex))
      .to.emit(this.manager, 'EnabledTradingRoute')
      .withArgs(wallet1.address, 'Uniswap', this.uniswapRoute.address, this.uniswapIndex)

      expect(await this.manager.isTradingRouteEnabled(this.uniswapIndex)).to.eq(true)
    })

    it('Should not allow to enable if already enabled', async function() {
      await expect(this.manager.enableTradingRoute(this.uniswapIndex))
      .to.revertedWith('This trading route is enabled')
    })

    it('Should not allow to disable if already disabled', async function() {
      await this.manager.disableTradingRoute(this.uniswapIndex)

      await expect(this.manager.disableTradingRoute(this.uniswapIndex))
      .to.revertedWith('This trading route is disabled')
    })

    it('Should not allow to enable trading route if not owner', async function() {
      await this.manager.disableTradingRoute(this.uniswapIndex)

      await expect(this.manager.connect(wallet2).enableTradingRoute(this.uniswapIndex))
      .to.revertedWith('caller is not the owner')
    })

    it('Should not allow to disable trading route if not owner', async function() {
      await expect(this.manager.connect(wallet2).disableTradingRoute(this.uniswapIndex))
      .to.revertedWith('caller is not the owner')
    })
  })
})

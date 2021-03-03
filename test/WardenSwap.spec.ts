import { ethers, waffle, network, config } from 'hardhat'
import { expect } from 'chai'
import { Signer, utils, Contract, BigNumber } from 'ethers'
import ERC20Abi from './helpers/erc20Abi.json'
import WhaleAddresses from './helpers/whaleAddresses.json'
import { main as Assets } from './helpers/assets'
import { WardenSwap } from '../typechain/WardenSwap'
import { IWardenTradingRoute } from '../typechain/IWardenTradingRoute'
import '@openzeppelin/test-helpers'

describe('WardenSwap', () => {
  let warden: WardenSwap
  let uniswapRoute: IWardenTradingRoute
  let sushiswapRoute: IWardenTradingRoute
  let curveRoute: IWardenTradingRoute
  let dai: Contract
  let usdc: Contract
  let usdt: Contract
  let susd: Contract
  let mkr: Contract

  let trader1: Signer
  let trader2: Signer
  let trader3: Signer

  let partnerIndex = 0

  const defaultFee = BigNumber.from(10) // 0.1%
  const provider = waffle.provider
  const [wallet1, wallet2, wallet3, reserve, other] = provider.getWallets()

  beforeEach(async () => {
    warden = await (await ethers.getContractFactory('WardenSwap')).deploy() as WardenSwap
    await warden.deployed()
    const partner0 = await warden.partners(0)
    await warden.updatePartner(0, reserve.address, partner0.fee, partner0.name)

    uniswapRoute = await (await ethers.getContractFactory('UniswapV2TradingRoute')).deploy() as IWardenTradingRoute
    await uniswapRoute.deployed()

    sushiswapRoute = await (await ethers.getContractFactory('SushiswapV2TradingRoute')).deploy() as IWardenTradingRoute
    await sushiswapRoute.deployed()

    curveRoute = await (await ethers.getContractFactory('CurveSusdTradingRoute')).deploy() as IWardenTradingRoute
    await curveRoute.deployed()

    dai = await ethers.getContractAt(ERC20Abi, Assets.DAI.address)
    usdc = await ethers.getContractAt(ERC20Abi, Assets.USDC.address)
    usdt = await ethers.getContractAt(ERC20Abi, Assets.USDT.address)
    susd = await ethers.getContractAt(ERC20Abi, Assets.SUSD.address)
    mkr = await ethers.getContractAt(ERC20Abi, Assets.MKR.address)

    trader1 = await ethers.provider.getSigner(WhaleAddresses.a16zAddress)
    trader2 = await ethers.provider.getSigner(WhaleAddresses.binance7)
    trader3 = await ethers.provider.getSigner(WhaleAddresses.binance8)

    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [WhaleAddresses.a16zAddress]}
    )
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [WhaleAddresses.binance7]}
    )
    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [WhaleAddresses.binance8]}
    )
  })

  it('Should initial data correctly', async () => {
    expect(await warden.etherERC20()).to.properAddress
    expect(await warden.owner()).to.properAddress

    expect(await warden.etherERC20()).to.equal(Assets.ETH.address)
    expect(await warden.owner()).to.equal(wallet1.address)

    // Platform Fee
    const partner = await warden.partners(0)
    const expectedName = ethers.utils.formatBytes32String('WARDEN').slice(0, 34)
    expect(partner.wallet).to.equal(reserve.address)
    expect(partner.fee).to.equal(defaultFee)
    expect(partner.name).to.equal(expectedName)
  })

  describe('Deploy trading routes', async () => {
    let uniswapIndex: number
    let sushiswapIndex: number
    let curveIndex: number

    beforeEach(async () => {
      // Uniswap
      await warden.addTradingRoute('Uniswap', uniswapRoute.address)
      uniswapIndex = 0
  
      // Sushiswap
      await warden.addTradingRoute('Sushiswap', sushiswapRoute.address)
      sushiswapIndex = 1
  
      // Curve
      await warden.addTradingRoute('Curve', curveRoute.address)
      curveIndex = 2
    })

    describe('fee = 0.1%', async() => {
      beforeEach(async () => {
        const partner0 = await warden.partners(0)
        await warden.updatePartner(0, reserve.address, 10, partner0.name)
      })

      it('Should calculate fee correctly for single route', async() => {
        const amountIn = utils.parseUnits('3500', 18)
        const src = Assets.DAI.address
        const dest = Assets.ETH.address

        const uniswapAmountOut = await uniswapRoute.getDestinationReturnAmount(src, dest, amountIn)
        const amountOut = await warden.getDestinationReturnAmount(uniswapIndex, src, dest, amountIn, partnerIndex)
        const expectedFee = uniswapAmountOut.sub(amountOut)
        console.log('uniswapAmountOut', utils.formatUnits(uniswapAmountOut, 18))
        console.log('amountOut', utils.formatUnits(amountOut, 18))
        console.log('expectedFee', utils.formatUnits(expectedFee, 18))
        
        expect(expectedFee.toString())
        .to.be.bignumber.equal(uniswapAmountOut.mul('10').div('10000').toString())
      })

      it('Should calculate fee correctly for split trades', async() => {
        const amountIns = [utils.parseEther('2'), utils.parseEther('3')]
        const src = Assets.ETH.address
        const dest = Assets.DAI.address
  
        const amountOut = await warden.getDestinationReturnAmountForSplitTrades(
          [uniswapIndex, sushiswapIndex],
          src,
          amountIns,
          dest,
          partnerIndex
        )
        const amountOutForRoute1 = await uniswapRoute.getDestinationReturnAmount(src, dest, amountIns[0])
        const amountOutForRoute2 = await sushiswapRoute.getDestinationReturnAmount(src, dest, amountIns[1])
        const expectedFee = amountOutForRoute1.add(amountOutForRoute2).sub(amountOut)
        console.log('amountOutForRoute1', utils.formatUnits(amountOutForRoute1, 18))
        console.log('amountOutForRoute2', utils.formatUnits(amountOutForRoute2, 18))
        console.log('amountOut', utils.formatUnits(amountOut, 18))
        console.log('expectedFee', utils.formatUnits(expectedFee, 18))
        
        expect(expectedFee.toString())
        .to.be.bignumber.equal(amountOutForRoute1.add(amountOutForRoute2).mul('10').div('10000').toString())
      })

      it('Should use index 0 fee when partner index not found', async() => {
        const amountIn = utils.parseUnits('3500', 18)
        const src = Assets.DAI.address
        const dest = Assets.ETH.address

        const uniswapAmountOut = await uniswapRoute.getDestinationReturnAmount(src, dest, amountIn)
        const amountOut = await warden.getDestinationReturnAmount(uniswapIndex, src, dest, amountIn, 1001)
        const expectedFee = uniswapAmountOut.sub(amountOut)
        console.log('uniswapAmountOut', utils.formatUnits(uniswapAmountOut, 18))
        console.log('amountOut', utils.formatUnits(amountOut, 18))
        console.log('expectedFee', utils.formatUnits(expectedFee, 18))
        
        expect(expectedFee.toString())
        .to.be.bignumber.equal(uniswapAmountOut.mul('10').div('10000').toString())
      })
    })

    describe('fee = 0.03%', async() => {
      beforeEach(async () => {
        const partner0 = await warden.partners(0)
        await warden.updatePartner(0, reserve.address, 3, partner0.name)
      })

      it('Should calculate fee correctly for single route', async() => {
        const amountIn = utils.parseUnits('3500', 18)
        const src = Assets.DAI.address
        const dest = Assets.ETH.address

        const uniswapAmountOut = await uniswapRoute.getDestinationReturnAmount(src, dest, amountIn)
        const amountOut = await warden.getDestinationReturnAmount(uniswapIndex, src, dest, amountIn, partnerIndex)
        const expectedFee = uniswapAmountOut.sub(amountOut)
        console.log('uniswapAmountOut', utils.formatUnits(uniswapAmountOut, 18))
        console.log('amountOut', utils.formatUnits(amountOut, 18))
        console.log('expectedFee', utils.formatUnits(expectedFee, 18))
        
        expect(expectedFee.toString())
        .to.be.bignumber.equal(uniswapAmountOut.mul('3').div('10000').toString())
      })
    })

    describe('fee = 0.7%', async() => {
      beforeEach(async () => {
        const partner0 = await warden.partners(0)
        await warden.updatePartner(0, reserve.address, 70, partner0.name)
      })

      it('Should calculate fee correctly for single route', async() => {
        const amountIn = utils.parseUnits('3500', 18)
        const src = Assets.DAI.address
        const dest = Assets.ETH.address

        const uniswapAmountOut = await uniswapRoute.getDestinationReturnAmount(src, dest, amountIn)
        const amountOut = await warden.getDestinationReturnAmount(uniswapIndex, src, dest, amountIn, partnerIndex)
        const expectedFee = uniswapAmountOut.sub(amountOut)
        console.log('uniswapAmountOut', utils.formatUnits(uniswapAmountOut, 18))
        console.log('amountOut', utils.formatUnits(amountOut, 18))
        console.log('expectedFee', utils.formatUnits(expectedFee, 18))
        
        expect(expectedFee.toString())
        .to.be.bignumber.equal(uniswapAmountOut.mul('70').div('10000').toString())
      })
    })

    describe('fee = 0%', async() => {
      beforeEach(async () => {
        const partner0 = await warden.partners(0)
        await warden.updatePartner(0, reserve.address, 0, partner0.name)
      })

      it('Should calculate fee correctly for single route', async() => {
        const amountIn = utils.parseUnits('3500', 18)
        const src = Assets.DAI.address
        const dest = Assets.ETH.address

        const uniswapAmountOut = await uniswapRoute.getDestinationReturnAmount(src, dest, amountIn)
        const amountOut = await warden.getDestinationReturnAmount(uniswapIndex, src, dest, amountIn, partnerIndex)
        const expectedFee = uniswapAmountOut.sub(amountOut)
        console.log('uniswapAmountOut', utils.formatUnits(uniswapAmountOut, 18))
        console.log('amountOut', utils.formatUnits(amountOut, 18))
        console.log('expectedFee', utils.formatUnits(expectedFee, 18))
        
        expect(expectedFee.toString())
        .to.be.bignumber.equal('0')
      })
    })

    it('Should collect fee correctly when partner index not found', async() => {
      const partner0 = await warden.partners(0)
      await warden.updatePartner(0, reserve.address, 10, partner0.name)

      const amountIn = utils.parseUnits('1', 18)
      const src = Assets.ETH.address
      const dest = Assets.DAI.address
      const randomPartnerIndex = 2501

      const uniswapAmountOut = await uniswapRoute.getDestinationReturnAmount(src, dest, amountIn)
      const amountOut = await warden.getDestinationReturnAmount(uniswapIndex, src, dest, amountIn, randomPartnerIndex)
      const expectedFee = uniswapAmountOut.sub(amountOut)
      console.log('uniswapAmountOut', utils.formatUnits(uniswapAmountOut, 18))
      console.log('amountOut', utils.formatUnits(amountOut, 18))
      console.log('expectedFee', utils.formatUnits(expectedFee, 18))
      
      expect(expectedFee.toString())
      .to.be.bignumber.equal(uniswapAmountOut.mul('10').div('10000').toString())

      await expect(await warden.trade(
        uniswapIndex,
        src,
        amountIn,
        dest,
        '1',
        randomPartnerIndex,
        {
          value: amountIn
        }
      ))
      .to.emit(warden, 'CollectFee')
      .withArgs(randomPartnerIndex, dest, reserve.address, expectedFee)
      .to.emit(dai, 'Transfer')
      .withArgs(warden.address, reserve.address, expectedFee)
    })

    it('Should collect fee = 0 when no fee', async() => {
      const partner0 = await warden.partners(0)
      await warden.updatePartner(0, reserve.address, 0, partner0.name)

      const amountIn = utils.parseUnits('1', 18)
      const src = Assets.ETH.address
      const dest = Assets.DAI.address

      const uniswapAmountOut = await uniswapRoute.getDestinationReturnAmount(src, dest, amountIn)
      const amountOut = await warden.getDestinationReturnAmount(uniswapIndex, src, dest, amountIn, partnerIndex)
      const expectedFee = uniswapAmountOut.sub(amountOut)
      console.log('uniswapAmountOut', utils.formatUnits(uniswapAmountOut, 18))
      console.log('amountOut', utils.formatUnits(amountOut, 18))
      console.log('expectedFee', utils.formatUnits(expectedFee, 18))
      
      expect(amountOut).to.be.equal(uniswapAmountOut)

      await expect(await warden.trade(
        uniswapIndex,
        src,
        amountIn,
        dest,
        '1',
        partnerIndex,
        {
          value: amountIn
        }
      ))
      .to.not.emit(warden, 'CollectFee')
    })
  })
})

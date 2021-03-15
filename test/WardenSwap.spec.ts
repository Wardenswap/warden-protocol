import { ethers, waffle, network, config } from 'hardhat'
import { expect } from 'chai'
import { Signer, utils, Contract, BigNumber } from 'ethers'
import ERC20Abi from './helpers/erc20Abi.json'
import WhaleAddresses from './helpers/whaleAddresses.json'
import { main as Assets } from './helpers/assets'
import { WardenSwap } from '../typechain/WardenSwap'
import { IWardenTradingRoute } from '../typechain/IWardenTradingRoute'
import { IERC20 } from '../typechain/IERC20'
import '@openzeppelin/test-helpers'
import { UNISWAP_ROUTER_ADDRESS, WETH_ADDRESS } from './constants'

describe('WardenSwap', () => {
  let warden: WardenSwap
  let uniswapRoute: IWardenTradingRoute
  let sushiswapRoute: IWardenTradingRoute
  let curveRoute: IWardenTradingRoute
  let dai: IERC20
  let usdc: IERC20
  let usdt: IERC20
  let susd: IERC20
  let mkr: IERC20

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

    uniswapRoute = await (await ethers.getContractFactory('UniswapV2Route')).deploy(
      UNISWAP_ROUTER_ADDRESS,
      WETH_ADDRESS
    ) as IWardenTradingRoute
    await uniswapRoute.deployed()

    sushiswapRoute = await (await ethers.getContractFactory('SushiswapRoute')).deploy() as IWardenTradingRoute
    await sushiswapRoute.deployed()

    curveRoute = await (await ethers.getContractFactory('CurveSusdRoute')).deploy() as IWardenTradingRoute
    await curveRoute.deployed()

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

      await uniswapRoute.addWhitelisted(warden.address)
      await sushiswapRoute.addWhitelisted(warden.address)
      await curveRoute.addWhitelisted(warden.address)
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
      .withArgs(0, dest, reserve.address, expectedFee) // expect to use partner index 0
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

    describe('Should collect remaining Token / Ether', async () => {
      it('Should collect remaining ether properly', async () => {
        const etherAmount = utils.parseEther('3')
  
        // Send ether to contract
        await wallet1.sendTransaction({
          to: warden.address,
          value: etherAmount
        })
        expect(await provider.getBalance(warden.address)).to.eq(etherAmount)
  
        // Collect
        await expect(() =>  warden.collectRemainingEther(etherAmount))
        .to.changeEtherBalance(wallet1, etherAmount)

        expect(await provider.getBalance(warden.address)).to.eq('0')
      })
  
      it('Should collect remaining token properly', async () => {
        const tokenAmount = utils.parseUnits('1500', 18)
  
        await dai.connect(trader2).transfer(warden.address, tokenAmount)
        expect(await dai.balanceOf(warden.address)).to.eq(tokenAmount)
  
        // Collect
        await expect(() =>  warden.collectRemainingToken(dai.address, tokenAmount))
        .to.changeTokenBalance(dai, wallet1, tokenAmount)

        expect(await dai.balanceOf(warden.address)).to.eq('0')
      })

      it('Should not allow collect remaining ether if not owner', async function() {
        const etherAmount = utils.parseEther('3')
        await expect(warden.connect(wallet2).collectRemainingEther(etherAmount))
        .to.revertedWith('caller is not the owner')
      })

      it('Should not allow collect remaining token if not owner', async function() {
        const tokenAmount = utils.parseUnits('1500', 18)
        await expect(warden.connect(wallet2).collectRemainingToken(dai.address, tokenAmount))
        .to.revertedWith('caller is not the owner')
      })
    })

    describe('Should trade fail when amountOut < minDestAmount', async () => {
      it('When single route', async () => {
        const amountIn = utils.parseEther('1')
        const src = Assets.ETH.address
        const dest = Assets.DAI.address

        await expect(warden.trade(
          uniswapIndex,
          src,
          amountIn,
          dest,
          utils.parseUnits('10000', 18),
          partnerIndex,
          {
            value: amountIn
          }
        ))
        .to.revertedWith('destination amount is too low')
      })

      it('When split trades', async () => {
        const amountIns = [utils.parseEther('1'), utils.parseEther('1')]
        const src = Assets.ETH.address
        const dest = Assets.DAI.address

        await expect(warden.splitTrades(
          [uniswapIndex, sushiswapIndex],
          src,
          utils.parseEther('2'),
          amountIns,
          dest,
          utils.parseUnits('10000', 18),
          partnerIndex,
          {
            value: utils.parseEther('2')
          }
        ))
        .to.revertedWith('destination amount is too low')
      })
    })

    describe('Should fail when no routes provide for split trades', async () => {
      const amountIns = [utils.parseEther('1'), utils.parseEther('1')]
      const src = Assets.ETH.address
      const dest = Assets.DAI.address

      it('When get rate', async () => {
        await expect(warden.getDestinationReturnAmountForSplitTrades(
          [],
          src,
          amountIns,
          dest,
          partnerIndex
        ))
        .to.revertedWith('routes can not be empty')
      })

      it('When trading', async () => {
        await expect(warden.splitTrades(
          [],
          src,
          utils.parseEther('2'),
          amountIns,
          dest,
          '1',
          partnerIndex,
          {
            value: utils.parseEther('2')
          }
        ))
        .to.revertedWith('routes can not be empty')
      })
    })

    describe('Should fail when no routes.length != srcAmounts.length', async () => {
      const amountIns = [utils.parseEther('1'), utils.parseEther('1')]
      const src = Assets.ETH.address
      const dest = Assets.DAI.address

      it('When get rate', async () => {
        await expect(warden.getDestinationReturnAmountForSplitTrades(
          [uniswapIndex],
          src,
          amountIns,
          dest,
          partnerIndex
        ))
        .to.revertedWith('routes and srcAmounts lengths mismatch')
      })

      it('When trading', async () => {
        await expect(warden.splitTrades(
          [uniswapIndex],
          src,
          utils.parseEther('2'),
          amountIns,
          dest,
          '1',
          partnerIndex,
          {
            value: utils.parseEther('2')
          }
        ))
        .to.revertedWith('routes and srcAmounts lengths mismatch')
      })
    })
  })
})

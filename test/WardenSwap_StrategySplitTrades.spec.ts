import { ethers, waffle, network, config } from 'hardhat'
import { expect } from 'chai'
import { Signer, utils, Contract, BigNumber } from 'ethers'
import ERC20Abi from './helpers/erc20Abi.json'
import WhaleAddresses from './helpers/whaleAddresses.json'
import { main as Assets } from './helpers/assets'
import { WardenSwap } from '../typechain/WardenSwap'
import { IWardenTradingRoute } from '../typechain/IWardenTradingRoute'
import { UNISWAP_ROUTER_ADDRESS, WETH_ADDRESS } from './constants'

describe('WardenSwap: Split trades strategy', () => {
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

  // before(async () => {
  //   await network.provider.request({
  //     method: "hardhat_reset",
  //     params: [{
  //       forking: {
  //         jsonRpcUrl: config.networks.hardhat.forking!.url,
  //         blockNumber: config.networks.hardhat.forking!.blockNumber
  //       }
  //     }]
  //   })
  // })

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

    describe('Should get rates properly', async () => {
      it('Should get rate (2+3) ETH -> DAI properly', async () => {
        const amountIns = [utils.parseEther('2'), utils.parseEther('3')]
        const src = Assets.ETH.address
        const dest = Assets.DAI.address
        const expectedAmountOut1 = '2708.790413059729615645'
        const expectedAmountOut2 = '4041.679567422106905198'
        const expectedAmountOut = '6750.469980481836520842'
  
        const amountOut = await warden.getDestinationReturnAmountForSplitTrades(
          [uniswapIndex, sushiswapIndex],
          src,
          amountIns,
          dest,
          partnerIndex
        )
        const amountOutForRoute1 = await warden.getDestinationReturnAmount(uniswapIndex, src, dest, amountIns[0], 0)
        const amountOutForRoute2 = await warden.getDestinationReturnAmount(sushiswapIndex, src, dest, amountIns[1], 0)
  
        expect(utils.formatUnits(amountOut, 18)).to.equal(expectedAmountOut)
        expect(utils.formatUnits(amountOutForRoute1, 18)).to.equal(expectedAmountOut1)
        expect(utils.formatUnits(amountOutForRoute2, 18)).to.equal(expectedAmountOut2)
      })

      it('Should get rate (1500, 3500) DAI -> ETH properly', async () => {
        const amountIns = [utils.parseUnits('1500', 18), utils.parseUnits('3500', 18)]
        const src = Assets.DAI.address
        const dest = Assets.ETH.address
        const expectedAmountOut1 = '1.09859855122396091'
        const expectedAmountOut2 = '2.57704756638548698'
        const expectedAmountOut = '3.67564611760944789'
  
        const amountOut = await warden.getDestinationReturnAmountForSplitTrades(
          [uniswapIndex, sushiswapIndex],
          src,
          amountIns,
          dest,
          partnerIndex
        )
        const amountOutForRoute1 = await warden.getDestinationReturnAmount(uniswapIndex, src, dest, amountIns[0], 0)
        const amountOutForRoute2 = await warden.getDestinationReturnAmount(sushiswapIndex, src, dest, amountIns[1], 0)
  
        expect(utils.formatUnits(amountOut, 18)).to.equal(expectedAmountOut)
        expect(utils.formatUnits(amountOutForRoute1, 18)).to.equal(expectedAmountOut1)
        expect(utils.formatUnits(amountOutForRoute2, 18)).to.equal(expectedAmountOut2)
      })

      it('Should get rate (2000, 4000) DAI -> USDC properly', async () => {
        const amountIns = [utils.parseUnits('2000', 18), utils.parseUnits('4000', 18)]
        const src = Assets.DAI.address
        const dest = Assets.USDC.address
        const expectedAmountOut1 = '1989.931091'
        const expectedAmountOut2 = '3314.195143'
        const expectedAmountOut = '5304.126234'
  
        const amountOut = await warden.getDestinationReturnAmountForSplitTrades(
          [uniswapIndex, sushiswapIndex],
          src,
          amountIns,
          dest,
          partnerIndex
        )
        const amountOutForRoute1 = await warden.getDestinationReturnAmount(uniswapIndex, src, dest, amountIns[0], 0)
        const amountOutForRoute2 = await warden.getDestinationReturnAmount(sushiswapIndex, src, dest, amountIns[1], 0)
  
        expect(utils.formatUnits(amountOut, 6)).to.equal(expectedAmountOut)
        expect(utils.formatUnits(amountOutForRoute1, 6)).to.equal(expectedAmountOut1)
        expect(utils.formatUnits(amountOutForRoute2, 6)).to.equal(expectedAmountOut2)
      })
    })

    describe('Should trade split trades (3+5) ETH -> DAI properly', async () => {
      const amountIns = [utils.parseEther('3'), utils.parseEther('5')]
      const totalAmountIn = utils.parseEther('8')
      const src = Assets.ETH.address
      const dest = Assets.DAI.address
      const expectedAmountOut = '10799087555118673630764'
      const minDestAmount = utils.parseUnits('10790', 18)

      afterEach(async () => {
        expect(await provider.getBalance(warden.address)).to.equal(0)
        expect(await dai.balanceOf(warden.address)).to.equal(0)
      })

      it('Should receive amount out properly', async () => {
        await expect(() => warden.splitTrades(
          [uniswapIndex, sushiswapIndex],
          src,
          totalAmountIn,
          amountIns,
          dest,
          minDestAmount,
          partnerIndex,
          {
            value: totalAmountIn
          }
        ))
        .to.changeTokenBalance(dai, wallet1, expectedAmountOut)
      })

      it('Should spend properly', async () => {
        await expect(() => warden.splitTrades(
          [uniswapIndex, sushiswapIndex],
          src,
          totalAmountIn,
          amountIns,
          dest,
          minDestAmount,
          partnerIndex,
          {
            value: totalAmountIn
          }
        ))
        .to.changeEtherBalance(wallet1, BigNumber.from(0).sub(totalAmountIn))
      })

      it('Should emit events properly', async () => {
        const uniswapAmountOut = await uniswapRoute.getDestinationReturnAmount(src, dest, amountIns[0])
        const sushiswapAmountOut = await sushiswapRoute.getDestinationReturnAmount(src, dest, amountIns[1])
        const expectedAmountOut = await warden.getDestinationReturnAmountForSplitTrades(
          [uniswapIndex, sushiswapIndex],
          src,
          amountIns,
          dest,
          partnerIndex
        )

        const expectedFee = uniswapAmountOut.add(sushiswapAmountOut).sub(expectedAmountOut)
        console.log('uniswapAmountOut', utils.formatUnits(uniswapAmountOut, 18))
        console.log('sushiswapAmountOut', utils.formatUnits(sushiswapAmountOut, 18))
        console.log('expectedAmountOut', utils.formatUnits(expectedAmountOut, 18))
        console.log('expectedFee', utils.formatUnits(expectedFee, 18))

        await expect(await warden.splitTrades(
          [uniswapIndex, sushiswapIndex],
          src,
          totalAmountIn,
          amountIns,
          dest,
          minDestAmount,
          partnerIndex,
          {
            value: totalAmountIn
          }
        ))
        .to.emit(warden, 'Trade')
        .withArgs(src, totalAmountIn, dest, expectedAmountOut, wallet1.address)
        .to.emit(uniswapRoute, 'Trade')
        .withArgs(src, amountIns[0], dest, uniswapAmountOut)
        .to.emit(sushiswapRoute, 'Trade')
        .withArgs(src, amountIns[1], dest, sushiswapAmountOut)
        .to.emit(warden, 'CollectFee')
        .withArgs(partnerIndex, dest, reserve.address, expectedFee)
        .to.emit(dai, 'Transfer')
        .withArgs(warden.address, reserve.address, expectedFee)
        .to.emit(dai, 'Transfer')
        .withArgs(warden.address, wallet1.address, expectedAmountOut)
      })
    })

    describe('Should trade split trades (1200, 3200) DAI -> ETH properly', async () => {
      const amountIns = [utils.parseUnits('1200', 18), utils.parseUnits('3200', 18)]
      const totalAmountIn = utils.parseEther('4400')
      const src = Assets.DAI.address
      const dest = Assets.ETH.address
      const expectedAmountOut = BigNumber.from('3236143668644293065')
      const expectedFee = BigNumber.from('3239383051695989')
      const minDestAmount = utils.parseUnits('3.20', 18)

      beforeEach(async () => {
        await dai.connect(trader2).approve(warden.address, ethers.constants.MaxUint256)
      })

      afterEach(async () => {
        expect(await dai.balanceOf(warden.address)).to.equal(0)
        expect(await provider.getBalance(warden.address)).to.equal(0)
      })

      it('Should receive amount out properly', async () => {
        await expect(() => warden.connect(trader2).splitTrades(
          [uniswapIndex, sushiswapIndex],
          src,
          totalAmountIn,
          amountIns,
          dest,
          minDestAmount,
          partnerIndex
        ))
        .to.changeEtherBalances([trader2, reserve], [expectedAmountOut, expectedFee])
      })

      it('Should spend properly', async () => {
        await expect(() => warden.connect(trader2).splitTrades(
          [uniswapIndex, sushiswapIndex],
          src,
          totalAmountIn,
          amountIns,
          dest,
          minDestAmount,
          partnerIndex
        ))
        .to.changeTokenBalance(dai, trader2, BigNumber.from(0).sub(totalAmountIn))
      })

      it('Should emit events properly', async () => {
        const uniswapAmountOut = await uniswapRoute.getDestinationReturnAmount(src, dest, amountIns[0])
        const sushiswapAmountOut = await sushiswapRoute.getDestinationReturnAmount(src, dest, amountIns[1])
        const expectedAmountOut = await warden.getDestinationReturnAmountForSplitTrades(
          [uniswapIndex, sushiswapIndex],
          src,
          amountIns,
          dest,
          partnerIndex
        )

        const expectedFee = uniswapAmountOut.add(sushiswapAmountOut).sub(expectedAmountOut)
        console.log('uniswapAmountOut', utils.formatUnits(uniswapAmountOut, 18))
        console.log('sushiswapAmountOut', utils.formatUnits(sushiswapAmountOut, 18))
        console.log('expectedAmountOut', utils.formatUnits(expectedAmountOut, 18))
        console.log('expectedFee', utils.formatUnits(expectedFee, 18))

        await expect(await warden.connect(trader2).splitTrades(
          [uniswapIndex, sushiswapIndex],
          src,
          totalAmountIn,
          amountIns,
          dest,
          minDestAmount,
          partnerIndex
        ))
        .to.emit(warden, 'Trade')
        .withArgs(src, totalAmountIn, dest, expectedAmountOut, await trader2.getAddress())
        .to.emit(uniswapRoute, 'Trade')
        .withArgs(src, amountIns[0], dest, uniswapAmountOut)
        .to.emit(sushiswapRoute, 'Trade')
        .withArgs(src, amountIns[1], dest, sushiswapAmountOut)
        .to.emit(warden, 'CollectFee')
        .withArgs(partnerIndex, dest, reserve.address, expectedFee)
      })
    })

    describe('Should trade split trades (2500, 3500) DAI -> USDC properly', async () => {
      const amountIns = [utils.parseUnits('2500', 18), utils.parseUnits('3500', 18)]
      const totalAmountIn = utils.parseUnits('6000', 18)
      const src = Assets.DAI.address
      const dest = Assets.USDC.address
      const expectedAmountOut = '5451550292'
      const minDestAmount = utils.parseUnits('1000', 6)

      beforeEach(async () => {
        await dai.connect(trader2).approve(warden.address, ethers.constants.MaxUint256)
      })

      afterEach(async () => {
        expect(await dai.balanceOf(warden.address)).to.equal(0)
        expect(await usdc.balanceOf(warden.address)).to.equal(0)
      })

      it('Should receive amount out properly', async () => {
        await expect(() => warden.connect(trader2).splitTrades(
          [uniswapIndex, sushiswapIndex],
          src,
          totalAmountIn,
          amountIns,
          dest,
          minDestAmount,
          partnerIndex
        ))
        .to.changeTokenBalance(usdc, trader2, expectedAmountOut)
      })

      it('Should spend properly', async () => {
        await expect(() => warden.connect(trader2).splitTrades(
          [uniswapIndex, sushiswapIndex],
          src,
          totalAmountIn,
          amountIns,
          dest,
          minDestAmount,
          partnerIndex
        ))
        .to.changeTokenBalance(dai, trader2, BigNumber.from(0).sub(totalAmountIn))
      })

      it('Should emit events properly', async () => {
        const uniswapAmountOut = await uniswapRoute.getDestinationReturnAmount(src, dest, amountIns[0])
        const sushiswapAmountOut = await sushiswapRoute.getDestinationReturnAmount(src, dest, amountIns[1])
        const expectedAmountOut = await warden.getDestinationReturnAmountForSplitTrades(
          [uniswapIndex, sushiswapIndex],
          src,
          amountIns,
          dest,
          partnerIndex
        )

        const expectedFee = uniswapAmountOut.add(sushiswapAmountOut).sub(expectedAmountOut)
        console.log('uniswapAmountOut', utils.formatUnits(uniswapAmountOut, 18))
        console.log('sushiswapAmountOut', utils.formatUnits(sushiswapAmountOut, 18))
        console.log('expectedAmountOut', utils.formatUnits(expectedAmountOut, 18))
        console.log('expectedFee', utils.formatUnits(expectedFee, 18))

        await expect(await warden.connect(trader2).splitTrades(
          [uniswapIndex, sushiswapIndex],
          src,
          totalAmountIn,
          amountIns,
          dest,
          minDestAmount,
          partnerIndex
        ))
        .to.emit(warden, 'Trade')
        .withArgs(src, totalAmountIn, dest, expectedAmountOut, await trader2.getAddress())
        .to.emit(uniswapRoute, 'Trade')
        .withArgs(src, amountIns[0], dest, uniswapAmountOut)
        .to.emit(sushiswapRoute, 'Trade')
        .withArgs(src, amountIns[1], dest, sushiswapAmountOut)
        .to.emit(warden, 'CollectFee')
        .withArgs(partnerIndex, dest, reserve.address, expectedFee)
        .to.emit(usdc, 'Transfer')
        .withArgs(warden.address, reserve.address, expectedFee)
        .to.emit(usdc, 'Transfer')
        .withArgs(warden.address, await trader2.getAddress(), expectedAmountOut)
      })
    })
  })
})

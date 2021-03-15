import { ethers, waffle, network, config } from 'hardhat'
import { expect } from 'chai'
import { Signer, utils, Contract, BigNumber } from 'ethers'
import ERC20Abi from './helpers/erc20Abi.json'
import WhaleAddresses from './helpers/whaleAddresses.json'
import { main as Assets } from './helpers/assets'
import { WardenSwap } from '../typechain/WardenSwap'
import { IWardenTradingRoute } from '../typechain/IWardenTradingRoute'
import { IERC20 } from '../typechain/IERC20'
import { MockToken } from '../typechain/MockToken'
import '@openzeppelin/test-helpers'
import { UNISWAP_ROUTER_ADDRESS, WETH_ADDRESS } from './constants'

describe('WardenSwap Priviledge', () => {
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

  })

  describe('Deploy trading routes', async () => {
    let uniswapIndex: number

    const amountIn = utils.parseEther('1')
    const src = Assets.ETH.address
    const dest = Assets.DAI.address

    beforeEach(async () => {
      // Uniswap
      await warden.addTradingRoute('Uniswap', uniswapRoute.address)
      uniswapIndex = 0

      await uniswapRoute.addWhitelisted(warden.address)
    })

    it('Should emit event when update Warden token properly', async () => {
      const wardenToken = await (await ethers.getContractFactory('MockToken')).deploy() as MockToken
      await wardenToken.deployed()

      await expect(await warden.updateWardenToken(wardenToken.address))
      .to.emit(warden, 'UpdateWardenToken')
      .withArgs(wardenToken.address)
    })

    it('Should not allow to update warnden token if not owner', async () => {
      const wardenToken = await (await ethers.getContractFactory('MockToken')).deploy() as MockToken
      await wardenToken.deployed()

      await expect(warden.connect(wallet2).updateWardenToken(wardenToken.address))
      .to.revertedWith('Ownable: caller is not the owner')
    })

    describe('Deploy warden token', async () => {
      let wardenToken: MockToken

      beforeEach(async () => {
        wardenToken = await (await ethers.getContractFactory('MockToken')).deploy() as MockToken
        await wardenToken.deployed()
        await warden.updateWardenToken(wardenToken.address);
      })

      it('Check basic info', async() => {
        expect(await wardenToken.name()).to.be.equal('MockToken')
        expect(await wardenToken.symbol()).to.be.equal('MOCK')
        expect(await wardenToken.decimals()).to.be.equal(18)
        expect(await warden.wardenToken()).to.be.equal(wardenToken.address)
        expect(await warden.eligibleAmount()).to.be.equal(utils.parseUnits('10', 18))
      })
  
      it('Should trade without fee if have WAD = 10', async() => {
        await wardenToken.mint(wallet1.address, utils.parseUnits('10', 18));
        expect(await wardenToken.balanceOf(wallet1.address))
        .to.be.equal(utils.parseUnits('10', 18));
  
        const uniswapAmountOut = await uniswapRoute.getDestinationReturnAmount(src, dest, amountIn)
        const expectedAmountOut = await warden.getDestinationReturnAmount(uniswapIndex, src, dest, amountIn, partnerIndex)
        const expectedFee = uniswapAmountOut.sub(expectedAmountOut)
  
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
        .to.emit(warden, 'Trade')
        .withArgs(src, amountIn, dest, uniswapAmountOut, wallet1.address)
        .to.emit(uniswapRoute, 'Trade')
        .withArgs(src, amountIn, dest, uniswapAmountOut)
        .to.not.emit(warden, 'CollectFee')

        expect(await warden.isEligibleForFreeTrade(wallet1.address)).to.be.true
      })

      it('Should trade without fee if have WAD > 10', async() => {
        await wardenToken.mint(wallet1.address, utils.parseUnits('2500', 18));
        expect(await wardenToken.balanceOf(wallet1.address))
        .to.be.equal(utils.parseUnits('2500', 18));
  
        const uniswapAmountOut = await uniswapRoute.getDestinationReturnAmount(src, dest, amountIn)
        const expectedAmountOut = await warden.getDestinationReturnAmount(uniswapIndex, src, dest, amountIn, partnerIndex)
        const expectedFee = uniswapAmountOut.sub(expectedAmountOut)
  
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
        .to.emit(warden, 'Trade')
        .withArgs(src, amountIn, dest, uniswapAmountOut, wallet1.address)
        .to.emit(uniswapRoute, 'Trade')
        .withArgs(src, amountIn, dest, uniswapAmountOut)
        .to.not.emit(warden, 'CollectFee')

        expect(await warden.isEligibleForFreeTrade(wallet1.address)).to.be.true
      })

      it('Should trade with fee when WAD < 10', async() => {
        await wardenToken.mint(wallet1.address, utils.parseUnits('5.1', 18));
        expect(await wardenToken.balanceOf(wallet1.address))
        .to.be.equal(utils.parseUnits('5.1', 18));
  
        const uniswapAmountOut = await uniswapRoute.getDestinationReturnAmount(src, dest, amountIn)
        const expectedAmountOut = await warden.getDestinationReturnAmount(uniswapIndex, src, dest, amountIn, partnerIndex)
        const expectedFee = uniswapAmountOut.sub(expectedAmountOut)
  
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
        .to.emit(warden, 'Trade')
        .withArgs(src, amountIn, dest, expectedAmountOut, wallet1.address)
        .to.emit(uniswapRoute, 'Trade')
        .withArgs(src, amountIn, dest, uniswapAmountOut)
        .to.emit(warden, 'CollectFee')
        .withArgs(partnerIndex, dest, reserve.address, expectedFee)

        expect(await warden.isEligibleForFreeTrade(wallet1.address)).to.be.false
      })

      it('Should update eligibleAmount by owner', async() => {
        const newAmount = utils.parseUnits('120', 18)

        await expect(await warden.updateEligibleAmount(newAmount))
        .to.emit(warden, 'UpdateEligibleAmount')
        .withArgs(newAmount)
        expect(await warden.eligibleAmount()).to.equal(newAmount)
      })

      it('Should not allow to update eligibleAmount if not owner', async() => {
        const newAmount = utils.parseUnits('120', 18)
  
        await expect(warden.connect(wallet2).updateEligibleAmount(newAmount))
        .to.revertedWith('Ownable: caller is not the owner')
        expect(await warden.eligibleAmount()).to.equal(utils.parseUnits('10', 18))
      })

      describe('Update eligibleAmount to 100', async() => {
        beforeEach(async() => {
          const newAmount = utils.parseUnits('100', 18)
          await warden.updateEligibleAmount(newAmount)
        })

        it('Should trade with fee when WAD > 10 && WAD < 100', async() => {
          await wardenToken.mint(wallet1.address, utils.parseUnits('60', 18))
          expect(await wardenToken.balanceOf(wallet1.address))
          .to.be.equal(utils.parseUnits('60', 18))
    
          const uniswapAmountOut = await uniswapRoute.getDestinationReturnAmount(src, dest, amountIn)
          const expectedAmountOut = await warden.getDestinationReturnAmount(uniswapIndex, src, dest, amountIn, partnerIndex)
          const expectedFee = uniswapAmountOut.sub(expectedAmountOut)
    
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
          .to.emit(warden, 'Trade')
          .withArgs(src, amountIn, dest, expectedAmountOut, wallet1.address)
          .to.emit(uniswapRoute, 'Trade')
          .withArgs(src, amountIn, dest, uniswapAmountOut)
          .to.emit(warden, 'CollectFee')
          .withArgs(partnerIndex, dest, reserve.address, expectedFee)
  
          expect(await warden.isEligibleForFreeTrade(wallet1.address)).to.be.false
        })

        it('Should trade without fee if have WAD = 100', async() => {
          await wardenToken.mint(wallet1.address, utils.parseUnits('100', 18))
          expect(await wardenToken.balanceOf(wallet1.address))
          .to.be.equal(utils.parseUnits('100', 18))
    
          const uniswapAmountOut = await uniswapRoute.getDestinationReturnAmount(src, dest, amountIn)
          const expectedAmountOut = await warden.getDestinationReturnAmount(uniswapIndex, src, dest, amountIn, partnerIndex)
    
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
          .to.emit(warden, 'Trade')
          .withArgs(src, amountIn, dest, uniswapAmountOut, wallet1.address)
          .to.emit(uniswapRoute, 'Trade')
          .withArgs(src, amountIn, dest, uniswapAmountOut)
          .to.not.emit(warden, 'CollectFee')
  
          expect(await warden.isEligibleForFreeTrade(wallet1.address)).to.be.true
        })
      })
    })

    it('Should trade with fee when no WAD assign', async() => {
      expect(await warden.wardenToken()).to.be.equal('0x0000000000000000000000000000000000000000')

      const uniswapAmountOut = await uniswapRoute.getDestinationReturnAmount(src, dest, amountIn)
      const expectedAmountOut = await warden.getDestinationReturnAmount(uniswapIndex, src, dest, amountIn, partnerIndex)
      const expectedFee = uniswapAmountOut.sub(expectedAmountOut)

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
      .to.emit(warden, 'Trade')
      .withArgs(src, amountIn, dest, expectedAmountOut, wallet1.address)
      .to.emit(uniswapRoute, 'Trade')
      .withArgs(src, amountIn, dest, uniswapAmountOut)
      .to.emit(warden, 'CollectFee')
      .withArgs(partnerIndex, dest, reserve.address, expectedFee)

      expect(await warden.isEligibleForFreeTrade(wallet1.address)).to.be.false
    })
  })
})

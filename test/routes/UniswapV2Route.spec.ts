import { ethers, waffle, network } from 'hardhat'
import hre from 'hardhat'
// import { BigNumber, bigNumberify } from 'hardhat'
import { Signer, utils, Contract, BigNumber } from 'ethers'
import { expect } from 'chai'
import ERC20Abi from '../helpers/erc20Abi.json'
import WhaleAddresses from '../helpers/whaleAddresses.json'
import { main as Assets } from '../helpers/assets'
import { UniswapV2Route } from '../../typechain/UniswapV2Route'
import { IERC20 } from '../../typechain/IERC20'
import '@openzeppelin/test-helpers'
import { UNISWAP_ROUTER_ADDRESS, WETH_ADDRESS } from '../constants'

describe('UniswapV2Route', () => {
  let route: UniswapV2Route
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
    const Route = await ethers.getContractFactory('UniswapV2Route')
    route = await Route.deploy(
      UNISWAP_ROUTER_ADDRESS,
      WETH_ADDRESS
    ) as UniswapV2Route
    await route.deployed()

    dai = await ethers.getContractAt(ERC20Abi, Assets.DAI.address) as IERC20
    mkr = await ethers.getContractAt(ERC20Abi, Assets.MKR.address) as IERC20

    trader1 = await ethers.provider.getSigner(WhaleAddresses.a16zAddress)
    trader2 = await ethers.provider.getSigner(WhaleAddresses.binance7)
    trader3 = await ethers.provider.getSigner(WhaleAddresses.binance8)

    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [WhaleAddresses.a16zAddress]}
    )
  })

  it('Should initial data correctly', async () => {
    expect(await route.router()).to.properAddress
    expect(await route.etherERC20()).to.properAddress
    expect(await route.wETH()).to.properAddress

    expect(await route.router()).to.equal('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D')
    expect(await route.etherERC20()).to.equal(Assets.ETH.address)
    expect(await route.wETH()).to.equal('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
    expect(await route.amountOutMin()).to.equal('1')
    expect(await route.deadline()).to.equal(ethers.constants.MaxUint256)
  })

  describe('Allowlist traders', async () => {
    beforeEach(async () => {
      await route.addWhitelisted(wallet1.address)
      await route.addWhitelisted(await trader1.getAddress())
      await route.addWhitelisted(await trader2.getAddress())
      await route.addWhitelisted(await trader3.getAddress())
    })

    it('Should emit Trade event properly', async function () {
      const amountIn = utils.parseEther('1')
      let amountOut: BigNumber = await route.getDestinationReturnAmount(Assets.ETH.address, Assets.DAI.address, amountIn)
  
      await expect(await route.trade(
        Assets.ETH.address,
        Assets.DAI.address,
        amountIn,
        {
          value: amountIn
        }
      ))
      .to.emit(route, 'Trade')
      .withArgs(Assets.ETH.address, amountIn, Assets.DAI.address, amountOut)
    })
  
    it('Should trade 1 ETH -> DAI correctly', async () => {
      const amountIn = utils.parseEther('1')
      let amountOut: BigNumber = await route.getDestinationReturnAmount(Assets.ETH.address, Assets.DAI.address, amountIn)
      console.log('1 ETH -> ? DAI', utils.formatUnits(amountOut, 18))
  
      await expect(() => route.trade(
        Assets.ETH.address,
        Assets.DAI.address,
        amountIn,
        {
          value: amountIn
        }
      ))
      .to.changeTokenBalance(dai, wallet1, amountOut)
  
      await expect(() =>  route.trade(
        Assets.ETH.address,
        Assets.DAI.address,
        amountIn,
        {
          value: amountIn
        }
      ))
      .to.changeEtherBalance(wallet1, '-1000000000000000000')
    })
  
    it('Should not allow trade 1 ETH -> DAI when provide incorrect amount int', async () => {
      await expect(route.trade(
        Assets.ETH.address,
        Assets.DAI.address,
        utils.parseEther('1'),
        {
          value: utils.parseEther('0.5')
        }
      ))
      .to.revertedWith('source amount mismatch')
  
      await expect(route.trade(
        Assets.ETH.address,
        Assets.DAI.address,
        utils.parseEther('0.5'),
        {
          value: utils.parseEther('1')
        }
      ))
      .to.revertedWith('source amount mismatch')
    })
  
    it('Should not allow trade 1 MKR -> ETH if balance is not enough', async () => {
      const amountIn = utils.parseEther('1')
  
      await expect(route.trade(
        Assets.MKR.address,
        Assets.ETH.address,
        amountIn
      ))
      .to.be.reverted
    })
  
    it('Should trade 1 MKR -> DAI correctly', async () => {
      const amountIn = utils.parseEther('1')
      let amountOut: BigNumber = await route.getDestinationReturnAmount(Assets.MKR.address, Assets.DAI.address, amountIn)
      console.log('1 MKR -> ? DAI', utils.formatUnits(amountOut, 18))
  
      await mkr.connect(trader1).approve(route.address, ethers.constants.MaxUint256)
      await expect(() =>  route.connect(trader1).trade(
        Assets.MKR.address,
        Assets.DAI.address,
        amountIn
      ))
      .to.changeTokenBalance(dai, trader1, amountOut)
  
      await expect(() =>  route.connect(trader1).trade(
        Assets.MKR.address,
        Assets.DAI.address,
        amountIn
      ))
      .to.changeTokenBalance(mkr, trader1, '-1000000000000000000')
    })
  
    it('Should trade 1 MKR -> ETH correctly', async () => {
      const amountIn = utils.parseEther('1')
      let amountOut: BigNumber = await route.getDestinationReturnAmount(Assets.MKR.address, Assets.ETH.address, amountIn)
      console.log('1 MKR -> ? ETH', utils.formatUnits(amountOut, 18))
  
      await mkr.connect(trader1).approve(route.address, ethers.constants.MaxUint256)
      await expect(() =>  route.connect(trader1).trade(
        Assets.MKR.address,
        Assets.ETH.address,
        amountIn
      ))
      .to.changeEtherBalance(trader1, amountOut)
  
      await expect(() =>  route.connect(trader1).trade(
        Assets.MKR.address,
        Assets.ETH.address,
        amountIn
      ))
      .to.changeTokenBalance(mkr, trader1, '-1000000000000000000')
    })
  
    it('Should get rate properly', async () => {
      const amountIn = utils.parseEther('1')
      expect(await route.getDestinationReturnAmount(Assets.ETH.address, Assets.DAI.address, amountIn))
      .to.not.equal(0)
  
      expect(await route.getDestinationReturnAmount(Assets.MKR.address, Assets.ETH.address, amountIn))
      .to.not.equal(0)
  
      expect(await route.getDestinationReturnAmount(Assets.MKR.address, Assets.DAI.address, amountIn))
      .to.not.equal(0)
    })
  
    it('Should not allow trade 1 MKR -> MKR', async () => {
      const amountIn = utils.parseEther('1')
  
      await expect(route.trade(
        Assets.MKR.address,
        Assets.MKR.address,
        amountIn
      ))
      .to.be.revertedWith('destination token can not be source token')
    })
  
    it('Should not get rate if source and destination token are the same', async () => {
      const amountIn = utils.parseEther('100')
  
      await expect(route.getDestinationReturnAmount(Assets.MKR.address, Assets.MKR.address, amountIn))
      .to.revertedWith('destination token can not be source token')
    })
  })

  it('Should not trade without allowlist', async () => {
    const amountIn = utils.parseEther('1')
    await expect(route.trade(
      Assets.ETH.address,
      Assets.DAI.address,
      amountIn,
      {
        value: amountIn
      }
    ))
    .to.revertedWith('WhitelistedRole: caller does not have the Whitelisted role')
  })
})

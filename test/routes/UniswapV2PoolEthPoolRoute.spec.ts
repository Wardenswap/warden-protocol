import { ethers, waffle, network } from 'hardhat'
import hre from 'hardhat'
// import { BigNumber, bigNumberify } from 'hardhat'
import { Signer, utils, Contract, BigNumber } from 'ethers'
import { expect } from 'chai'
import ERC20Abi from '../helpers/erc20Abi.json'
import WhaleAddresses from '../helpers/whaleAddresses.json'
import { main as Assets } from '../helpers/assets'
import { UniswapV2PoolToPoolTokenEthTokenRoute } from '../../typechain/UniswapV2PoolToPoolTokenEthTokenRoute'
import { IERC20 } from '../../typechain/IERC20'
import { IUniswapV2Router } from '../../typechain/IUniswapV2Router'
import { abi as UniswapV2RouterAbi } from '../../artifacts/contracts/interfaces/IUniswapV2Router.sol/IUniswapV2Router.json'
import '@openzeppelin/test-helpers'
import { UNISWAP_ROUTER_ADDRESS, SUSHISWAP_ROUTER_ADDRESS, WETH_ADDRESS } from '../constants'

describe('UniswapV2PoolEthPoolRoute', () => {
  let route: UniswapV2PoolToPoolTokenEthTokenRoute
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
    const Route = await ethers.getContractFactory('UniswapV2PoolToPoolTokenEthTokenRoute')
    route = await Route.deploy(
      UNISWAP_ROUTER_ADDRESS,
      SUSHISWAP_ROUTER_ADDRESS,
      WETH_ADDRESS
    ) as UniswapV2PoolToPoolTokenEthTokenRoute
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
    expect(await route.router1()).to.properAddress
    expect(await route.router2()).to.properAddress
    expect(await route.etherERC20()).to.properAddress
    expect(await route.wETH()).to.properAddress

    expect(await route.router1()).to.equal(UNISWAP_ROUTER_ADDRESS)
    expect(await route.router2()).to.equal(SUSHISWAP_ROUTER_ADDRESS)
    expect(await route.etherERC20()).to.equal(Assets.ETH.address)
    expect(await route.wETH()).to.equal(WETH_ADDRESS)
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
      let amountOut: BigNumber = await route.getDestinationReturnAmount(Assets.MKR.address, Assets.DAI.address, amountIn)
  
      await mkr.connect(trader1).approve(route.address, ethers.constants.MaxUint256)
      await expect(await route.connect(trader1).trade(
        Assets.MKR.address,
        Assets.DAI.address,
        amountIn
      ))
      .to.emit(route, 'Trade')
      .withArgs(Assets.MKR.address, amountIn, Assets.DAI.address, amountOut)
    })
  
    it('Should trade 100 MKR -> DAI correctly', async () => {
      const amountIn = utils.parseEther('100')
      let amountOut: BigNumber = await route.getDestinationReturnAmount(Assets.MKR.address, Assets.DAI.address, amountIn)
      console.log('100 MKR -> ? DAI', utils.formatUnits(amountOut, 18))
  
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
      .to.changeTokenBalance(mkr, trader1, '-100000000000000000000')
    })
  
    it('Should not allow trade 100 ETH -> Any', async () => {
      const amountIn = utils.parseEther('100')
      await expect(route.trade(
        Assets.ETH.address,
        Assets.DAI.address,
        amountIn,
        {
          value: amountIn
        }
      ))
      .to.revertedWith('Ether exchange is not supported')
    })
  
    it('Should not allow trade 100 MKR -> ETH', async () => {
      const amountIn = utils.parseEther('100')
  
      await mkr.connect(trader1).approve(route.address, ethers.constants.MaxUint256)
      await expect(route.connect(trader1).trade(
        Assets.MKR.address,
        Assets.ETH.address,
        amountIn
      ))
      .to.revertedWith('Ether exchange is not supported')
    })
  
    it('Should get rate 0 when trading with ETH', async () => {
      const amountIn = utils.parseEther('100')
      expect(await route.getDestinationReturnAmount(Assets.ETH.address, Assets.DAI.address, amountIn))
      .to.equal(0)
  
      expect(await route.getDestinationReturnAmount(Assets.MKR.address, Assets.ETH.address, amountIn))
      .to.equal(0)
    })
  
    it('Should get rate properly', async () => {
      const amountIn = utils.parseEther('100')
      expect(await route.getDestinationReturnAmount(Assets.MKR.address, Assets.DAI.address, amountIn))
      .to.not.equal(0)
    })
  
    it('Should not allow trade 100 MKR -> MKR', async () => {
      const amountIn = utils.parseEther('100')
  
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
    const amountIn = utils.parseEther('100')

    await mkr.connect(trader1).approve(route.address, ethers.constants.MaxUint256)
    await expect(route.connect(trader1).trade(
      Assets.MKR.address,
      Assets.DAI.address,
      amountIn
    ))
    .to.revertedWith('WhitelistedRole: caller does not have the Whitelisted role')
  })

  it('Should get rate correctly', async () => {
    const src = Assets.MKR
    const dest = Assets.DAI
    const amountIn = utils.parseEther('100')

    // Uniswap route
    const uniswap = await ethers.getContractAt(UniswapV2RouterAbi, UNISWAP_ROUTER_ADDRESS) as IUniswapV2Router
    const amountOuts1 = await uniswap.getAmountsOut(amountIn, [src.address, WETH_ADDRESS])

    // Sushiswap route
    const sushiswap = await ethers.getContractAt(UniswapV2RouterAbi, SUSHISWAP_ROUTER_ADDRESS) as IUniswapV2Router
    const amountOuts2 = await sushiswap.getAmountsOut(amountOuts1[amountOuts1.length - 1], [WETH_ADDRESS, dest.address])

    expect(await route.getDestinationReturnAmount(src.address, dest.address, amountIn))
    .to.be.equal(amountOuts2[amountOuts2.length - 1])
  })
})

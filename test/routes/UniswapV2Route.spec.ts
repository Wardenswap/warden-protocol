import { ethers, waffle, network } from 'hardhat'
import hre from 'hardhat'
// import { BigNumber, bigNumberify } from 'hardhat'
import { Signer, utils, Contract, BigNumber } from 'ethers'
import { expect } from 'chai'
import ERC20Abi from '../helpers/erc20Abi.json'
import WhaleAddresses from '../helpers/whaleAddresses.json'
import { main as Assets } from '../helpers/assets'

describe('UniswapV2TradingRoute', function() {
  const provider = waffle.provider
  const [wallet1, wallet2, wallet3, wallet4, other] = provider.getWallets()

  before(async function() {
    const Route = await ethers.getContractFactory('UniswapV2TradingRoute')
    this.route = await Route.deploy()
    await this.route.deployed()

    this.dai = await ethers.getContractAt(ERC20Abi, Assets.DAI.address)
    this.mkr = await ethers.getContractAt(ERC20Abi, Assets.MKR.address)

    this.trader = await ethers.provider.getSigner(WhaleAddresses.a16zAddress)

    await network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [WhaleAddresses.a16zAddress]}
    )
  })

  it('Should initial data correctly', async function() {
    expect(await this.route.router()).to.properAddress
    expect(await this.route.etherERC20()).to.properAddress
    expect(await this.route.wETH()).to.properAddress

    expect(await this.route.router()).to.equal('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D')
    expect(await this.route.etherERC20()).to.equal(Assets.ETH.address)
    expect(await this.route.wETH()).to.equal('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
    expect(await this.route.amountOutMin()).to.equal('1')
    expect(await this.route.deadline()).to.equal(ethers.constants.MaxUint256)
  })

  it('Should emit Trade event properly', async function () {
    const amountIn = utils.parseEther('1')
    let amountOut: BigNumber = await this.route.getDestinationReturnAmount(Assets.ETH.address, Assets.DAI.address, amountIn)

    await expect(await this.route.trade(
      Assets.ETH.address,
      Assets.DAI.address,
      amountIn,
      {
        value: amountIn
      }
    ))
    .to.emit(this.route, 'Trade')
    .withArgs(Assets.ETH.address, amountIn, Assets.DAI.address, amountOut)
  })

  it('Should trade 1 ETH -> DAI correctly', async function() {
    const amountIn = utils.parseEther('1')
    let amountOut: BigNumber = await this.route.getDestinationReturnAmount(Assets.ETH.address, Assets.DAI.address, amountIn)
    console.log('1 ETH -> ? DAI', utils.formatUnits(amountOut, 18))

    await expect(() => this.route.trade(
      Assets.ETH.address,
      Assets.DAI.address,
      amountIn,
      {
        value: amountIn
      }
    ))
    .to.changeTokenBalance(this.dai, wallet1, amountOut)

    await expect(() =>  this.route.trade(
      Assets.ETH.address,
      Assets.DAI.address,
      amountIn,
      {
        value: amountIn
      }
    ))
    .to.changeEtherBalance(wallet1, '-1000000000000000000')
  })

  it('Should not allow trade 1 ETH -> DAI when provide incorrect amount int', async function() {
    await expect(this.route.trade(
      Assets.ETH.address,
      Assets.DAI.address,
      utils.parseEther('1'),
      {
        value: utils.parseEther('0.5')
      }
    ))
    .to.revertedWith('source amount mismatch')

    await expect(this.route.trade(
      Assets.ETH.address,
      Assets.DAI.address,
      utils.parseEther('0.5'),
      {
        value: utils.parseEther('1')
      }
    ))
    .to.revertedWith('source amount mismatch')
  })

  it('Should not allow trade 1 MKR -> ETH if balance is not enough', async function() {
    const amountIn = utils.parseEther('1')

    await expect(this.route.trade(
      Assets.MKR.address,
      Assets.ETH.address,
      amountIn
    ))
    .to.be.reverted
  })

  it('Should trade 1 MKR -> DAI correctly', async function() {
    const amountIn = utils.parseEther('1')
    let amountOut: BigNumber = await this.route.getDestinationReturnAmount(Assets.MKR.address, Assets.DAI.address, amountIn)
    console.log('1 MKR -> ? DAI', utils.formatUnits(amountOut, 18))

    await this.mkr.connect(this.trader).approve(this.route.address, ethers.constants.MaxUint256)
    await expect(() =>  this.route.connect(this.trader).trade(
      Assets.MKR.address,
      Assets.DAI.address,
      amountIn
    ))
    .to.changeTokenBalance(this.dai, this.trader, amountOut)

    await expect(() =>  this.route.connect(this.trader).trade(
      Assets.MKR.address,
      Assets.DAI.address,
      amountIn
    ))
    .to.changeTokenBalance(this.mkr, this.trader, '-1000000000000000000')
  })

  it('Should trade 1 MKR -> ETH correctly', async function() {
    const amountIn = utils.parseEther('1')
    let amountOut: BigNumber = await this.route.getDestinationReturnAmount(Assets.MKR.address, Assets.ETH.address, amountIn)
    console.log('1 MKR -> ? ETH', utils.formatUnits(amountOut, 18))

    await this.mkr.connect(this.trader).approve(this.route.address, ethers.constants.MaxUint256)
    await expect(() =>  this.route.connect(this.trader).trade(
      Assets.MKR.address,
      Assets.ETH.address,
      amountIn
    ))
    .to.changeEtherBalance(this.trader, amountOut)

    await expect(() =>  this.route.connect(this.trader).trade(
      Assets.MKR.address,
      Assets.ETH.address,
      amountIn
    ))
    .to.changeTokenBalance(this.mkr, this.trader, '-1000000000000000000')
  })

  it('Should get rate properly', async function() {
    const amountIn = utils.parseEther('1')
    expect(await this.route.getDestinationReturnAmount(Assets.ETH.address, Assets.DAI.address, amountIn))
    .to.not.equal(0)

    expect(await this.route.getDestinationReturnAmount(Assets.MKR.address, Assets.ETH.address, amountIn))
    .to.not.equal(0)

    expect(await this.route.getDestinationReturnAmount(Assets.MKR.address, Assets.DAI.address, amountIn))
    .to.not.equal(0)
  })

  it('Should not allow trade 1 MKR -> MKR', async function() {
    const amountIn = utils.parseEther('1')

    await expect(this.route.trade(
      Assets.MKR.address,
      Assets.MKR.address,
      amountIn
    ))
    .to.be.revertedWith('destination token can not be source token')
  })

  it('Should not get rate if source and destination token are the same', async function() {
    const amountIn = utils.parseEther('100')

    await expect(this.route.getDestinationReturnAmount(Assets.MKR.address, Assets.MKR.address, amountIn))
    .to.revertedWith('destination token can not be source token')
  })
})

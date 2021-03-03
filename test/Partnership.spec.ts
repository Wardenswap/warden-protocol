import { ethers, waffle, network } from 'hardhat'
import { expect } from 'chai'
import { Partnership } from "../typechain/Partnership";


describe('Partnership', () => {
  let partner: Partnership

  const provider = waffle.provider
  const [wallet1, wallet2, wallet3, wallet4, other] = provider.getWallets()

  beforeEach(async () => {
    partner = await (await ethers.getContractFactory('Partnership')).deploy() as Partnership
    await partner.deployed()
  })

  it('Should initial data correctly', async () => {
    expect((await partner.partners(0)).wallet).to.equal(wallet1.address)
    expect((await partner.partners(0)).fee).to.equal(10) // 0.1%
    expect((await partner.partners(0)).name).to.equal(ethers.utils.formatBytes32String('WARDEN').slice(0, 34))
    expect(await partner.owner()).to.equal(wallet1.address)
  })

  it('Should adding new partner correctly', async function() {
    const fee = 5 // 0.05%
    const name = ethers.utils.formatBytes32String('Partner 1').slice(0, 34)

    await expect(partner.updatePartner(1, wallet2.address, fee, name))
    .to.emit(partner, 'UpdatePartner')
    .withArgs(1, wallet2.address, fee, name)

    expect((await partner.partners(1)).wallet).to.equal(wallet2.address)
    expect((await partner.partners(1)).fee).to.equal(fee)
    expect((await partner.partners(1)).name).to.equal(name)
  })

  it('Should updating existing partner correctly', async function() {
    const fee = 7 // 0.07%
    const name = ethers.utils.formatBytes32String('WARDEN').slice(0, 34)

    await expect(partner.updatePartner(0, wallet1.address, fee, name))
    .to.emit(partner, 'UpdatePartner')
    .withArgs(0, wallet1.address, fee, name)

    expect((await partner.partners(0)).wallet).to.equal(wallet1.address)
    expect((await partner.partners(0)).fee).to.equal(fee)
    expect((await partner.partners(0)).name).to.equal(name)
  })

  it('Should not allow adding partner if not owner', async function() {
    await expect(partner.connect(wallet2).updatePartner(2, wallet3.address, 10, ethers.utils.formatBytes32String('Wallet Provider 3').slice(0, 34)))
    .to.revertedWith('caller is not the owner')
  })

  it('Should not setting fee more than 1%', async function() {
    const feeOk = 100 // 1%
    const feeNotOk1 = 101 // 1.01%
    const feeNotOk2 = 200 // 2%

    const name = (await partner.partners(0)).name

    await expect(partner.updatePartner(0, wallet1.address, feeOk, name))
    .to.not.reverted

    await expect(partner.updatePartner(0, wallet1.address, feeNotOk1, name))
    .to.revertedWith('fee: no more than 1%')

    await expect(partner.updatePartner(0, wallet1.address, feeNotOk2, name))
    .to.revertedWith('fee: no more than 1%')
  })
})

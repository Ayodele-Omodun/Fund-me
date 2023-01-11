const { deployments, ethers, getNamedAccounts, network } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", () => {
          let fundMe
          let deployer
          let mockV3
          const amount = ethers.utils.parseEther("1")
          let accounts
          beforeEach(async () => {
              await deployments.fixture(["all"])
              deployer = (await getNamedAccounts()).deployer
              fundMe = await ethers.getContract("FundMe", deployer)
              mockV3 = await ethers.getContract("MockV3Aggregator", deployer)
          })

          describe("Constructor", () => {
              it("Sets the aggregator address correctly", async () => {
                  const response = await fundMe.getPriceFeed()
                  assert.equal(response, mockV3.address)
              })

              describe("Fund", () => {
                  it("Fails if not enough ether is sent", async () => {
                      expect(fundMe.fund()).to.be.revertedWith(
                          "Not enough funds"
                      )
                  })
                  it("Adds the funder to the array of funders", async () => {
                      await fundMe.fund({ value: amount })
                      const funder = await fundMe.getFunders(0)
                      assert.equal(funder, deployer)
                  })
                  it("Maps the funder to the amount funded", async () => {
                      await fundMe.fund({ value: amount })
                      const response = await fundMe.getAddressToAmountFunded(
                          deployer
                      )
                      assert.equal(response.toString(), amount.toString())
                  })
              })
              describe("withdraw", () => {
                  beforeEach(async () => {
                      await fundMe.fund({ value: amount })
                  })
                  it("Withdraws all the funds", async () => {
                      const startingFundMeBalance =
                          await fundMe.provider.getBalance(fundMe.address)
                      const startingDeployerBalance =
                          await fundMe.provider.getBalance(deployer)

                      const transactionResponse = await fundMe.withdrawAll()
                      const transactionReceipt = await transactionResponse.wait(
                          1
                      )

                      const { gasUsed, effectiveGasPrice } = transactionReceipt
                      const gasCost = gasUsed.mul(effectiveGasPrice)
                      const endingFundMeBalance =
                          await fundMe.provider.getBalance(fundMe.address)
                      const endingDeployerBalance =
                          await fundMe.provider.getBalance(deployer)

                      assert.equal(endingFundMeBalance, 0)
                      assert.equal(
                          startingFundMeBalance
                              .add(startingDeployerBalance)
                              .toString(),
                          endingDeployerBalance.add(gasCost).toString()
                      )
                  })

                  it("Withdraws allows us to use multiple founders", async () => {
                      const accounts = await ethers.getSigners()
                      for (i = 0; i < 6; i++) {
                          const fundMeconnectedToAccounts =
                              await fundMe.connect(accounts[i])
                          await fundMeconnectedToAccounts.fund({
                              value: amount,
                          })
                      }
                      const startingFundMeBalance =
                          await fundMe.provider.getBalance(fundMe.address)
                      const startingDeployerBalance =
                          await fundMe.provider.getBalance(deployer)

                      const transactionResponse = await fundMe.withdrawAll()
                      const transactionReceipt = await transactionResponse.wait(
                          1
                      )

                      const { gasUsed, effectiveGasPrice } = transactionReceipt
                      const gasCost = gasUsed.mul(effectiveGasPrice)
                      const endingFundMeBalance =
                          await fundMe.provider.getBalance(fundMe.address)
                      const endingDeployerBalance =
                          await fundMe.provider.getBalance(deployer)

                      assert.equal(endingFundMeBalance, 0)
                      assert.equal(
                          startingFundMeBalance
                              .add(startingDeployerBalance)
                              .toString(),
                          endingDeployerBalance.add(gasCost).toString()
                      )

                      await expect(fundMe.getFunders(0)).to.be.reverted

                      for (i = 0; i < 6; i++) {
                          assert.equal(
                              await fundMe.getAddressToAmountFunded(
                                  accounts[i].address
                              ),
                              0
                          )
                      }
                  })

                  it("only allows owner to wtihdraw", async () => {
                      const accounts = await ethers.getSigners()
                      const attacker = accounts[1]
                      const attackerConnectedContract = fundMe.connect(attacker)
                      await expect(attackerConnectedContract.withdrawAll()).to
                          .be.reverted
                  })
              })
          })
      })

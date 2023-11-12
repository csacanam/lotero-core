const { ethers } = require("hardhat");
const { expect } = require("chai");
const { BigNumber } = require("ethers");

const provider = ethers.getDefaultProvider();

describe("Decentralized Slot Machine", async function () {
  let myContract;
  let hardhatVrfCoordinatorV2Mock;
  let account1;
  let account2;
  let account3;

  //1. CONTRACT DEPLOYMENT
  describe("1. CONTRACTS DEPLOYMENT", function () {
    it("Contracts deployed", async function () {
      const SlotMachine = await ethers.getContractFactory("SlotMachine");
      let vrfCoordinatorV2Mock = await ethers.getContractFactory("VRFCoordinatorV2Mock");

      hardhatVrfCoordinatorV2Mock = await vrfCoordinatorV2Mock.deploy(0, 0);

      await hardhatVrfCoordinatorV2Mock.createSubscription();

      await hardhatVrfCoordinatorV2Mock.fundSubscription(1, ethers.utils.parseEther("7"));

      const keyHash = "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f";
      myContract = await SlotMachine.deploy(1, hardhatVrfCoordinatorV2Mock.address, keyHash, {
        value: ethers.utils.parseEther("7"),
      });

      await hardhatVrfCoordinatorV2Mock.addConsumer(1, myContract.address);

      [account1, account2, account3] = await ethers.getSigners();
    });

    //2. PLAY
    describe("2. PLAY", function () {
      describe("Round # 1 - First Player", function () {
        it("ReceivedRandomness is emitted", async () => {
          //Play Transaction
          let tx = await myContract.play(ethers.constants.AddressZero, {
            value: ethers.utils.parseEther("0.1"),
          });
          let { events } = await tx.wait();

          let [reqId] = events.filter(x => x.event === "RequestedRandomness")[0].args;

          //VRFCoordinator Response
          await expect(hardhatVrfCoordinatorV2Mock.fulfillRandomWords(reqId, myContract.address)).to.emit(
            myContract,
            "ReceivedRandomness",
          );
        });

        it("Check user information", async () => {
          const user1 = await myContract.infoPerUser(account1.address);
          expect(user1.moneyAdded).to.be.equal(ethers.utils.parseEther("0.1"));
          expect(user1.moneyEarned).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.moneyClaimed).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.active).to.be.equal(true);
          expect(user1.referringUserAddress).to.be.equal(ethers.constants.AddressZero);
          expect(user1.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
        });

        it("Check round information", async () => {
          let round = await myContract.rounds(1);
          expect(round.userAddress).to.be.equal(account1.address);
          expect(round.number1).to.be.equal(1);
          expect(round.number2).to.be.equal(9);
          expect(round.number3).to.be.equal(6);
          expect(round.value).to.be.equal(ethers.utils.parseEther("0.1"));
        });

        it("Check general stats", async () => {
          const users = await myContract.users();
          expect(Number(users)).to.be.equal(Number(1));

          const totalMoneyAdded = await myContract.totalMoneyAdded();
          expect(totalMoneyAdded).to.be.equal(ethers.utils.parseEther("0.1"));

          const totalMoneyEarnedByPlayers = await myContract.totalMoneyEarnedByPlayers();
          expect(totalMoneyEarnedByPlayers).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyClaimedByPlayers = await myContract.totalMoneyClaimedByPlayers();
          expect(totalMoneyClaimedByPlayers).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByDevs = await myContract.totalMoneyEarnedByDevs();
          expect(totalMoneyEarnedByDevs).to.be.equal(ethers.utils.parseEther("0.005"));

          const totalMoneyClaimedByDevs = await myContract.totalMoneyClaimedByDevs();
          expect(totalMoneyClaimedByDevs).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByReferrals = await myContract.totalMoneyEarnedByReferrals();
          expect(totalMoneyEarnedByReferrals).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyClaimedByReferrals = await myContract.totalMoneyClaimedByReferrals();
          expect(totalMoneyClaimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));

          const moneyInContract = await myContract.getMoneyInContract();
          expect(moneyInContract).to.be.equal(ethers.utils.parseEther("7.1"));

          const currentDebt = await myContract.getCurrentDebt();
          expect(currentDebt).to.be.equal(ethers.utils.parseEther("0.005"));
        });
      });

      describe("Round # 2 - First Player", function () {
        it("ReceivedRandomness is emitted", async () => {
          //Play Transaction
          let tx = await myContract.play(ethers.constants.AddressZero, {
            value: ethers.utils.parseEther("0.1"),
          });
          let { events } = await tx.wait();

          let [reqId] = events.filter(x => x.event === "RequestedRandomness")[0].args;

          //VRFCoordinator Response
          await expect(hardhatVrfCoordinatorV2Mock.fulfillRandomWords(reqId, myContract.address)).to.emit(
            myContract,
            "ReceivedRandomness",
          );
        });

        it("Check user information", async () => {
          const user1 = await myContract.infoPerUser(account1.address);
          expect(user1.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user1.moneyEarned).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.moneyClaimed).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.active).to.be.equal(true);
          expect(user1.referringUserAddress).to.be.equal(ethers.constants.AddressZero);
          expect(user1.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
        });

        it("Check round information", async () => {
          let round = await myContract.rounds(2);
          expect(round.userAddress).to.be.equal(account1.address);
          expect(round.number1).to.be.equal(1);
          expect(round.number2).to.be.equal(7);
          expect(round.number3).to.be.equal(8);
          expect(round.value).to.be.equal(ethers.utils.parseEther("0.1"));
        });

        it("Check general stats", async () => {
          const users = await myContract.users();
          expect(Number(users)).to.be.equal(Number(1));

          const totalMoneyAdded = await myContract.totalMoneyAdded();
          expect(totalMoneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));

          const totalMoneyEarnedByPlayers = await myContract.totalMoneyEarnedByPlayers();
          expect(totalMoneyEarnedByPlayers).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyClaimedByPlayers = await myContract.totalMoneyClaimedByPlayers();
          expect(totalMoneyClaimedByPlayers).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByDevs = await myContract.totalMoneyEarnedByDevs();
          expect(totalMoneyEarnedByDevs).to.be.equal(ethers.utils.parseEther("0.01"));

          const totalMoneyClaimedByDevs = await myContract.totalMoneyClaimedByDevs();
          expect(totalMoneyClaimedByDevs).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByReferrals = await myContract.totalMoneyEarnedByReferrals();
          expect(totalMoneyEarnedByReferrals).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyClaimedByReferrals = await myContract.totalMoneyClaimedByReferrals();
          expect(totalMoneyClaimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));

          const moneyInContract = await myContract.getMoneyInContract();
          expect(moneyInContract).to.be.equal(ethers.utils.parseEther("7.2"));

          const currentDebt = await myContract.getCurrentDebt();
          expect(currentDebt).to.be.equal(ethers.utils.parseEther("0.01"));
        });
      });

      describe("Round # 3 - Second Player", function () {
        it("ReceivedRandomness is emitted", async () => {
          let myContractAsAccount2 = myContract.connect(account2);

          //Play Transaction
          let tx = await myContractAsAccount2.play(account1.address, {
            value: ethers.utils.parseEther("0.1"),
          });
          let { events } = await tx.wait();

          let [reqId] = events.filter(x => x.event === "RequestedRandomness")[0].args;

          //VRFCoordinator Response
          await expect(hardhatVrfCoordinatorV2Mock.fulfillRandomWords(reqId, myContract.address)).to.emit(
            myContract,
            "ReceivedRandomness",
          );
        });

        it("Check first player information", async () => {
          const user1 = await myContract.infoPerUser(account1.address);
          expect(user1.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user1.moneyEarned).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.moneyClaimed).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.active).to.be.equal(true);
          expect(user1.referringUserAddress).to.be.equal(ethers.constants.AddressZero);
          expect(user1.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0.001"));
          expect(user1.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
        });

        it("Check second player information", async () => {
          const user2 = await myContract.infoPerUser(account2.address);
          expect(user2.moneyAdded).to.be.equal(ethers.utils.parseEther("0.1"));
          expect(user2.moneyEarned).to.be.equal(ethers.utils.parseEther("0"));
          expect(user2.moneyClaimed).to.be.equal(ethers.utils.parseEther("0"));
          expect(user2.active).to.be.equal(true);
          expect(user2.referringUserAddress).to.be.equal(account1.address);
          expect(user2.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
          expect(user2.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
        });

        it("Check round information", async () => {
          let round = await myContract.rounds(3);
          expect(round.userAddress).to.be.equal(account2.address);
          expect(round.number1).to.be.equal(9);
          expect(round.number2).to.be.equal(1);
          expect(round.number3).to.be.equal(9);
          expect(round.value).to.be.equal(ethers.utils.parseEther("0.1"));
        });

        it("Check general stats", async () => {
          const users = await myContract.users();
          expect(Number(users)).to.be.equal(Number(2));

          const totalMoneyAdded = await myContract.totalMoneyAdded();
          expect(totalMoneyAdded).to.be.equal(ethers.utils.parseEther("0.3"));

          const totalMoneyEarnedByPlayers = await myContract.totalMoneyEarnedByPlayers();
          expect(totalMoneyEarnedByPlayers).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyClaimedByPlayers = await myContract.totalMoneyClaimedByPlayers();
          expect(totalMoneyClaimedByPlayers).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByDevs = await myContract.totalMoneyEarnedByDevs();
          expect(totalMoneyEarnedByDevs).to.be.equal(ethers.utils.parseEther("0.015"));

          const totalMoneyClaimedByDevs = await myContract.totalMoneyClaimedByDevs();
          expect(totalMoneyClaimedByDevs).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByReferrals = await myContract.totalMoneyEarnedByReferrals();
          expect(totalMoneyEarnedByReferrals).to.be.equal(ethers.utils.parseEther("0.001"));

          const totalMoneyClaimedByReferrals = await myContract.totalMoneyClaimedByReferrals();
          expect(totalMoneyClaimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));

          const moneyInContract = await myContract.getMoneyInContract();
          expect(moneyInContract).to.be.equal(ethers.utils.parseEther("7.3"));

          const currentDebt = await myContract.getCurrentDebt();
          expect(currentDebt).to.be.equal(ethers.utils.parseEther("0.016"));
        });
      });

      describe("Round # 4 - Second Player", function () {
        it("ReceivedRandomness is emitted", async () => {
          let myContractAsAccount2 = myContract.connect(account2);

          //Play Transaction
          let tx = await myContractAsAccount2.play(ethers.constants.AddressZero, {
            value: ethers.utils.parseEther("0.1"),
          });
          let { events } = await tx.wait();

          let [reqId] = events.filter(x => x.event === "RequestedRandomness")[0].args;

          //VRFCoordinator Response
          await expect(
            hardhatVrfCoordinatorV2Mock.fulfillRandomWordsWithOverride(reqId, myContract.address, [1, 2, 3]),
          ).to.emit(myContract, "ReceivedRandomness");
        });

        it("Check first player information", async () => {
          const user1 = await myContract.infoPerUser(account1.address);
          expect(user1.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user1.moneyEarned).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.moneyClaimed).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.active).to.be.equal(true);
          expect(user1.referringUserAddress).to.be.equal(ethers.constants.AddressZero);
          expect(user1.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));
          expect(user1.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
        });

        it("Check second player information", async () => {
          const user2 = await myContract.infoPerUser(account2.address);
          expect(user2.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user2.moneyEarned).to.be.equal(ethers.utils.parseEther("0.5"));
          expect(user2.moneyClaimed).to.be.equal(ethers.utils.parseEther("0"));
          expect(user2.active).to.be.equal(true);
          expect(user2.referringUserAddress).to.be.equal(account1.address);
          expect(user2.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
          expect(user2.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
        });

        it("Check round information", async () => {
          let round = await myContract.rounds(4);
          expect(round.userAddress).to.be.equal(account2.address);
          expect(round.number1).to.be.equal(1);
          expect(round.number2).to.be.equal(2);
          expect(round.number3).to.be.equal(3);
          expect(round.value).to.be.equal(ethers.utils.parseEther("0.1"));
        });

        it("Check general stats", async () => {
          const users = await myContract.users();
          expect(Number(users)).to.be.equal(Number(2));

          const totalMoneyAdded = await myContract.totalMoneyAdded();
          expect(totalMoneyAdded).to.be.equal(ethers.utils.parseEther("0.4"));

          const totalMoneyEarnedByPlayers = await myContract.totalMoneyEarnedByPlayers();
          expect(totalMoneyEarnedByPlayers).to.be.equal(ethers.utils.parseEther("0.5"));

          const totalMoneyClaimedByPlayers = await myContract.totalMoneyClaimedByPlayers();
          expect(totalMoneyClaimedByPlayers).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByDevs = await myContract.totalMoneyEarnedByDevs();
          expect(totalMoneyEarnedByDevs).to.be.equal(ethers.utils.parseEther("0.02"));

          const totalMoneyClaimedByDevs = await myContract.totalMoneyClaimedByDevs();
          expect(totalMoneyClaimedByDevs).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByReferrals = await myContract.totalMoneyEarnedByReferrals();
          expect(totalMoneyEarnedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));

          const totalMoneyClaimedByReferrals = await myContract.totalMoneyClaimedByReferrals();
          expect(totalMoneyClaimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));

          const moneyInContract = await myContract.getMoneyInContract();
          expect(moneyInContract).to.be.equal(ethers.utils.parseEther("7.4"));

          const currentDebt = await myContract.getCurrentDebt();
          expect(currentDebt).to.be.equal(ethers.utils.parseEther("0.522"));
        });
      });

      describe("Round # 5 - Second Player", function () {
        it("Play with 0 ether should be reverted", async () => {
          let myContractAsAccount2 = myContract.connect(account2);

          //Play Transaction
          await expect(
            myContractAsAccount2.play(ethers.constants.AddressZero, {
              value: ethers.utils.parseEther("0"),
            }),
          ).to.be.revertedWith("Amount should be greater than 0");
        });

        it("Check first player information", async () => {
          const user1 = await myContract.infoPerUser(account1.address);
          expect(user1.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user1.moneyEarned).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.moneyClaimed).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.active).to.be.equal(true);
          expect(user1.referringUserAddress).to.be.equal(ethers.constants.AddressZero);
          expect(user1.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));
          expect(user1.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
        });

        it("Check second player information", async () => {
          const user2 = await myContract.infoPerUser(account2.address);
          expect(user2.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user2.moneyEarned).to.be.equal(ethers.utils.parseEther("0.5"));
          expect(user2.moneyClaimed).to.be.equal(ethers.utils.parseEther("0"));
          expect(user2.active).to.be.equal(true);
          expect(user2.referringUserAddress).to.be.equal(account1.address);
          expect(user2.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
          expect(user2.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
        });

        it("Check round information", async () => {
          let round = await myContract.rounds(4);
          expect(round.userAddress).to.be.equal(account2.address);
          expect(round.number1).to.be.equal(1);
          expect(round.number2).to.be.equal(2);
          expect(round.number3).to.be.equal(3);
          expect(round.value).to.be.equal(ethers.utils.parseEther("0.1"));
        });

        it("Check general stats", async () => {
          const users = await myContract.users();
          expect(Number(users)).to.be.equal(Number(2));

          const totalMoneyAdded = await myContract.totalMoneyAdded();
          expect(totalMoneyAdded).to.be.equal(ethers.utils.parseEther("0.4"));

          const totalMoneyEarnedByPlayers = await myContract.totalMoneyEarnedByPlayers();
          expect(totalMoneyEarnedByPlayers).to.be.equal(ethers.utils.parseEther("0.5"));

          const totalMoneyClaimedByPlayers = await myContract.totalMoneyClaimedByPlayers();
          expect(totalMoneyClaimedByPlayers).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByDevs = await myContract.totalMoneyEarnedByDevs();
          expect(totalMoneyEarnedByDevs).to.be.equal(ethers.utils.parseEther("0.02"));

          const totalMoneyClaimedByDevs = await myContract.totalMoneyClaimedByDevs();
          expect(totalMoneyClaimedByDevs).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByReferrals = await myContract.totalMoneyEarnedByReferrals();
          expect(totalMoneyEarnedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));

          const totalMoneyClaimedByReferrals = await myContract.totalMoneyClaimedByReferrals();
          expect(totalMoneyClaimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));

          const moneyInContract = await myContract.getMoneyInContract();
          expect(moneyInContract).to.be.equal(ethers.utils.parseEther("7.4"));

          const currentDebt = await myContract.getCurrentDebt();
          expect(currentDebt).to.be.equal(ethers.utils.parseEther("0.522"));
        });
      });

      describe("Round # 6 - Second Player", function () {
        it("Play with 0.005 ether should be reverted", async () => {
          let myContractAsAccount2 = myContract.connect(account2);

          //Play Transaction
          await expect(
            myContractAsAccount2.play(ethers.constants.AddressZero, {
              value: ethers.utils.parseEther("0.005"),
            }),
          ).to.be.revertedWith("Value should be greater than minimum value to play");
        });

        it("Check first player information", async () => {
          const user1 = await myContract.infoPerUser(account1.address);
          expect(user1.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user1.moneyEarned).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.moneyClaimed).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.active).to.be.equal(true);
          expect(user1.referringUserAddress).to.be.equal(ethers.constants.AddressZero);
          expect(user1.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));
          expect(user1.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
        });

        it("Check second player information", async () => {
          const user2 = await myContract.infoPerUser(account2.address);
          expect(user2.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user2.moneyEarned).to.be.equal(ethers.utils.parseEther("0.5"));
          expect(user2.moneyClaimed).to.be.equal(ethers.utils.parseEther("0"));
          expect(user2.active).to.be.equal(true);
          expect(user2.referringUserAddress).to.be.equal(account1.address);
          expect(user2.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
          expect(user2.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
        });

        it("Check round information", async () => {
          let round = await myContract.rounds(4);
          expect(round.userAddress).to.be.equal(account2.address);
          expect(round.number1).to.be.equal(1);
          expect(round.number2).to.be.equal(2);
          expect(round.number3).to.be.equal(3);
          expect(round.value).to.be.equal(ethers.utils.parseEther("0.1"));
        });

        it("Check general stats", async () => {
          const users = await myContract.users();
          expect(Number(users)).to.be.equal(Number(2));

          const totalMoneyAdded = await myContract.totalMoneyAdded();
          expect(totalMoneyAdded).to.be.equal(ethers.utils.parseEther("0.4"));

          const totalMoneyEarnedByPlayers = await myContract.totalMoneyEarnedByPlayers();
          expect(totalMoneyEarnedByPlayers).to.be.equal(ethers.utils.parseEther("0.5"));

          const totalMoneyClaimedByPlayers = await myContract.totalMoneyClaimedByPlayers();
          expect(totalMoneyClaimedByPlayers).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByDevs = await myContract.totalMoneyEarnedByDevs();
          expect(totalMoneyEarnedByDevs).to.be.equal(ethers.utils.parseEther("0.02"));

          const totalMoneyClaimedByDevs = await myContract.totalMoneyClaimedByDevs();
          expect(totalMoneyClaimedByDevs).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByReferrals = await myContract.totalMoneyEarnedByReferrals();
          expect(totalMoneyEarnedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));

          const totalMoneyClaimedByReferrals = await myContract.totalMoneyClaimedByReferrals();
          expect(totalMoneyClaimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));

          const moneyInContract = await myContract.getMoneyInContract();
          expect(moneyInContract).to.be.equal(ethers.utils.parseEther("7.4"));

          const currentDebt = await myContract.getCurrentDebt();
          expect(currentDebt).to.be.equal(ethers.utils.parseEther("0.522"));
        });
      });

      describe("Round # 7 - Second Player", function () {
        it("Play with 3 ether should be reverted", async () => {
          let myContractAsAccount2 = myContract.connect(account2);

          //Play Transaction
          await expect(
            myContractAsAccount2.play(ethers.constants.AddressZero, {
              value: ethers.utils.parseEther("3"),
            }),
          ).to.be.revertedWith("Cannot add money because contract could not pay if user wins");
        });

        it("Check first player information", async () => {
          const user1 = await myContract.infoPerUser(account1.address);
          expect(user1.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user1.moneyEarned).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.moneyClaimed).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.active).to.be.equal(true);
          expect(user1.referringUserAddress).to.be.equal(ethers.constants.AddressZero);
          expect(user1.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));
          expect(user1.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
        });

        it("Check second player information", async () => {
          const user2 = await myContract.infoPerUser(account2.address);
          expect(user2.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user2.moneyEarned).to.be.equal(ethers.utils.parseEther("0.5"));
          expect(user2.moneyClaimed).to.be.equal(ethers.utils.parseEther("0"));
          expect(user2.active).to.be.equal(true);
          expect(user2.referringUserAddress).to.be.equal(account1.address);
          expect(user2.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
          expect(user2.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
        });

        it("Check round information", async () => {
          let round = await myContract.rounds(4);
          expect(round.userAddress).to.be.equal(account2.address);
          expect(round.number1).to.be.equal(1);
          expect(round.number2).to.be.equal(2);
          expect(round.number3).to.be.equal(3);
          expect(round.value).to.be.equal(ethers.utils.parseEther("0.1"));
        });

        it("Check general stats", async () => {
          const users = await myContract.users();
          expect(Number(users)).to.be.equal(Number(2));

          const totalMoneyAdded = await myContract.totalMoneyAdded();
          expect(totalMoneyAdded).to.be.equal(ethers.utils.parseEther("0.4"));

          const totalMoneyEarnedByPlayers = await myContract.totalMoneyEarnedByPlayers();
          expect(totalMoneyEarnedByPlayers).to.be.equal(ethers.utils.parseEther("0.5"));

          const totalMoneyClaimedByPlayers = await myContract.totalMoneyClaimedByPlayers();
          expect(totalMoneyClaimedByPlayers).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByDevs = await myContract.totalMoneyEarnedByDevs();
          expect(totalMoneyEarnedByDevs).to.be.equal(ethers.utils.parseEther("0.02"));

          const totalMoneyClaimedByDevs = await myContract.totalMoneyClaimedByDevs();
          expect(totalMoneyClaimedByDevs).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByReferrals = await myContract.totalMoneyEarnedByReferrals();
          expect(totalMoneyEarnedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));

          const totalMoneyClaimedByReferrals = await myContract.totalMoneyClaimedByReferrals();
          expect(totalMoneyClaimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));

          const moneyInContract = await myContract.getMoneyInContract();
          expect(moneyInContract).to.be.equal(ethers.utils.parseEther("7.4"));

          const currentDebt = await myContract.getCurrentDebt();
          expect(currentDebt).to.be.equal(ethers.utils.parseEther("0.522"));
        });
      });
    });

    //3. PLAYER CLAIMINGS
    describe("3. PLAYER CLAIMINGS", function () {
      describe("First Player Claim Earnings", function () {
        it("Claim earnings", async () => {
          myContract.claimPlayerEarnings(account1.address);
        });

        it("Check first player information", async () => {
          const user1 = await myContract.infoPerUser(account1.address);
          expect(user1.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user1.moneyEarned).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.moneyClaimed).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.active).to.be.equal(true);
          expect(user1.referringUserAddress).to.be.equal(ethers.constants.AddressZero);
          expect(user1.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));
          expect(user1.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));
        });

        it("Check second player information", async () => {
          const user2 = await myContract.infoPerUser(account2.address);
          expect(user2.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user2.moneyEarned).to.be.equal(ethers.utils.parseEther("0.5"));
          expect(user2.moneyClaimed).to.be.equal(ethers.utils.parseEther("0"));
          expect(user2.active).to.be.equal(true);
          expect(user2.referringUserAddress).to.be.equal(account1.address);
          expect(user2.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
          expect(user2.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
        });

        it("Check general stats", async () => {
          const users = await myContract.users();
          expect(Number(users)).to.be.equal(Number(2));

          const totalMoneyAdded = await myContract.totalMoneyAdded();
          expect(totalMoneyAdded).to.be.equal(ethers.utils.parseEther("0.4"));

          const totalMoneyEarnedByPlayers = await myContract.totalMoneyEarnedByPlayers();
          expect(totalMoneyEarnedByPlayers).to.be.equal(ethers.utils.parseEther("0.5"));

          const totalMoneyClaimedByPlayers = await myContract.totalMoneyClaimedByPlayers();
          expect(totalMoneyClaimedByPlayers).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByDevs = await myContract.totalMoneyEarnedByDevs();
          expect(totalMoneyEarnedByDevs).to.be.equal(ethers.utils.parseEther("0.02"));

          const totalMoneyClaimedByDevs = await myContract.totalMoneyClaimedByDevs();
          expect(totalMoneyClaimedByDevs).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByReferrals = await myContract.totalMoneyEarnedByReferrals();
          expect(totalMoneyEarnedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));

          const totalMoneyClaimedByReferrals = await myContract.totalMoneyClaimedByReferrals();
          expect(totalMoneyClaimedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));

          const moneyInContract = await myContract.getMoneyInContract();
          expect(moneyInContract).to.be.equal(ethers.utils.parseEther("7.398"));

          const currentDebt = await myContract.getCurrentDebt();
          expect(currentDebt).to.be.equal(ethers.utils.parseEther("0.52"));
        });
      });

      describe("Second Player Claim Earnings", function () {
        it("Claim earnings", async () => {
          myContract.claimPlayerEarnings(account2.address);
        });

        it("Check first player information", async () => {
          const user1 = await myContract.infoPerUser(account1.address);
          expect(user1.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user1.moneyEarned).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.moneyClaimed).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.active).to.be.equal(true);
          expect(user1.referringUserAddress).to.be.equal(ethers.constants.AddressZero);
          expect(user1.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));
          expect(user1.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));
        });

        it("Check second player information", async () => {
          const user2 = await myContract.infoPerUser(account2.address);
          expect(user2.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user2.moneyEarned).to.be.equal(ethers.utils.parseEther("0.5"));
          expect(user2.moneyClaimed).to.be.equal(ethers.utils.parseEther("0.5"));
          expect(user2.active).to.be.equal(true);
          expect(user2.referringUserAddress).to.be.equal(account1.address);
          expect(user2.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
          expect(user2.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
        });

        it("Check general stats", async () => {
          const users = await myContract.users();
          expect(Number(users)).to.be.equal(Number(2));

          const totalMoneyAdded = await myContract.totalMoneyAdded();
          expect(totalMoneyAdded).to.be.equal(ethers.utils.parseEther("0.4"));

          const totalMoneyEarnedByPlayers = await myContract.totalMoneyEarnedByPlayers();
          expect(totalMoneyEarnedByPlayers).to.be.equal(ethers.utils.parseEther("0.5"));

          const totalMoneyClaimedByPlayers = await myContract.totalMoneyClaimedByPlayers();
          expect(totalMoneyClaimedByPlayers).to.be.equal(ethers.utils.parseEther("0.5"));

          const totalMoneyEarnedByDevs = await myContract.totalMoneyEarnedByDevs();
          expect(totalMoneyEarnedByDevs).to.be.equal(ethers.utils.parseEther("0.02"));

          const totalMoneyClaimedByDevs = await myContract.totalMoneyClaimedByDevs();
          expect(totalMoneyClaimedByDevs).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByReferrals = await myContract.totalMoneyEarnedByReferrals();
          expect(totalMoneyEarnedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));

          const totalMoneyClaimedByReferrals = await myContract.totalMoneyClaimedByReferrals();
          expect(totalMoneyClaimedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));

          const moneyInContract = await myContract.getMoneyInContract();
          expect(moneyInContract).to.be.equal(ethers.utils.parseEther("6.898"));

          const currentDebt = await myContract.getCurrentDebt();
          expect(currentDebt).to.be.equal(ethers.utils.parseEther("0.02"));
        });
      });

      describe("Third Player Try to Claim Earnings", function () {
        it("Third player claiming earnings should be reverted", async () => {
          await expect(myContract.claimPlayerEarnings(account3.address)).to.be.revertedWith(
            "User has not earned money",
          );
        });

        it("Check first player information", async () => {
          const user1 = await myContract.infoPerUser(account1.address);
          expect(user1.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user1.moneyEarned).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.moneyClaimed).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.active).to.be.equal(true);
          expect(user1.referringUserAddress).to.be.equal(ethers.constants.AddressZero);
          expect(user1.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));
          expect(user1.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));
        });

        it("Check second player information", async () => {
          const user2 = await myContract.infoPerUser(account2.address);
          expect(user2.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user2.moneyEarned).to.be.equal(ethers.utils.parseEther("0.5"));
          expect(user2.moneyClaimed).to.be.equal(ethers.utils.parseEther("0.5"));
          expect(user2.active).to.be.equal(true);
          expect(user2.referringUserAddress).to.be.equal(account1.address);
          expect(user2.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
          expect(user2.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
        });

        it("Check general stats", async () => {
          const users = await myContract.users();
          expect(Number(users)).to.be.equal(Number(2));

          const totalMoneyAdded = await myContract.totalMoneyAdded();
          expect(totalMoneyAdded).to.be.equal(ethers.utils.parseEther("0.4"));

          const totalMoneyEarnedByPlayers = await myContract.totalMoneyEarnedByPlayers();
          expect(totalMoneyEarnedByPlayers).to.be.equal(ethers.utils.parseEther("0.5"));

          const totalMoneyClaimedByPlayers = await myContract.totalMoneyClaimedByPlayers();
          expect(totalMoneyClaimedByPlayers).to.be.equal(ethers.utils.parseEther("0.5"));

          const totalMoneyEarnedByDevs = await myContract.totalMoneyEarnedByDevs();
          expect(totalMoneyEarnedByDevs).to.be.equal(ethers.utils.parseEther("0.02"));

          const totalMoneyClaimedByDevs = await myContract.totalMoneyClaimedByDevs();
          expect(totalMoneyClaimedByDevs).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByReferrals = await myContract.totalMoneyEarnedByReferrals();
          expect(totalMoneyEarnedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));

          const totalMoneyClaimedByReferrals = await myContract.totalMoneyClaimedByReferrals();
          expect(totalMoneyClaimedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));

          const moneyInContract = await myContract.getMoneyInContract();
          expect(moneyInContract).to.be.equal(ethers.utils.parseEther("6.898"));

          const currentDebt = await myContract.getCurrentDebt();
          expect(currentDebt).to.be.equal(ethers.utils.parseEther("0.02"));
        });
      });

      describe("Second Player Try to Claim Earnings Again", function () {
        it("Second player claiming earnings again should be reverted", async () => {
          await expect(myContract.claimPlayerEarnings(account2.address)).to.be.revertedWith(
            "User has claimed all the earnings",
          );
        });

        it("Check first player information", async () => {
          const user1 = await myContract.infoPerUser(account1.address);
          expect(user1.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user1.moneyEarned).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.moneyClaimed).to.be.equal(ethers.utils.parseEther("0"));
          expect(user1.active).to.be.equal(true);
          expect(user1.referringUserAddress).to.be.equal(ethers.constants.AddressZero);
          expect(user1.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));
          expect(user1.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));
        });

        it("Check second player information", async () => {
          const user2 = await myContract.infoPerUser(account2.address);
          expect(user2.moneyAdded).to.be.equal(ethers.utils.parseEther("0.2"));
          expect(user2.moneyEarned).to.be.equal(ethers.utils.parseEther("0.5"));
          expect(user2.moneyClaimed).to.be.equal(ethers.utils.parseEther("0.5"));
          expect(user2.active).to.be.equal(true);
          expect(user2.referringUserAddress).to.be.equal(account1.address);
          expect(user2.earnedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
          expect(user2.claimedByReferrals).to.be.equal(ethers.utils.parseEther("0"));
        });

        it("Check general stats", async () => {
          const users = await myContract.users();
          expect(Number(users)).to.be.equal(Number(2));

          const totalMoneyAdded = await myContract.totalMoneyAdded();
          expect(totalMoneyAdded).to.be.equal(ethers.utils.parseEther("0.4"));

          const totalMoneyEarnedByPlayers = await myContract.totalMoneyEarnedByPlayers();
          expect(totalMoneyEarnedByPlayers).to.be.equal(ethers.utils.parseEther("0.5"));

          const totalMoneyClaimedByPlayers = await myContract.totalMoneyClaimedByPlayers();
          expect(totalMoneyClaimedByPlayers).to.be.equal(ethers.utils.parseEther("0.5"));

          const totalMoneyEarnedByDevs = await myContract.totalMoneyEarnedByDevs();
          expect(totalMoneyEarnedByDevs).to.be.equal(ethers.utils.parseEther("0.02"));

          const totalMoneyClaimedByDevs = await myContract.totalMoneyClaimedByDevs();
          expect(totalMoneyClaimedByDevs).to.be.equal(ethers.utils.parseEther("0"));

          const totalMoneyEarnedByReferrals = await myContract.totalMoneyEarnedByReferrals();
          expect(totalMoneyEarnedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));

          const totalMoneyClaimedByReferrals = await myContract.totalMoneyClaimedByReferrals();
          expect(totalMoneyClaimedByReferrals).to.be.equal(ethers.utils.parseEther("0.002"));

          const moneyInContract = await myContract.getMoneyInContract();
          expect(moneyInContract).to.be.equal(ethers.utils.parseEther("6.898"));

          const currentDebt = await myContract.getCurrentDebt();
          expect(currentDebt).to.be.equal(ethers.utils.parseEther("0.02"));
        });
      });
    });

    //4. DEVS MANAGEMENT
    describe("4. DEVS MANAGEMENT", function () {
      describe("Add members testing", function () {
        it("Team members length should be equals to 1 after adding user a", async () => {
          await myContract.addTeamMember(account1.address, 60);
          const teamMembersLength = await myContract.getTeamMembersLength();
          expect(teamMembersLength).to.be.equal(1);
        });

        it("Adding the same user to the members list should be reverted", async () => {
          await expect(myContract.addTeamMember(account1.address, 60)).to.be.revertedWith(
            "There is a member with given address",
          );
          const teamMembersLength = await myContract.getTeamMembersLength();
          expect(teamMembersLength).to.be.equal(1);
        });

        it("Adding user b to the members list should be reverted", async () => {
          await expect(myContract.addTeamMember(account2.address, 50)).to.be.revertedWith(
            "The total new percentage cannot be more than 100",
          );
          const teamMembersLength = await myContract.getTeamMembersLength();
          expect(teamMembersLength).to.be.equal(1);
        });

        it("Team members length should be equals to 2 after adding user b", async () => {
          await myContract.addTeamMember(account2.address, 40);
          const teamMembersLength = await myContract.getTeamMembersLength();
          expect(teamMembersLength).to.be.equal(2);
        });
      });

      describe("Remove members testing", function () {
        it("Team members length should be equals to 1 after adding user a", async () => {
          await myContract.removeTeamMember(account1.address);
          const teamMembersLength = await myContract.getTeamMembersLength();
          expect(teamMembersLength).to.be.equal(1);
        });

        it("Adding user a with user b shoud be reverted", async () => {
          let myContractAsAccount2 = myContract.connect(account2);

          await expect(myContractAsAccount2.addTeamMember(account1.address, 60)).to.be.revertedWith(
            "Ownable: caller is not the owner",
          );
          const teamMembersLength = await myContract.getTeamMembersLength();
          expect(teamMembersLength).to.be.equal(1);
        });

        it("Team members length should be equals to 1 after adding user a again", async () => {
          await myContract.addTeamMember(account1.address, 60);
          const teamMembersLength = await myContract.getTeamMembersLength();
          expect(teamMembersLength).to.be.equal(2);
        });
      });
    });

    //5. DEV CLAIMINGS
    describe("5. DEVS CLAIMINGS", function () {
      it("Claiming as user c should be reverted", async () => {
        let myContractAsAccount3 = myContract.connect(account3);

        await expect(myContractAsAccount3.claimDevEarnings()).to.be.revertedWith(
          "User is not part of the team members",
        );
      });

      it("User a claims dev earnings", async () => {
        await myContract.claimDevEarnings();

        const totalMoneyClaimedByDevs = await myContract.totalMoneyClaimedByDevs();
        expect(totalMoneyClaimedByDevs).to.be.equal(ethers.utils.parseEther("0.02"));

        const moneyInContract = await myContract.getMoneyInContract();
        expect(moneyInContract).to.be.equal(ethers.utils.parseEther("6.878"));

        const currentDebt = await myContract.getCurrentDebt();
        expect(currentDebt).to.be.equal(ethers.utils.parseEther("0"));
      });

      it("User b claiming dev earnings should be reverted", async () => {
        let myContractAsAccount2 = myContract.connect(account2);

        await expect(myContractAsAccount2.claimDevEarnings()).to.be.revertedWith(
          "There is no total pending money to pay to devs",
        );

        const totalMoneyClaimedByDevs = await myContract.totalMoneyClaimedByDevs();
        expect(totalMoneyClaimedByDevs).to.be.equal(ethers.utils.parseEther("0.02"));

        const moneyInContract = await myContract.getMoneyInContract();
        expect(moneyInContract).to.be.equal(ethers.utils.parseEther("6.878"));

        const currentDebt = await myContract.getCurrentDebt();
        expect(currentDebt).to.be.equal(ethers.utils.parseEther("0"));
      });

      it("Team members length should be equals to 0 after removing a and b", async () => {
        await myContract.removeTeamMember(account2.address);
        await myContract.removeTeamMember(account1.address);
        const teamMembersLength = await myContract.getTeamMembersLength();
        expect(teamMembersLength).to.be.equal(0);
      });

      it("User a claims dev earnings should be reverted", async () => {
        await expect(myContract.claimDevEarnings()).to.be.revertedWith("There are not team members in the list");
      });
    });
  });
});

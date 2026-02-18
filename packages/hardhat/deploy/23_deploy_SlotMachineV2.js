const { ethers } = require("hardhat");

// Key Hash (same as SlotMachine deploy - Mumbai for local/mock)
const MUMBAI_KEY_HASH = "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f";

// Subscription (local mock uses 1)
const LOCAL_SUBSCRIPTION_ID = "1";

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const keyHash = MUMBAI_KEY_HASH;
  const subscriptionId = LOCAL_SUBSCRIPTION_ID;

  const vrfCoordinatorContract = await ethers.getContract("VRFCoordinatorV2PlusMock", deployer);
  const vrfCoordinatorAddress = vrfCoordinatorContract.address;

  const mockUSDTContract = await ethers.getContract("MockUSDT", deployer);
  const mockUSDTAddress = mockUSDTContract.address;

  const slotMachineV2 = await deploy("SlotMachineV2", {
    from: deployer,
    args: [subscriptionId, vrfCoordinatorAddress, keyHash, mockUSDTAddress],
    log: true,
    waitConfirmations: 1,
  });

  await vrfCoordinatorContract.addConsumer(LOCAL_SUBSCRIPTION_ID, slotMachineV2.address);

  console.log("SlotMachineV2 address: ", slotMachineV2.address);
};
module.exports.tags = ["SlotMachineV2"];
module.exports.dependencies = ["SlotMachine"];

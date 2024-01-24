const { ethers } = require("hardhat");

//Key Hash
const MUMBAI_KEY_HASH = "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f";

//Subscription
const LOCAL_SUBSCRIPTION_ID = "1";

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const keyHash = MUMBAI_KEY_HASH;
  const subscriptionId = LOCAL_SUBSCRIPTION_ID;

  const vrfCoordinatorContract = await ethers.getContract("VRFCoordinatorV2Mock", deployer);

  const vrfCoordinatorAddress = vrfCoordinatorContract.address;

  const myContract = await deploy("SlotMachine", {
    from: deployer,
    args: [subscriptionId, vrfCoordinatorAddress, keyHash],
    log: true,
    waitConfirmations: 1,
  });

  await vrfCoordinatorContract.addConsumer(LOCAL_SUBSCRIPTION_ID, myContract.address);

  console.log("Contract address: ", myContract.address);
};
module.exports.tags = ["SlotMachine"];

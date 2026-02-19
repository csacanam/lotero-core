const { ethers } = require("hardhat");
const networksConfig = require("../networks.config");

module.exports = async ({ getNamedAccounts, deployments, network }) => {
  const config = networksConfig[network.name];
  if (!config) {
    throw new Error(`No config for network "${network.name}". Add it to networks.config.js`);
  }

  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  let vrfCoordinatorAddress;
  let tokenAddress;
  let subscriptionId;

  if (config.useMock) {
    const vrfCoordinator = await ethers.getContract("VRFCoordinatorV2PlusMock", deployer);
    const token = await ethers.getContract("MockUSDT", deployer);
    vrfCoordinatorAddress = vrfCoordinator.address;
    tokenAddress = token.address;
    subscriptionId = config.subscriptionId;
  } else {
    vrfCoordinatorAddress = config.vrfCoordinator;
    tokenAddress = config.tokenAddress;
    subscriptionId = process.env[config.subscriptionIdEnv];
    if (!subscriptionId) {
      throw new Error(
        `${config.subscriptionIdEnv} must be set in .env (create subscription at vrf.chain.link)`
      );
    }
  }

  const useNativePayment = config.useNativePayment ?? false;

  const slotMachineV2 = await deploy("SlotMachineV2", {
    from: deployer,
    args: [subscriptionId, vrfCoordinatorAddress, config.keyHash, tokenAddress, useNativePayment],
    log: true,
    waitConfirmations: config.useMock ? 1 : 2,
  });

  if (config.useMock) {
    const vrfCoordinator = await ethers.getContract("VRFCoordinatorV2PlusMock", deployer);
    await vrfCoordinator.addConsumer(subscriptionId, slotMachineV2.address);
  }

  console.log("SlotMachineV2 deployed at:", slotMachineV2.address);
  if (!config.useMock) {
    console.log("Add as consumer in vrf.chain.link:", slotMachineV2.address);
  }
};

module.exports.tags = ["SlotMachineV2"];

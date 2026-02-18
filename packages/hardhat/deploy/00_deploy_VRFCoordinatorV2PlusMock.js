const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  let hardhatVrfCoordinatorV2Mock;

  await deploy("VRFCoordinatorV2PlusMock", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });

  hardhatVrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2PlusMock");

  await hardhatVrfCoordinatorV2Mock.createSubscription();

  await hardhatVrfCoordinatorV2Mock.fundSubscription(1, ethers.utils.parseEther("7"));
};
module.exports.tags = ["SlotMachine"];

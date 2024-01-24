const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  let hardhatVrfCoordinatorV2Mock;

  await deploy("MockUSDT", {
    from: deployer,
    args: [0, 0],
    log: true,
    waitConfirmations: 1,
  });

  hardhatVrfCoordinatorV2Mock = await ethers.getContract("MockUSDT");

  await hardhatVrfCoordinatorV2Mock.createSubscription();

  await hardhatVrfCoordinatorV2Mock.fundSubscription(1, ethers.utils.parseEther("7"));
};
module.exports.tags = ["SlotMachine"];

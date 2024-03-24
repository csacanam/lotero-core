const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  let hardhatVrfCoordinatorV2Mock;

  await deploy("MockUSDT", {
    from: deployer,
    log: true,
    waitConfirmations: 1,
  });
};
module.exports.tags = ["SlotMachine"];

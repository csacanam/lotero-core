const { ethers } = require("hardhat");
const networksConfig = require("../networks.config");

module.exports.skip = async ({ network }) => {
  const config = networksConfig[network.name];
  return !config?.useMock;
};

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  let hardhatVrfCoordinatorV2Mock;

  await deploy("MockUSDT", {
    from: deployer,
    log: true,
    waitConfirmations: 1,
  });
};
module.exports.tags = ["MockUSDT"];

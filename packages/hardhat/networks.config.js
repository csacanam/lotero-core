/**
 * Network config for VRF, token, and subscription.
 * Add entries here for new networks.
 *
 * useMock: true = deploy VRFCoordinatorV2PlusMock and MockUSDT
 * useMock: false = use real VRF and token (subscriptionId from env)
 * useNativePayment: true = VRF paid in native token; false = LINK (default)
 */
module.exports = {
  hardhat: {
    useMock: true,
    keyHash: "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f", // Mumbai (mock accepts any)
    subscriptionId: "1",
    useNativePayment: false,
  },
  localhost: {
    useMock: true,
    keyHash: "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f",
    subscriptionId: "1",
    useNativePayment: false,
  },
  base: {
    useMock: false,
    vrfCoordinator: "0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634",
    keyHash: "0xdc2f87677b01473c763cb0aee938ed3341512f6057324a584e5944e786144d70",
    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    subscriptionIdEnv: "BASE_VRF_SUBSCRIPTION_ID",
    useNativePayment: false,
  },
  arbitrum: {
    useMock: false,
    vrfCoordinator: "0x3C0Ca683b403E37668AE3DC4FB62F4B29B6f7a3e",
    keyHash: "0x8472ba59cf7134dfe321f4d61a430c4857e8b19cdd5230b09952a92671c24409",
    tokenAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
    subscriptionIdEnv: "ARBITRUM_VRF_SUBSCRIPTION_ID",
    useNativePayment: false,
  },
};

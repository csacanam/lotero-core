/** Minimal SlotMachineV2 ABI for agent relay */
export const SlotMachineV2Abi = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "requestId", type: "uint256" },
      { indexed: true, name: "payer", type: "address" },
      { indexed: true, name: "player", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "SpinRequested",
    type: "event",
  },
  {
    inputs: [
      { name: "player", type: "address" },
      { name: "referringUserAddress", type: "address" },
      { name: "amountToPlay", type: "uint256" },
    ],
    name: "playFor",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "roundId", type: "uint256" }],
    name: "getRoundInfo",
    outputs: [
      {
        components: [
          { name: "userAddress", type: "address" },
          { name: "number1", type: "uint8" },
          { name: "number2", type: "uint8" },
          { name: "number3", type: "uint8" },
          { name: "value", type: "uint256" },
          { name: "hasWon", type: "bool" },
          { name: "prize", type: "uint256" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "requestId", type: "uint256" }],
    name: "isResolved",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "address" }],
    name: "infoPerUser",
    outputs: [
      { name: "moneyAdded", type: "uint256" },
      { name: "moneyEarned", type: "uint256" },
      { name: "moneyClaimed", type: "uint256" },
      { name: "active", type: "bool" },
      { name: "referringUserAddress", type: "address" },
      { name: "earnedByReferrals", type: "uint256" },
      { name: "claimedByReferrals", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMoneyInContract",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMaxValueToPlay",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isClosed",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "useNativePayment",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
];

/** VRF Coordinator V2 Plus - getSubscription only */
export const VRFCoordinatorAbi = [
  {
    inputs: [{ name: "_subId", type: "uint256" }],
    name: "getSubscription",
    outputs: [
      { name: "balance", type: "uint96" },
      { name: "nativeBalance", type: "uint96" },
      { name: "reqCount", type: "uint64" },
      { name: "owner", type: "address" },
      { name: "consumers", type: "address[]" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

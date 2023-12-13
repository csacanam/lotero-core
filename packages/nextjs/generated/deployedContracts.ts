const contracts = {
  31337: [
    {
      chainId: "31337",
      name: "localhost",
      contracts: {
        SlotMachine: {
          address: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
          abi: [
            {
              inputs: [
                {
                  internalType: "uint64",
                  name: "_subscriptionId",
                  type: "uint64",
                },
                {
                  internalType: "address",
                  name: "_vrfCoordinator",
                  type: "address",
                },
                {
                  internalType: "bytes32",
                  name: "_keyHash",
                  type: "bytes32",
                },
              ],
              stateMutability: "payable",
              type: "constructor",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "have",
                  type: "address",
                },
                {
                  internalType: "address",
                  name: "want",
                  type: "address",
                },
              ],
              name: "OnlyCoordinatorCanFulfill",
              type: "error",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: false,
                  internalType: "enum SlotMachine.Symbols",
                  name: "symbol",
                  type: "uint8",
                },
              ],
              name: "NewSymbol",
              type: "event",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: "address",
                  name: "previousOwner",
                  type: "address",
                },
                {
                  indexed: true,
                  internalType: "address",
                  name: "newOwner",
                  type: "address",
                },
              ],
              name: "OwnershipTransferred",
              type: "event",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: "uint256",
                  name: "reqId",
                  type: "uint256",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "n1",
                  type: "uint256",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "n2",
                  type: "uint256",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "n3",
                  type: "uint256",
                },
              ],
              name: "ReceivedRandomness",
              type: "event",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: "uint256",
                  name: "reqId",
                  type: "uint256",
                },
                {
                  indexed: true,
                  internalType: "address",
                  name: "invoker",
                  type: "address",
                },
              ],
              name: "RequestedRandomness",
              type: "event",
            },
            {
              inputs: [],
              name: "DEV_FEE",
              outputs: [
                {
                  internalType: "uint8",
                  name: "",
                  type: "uint8",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "INVALID_NUMBER",
              outputs: [
                {
                  internalType: "uint8",
                  name: "",
                  type: "uint8",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "MINIMUM_VALUE_TO_PLAY",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "REFERRAL_FEE",
              outputs: [
                {
                  internalType: "uint8",
                  name: "",
                  type: "uint8",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "teamMemberAddress",
                  type: "address",
                },
                {
                  internalType: "uint8",
                  name: "percentage",
                  type: "uint8",
                },
              ],
              name: "addTeamMember",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [],
              name: "claimDevEarnings",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "userAddress",
                  type: "address",
                },
              ],
              name: "claimPlayerEarnings",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [],
              name: "getCurrentDebt",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "getMaxValueToPlay",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "getMoneyInContract",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "roundId",
                  type: "uint256",
                },
              ],
              name: "getRoundInfo",
              outputs: [
                {
                  components: [
                    {
                      internalType: "address",
                      name: "userAddress",
                      type: "address",
                    },
                    {
                      internalType: "uint8",
                      name: "number1",
                      type: "uint8",
                    },
                    {
                      internalType: "uint8",
                      name: "number2",
                      type: "uint8",
                    },
                    {
                      internalType: "uint8",
                      name: "number3",
                      type: "uint8",
                    },
                    {
                      internalType: "uint256",
                      name: "value",
                      type: "uint256",
                    },
                  ],
                  internalType: "struct SlotMachine.Round",
                  name: "",
                  type: "tuple",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "getTeamMemberList",
              outputs: [
                {
                  components: [
                    {
                      internalType: "address",
                      name: "devAddress",
                      type: "address",
                    },
                    {
                      internalType: "uint8",
                      name: "percentage",
                      type: "uint8",
                    },
                  ],
                  internalType: "struct SlotMachine.TeamMember[]",
                  name: "",
                  type: "tuple[]",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "getTeamMembersLength",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "",
                  type: "address",
                },
              ],
              name: "infoPerUser",
              outputs: [
                {
                  internalType: "uint256",
                  name: "moneyAdded",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "moneyEarned",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "moneyClaimed",
                  type: "uint256",
                },
                {
                  internalType: "bool",
                  name: "active",
                  type: "bool",
                },
                {
                  internalType: "address",
                  name: "referringUserAddress",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "earnedByReferrals",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "claimedByReferrals",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "isClosed",
              outputs: [
                {
                  internalType: "bool",
                  name: "",
                  type: "bool",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "owner",
              outputs: [
                {
                  internalType: "address",
                  name: "",
                  type: "address",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "referringUserAddress",
                  type: "address",
                },
              ],
              name: "play",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "payable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint8",
                  name: "",
                  type: "uint8",
                },
              ],
              name: "prize",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "requestId",
                  type: "uint256",
                },
                {
                  internalType: "uint256[]",
                  name: "randomWords",
                  type: "uint256[]",
                },
              ],
              name: "rawFulfillRandomWords",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              name: "reel1",
              outputs: [
                {
                  internalType: "enum SlotMachine.Symbols",
                  name: "",
                  type: "uint8",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              name: "reel2",
              outputs: [
                {
                  internalType: "enum SlotMachine.Symbols",
                  name: "",
                  type: "uint8",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              name: "reel3",
              outputs: [
                {
                  internalType: "enum SlotMachine.Symbols",
                  name: "",
                  type: "uint8",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "teamMemberAddress",
                  type: "address",
                },
              ],
              name: "removeTeamMember",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [],
              name: "renounceOwnership",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              name: "rounds",
              outputs: [
                {
                  internalType: "address",
                  name: "userAddress",
                  type: "address",
                },
                {
                  internalType: "uint8",
                  name: "number1",
                  type: "uint8",
                },
                {
                  internalType: "uint8",
                  name: "number2",
                  type: "uint8",
                },
                {
                  internalType: "uint8",
                  name: "number3",
                  type: "uint8",
                },
                {
                  internalType: "uint256",
                  name: "value",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              name: "teamMembers",
              outputs: [
                {
                  internalType: "address",
                  name: "devAddress",
                  type: "address",
                },
                {
                  internalType: "uint8",
                  name: "percentage",
                  type: "uint8",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "totalMoneyAdded",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "totalMoneyClaimedByDevs",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "totalMoneyClaimedByPlayers",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "totalMoneyClaimedByReferrals",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "totalMoneyEarnedByDevs",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "totalMoneyEarnedByPlayers",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "totalMoneyEarnedByReferrals",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "newOwner",
                  type: "address",
                },
              ],
              name: "transferOwnership",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [],
              name: "users",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              stateMutability: "payable",
              type: "receive",
            },
          ],
        },
        VRFCoordinatorV2Mock: {
          address: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          abi: [
            {
              inputs: [
                {
                  internalType: "uint96",
                  name: "_baseFee",
                  type: "uint96",
                },
                {
                  internalType: "uint96",
                  name: "_gasPriceLink",
                  type: "uint96",
                },
              ],
              stateMutability: "nonpayable",
              type: "constructor",
            },
            {
              inputs: [],
              name: "InsufficientBalance",
              type: "error",
            },
            {
              inputs: [],
              name: "InvalidConsumer",
              type: "error",
            },
            {
              inputs: [],
              name: "InvalidRandomWords",
              type: "error",
            },
            {
              inputs: [],
              name: "InvalidSubscription",
              type: "error",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "owner",
                  type: "address",
                },
              ],
              name: "MustBeSubOwner",
              type: "error",
            },
            {
              inputs: [],
              name: "TooManyConsumers",
              type: "error",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: "uint64",
                  name: "subId",
                  type: "uint64",
                },
                {
                  indexed: false,
                  internalType: "address",
                  name: "consumer",
                  type: "address",
                },
              ],
              name: "ConsumerAdded",
              type: "event",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: "uint64",
                  name: "subId",
                  type: "uint64",
                },
                {
                  indexed: false,
                  internalType: "address",
                  name: "consumer",
                  type: "address",
                },
              ],
              name: "ConsumerRemoved",
              type: "event",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: "uint256",
                  name: "requestId",
                  type: "uint256",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "outputSeed",
                  type: "uint256",
                },
                {
                  indexed: false,
                  internalType: "uint96",
                  name: "payment",
                  type: "uint96",
                },
                {
                  indexed: false,
                  internalType: "bool",
                  name: "success",
                  type: "bool",
                },
              ],
              name: "RandomWordsFulfilled",
              type: "event",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: "bytes32",
                  name: "keyHash",
                  type: "bytes32",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "requestId",
                  type: "uint256",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "preSeed",
                  type: "uint256",
                },
                {
                  indexed: true,
                  internalType: "uint64",
                  name: "subId",
                  type: "uint64",
                },
                {
                  indexed: false,
                  internalType: "uint16",
                  name: "minimumRequestConfirmations",
                  type: "uint16",
                },
                {
                  indexed: false,
                  internalType: "uint32",
                  name: "callbackGasLimit",
                  type: "uint32",
                },
                {
                  indexed: false,
                  internalType: "uint32",
                  name: "numWords",
                  type: "uint32",
                },
                {
                  indexed: true,
                  internalType: "address",
                  name: "sender",
                  type: "address",
                },
              ],
              name: "RandomWordsRequested",
              type: "event",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: "uint64",
                  name: "subId",
                  type: "uint64",
                },
                {
                  indexed: false,
                  internalType: "address",
                  name: "to",
                  type: "address",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "amount",
                  type: "uint256",
                },
              ],
              name: "SubscriptionCanceled",
              type: "event",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: "uint64",
                  name: "subId",
                  type: "uint64",
                },
                {
                  indexed: false,
                  internalType: "address",
                  name: "owner",
                  type: "address",
                },
              ],
              name: "SubscriptionCreated",
              type: "event",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: "uint64",
                  name: "subId",
                  type: "uint64",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "oldBalance",
                  type: "uint256",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "newBalance",
                  type: "uint256",
                },
              ],
              name: "SubscriptionFunded",
              type: "event",
            },
            {
              inputs: [],
              name: "BASE_FEE",
              outputs: [
                {
                  internalType: "uint96",
                  name: "",
                  type: "uint96",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "GAS_PRICE_LINK",
              outputs: [
                {
                  internalType: "uint96",
                  name: "",
                  type: "uint96",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "MAX_CONSUMERS",
              outputs: [
                {
                  internalType: "uint16",
                  name: "",
                  type: "uint16",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint64",
                  name: "_subId",
                  type: "uint64",
                },
              ],
              name: "acceptSubscriptionOwnerTransfer",
              outputs: [],
              stateMutability: "pure",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint64",
                  name: "_subId",
                  type: "uint64",
                },
                {
                  internalType: "address",
                  name: "_consumer",
                  type: "address",
                },
              ],
              name: "addConsumer",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint64",
                  name: "_subId",
                  type: "uint64",
                },
                {
                  internalType: "address",
                  name: "_to",
                  type: "address",
                },
              ],
              name: "cancelSubscription",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint64",
                  name: "_subId",
                  type: "uint64",
                },
                {
                  internalType: "address",
                  name: "_consumer",
                  type: "address",
                },
              ],
              name: "consumerIsAdded",
              outputs: [
                {
                  internalType: "bool",
                  name: "",
                  type: "bool",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "createSubscription",
              outputs: [
                {
                  internalType: "uint64",
                  name: "_subId",
                  type: "uint64",
                },
              ],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "_requestId",
                  type: "uint256",
                },
                {
                  internalType: "address",
                  name: "_consumer",
                  type: "address",
                },
              ],
              name: "fulfillRandomWords",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint256",
                  name: "_requestId",
                  type: "uint256",
                },
                {
                  internalType: "address",
                  name: "_consumer",
                  type: "address",
                },
                {
                  internalType: "uint256[]",
                  name: "_words",
                  type: "uint256[]",
                },
              ],
              name: "fulfillRandomWordsWithOverride",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint64",
                  name: "_subId",
                  type: "uint64",
                },
                {
                  internalType: "uint96",
                  name: "_amount",
                  type: "uint96",
                },
              ],
              name: "fundSubscription",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [],
              name: "getConfig",
              outputs: [
                {
                  internalType: "uint16",
                  name: "minimumRequestConfirmations",
                  type: "uint16",
                },
                {
                  internalType: "uint32",
                  name: "maxGasLimit",
                  type: "uint32",
                },
                {
                  internalType: "uint32",
                  name: "stalenessSeconds",
                  type: "uint32",
                },
                {
                  internalType: "uint32",
                  name: "gasAfterPaymentCalculation",
                  type: "uint32",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "getFallbackWeiPerUnitLink",
              outputs: [
                {
                  internalType: "int256",
                  name: "",
                  type: "int256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "getFeeConfig",
              outputs: [
                {
                  internalType: "uint32",
                  name: "fulfillmentFlatFeeLinkPPMTier1",
                  type: "uint32",
                },
                {
                  internalType: "uint32",
                  name: "fulfillmentFlatFeeLinkPPMTier2",
                  type: "uint32",
                },
                {
                  internalType: "uint32",
                  name: "fulfillmentFlatFeeLinkPPMTier3",
                  type: "uint32",
                },
                {
                  internalType: "uint32",
                  name: "fulfillmentFlatFeeLinkPPMTier4",
                  type: "uint32",
                },
                {
                  internalType: "uint32",
                  name: "fulfillmentFlatFeeLinkPPMTier5",
                  type: "uint32",
                },
                {
                  internalType: "uint24",
                  name: "reqsForTier2",
                  type: "uint24",
                },
                {
                  internalType: "uint24",
                  name: "reqsForTier3",
                  type: "uint24",
                },
                {
                  internalType: "uint24",
                  name: "reqsForTier4",
                  type: "uint24",
                },
                {
                  internalType: "uint24",
                  name: "reqsForTier5",
                  type: "uint24",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "getRequestConfig",
              outputs: [
                {
                  internalType: "uint16",
                  name: "",
                  type: "uint16",
                },
                {
                  internalType: "uint32",
                  name: "",
                  type: "uint32",
                },
                {
                  internalType: "bytes32[]",
                  name: "",
                  type: "bytes32[]",
                },
              ],
              stateMutability: "pure",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint64",
                  name: "_subId",
                  type: "uint64",
                },
              ],
              name: "getSubscription",
              outputs: [
                {
                  internalType: "uint96",
                  name: "balance",
                  type: "uint96",
                },
                {
                  internalType: "uint64",
                  name: "reqCount",
                  type: "uint64",
                },
                {
                  internalType: "address",
                  name: "owner",
                  type: "address",
                },
                {
                  internalType: "address[]",
                  name: "consumers",
                  type: "address[]",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint64",
                  name: "subId",
                  type: "uint64",
                },
              ],
              name: "pendingRequestExists",
              outputs: [
                {
                  internalType: "bool",
                  name: "",
                  type: "bool",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint64",
                  name: "_subId",
                  type: "uint64",
                },
                {
                  internalType: "address",
                  name: "_consumer",
                  type: "address",
                },
              ],
              name: "removeConsumer",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "bytes32",
                  name: "_keyHash",
                  type: "bytes32",
                },
                {
                  internalType: "uint64",
                  name: "_subId",
                  type: "uint64",
                },
                {
                  internalType: "uint16",
                  name: "_minimumRequestConfirmations",
                  type: "uint16",
                },
                {
                  internalType: "uint32",
                  name: "_callbackGasLimit",
                  type: "uint32",
                },
                {
                  internalType: "uint32",
                  name: "_numWords",
                  type: "uint32",
                },
              ],
              name: "requestRandomWords",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "uint64",
                  name: "_subId",
                  type: "uint64",
                },
                {
                  internalType: "address",
                  name: "_newOwner",
                  type: "address",
                },
              ],
              name: "requestSubscriptionOwnerTransfer",
              outputs: [],
              stateMutability: "pure",
              type: "function",
            },
          ],
        },
      },
    },
  ],
} as const;

export default contracts;

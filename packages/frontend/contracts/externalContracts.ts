import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

const externalContracts = {
  421614: [
    {
      chainId: "421614",
      name: "Arbitrum Sepolia",
      contracts: {
        SlotMachine: {
          address: "0x3fb19E6c77dd18e8ceC1662ec3bbd7D3a088B88a",
          abi: [
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
              inputs: [
                {
                  internalType: "address",
                  name: "to",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "amount",
                  type: "uint256",
                },
              ],
              name: "depositUsdtTokens",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
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
                {
                  internalType: "address",
                  name: "_usdtTokenAddress",
                  type: "address",
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
              inputs: [
                {
                  internalType: "address",
                  name: "owner",
                  type: "address",
                },
              ],
              name: "OwnableInvalidOwner",
              type: "error",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "account",
                  type: "address",
                },
              ],
              name: "OwnableUnauthorizedAccount",
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
              inputs: [
                {
                  internalType: "address",
                  name: "referringUserAddress",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "amountToPlay",
                  type: "uint256",
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
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: "uint256",
                  name: "requestId",
                  type: "uint256",
                },
                {
                  indexed: true,
                  internalType: "address",
                  name: "payer",
                  type: "address",
                },
                {
                  indexed: true,
                  internalType: "address",
                  name: "player",
                  type: "address",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "amount",
                  type: "uint256",
                },
              ],
              name: "SpinRequested",
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
                  indexed: true,
                  internalType: "address",
                  name: "player",
                  type: "address",
                },
                {
                  indexed: false,
                  internalType: "bool",
                  name: "hasWon",
                  type: "bool",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "prize",
                  type: "uint256",
                },
                {
                  indexed: false,
                  internalType: "uint8",
                  name: "n1",
                  type: "uint8",
                },
                {
                  indexed: false,
                  internalType: "uint8",
                  name: "n2",
                  type: "uint8",
                },
                {
                  indexed: false,
                  internalType: "uint8",
                  name: "n3",
                  type: "uint8",
                },
              ],
              name: "SpinResolved",
              type: "event",
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
              stateMutability: "payable",
              type: "receive",
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
                    {
                      internalType: "bool",
                      name: "hasWon",
                      type: "bool",
                    },
                    {
                      internalType: "uint256",
                      name: "prize",
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
              name: "getRoundsList",
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
                    {
                      internalType: "bool",
                      name: "hasWon",
                      type: "bool",
                    },
                    {
                      internalType: "uint256",
                      name: "prize",
                      type: "uint256",
                    },
                  ],
                  internalType: "struct SlotMachine.Round[]",
                  name: "",
                  type: "tuple[]",
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
                {
                  internalType: "bool",
                  name: "hasWon",
                  type: "bool",
                },
                {
                  internalType: "uint256",
                  name: "prize",
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
              name: "roundsList",
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
                {
                  internalType: "bool",
                  name: "hasWon",
                  type: "bool",
                },
                {
                  internalType: "uint256",
                  name: "prize",
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
              inputs: [],
              name: "usdtToken",
              outputs: [
                {
                  internalType: "contract IERC20",
                  name: "",
                  type: "address",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "usdtTokenAddress",
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
          ],
        },
        USDT: {
          address: "0x26E33626259cbb30c24a0b3aDA9613c87F0e859d",
          abi: [
            {
              inputs: [
                {
                  internalType: "address",
                  name: "spender",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "value",
                  type: "uint256",
                },
              ],
              name: "approve",
              outputs: [
                {
                  internalType: "bool",
                  name: "",
                  type: "bool",
                },
              ],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [],
              stateMutability: "nonpayable",
              type: "constructor",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "spender",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "allowance",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "needed",
                  type: "uint256",
                },
              ],
              name: "ERC20InsufficientAllowance",
              type: "error",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "sender",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "balance",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "needed",
                  type: "uint256",
                },
              ],
              name: "ERC20InsufficientBalance",
              type: "error",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "approver",
                  type: "address",
                },
              ],
              name: "ERC20InvalidApprover",
              type: "error",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "receiver",
                  type: "address",
                },
              ],
              name: "ERC20InvalidReceiver",
              type: "error",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "sender",
                  type: "address",
                },
              ],
              name: "ERC20InvalidSender",
              type: "error",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "spender",
                  type: "address",
                },
              ],
              name: "ERC20InvalidSpender",
              type: "error",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: "address",
                  name: "owner",
                  type: "address",
                },
                {
                  indexed: true,
                  internalType: "address",
                  name: "spender",
                  type: "address",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "value",
                  type: "uint256",
                },
              ],
              name: "Approval",
              type: "event",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "to",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "value",
                  type: "uint256",
                },
              ],
              name: "transfer",
              outputs: [
                {
                  internalType: "bool",
                  name: "",
                  type: "bool",
                },
              ],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              anonymous: false,
              inputs: [
                {
                  indexed: true,
                  internalType: "address",
                  name: "from",
                  type: "address",
                },
                {
                  indexed: true,
                  internalType: "address",
                  name: "to",
                  type: "address",
                },
                {
                  indexed: false,
                  internalType: "uint256",
                  name: "value",
                  type: "uint256",
                },
              ],
              name: "Transfer",
              type: "event",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "from",
                  type: "address",
                },
                {
                  internalType: "address",
                  name: "to",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "value",
                  type: "uint256",
                },
              ],
              name: "transferFrom",
              outputs: [
                {
                  internalType: "bool",
                  name: "",
                  type: "bool",
                },
              ],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "owner",
                  type: "address",
                },
                {
                  internalType: "address",
                  name: "spender",
                  type: "address",
                },
              ],
              name: "allowance",
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
                  name: "account",
                  type: "address",
                },
              ],
              name: "balanceOf",
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
              name: "decimals",
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
              name: "name",
              outputs: [
                {
                  internalType: "string",
                  name: "",
                  type: "string",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "symbol",
              outputs: [
                {
                  internalType: "string",
                  name: "",
                  type: "string",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "totalSupply",
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
          ],
        },
      },
    },
  ],
} as const;

export default externalContracts satisfies GenericContractsDeclaration;

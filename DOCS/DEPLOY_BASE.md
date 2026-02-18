# Deploying to Base Mainnet

Step-by-step guide to deploy Lotero on Base.

---

## Prerequisites

- Wallet with **ETH** on Base (for gas)
- Wallet with **LINK** on Base (to fund the VRF subscription)
- [Alchemy](https://alchemy.com) or [Infura](https://infura.io) account for RPC

---

## Step 1: Configure `.env`

In `packages/hardhat/.env`:

```env
DEPLOYER_PRIVATE_KEY=0x...          # Your private key (never commit it!)
ALCHEMY_API_KEY=your_api_key       # For Base RPC
ETHERSCAN_API_KEY=your_etherscan_key  # Basescan uses the same API key as Etherscan
```

---

## Step 2: Create VRF subscription on Chainlink

1. Go to [vrf.chain.link](https://vrf.chain.link)
2. Connect the same wallet you will use for deploy
3. Create a subscription on **Base Mainnet**
4. Fund the subscription with **LINK** (recommended: ~10–20 LINK to start)
5. Copy the **Subscription ID** (number, e.g. 123)

Add to `.env`:

```env
BASE_VRF_SUBSCRIPTION_ID=123
```

---

## Step 3: Deploy

```bash
cd packages/hardhat
yarn deploy --network base --tags SlotMachine       # Only SlotMachine
# or
yarn deploy --network base --tags SlotMachineV2     # Only SlotMachineV2
```

Pass `--network` and `--tags` to choose network and which contract(s) to deploy. This skips the mock VRF and MockUSDT used for local tests.

Network configuration is in `packages/hardhat/networks.config.js`. Base uses real VRF, USDC, and requires `BASE_VRF_SUBSCRIPTION_ID` in `.env`.

---

## Step 4: Add consumer to the VRF subscription

1. On [vrf.chain.link](https://vrf.chain.link), in your subscription
2. Click **Add consumer**
3. Enter the deployed **SlotMachine** contract address

---

## Step 5: Fund the contract with USDC

Send at least **30 USDC** to the contract address (from MetaMask or any wallet). The contract needs liquidity to pay prizes. More USDC increases the bet limit (`getMaxValueToPlay()`).

---

## Step 6: Verify contracts (optional)

```bash
yarn hardhat verify --network base <CONTRACT_ADDRESS> <SUBSCRIPTION_ID> <VRF_COORDINATOR> <KEY_HASH> <USDC_ADDRESS> <USE_NATIVE_PAYMENT>
```

- `USE_NATIVE_PAYMENT`: `false` (LINK) or `true` (native token)

Example (SlotMachineV2, LINK payment):

```bash
yarn hardhat verify --network base 0x... 123 0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634 0x00b81b5a830cb0a4009fbd8904de511e28631e62ce5ad231373d3cdad373ccab 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 false
```

---

## Reference addresses (Base Mainnet)

| Resource        | Address                                      |
| --------------- | -------------------------------------------- |
| VRF Coordinator | `0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634` |
| USDC            | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| LINK            | `0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196` |

**Key Hash (30 gwei):** `0xdc2f87677b01473c763cb0aee938ed3341512f6057324a584e5944e786144d70`

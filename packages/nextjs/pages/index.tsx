import { useEffect } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";

const SlotMachine = (): JSX.Element => {
  useEffect(() => {
    // Execute the game logic when the page loads
    //play();
  }, []);

  //Token Contract
  const tokenIsApproved = false;

  //Get address of current user
  const { address: connectedAddress } = useAccount();

  //Get user balance of token to play
  const { data: tokenUserBalance } = useScaffoldContractRead({
    contractName: "MockUSDT",
    functionName: "balanceOf",
    args: [connectedAddress],
  });

  //Create userInfo object
  const userInfo = {
    moneyAdded: 0,
    moneyEarned: 0,
    moneyClaimed: 0,
    active: false,
    referringUserAddress: "0x0000000000000000000000000000000000000000",
    earnedByReferrals: 0,
    claimedByReferrals: 0,
  };

  //Get info from current user
  const { data: userInfoTx } = useScaffoldContractRead({
    contractName: "SlotMachine",
    functionName: "infoPerUser",
    args: [connectedAddress],
  });

  if (userInfoTx) {
    const values = Object.values(userInfoTx);
    userInfo.moneyAdded = values[0];
    userInfo.moneyEarned = values[1];
    userInfo.moneyClaimed = values[2];
    userInfo.active = values[3];
    userInfo.referringUserAddress = values[4];
    userInfo.earnedByReferrals = values[5];
    userInfo.claimedByReferrals = values[6];
  }

  //console.log("Balance: ", tokenUserBalance);
  //console.log("Money to Claim: ", userInfo.moneyEarned - userInfo.moneyClaimed)

  //Play function
  const { writeAsync } = useScaffoldContractWrite({
    contractName: "SlotMachine",
    functionName: "play",
    args: ["0x0000000000000000000000000000000000000000", BigInt(1000000)],
    blockConfirmations: 1,
    onBlockConfirmation: txnReceipt => {
      console.log("Transaction blockHash", txnReceipt.blockHash);
    },
  });

  const approveToken = (): void => {
    console.log("Approve token");
  };

  /*const play = (): void => {
    // Logic to interact with the smart contract and get game results


    // Assume you got slot results as random numbers (0-9)
    const result1 = getRandomNumber();
    const result2 = getRandomNumber();
    const result3 = getRandomNumber();

    // Display results in the slots
    const slot1 = document.getElementById("slot1");
    const slot2 = document.getElementById("slot2");
    const slot3 = document.getElementById("slot3");

    if (slot1 && slot2 && slot3) {
      slot1.innerText = result1.toString();
      slot2.innerText = result2.toString();
      slot3.innerText = result3.toString();
    }

    // More logic to interact with the contract and show the result
  };*/

  /*const getRandomNumber = (): number => {
    return Math.floor(Math.random() * 10);
  };*/

  return (
    <div className="container">
      <h1 id="slotMachineTitle" className="text-center mb-8">
        <span className="block text-4xl font-bold">Welcome to Lotero</span>
        <span className="block text-2xl mb-2">A decentralized slot machine with juicy rewards! 🚀</span>
      </h1>

      <div className="columns">
        {/* First Column */}
        <div className="column">
          <div className="row">
            <h2>Balance</h2>
          </div>
          <div className="row">
            <div className="balance">
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="#26a69a"></circle>
                  <rect width="18" height="5" x="15" y="13" fill="#fff"></rect>
                  <path
                    fill="#fff"
                    d="M24,21c-4.457,0-12,0.737-12,3.5S19.543,28,24,28s12-0.737,12-3.5S28.457,21,24,21z M24,26 c-5.523,0-10-0.895-10-2c0-1.105,4.477-2,10-2s10,0.895,10,2C34,25.105,29.523,26,24,26z"
                  ></path>
                  <path
                    fill="#fff"
                    d="M24,24c1.095,0,2.093-0.037,3-0.098V13h-6v10.902C21.907,23.963,22.905,24,24,24z"
                  ></path>
                  <path
                    fill="#fff"
                    d="M25.723,25.968c-0.111,0.004-0.223,0.007-0.336,0.01C24.932,25.991,24.472,26,24,26 s-0.932-0.009-1.387-0.021c-0.113-0.003-0.225-0.006-0.336-0.01c-0.435-0.015-0.863-0.034-1.277-0.06V36h6V25.908 C26.586,25.934,26.158,25.953,25.723,25.968z"
                  ></path>
                </svg>
              </span>
              <span>{formatUnits(tokenUserBalance || 0n, 6)?.toString()}</span>
            </div>
          </div>
          <div className="row">
            <button className="pay-table-button">Pay table</button>
          </div>
        </div>

        {/* Second Column */}
        <div className="column">
          <div className="row">
            <h2>Rewards</h2>
            <button className="claim-button">Claim</button>
          </div>
          <div className="row">
            <div className="wins">
              <span>Wins:</span>
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="#26a69a"></circle>
                  <rect width="18" height="5" x="15" y="13" fill="#fff"></rect>
                  <path
                    fill="#fff"
                    d="M24,21c-4.457,0-12,0.737-12,3.5S19.543,28,24,28s12-0.737,12-3.5S28.457,21,24,21z M24,26 c-5.523,0-10-0.895-10-2c0-1.105,4.477-2,10-2s10,0.895,10,2C34,25.105,29.523,26,24,26z"
                  ></path>
                  <path
                    fill="#fff"
                    d="M24,24c1.095,0,2.093-0.037,3-0.098V13h-6v10.902C21.907,23.963,22.905,24,24,24z"
                  ></path>
                  <path
                    fill="#fff"
                    d="M25.723,25.968c-0.111,0.004-0.223,0.007-0.336,0.01C24.932,25.991,24.472,26,24,26 s-0.932-0.009-1.387-0.021c-0.113-0.003-0.225-0.006-0.336-0.01c-0.435-0.015-0.863-0.034-1.277-0.06V36h6V25.908 C26.586,25.934,26.158,25.953,25.723,25.968z"
                  ></path>
                </svg>
              </span>
              <span>{formatUnits(BigInt(userInfo.moneyEarned - userInfo.moneyClaimed), 6)?.toString()}</span>
            </div>
          </div>
          <div className="row">
            <div className="referrals">
              <span>Referrals:</span>
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="#26a69a"></circle>
                  <rect width="18" height="5" x="15" y="13" fill="#fff"></rect>
                  <path
                    fill="#fff"
                    d="M24,21c-4.457,0-12,0.737-12,3.5S19.543,28,24,28s12-0.737,12-3.5S28.457,21,24,21z M24,26 c-5.523,0-10-0.895-10-2c0-1.105,4.477-2,10-2s10,0.895,10,2C34,25.105,29.523,26,24,26z"
                  ></path>
                  <path
                    fill="#fff"
                    d="M24,24c1.095,0,2.093-0.037,3-0.098V13h-6v10.902C21.907,23.963,22.905,24,24,24z"
                  ></path>
                  <path
                    fill="#fff"
                    d="M25.723,25.968c-0.111,0.004-0.223,0.007-0.336,0.01C24.932,25.991,24.472,26,24,26 s-0.932-0.009-1.387-0.021c-0.113-0.003-0.225-0.006-0.336-0.01c-0.435-0.015-0.863-0.034-1.277-0.06V36h6V25.908 C26.586,25.934,26.158,25.953,25.723,25.968z"
                  ></path>
                </svg>
              </span>
              <span>
                {formatUnits(BigInt(userInfo.earnedByReferrals - userInfo.claimedByReferrals), 6)?.toString()}
              </span>
              <span className="info-icon">ℹ️</span>
            </div>
          </div>
        </div>
      </div>

      <div className="slots">
        {/* Integrated the slot reels from provided HTML */}
        <div className="reel"></div>
        <div className="reel"></div>
        <div className="reel"></div>
      </div>

      {/* Integrated the result display element */}
      <div id="result">{/* Here will be the game result */}</div>

      <div className="play-form">
        {/* Spin button */}
        {tokenIsApproved ? (
          <button
            className="btn btn-secondary btn-sm action-button spin-button"
            type="button"
            onClick={() => writeAsync()}
          >
            Play
          </button>
        ) : (
          <button
            className="btn btn-secondary btn-sm action-button spin-button"
            type="button"
            onClick={() => approveToken()}
          >
            Approve
          </button>
        )}
      </div>
    </div>
  );
};

export default SlotMachine;

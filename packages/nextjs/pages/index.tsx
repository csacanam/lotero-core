import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import { useAccount, useContractEvent, useContractRead, useContractWrite } from "wagmi";
import externalContracts from "~~/contracts/externalContracts";
import scaffoldConfig from "~~/scaffold.config";

const SlotMachine = (): JSX.Element => {
  //General variables
  let requestedReqId: bigint;
  let receivedReqId: bigint;
  const reel = ["DOGE", "DOGE", "DOGE", "DOGE", "DOGE", "BNB", "BNB", "ETH", "ETH", "BTC"];

  //Results of game
  const [firstResult, setFirstResult] = useState<number>(0);
  const [secondResult, setSecondResult] = useState<number>(0);
  const [thirdResult, setThirdResult] = useState<number>(0);

  //Slot Machine UI Variables
  const num_icons = 10;
  const icon_height = 79;
  let isRolling = false;
  const rollIntervalRef = useRef<NodeJS.Timer | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false); // State to track if the user is playing

  // Audio element reference
  const casinoSoundRef = useRef<HTMLAudioElement | null>(null);
  console.log("isRolling 1", isRolling);
  console.log("rollInterval 1", rollIntervalRef);

  //Get referral user address
  let referralUserAddress = "0x0000000000000000000000000000000000000000";
  const router = useRouter();
  if (router.query.ref) {
    referralUserAddress = router.query.ref.toString();
  }
  console.log("Referral User Address:", referralUserAddress);

  //Get deployedContracts
  const chainId = scaffoldConfig.targetNetwork.id;
  const mockUSDTContract = externalContracts[chainId][0].contracts.USDT;
  const slotMachineContract = externalContracts[chainId][0].contracts.SlotMachine;

  //Get address of current user
  const { address: connectedAddress } = useAccount();
  console.log("Current address", connectedAddress);

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

  //Get user balance of token to play
  const { data: tokenUserBalance, refetch: refetchBalance } = useContractRead({
    address: mockUSDTContract.address,
    abi: mockUSDTContract.abi,
    functionName: "balanceOf",
    args: [connectedAddress as string],
  });
  console.log("Current balance:", tokenUserBalance);

  //Get info from current user
  const { data: userInfoTx, refetch: refetchUserInfo } = useContractRead({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    functionName: "infoPerUser",
    args: [connectedAddress as string],
    onSuccess(data) {
      if (data) {
        const values = Object.values(data);
        userInfo.moneyAdded = values[0] as any;
        userInfo.moneyEarned = values[1] as any;
        userInfo.moneyClaimed = values[2] as any;
        userInfo.active = values[3] as boolean;
        userInfo.referringUserAddress = values[4] as string;
        userInfo.earnedByReferrals = values[5] as any;
        userInfo.claimedByReferrals = values[6] as any;
      }
    },
  });

  if (userInfoTx) {
    const values = Object.values(userInfoTx);
    userInfo.moneyAdded = values[0] as any;
    userInfo.moneyEarned = values[1] as any;
    userInfo.moneyClaimed = values[2] as any;
    userInfo.active = values[3] as boolean;
    userInfo.referringUserAddress = values[4] as string;
    userInfo.earnedByReferrals = values[5] as any;
    userInfo.claimedByReferrals = values[6] as any;
  }

  //Get allowance of token
  const { data: allowanceToken } = useContractRead({
    address: mockUSDTContract.address,
    abi: mockUSDTContract.abi,
    functionName: "allowance",
    args: [connectedAddress as string, slotMachineContract.address],
  });

  if (allowanceToken && allowanceToken >= BigInt(1000000)) {
    console.log("Token is approved");
  }
  if (connectedAddress) {
    console.log("Allowance: ", allowanceToken);
  }

  //Play function
  const { writeAsync: play } = useContractWrite({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    functionName: "play",
    args: [referralUserAddress, BigInt(1000000)],
    onSettled(data, error) {
      if (data) {
        startSoundCasino("/casino.mp3");
        startSlotMachine();
        console.log("Settled", { data, error });
        setIsPlaying(false); // Cambia el estado para detener el juego
        refetchBalance(); // Actualiza el balance
        refetchUserInfo(); // Actualiza los "wins" y "referrals"
      } else {
        console.log("Error playing", error?.message);
      }
    },
    onError(error) {
      console.error("Error playing:", error);
      setIsPlaying(false); // Reset isPlaying state when randomness is received

      if (error.message.includes("contract could not pay if user wins")) {
        // Display friendly error message to the user
        const modal = document.getElementById("error_modal") as HTMLDialogElement | null;
        modal?.showModal();
      } else {
        // Handle other errors
        // Optionally, display a generic error message
        alert("An error occurred while playing. Please try again later.");
      }
    },
  });

  /** 
  useContractEvent({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    eventName: "PlayCompleted",
    listener(log) {
      console.log("Game completed, updating UI");
      refetchBalance();
      refetchUserInfo();
    },
  });
  
  useContractEvent({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    eventName: "Claimed",
    listener(log) {
      console.log("Claim completed, updating referrals and wins");
      refetchUserInfo();
    },
  });*/

  //Listen for RequestedRandomness event
  useContractEvent({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    eventName: "RequestedRandomness",
    listener(log) {
      let firstNumber;
      let secondNumber;
      let thirdNumber;

      for (const entry of log) {
        console.log("Entry ReqId: ", entry.eventName);
        if (entry.eventName === "RequestedRandomness") {
          console.log("Request Id 1:", entry.args.reqId);
          console.log("Request Id 2:", receivedReqId);
          requestedReqId = entry.args.reqId as bigint;
        } else if (
          entry.eventName === "ReceivedRandomness" &&
          entry.args &&
          "n1" in entry.args &&
          "n2" in entry.args &&
          "n3" in entry.args
        ) {
          console.log("Request Id 1:", requestedReqId);
          console.log("Request Id 2:", entry.args.reqId);
          receivedReqId = entry.args.reqId as bigint;
          firstNumber = entry.args.n1 as number;
          secondNumber = entry.args.n2 as number;
          thirdNumber = entry.args.n3 as number;
        }
      }

      if (requestedReqId === receivedReqId) {
        stopSoundCasino();

        console.log("Received!!");

        const firstResult: number = +formatUnits(BigInt(firstNumber as any), 0);
        const secondResult: number = +formatUnits(BigInt(secondNumber as any), 0);
        const thirdResult: number = +formatUnits(BigInt(thirdNumber as any), 0);

        // Set the results of the game
        setFirstResult(firstResult);
        setSecondResult(secondResult);
        setThirdResult(thirdResult);

        stopSlotMachine(firstResult, secondResult, thirdResult);
        setIsPlaying(false); // Reset isPlaying state when randomness is received

        //Open result modal
        const modal = document.getElementById("result_modal") as HTMLDialogElement | null;
        modal?.showModal();

        if (reel[firstResult] == reel[secondResult] && reel[secondResult] == reel[thirdResult]) {
          startWinSound();
        }

        console.log("Option 1", reel[firstResult]);
        console.log("Option 1", firstResult);
        console.log("Option 2", reel[secondResult]);
        console.log("Option 2", secondResult);
        console.log("Option 3", reel[thirdResult]);
        console.log("Option 3", thirdResult);
      }
    },
  });

  //Listen for ReceivedRandomness event
  /*useContractEvent({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    eventName: "ReceivedRandomness",
    listener(log) {

      receivedReqId = log[0].args.reqId as bigint;
      stopSoundCasino();
      if (requestedReqId == receivedReqId) {
        console.log("Received!!");

        const firstResult: number = +formatUnits(BigInt(log[4].args.n1 as any), 0);
        const secondResult: number = +formatUnits(BigInt(log[4].args.n2 as any), 0);
        const thirdResult: number = +formatUnits(BigInt(log[4].args.n3 as any), 0);

        // Set the results of the game
        setFirstResult(firstResult);
        setSecondResult(secondResult);
        setThirdResult(thirdResult);

        stopSlotMachine(firstResult, secondResult, thirdResult);
        setIsPlaying(false); // Reset isPlaying state when randomness is received

        //Open result modal
        const modal = document.getElementById("result_modal") as HTMLDialogElement | null;
        modal?.showModal();

        if (reel[firstResult] == reel[secondResult] && reel[secondResult] == reel[thirdResult]) {
          startWinSound();
        }
        console.log("Option 1", reel[firstResult]);
        console.log("Option 1", firstResult);
        console.log("Option 2", reel[secondResult]);
        console.log("Option 2", secondResult);
        console.log("Option 3", reel[thirdResult]);
        console.log("Option 3", thirdResult);
      }
    },
  });*/

  // Roll function for a single reel
  function rollReel(value: Element) {
    const reel = value as HTMLElement; // Cast to HTMLElement
    const initialPosition = Math.floor(Math.random() * num_icons) * icon_height * -1 - 40;
    reel.style.backgroundPositionY = `${initialPosition}px`;
  }

  // Roll all reels at the same time
  function rollAllReels() {
    const reels = document.querySelectorAll(".slots .reel");
    reels.forEach(rollReel);
  }

  // Start rolling the slots infinitely
  function startSlotMachine() {
    if (!isRolling) {
      isRolling = true;
      rollAllReels();
      const interval = setInterval(rollAllReels, 50);
      rollIntervalRef.current = interval; // Assign the interval to the ref
    }
    console.log("isRolling 2", isRolling);
    console.log("rollInterval 2", rollIntervalRef);
  }

  //Stop slot machine function
  function stopSlotMachine(stop1Index: number, stop2Index: number, stop3Index: number) {
    isRolling = false;

    const reels = document.querySelectorAll(".slots .reel");

    // Stop the first reel after a short delay
    setTimeout(() => {
      (reels[0] as HTMLElement).style.backgroundPositionY = `${stop1Index * icon_height - 40}px`;

      // Stop the second reel after a short delay
      setTimeout(() => {
        (reels[1] as HTMLElement).style.backgroundPositionY = `${stop2Index * icon_height - 40}px`;

        // Stop the third reel after a short delay
        setTimeout(() => {
          (reels[2] as HTMLElement).style.backgroundPositionY = `${stop3Index * icon_height - 40}px`;
        }, 300); // Adjust the delay here for the desired effect
      }, 300); // Adjust the delay here for the desired effect
    }, 300); // Adjust the delay here for the desired effect

    clearInterval(rollIntervalRef.current);
  }

  //Logic to copy referral link
  const [copied, setCopied] = useState(false);
  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/ref=${connectedAddress}`;
  const copyToClipboard = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(referralLink)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        })
        .catch(error => {
          console.error("Error copying to clipboard:", error);
          // Fallback method
          document.execCommand("copy");
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        });
    } else {
      // Fallback method
      document.execCommand("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);

      // Display message for mobile users
      alert("Please manually select and copy the referral link.");
    }
  };

  // Function to start the casino sound
  const startSoundCasino = (soundSrc: string): void => {
    if (casinoSoundRef.current) {
      casinoSoundRef.current.src = soundSrc;
      casinoSoundRef.current.loop = true;
      casinoSoundRef.current.play();
    }
  };

  // Function to stop the casino sound
  const stopSoundCasino = (): void => {
    if (casinoSoundRef.current) {
      casinoSoundRef.current.pause();
      casinoSoundRef.current.currentTime = 0; // Reset the audio to the beginning
    }
  };

  // Function to play the sound when the user clicks a button
  const startClickSound = () => {
    const clickSound = new Audio("/click.mp3"); // Assuming click.mp3 is the sound file
    clickSound.play();
  };

  // Function to play the sound when the user wins
  const startWinSound = () => {
    const clickSound = new Audio("/win.mp3"); // Assuming click.mp3 is the sound file
    clickSound.play();
  };

  //Claim wins function
  const { writeAsync: claimWins } = useContractWrite({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    functionName: "claimPlayerEarnings",
    args: [connectedAddress as string],
    onSettled(data, error) {
      if (data) {
        console.log("Claim settled", { data, error });
        refetchBalance(); // Actualiza el balance
        refetchUserInfo(); // Actualiza los "wins" y "referrals"
      } else {
        console.log("Error claiming", error?.message);
      }
    },
    onError(error) {
      console.error("Error claiming:", error);
      alert("An error occurred while claiming. Please try again later.");
    },
  });

  //Claim referrals function
  const { writeAsync: claimReferrals } = useContractWrite({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    functionName: "claimPlayerEarnings",
    args: [connectedAddress as string],
    onSettled(data, error) {
      if (data) {
        console.log("Claim settled", { data, error });
        refetchBalance(); // Actualiza el balance
        refetchUserInfo(); // Actualiza los "wins" y "referrals"
      } else {
        console.log("Error claiming", error?.message);
      }
    },
    onError(error) {
      console.error("Error claiming:", error);
      alert("An error occurred while claiming. Please try again later.");
    },
  });

  useEffect(() => {
    if (!isPlaying) {
      // Actualiza el balance y la información del usuario cuando el juego termina
      refetchBalance();
      refetchUserInfo();
    }
  }, [isPlaying, refetchBalance, refetchUserInfo]);

  const { openConnectModal } = useConnectModal();

  const handleConnect = () => {
    if (openConnectModal) {
      openConnectModal();
    }
  };

  return (
    <div className="container">
      <h1 id="slotMachineTitle" className="text-center mb-8">
        <span className="block text-4xl font-bold">Welcome to Lotero</span>
        <span className="block text-2xl mb-2">A decentralized slot machine with juicy rewards! 🚀</span>
      </h1>

      <div className="columns">
        {/* Balance Column */}
        <div className="column">
          <div className="row">
            <h2>Balance</h2>
          </div>
          <div className="row">
            <div className="balance">
              {connectedAddress && (
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
              )}
              {connectedAddress ? (
                <span>{formatUnits(tokenUserBalance || 0n, 6)?.toString()}</span>
              ) : (
                <span>Please connect your wallet to play</span>
              )}
            </div>
          </div>
          <div className="row">
            <button
              className="pay-table-button"
              onClick={() => {
                if (connectedAddress) {
                  const modal = document.getElementById("paytable_modal") as HTMLDialogElement | null;
                  modal?.showModal();
                } else {
                  handleConnect();
                }
              }}
              style={{ marginLeft: "15px" }}
            >
              {connectedAddress ? "Pay table" : "CONNECT WALLET"}
            </button>
          </div>
        </div>

        {/* Game Column */}
        <div className="column">
          <div className="slots">
            {/* Integrated the slot reels from provided HTML */}
            <div className="reel"></div>
            <div className="reel"></div>
            <div className="reel"></div>
          </div>
          <div className="play-form">
            <button
              className={`spin-button ${isPlaying ? "playing" : ""}`}
              onClick={async () => {
                if (connectedAddress && !isPlaying) {
                  if (!tokenUserBalance || tokenUserBalance < BigInt(1000000)) {
                    alert("You don't have enough USDT to play. Please add more funds.");
                    return;
                  }
                  try {
                    setIsPlaying(true);
                    startClickSound();
                    await play();
                  } catch (error: any) {
                    console.error("Error in play function:", error);
                    setIsPlaying(false);
                    if (error.message?.includes("internal error")) {
                      alert("There was an internal error. Please try again in a few moments.");
                    } else {
                      alert("An error occurred while playing. Please try again later.");
                    }
                  }
                } else if (!connectedAddress) {
                  handleConnect();
                }
              }}
              disabled={isPlaying || (!!connectedAddress && (!tokenUserBalance || tokenUserBalance < BigInt(1000000)))}
            >
              {isPlaying ? "PLAYING..." : connectedAddress ? "🎰 SPIN NOW" : "CONNECT WALLET"}
            </button>
          </div>
        </div>

        {/* Rewards Column */}
        <div className="column">
          <div className="row">
            <h2>Rewards</h2>
          </div>
          <div className="row">
            <div className="wins">
              {connectedAddress && <span>Wins:</span>}
              {connectedAddress && (
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
              )}
              {connectedAddress ? (
                <span>{formatUnits(BigInt(userInfo.moneyEarned - userInfo.moneyClaimed), 6)?.toString()}</span>
              ) : (
                <span>Please connect your wallet to play</span>
              )}
            </div>
          </div>
          <div className="row">
            <button
              id="claimWinsButton"
              className="claim-button"
              onClick={async () => {
                if (connectedAddress) {
                  try {
                    await claimWins();
                  } catch (error: any) {
                    console.error("Error in claim wins function:", error);
                    if (error.message?.includes("internal error")) {
                      alert("There was an internal error. Please try again in a few moments.");
                    } else {
                      alert("An error occurred while claiming. Please try again later.");
                    }
                  }
                } else {
                  handleConnect();
                }
              }}
            >
              {connectedAddress ? "Claim Wins" : "CONNECT WALLET"}
            </button>
          </div>
          {connectedAddress && (
            <>
              <div className="row">
                <div className="referrals">
                  <span>Referrals:</span>
                  <span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      x="0px"
                      y="0px"
                      width="100"
                      height="100"
                      viewBox="0 0 48 48"
                    >
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
                </div>
              </div>
              <div className="row referral-text">
                <p>Invite friends and earn rewards!</p>
                <a
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    const modal = document.getElementById("referral_modal") as HTMLDialogElement | null;
                    modal?.showModal();
                  }}
                  className="vibrate"
                >
                  🔗 Get your referral link
                </a>
              </div>
              <div className="row">
                <button
                  id="claimReferralsButton"
                  className="claim-button"
                  style={{ marginLeft: "15px" }}
                  onClick={async () => {
                    if (connectedAddress) {
                      try {
                        await claimReferrals();
                      } catch (error: any) {
                        console.error("Error in claim referrals function:", error);
                        if (error.message?.includes("internal error")) {
                          alert("There was an internal error. Please try again in a few moments.");
                        } else {
                          alert("An error occurred while claiming. Please try again later.");
                        }
                      }
                    } else {
                      handleConnect();
                    }
                  }}
                >
                  {connectedAddress ? "Claim Referrals" : "CONNECT WALLET"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Result Modal */}
      <dialog id="result_modal" className="modal">
        <div className="modal-box">
          {/* Title with result message */}
          <h3 className="font-bold text-lg resultmodal-title">
            {reel[firstResult] === reel[secondResult] && reel[secondResult] === reel[thirdResult]
              ? "Congratulations! You Win!"
              : "Better luck next time!"}
          </h3>

          {/* Content with symbols of each reel */}
          <div className="modal-content">
            {/* Container for images */}
            <div className="reel-results-container">
              <div className="reel-result">
                {/* Symbol of the first reel */}
                <Image src={`/logos/${reel[firstResult]}.png`} alt={reel[firstResult]} width={79} height={79} />
              </div>
              <div className="reel-result">
                {/* Symbol of the second reel */}
                <Image src={`/logos/${reel[secondResult]}.png`} alt={reel[secondResult]} width={79} height={79} />
              </div>
              <div className="reel-result">
                {/* Symbol of the third reel */}
                <Image src={`/logos/${reel[thirdResult]}.png`} alt={reel[thirdResult]} width={79} height={79} />
              </div>
            </div>
          </div>

          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Referral Modal */}
      <dialog id="referral_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Share your referral link!</h3>
          <p className="py-4">
            Get a 1% commission on every bet from users playing for the first time with your referral link.
          </p>
          {/* Display referral link */}
          <div className="referral-link">
            <input type="text" value={referralLink} readOnly className="referral-input" />
            <button onClick={copyToClipboard} className="copy-button">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Modal for pay table */}
      <dialog id="paytable_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Lotero - Pay Table</h3>
          <div className="pay-table">
            <table>
              <thead>
                <tr>
                  <th>Coin</th>
                  <th>Combination</th>
                  <th>Payout (USDT)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <Image src="/logos/doge.png" alt="DOGE" width={79} height={79} />
                  </td>
                  <td>DOGE x 3</td>
                  <td>5</td>
                </tr>
                <tr>
                  <td>
                    <Image src="/logos/bnb.png" alt="BNB" width={79} height={79} />
                  </td>
                  <td>BNB x 3</td>
                  <td>14</td>
                </tr>
                <tr>
                  <td>
                    <Image src="/logos/eth.png" alt="ETH" width={79} height={79} />
                  </td>
                  <td>ETH x 3</td>
                  <td>20</td>
                </tr>
                <tr>
                  <td>
                    <Image src="/logos/btc.png" alt="BTC" width={79} height={79} />
                  </td>
                  <td>BTC x 3</td>
                  <td>30</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Error Modal */}
      <dialog id="error_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Game closed!</h3>
          <p className="py-4">
            The contract does not have enough funds to pay out in case you win. Please contact support for assistance.
          </p>
          <a className="copy-button" href="https://t.me/+4a-Lc7yiSJsxYjEx">
            Support
          </a>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Audio element for casino sound */}
      <audio ref={casinoSoundRef} />
    </div>
  );
};

export default SlotMachine;

import { useRef, useState } from "react";
import { keccak256, toBytes } from "viem";
import { useAccount, useContractEvent, useContractRead, useContractWrite, useWaitForTransaction } from "wagmi";
import externalContracts from "~~/contracts/externalContracts";
import scaffoldConfig from "~~/scaffold.config";

const TestPage = (): JSX.Element => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<{ n1: string; n2: string; n3: string } | null>(null);
  const eventCounterRef = useRef(0);
  const pendingRequestsRef = useRef<Set<string>>(new Set());

  // Get contract configuration
  const chainId = scaffoldConfig.targetNetwork.id;
  const mockUSDTContract = externalContracts[chainId][0].contracts.USDT;
  const slotMachineContract = externalContracts[chainId][0].contracts.SlotMachine;

  // Get user address
  const { address: connectedAddress } = useAccount();

  // Get user balance
  const { data: tokenUserBalance, refetch: refetchBalance } = useContractRead({
    address: mockUSDTContract.address,
    abi: mockUSDTContract.abi,
    functionName: "balanceOf",
    args: [connectedAddress as string],
  });

  // Play function
  const { writeAsync: play, data: playData } = useContractWrite({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    functionName: "play",
    args: ["0x0000000000000000000000000000000000000000", BigInt(1000000)],
  });

  // Wait for transaction and get logs
  useWaitForTransaction({
    hash: playData?.hash,
    onSuccess: receipt => {
      console.log("✅ [DEBUG] Transaction successful");
      console.log("📝 [DEBUG] Transaction hash:", receipt.transactionHash);

      // Get SpinRequested event from transaction logs
      const spinRequestedEvent = (
        slotMachineContract.abi as unknown as Array<{ type?: string; name?: string; inputs?: Array<{ type: string }> }>
      ).find(item => item.type === "event" && item.name === "SpinRequested");
      const eventTopic = spinRequestedEvent?.inputs
        ? keccak256(
            toBytes(
              `${spinRequestedEvent.name}(${spinRequestedEvent.inputs.map((i: { type: string }) => i.type).join(",")})`,
            ),
          )
        : null;
      const requestedEvent = eventTopic ? receipt.logs.find(log => log.topics[0] === eventTopic) : undefined;

      if (requestedEvent?.topics[1]) {
        const reqId = requestedEvent.topics[1] as string; // reqId is the first indexed parameter
        console.log("🎲 [DEBUG] SpinRequested from transaction - Request ID:", reqId);
        setPendingRequestId(reqId);
        pendingRequestsRef.current.add(reqId);
      }

      refetchBalance();
    },
    onError: error => {
      console.log("❌ [DEBUG] Transaction failed:", error.message);
      setIsPlaying(false);
    },
  });

  // Listen for SpinResolved event
  useContractEvent({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    eventName: "SpinResolved",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener(log: any[]) {
      const counter = ++eventCounterRef.current;
      if (!log[0].args) {
        return;
      }

      const args = log[0].args;
      const receivedReqId = args?.requestId;
      if (receivedReqId == null) return;
      const reqIdString = receivedReqId.toString();

      console.log(`[Event #${counter}] 🎲 [DEBUG] SpinResolved event received - Request ID: ${reqIdString}`);

      // Check if this is the response to our pending request
      if (reqIdString === pendingRequestId) {
        console.log(`[Event #${counter}] 🎲 [DEBUG] This is our response!`);
        console.log(`[Event #${counter}] 🎲 [DEBUG] Numbers:`, {
          n1: args.n1?.toString(),
          n2: args.n2?.toString(),
          n3: args.n3?.toString(),
        });

        const results = {
          n1: args.n1?.toString() || "0",
          n2: args.n2?.toString() || "0",
          n3: args.n3?.toString() || "0",
        };

        setLastResults(results);
        pendingRequestsRef.current.delete(reqIdString);
        setPendingRequestId(null);
        setIsPlaying(false);
      } else {
        console.log(`[Event #${counter}] 🎲 [DEBUG] This is not our response, ignoring`);
      }
    },
  });

  const handlePlay = async () => {
    if (connectedAddress && !isPlaying) {
      if (!tokenUserBalance || tokenUserBalance < BigInt(1000000)) {
        alert("You don't have enough USDT to play. Please add more funds.");
        return;
      }
      try {
        setIsPlaying(true);
        setLastResults(null);
        setPendingRequestId(null);
        await play();
      } catch (error: any) {
        console.error("❌ [DEBUG] Error in play function:", error);
        setIsPlaying(false);
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Slot Machine Test Page</h1>

      <div className="mb-4 space-y-2">
        <p>Balance: {tokenUserBalance ? tokenUserBalance.toString() : "0"}</p>
        <p>Current Request ID: {pendingRequestId || "None"}</p>
        <p>Pending Requests: {Array.from(pendingRequestsRef.current).join(", ") || "None"}</p>

        {lastResults && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h2 className="font-bold mb-2">Last Results:</h2>
            <p>Request ID: {pendingRequestId}</p>
            <p>Number 1: {lastResults.n1}</p>
            <p>Number 2: {lastResults.n2}</p>
            <p>Number 3: {lastResults.n3}</p>
          </div>
        )}
      </div>

      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handlePlay}
        disabled={isPlaying || !connectedAddress}
      >
        {isPlaying ? "Playing..." : "Play"}
      </button>
    </div>
  );
};

export default TestPage;

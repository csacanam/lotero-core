import { useRef, useState } from "react";
import { useContractEvent } from "wagmi";
import externalContracts from "~~/contracts/externalContracts";
import scaffoldConfig from "~~/scaffold.config";

interface EventLog {
  timestamp: string;
  reqId: string;
  n1: string;
  n2: string;
  n3: string;
  topics: string[];
}

const EventsPage = (): JSX.Element => {
  const [events, setEvents] = useState<EventLog[]>([]);
  const eventCounterRef = useRef(0);

  // Get contract configuration
  const chainId = scaffoldConfig.targetNetwork.id;
  const slotMachineContract = externalContracts[chainId][0].contracts.SlotMachine;

  // Listen for SpinResolved event
  useContractEvent({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    eventName: "SpinResolved",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener(log: any[]) {
      const counter = ++eventCounterRef.current;
      const eventLog = log[0] as {
        eventName?: string;
        args?: { requestId?: bigint; n1?: bigint; n2?: bigint; n3?: bigint };
        topics?: string[];
      };
      if (!eventLog) return;
      console.log(`[Event #${counter}] 🎲 [DEBUG] SpinResolved raw event:`, eventLog);
      console.log(`[Event #${counter}] 🎲 [DEBUG] Event name:`, eventLog.eventName);
      console.log(`[Event #${counter}] 🎲 [DEBUG] Event args:`, eventLog.args);

      if (!eventLog.args) return;

      const args = eventLog.args;
      const reqId = args.requestId as bigint;
      const reqIdString = reqId.toString();
      const timestamp = new Date().toLocaleTimeString();

      // Access numbers directly from args
      const n1 = args.n1?.toString() || "0";
      const n2 = args.n2?.toString() || "0";
      const n3 = args.n3?.toString() || "0";

      setEvents(prev =>
        [
          {
            timestamp,
            reqId: reqIdString,
            n1,
            n2,
            n3,
            topics: eventLog.topics ?? [],
          },
          ...prev,
        ].slice(0, 10),
      );
    },
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Slot Machine Events Monitor</h1>
      <p className="mb-4">Listening for SpinResolved events on contract: {slotMachineContract.address}</p>

      <div className="space-y-4">
        {events.map((event, index) => (
          <div key={index} className="p-4 bg-gray-100 rounded text-black">
            <p className="font-bold text-black">Event at {event.timestamp}</p>
            <p className="text-black">Request ID: {event.reqId}</p>
            <p className="text-black">Number 1: {event.n1}</p>
            <p className="text-black">Number 2: {event.n2}</p>
            <p className="text-black">Number 3: {event.n3}</p>
            <div className="mt-2">
              <p className="text-black font-bold">Topics:</p>
              {event.topics.map((topic, i) => (
                <p key={i} className="text-black text-sm">
                  [{i}]: {topic}
                </p>
              ))}
            </div>
          </div>
        ))}

        {events.length === 0 && <p className="text-gray-700">Waiting for events...</p>}
      </div>
    </div>
  );
};

export default EventsPage;

import { useEffect } from "react";

const SlotMachine = (): JSX.Element => {
  useEffect(() => {
    // Execute the game logic when the page loads
    play();
  }, []);

  const play = (): void => {
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
  };

  const getRandomNumber = (): number => {
    return Math.floor(Math.random() * 10);
  };

  return (
    <div className="container">
      <h1 id="slotMachineTitle" className="text-center mb-8">
        <span className="block text-4xl font-bold">Welcome to Lotero</span>
        <span className="block text-2xl mb-2">A decentralized slot machine with juicy rewards! 🚀</span>
      </h1>

      <form id="playForm">
        {/* Removed the input field for referring user */}
        <button className="btn btn-secondary btn-sm" type="button" onClick={play}>
          Play Lotero
        </button>
      </form>

      <div className="slots">
        {/* Integrated the slot reels from provided HTML */}
        <div className="reel"></div>
        <div className="reel"></div>
        <div className="reel"></div>
      </div>

      {/* Integrated the debug element from the provided HTML */}
      <div id="debug" className="debug"></div>

      {/* Integrated the result display element */}
      <div id="result">{/* Here will be the game result */}</div>
    </div>
  );
};

export default SlotMachine;

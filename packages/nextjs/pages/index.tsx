import { useEffect } from "react";

const SlotMachine = (): JSX.Element => {
  useEffect(() => {
    // Ejecutar la lógica del juego cuando se carga la página
    //play();
  }, []);

  const play = (): void => {
    //const referringUserAddress = ''; // Obtener la dirección del usuario referido aquí

    // Lógica para interactuar con el contrato inteligente y obtener resultados del juego

    // Supongamos que obtuviste los resultados de los slots como números aleatorios (0-9)
    const result1 = getRandomNumber();
    const result2 = getRandomNumber();
    const result3 = getRandomNumber();

    const slot1 = document.getElementById("slot1");
    const slot2 = document.getElementById("slot2");
    const slot3 = document.getElementById("slot3");

    if (slot1 && slot2 && slot3) {
      slot1.innerText = result1.toString();
      slot2.innerText = result2.toString();
      slot3.innerText = result3.toString();
    }

    // Más lógica para interactuar con el contrato y mostrar el resultado
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
        {/* Eliminamos el campo de entrada del usuario referido */}
        <button className="btn btn-secondary btn-sm" type="button" onClick={play}>
          Jugar
        </button>
      </form>

      <div className="slots">
        <div className="slot" id="slot1"></div>
        <div className="slot" id="slot2"></div>
        <div className="slot" id="slot3"></div>
      </div>

      <div id="result">{/* Aquí se mostrará el resultado del juego */}</div>
    </div>
  );
};

export default SlotMachine;

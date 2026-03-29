import React from "react";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

/**
 * Minimal header — just the wallet connect button, no logo (the neon title replaces it)
 */
export const Header = () => {
  return (
    <div
      className="sticky top-0 z-20 flex justify-end items-center px-4 py-2"
      style={{
        background: "rgba(13, 13, 13, 0.85)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255, 215, 0, 0.1)",
      }}
    >
      <RainbowKitCustomConnectButton />
    </div>
  );
};

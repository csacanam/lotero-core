import React from "react";

/**
 * Site footer
 */
export const Footer = () => {
  return (
    <div className="casino-footer">
      <span className="footer-built">
        Built by{" "}
        <a href="https://sakalabs.io" target="_blank" rel="noreferrer">
          Saka Labs
        </a>
      </span>
      <p className="footer-disclaimer">
        Lotero is an experimental, open-source protocol. Use at your own risk. No warranties. Must be 18+.
      </p>
    </div>
  );
};

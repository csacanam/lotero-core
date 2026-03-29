import React from "react";

/**
 * Site footer
 */
export const Footer = () => {
  return (
    <div className="casino-footer">
      <div className="footer-links">
        <span className="footer-text">
          Built by{" "}
          <a href="https://sakalabs.io" target="_blank" rel="noreferrer">
            Saka Labs
          </a>
        </span>
        <span className="footer-sep">&middot;</span>
        <a href="https://camilos-personal-organization.gitbook.io/lotero/" target="_blank" rel="noreferrer">
          Docs
        </a>
      </div>
      <p className="footer-disclaimer">
        Lotero is an experimental, open-source protocol. Use at your own risk. No warranties. Must be 18+.
      </p>
    </div>
  );
};

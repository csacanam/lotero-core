import React from "react";

/**
 * Site footer
 */
export const Footer = () => {
  return (
    <div className="casino-footer">
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
      <span className="footer-sep">&middot;</span>
      <a href="https://t.me/+4a-Lc7yiSJsxYjEx" target="_blank" rel="noreferrer">
        Support
      </a>
    </div>
  );
};

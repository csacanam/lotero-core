import React from "react";
import { LanguageSelector, useTranslation } from "~~/i18n";

export const Footer = () => {
  const { t } = useTranslation();
  return (
    <div className="casino-footer">
      <LanguageSelector />
      <span className="footer-built">
        {t("footer.builtBy")}{" "}
        <a href="https://sakalabs.io" target="_blank" rel="noreferrer">
          Saka Labs
        </a>
      </span>
    </div>
  );
};

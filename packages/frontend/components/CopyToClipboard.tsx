import { ReactNode } from "react";

type CopyToClipboardProps = {
  text: string;
  onCopy?: () => void;
  children: ReactNode;
};

/** Drop-in replacement for react-copy-to-clipboard. Uses native Clipboard API. */
export const CopyToClipboard = ({ text, onCopy, children }: CopyToClipboardProps) => {
  const handleClick = () => {
    void navigator.clipboard.writeText(text).then(() => {
      onCopy?.();
    });
  };

  return (
    <span onClick={handleClick} onKeyDown={e => e.key === "Enter" && handleClick()} role="button" tabIndex={0}>
      {children}
    </span>
  );
};

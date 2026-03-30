import Link from "next/link";

export const ModeToggle = ({ active }: { active: "humans" | "agents" }) => {
  return (
    <div className="mode-toggle">
      <Link href="/" className={`mode-toggle-btn ${active === "humans" ? "mode-active" : ""}`}>
        For Humans
      </Link>
      <Link href="/for-agents" className={`mode-toggle-btn ${active === "agents" ? "mode-active" : ""}`}>
        For Agents
      </Link>
    </div>
  );
};

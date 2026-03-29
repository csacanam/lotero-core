import { useState } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { formatUnits } from "viem";
import { useAccount, useContractRead, useContractWrite } from "wagmi";
import externalContracts from "~~/contracts/externalContracts";
import scaffoldConfig from "~~/scaffold.config";

const AdminPage = (): JSX.Element => {
  const chainId = scaffoldConfig.targetNetwork.id;
  const slotMachineContract = externalContracts[chainId][0].contracts.SlotMachine;
  const { address: connectedAddress } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [isClaiming, setIsClaiming] = useState(false);

  // Read team members
  const { data: teamMembers } = useContractRead({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    functionName: "getTeamMemberList",
  });

  // Read total dev earnings
  const { data: totalEarnedByDevs, refetch: refetchEarned } = useContractRead({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    functionName: "totalMoneyEarnedByDevs",
  });

  // Read total dev claimed
  const { data: totalClaimedByDevs, refetch: refetchClaimed } = useContractRead({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    functionName: "totalMoneyClaimedByDevs",
  });

  // Read contract money and debt
  const { data: moneyInContract } = useContractRead({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    functionName: "getMoneyInContract",
  });

  const { data: currentDebt } = useContractRead({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    functionName: "getCurrentDebt",
  });

  // Claim dev earnings (direct on-chain, only team members can call)
  const { writeAsync: claimDevEarnings } = useContractWrite({
    address: slotMachineContract.address,
    abi: slotMachineContract.abi,
    functionName: "claimDevEarnings",
  });

  // Check if connected wallet is a team member
  const isTeamMember =
    connectedAddress &&
    teamMembers &&
    (teamMembers as any[]).some((m: any) => m.devAddress?.toLowerCase() === connectedAddress.toLowerCase());

  const pendingDevEarnings =
    totalEarnedByDevs && totalClaimedByDevs ? BigInt(totalEarnedByDevs as any) - BigInt(totalClaimedByDevs as any) : 0n;

  const connectedMember =
    connectedAddress && teamMembers
      ? (teamMembers as any[]).find((m: any) => m.devAddress?.toLowerCase() === connectedAddress.toLowerCase())
      : null;

  const connectedMemberShare =
    connectedMember && pendingDevEarnings > 0n ? (pendingDevEarnings * BigInt(connectedMember.percentage)) / 100n : 0n;

  const handleClaimDev = async () => {
    if (!claimDevEarnings) return;
    setIsClaiming(true);
    try {
      await claimDevEarnings();
      refetchEarned();
      refetchClaimed();
      alert("Dev earnings claimed successfully!");
    } catch (error: any) {
      console.error("Dev claim error:", error);
      if (error.message?.includes("rejected") || error.message?.includes("denied")) {
        setIsClaiming(false);
        return;
      }
      alert(error.message || "Failed to claim dev earnings.");
    }
    setIsClaiming(false);
  };

  // Not connected
  if (!connectedAddress) {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <h1 className="admin-title">DEV PANEL</h1>
          <p className="admin-subtitle">Connect an authorized wallet to access.</p>
          <button className="casino-btn casino-btn-secondary" onClick={() => openConnectModal?.()}>
            CONNECT WALLET
          </button>
        </div>
      </div>
    );
  }

  // Not a team member
  if (!isTeamMember) {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <h1 className="admin-title">ACCESS DENIED</h1>
          <p className="admin-subtitle">
            Wallet{" "}
            <code>
              {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
            </code>{" "}
            is not an authorized team member.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-card">
        <h1 className="admin-title">DEV PANEL</h1>
        <p className="admin-subtitle">
          Logged in as{" "}
          <code>
            {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
          </code>
        </p>

        {/* Contract stats */}
        <div className="admin-section">
          <h2 className="admin-section-title">CONTRACT</h2>
          <div className="admin-stat-grid">
            <div className="admin-stat">
              <span className="admin-stat-label">Money in Contract</span>
              <span className="admin-stat-value">
                {moneyInContract ? formatUnits(BigInt(moneyInContract as any), 6) : "..."} USDC
              </span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-label">Current Debt</span>
              <span className="admin-stat-value">
                {currentDebt ? formatUnits(BigInt(currentDebt as any), 6) : "..."} USDC
              </span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-label">Available Bankroll</span>
              <span className="admin-stat-value">
                {moneyInContract && currentDebt
                  ? formatUnits(BigInt(moneyInContract as any) - BigInt(currentDebt as any), 6)
                  : "..."}{" "}
                USDC
              </span>
            </div>
          </div>
        </div>

        {/* Dev earnings */}
        <div className="admin-section">
          <h2 className="admin-section-title">DEV EARNINGS</h2>
          <div className="admin-stat-grid">
            <div className="admin-stat">
              <span className="admin-stat-label">Total Earned</span>
              <span className="admin-stat-value">
                {totalEarnedByDevs ? formatUnits(BigInt(totalEarnedByDevs as any), 6) : "0"} USDC
              </span>
            </div>
            <div className="admin-stat">
              <span className="admin-stat-label">Total Claimed</span>
              <span className="admin-stat-value">
                {totalClaimedByDevs ? formatUnits(BigInt(totalClaimedByDevs as any), 6) : "0"} USDC
              </span>
            </div>
            <div className="admin-stat admin-stat-highlight">
              <span className="admin-stat-label">Pending</span>
              <span className="admin-stat-value">{formatUnits(pendingDevEarnings, 6)} USDC</span>
            </div>
          </div>
        </div>

        {/* Your share */}
        <div className="admin-section">
          <h2 className="admin-section-title">YOUR SHARE</h2>
          <div className="admin-stat-grid">
            <div className="admin-stat">
              <span className="admin-stat-label">Your Percentage</span>
              <span className="admin-stat-value">{connectedMember?.percentage?.toString() || "0"}%</span>
            </div>
            <div className="admin-stat admin-stat-highlight">
              <span className="admin-stat-label">Your Pending</span>
              <span className="admin-stat-value">{formatUnits(connectedMemberShare, 6)} USDC</span>
            </div>
          </div>

          <button
            className="casino-btn casino-btn-claim admin-claim-btn"
            onClick={handleClaimDev}
            disabled={isClaiming || pendingDevEarnings <= 0n}
          >
            {isClaiming ? "CLAIMING..." : "CLAIM DEV EARNINGS"}
          </button>
          <p className="admin-note">
            This distributes ALL pending dev earnings to all team members by their percentage. Requires gas (ETH on
            Base).
          </p>
        </div>

        {/* Team members list */}
        <div className="admin-section">
          <h2 className="admin-section-title">TEAM MEMBERS</h2>
          <div className="admin-team-list">
            {teamMembers &&
              (teamMembers as any[]).map((m: any, i: number) => (
                <div
                  key={i}
                  className={`admin-team-row ${
                    m.devAddress?.toLowerCase() === connectedAddress.toLowerCase() ? "admin-team-row-you" : ""
                  }`}
                >
                  <code className="admin-team-address">
                    {m.devAddress?.slice(0, 6)}...{m.devAddress?.slice(-4)}
                  </code>
                  <span className="admin-team-pct">{m.percentage?.toString()}%</span>
                  {m.devAddress?.toLowerCase() === connectedAddress.toLowerCase() && (
                    <span className="admin-team-you">YOU</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;

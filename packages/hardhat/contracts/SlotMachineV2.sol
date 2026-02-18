// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

import "./SlotMachine.sol";
import "@chainlink/contracts/src/v0.8/dev/vrf/libraries/VRFV2PlusClient.sol";

/**
 * @title SlotMachineV2
 * @dev Extends SlotMachine with playFor: allows a sender to pay and play on behalf of another user.
 * The player receives the round, wins, and stats. The sender (msg.sender) pays the amount.
 */
contract SlotMachineV2 is SlotMachine {
	constructor(
		uint256 _subscriptionId,
		address _vrfCoordinator,
		bytes32 _keyHash,
		address _tokenAddress
	) payable SlotMachine(_subscriptionId, _vrfCoordinator, _keyHash, _tokenAddress) {}

	/**
	 * @dev Allow a sender to play on behalf of another user (player).
	 * The sender (msg.sender) pays the amount; the player receives the round, wins, and stats.
	 * @param player The address that will receive the round, wins, and be credited as the player
	 * @param referringUserAddress User who referred this player
	 * @param amountToPlay Amount of tokens to play (transferred from msg.sender)
	 */
	function playFor(
		address player,
		address referringUserAddress,
		uint256 amountToPlay
	) public payable returns (uint256) {
		require(player != address(0), "Player cannot be zero address");
		require(
			!isClosed(),
			"Cannot add money because contract could not pay if user wins"
		);
		require(amountToPlay > 0, "Amount should be greater than 0");
		require(
			amountToPlay >= MINIMUM_VALUE_TO_PLAY,
			"Value should be greater than minimum value to play"
		);
		require(
			getMaxValueToPlay() >= amountToPlay,
			"Cannot add money because contract could not pay if user wins"
		);

		// Transfer from sender (payer) to contract - sender pays, not the player
		token.transferFrom(msg.sender, address(this), amountToPlay);

		User storage currentUser = infoPerUser[player];
		if (currentUser.active == false) {
			currentUser.active = true;
			currentUser.moneyEarned = 0;
			currentUser.earnedByReferrals = 0;
			currentUser.claimedByReferrals = 0;
			currentUser.referringUserAddress = referringUserAddress;
			users += 1;
		}

		// Pay to referring user if exists and is not the same as player
		if (
			currentUser.referringUserAddress != address(0) &&
			currentUser.referringUserAddress != player
		) {
			uint256 referralAmount = (amountToPlay * REFERRAL_FEE) / 100;
			totalMoneyEarnedByReferrals += referralAmount;
			infoPerUser[currentUser.referringUserAddress].earnedByReferrals += referralAmount;
		}

		uint256 requestId = s_vrfCoordinator.requestRandomWords(
			VRFV2PlusClient.RandomWordsRequest({
				keyHash: keyHash,
				subId: subscriptionId,
				requestConfirmations: requestConfirmations,
				callbackGasLimit: callbackGasLimit,
				numWords: numWords,
				extraArgs: VRFV2PlusClient._argsToBytes(
					VRFV2PlusClient.ExtraArgsV1({ nativePayment: false })
				)
			})
		);

		Round memory currentRound = Round(
			player, // player receives the round, not msg.sender
			INVALID_NUMBER,
			INVALID_NUMBER,
			INVALID_NUMBER,
			amountToPlay,
			false,
			0
		);

		rounds[requestId] = currentRound;

		emit SpinRequested(requestId, msg.sender, player, amountToPlay);

		return requestId;
	}
}

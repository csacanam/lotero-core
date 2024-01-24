// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract SlotMachine is Ownable, VRFConsumerBaseV2 {
	//VRF Chainlink
	VRFCoordinatorV2Interface COORDINATOR;
	uint64 subscriptionId;
	bytes32 keyHash;
	uint32 callbackGasLimit = 100000;
	uint16 requestConfirmations = 5;
	uint32 numWords = 3;

	//USDT Contract
	address public usdtTokenAddress;
	IERC20 public usdtToken;

	uint256 public constant MINIMUM_VALUE_TO_PLAY = 1 * 10 ** 6;
	uint8 public constant INVALID_NUMBER = 20;

	mapping(uint256 => Round) public rounds;

	struct User {
		uint256 moneyAdded; //money added to contract
		uint256 moneyEarned; //money earned by the user
		uint256 moneyClaimed; //amount of money the user can claim
		bool active; //if true, user has activated the account
		address referringUserAddress; //the one who refers the user
		uint256 earnedByReferrals; //total money earned by referrals in the contract
		uint256 claimedByReferrals; //total money claimed by referrals in the contract
	}

	struct TeamMember {
		address devAddress;
		uint8 percentage;
	}

	struct Round {
		address userAddress;
		uint8 number1;
		uint8 number2;
		uint8 number3;
		uint256 value;
	}

	enum Symbols {
		DOGE,
		BNB,
		ETH,
		BTC
	}

	mapping(uint8 => uint256) public prize;
	Symbols[] public reel1;
	Symbols[] public reel2;
	Symbols[] public reel3;

	mapping(address => User) public infoPerUser; //information per user
	uint256 public users; //amount of users who have used the protocol
	uint256 public totalMoneyAdded; //total money added to the contract by users
	uint256 public totalMoneyEarnedByPlayers; //total money earned by players in the contract
	uint256 public totalMoneyClaimedByPlayers; //total money claimed by players in the contract
	uint256 public totalMoneyEarnedByDevs; //total money earned by devs
	uint256 public totalMoneyClaimedByDevs; //total money claimed by devs
	uint256 public totalMoneyEarnedByReferrals; //total money earned by referrals in the contract
	uint256 public totalMoneyClaimedByReferrals; //total money claimed by referrals in the contract

	//Dev Team
	TeamMember[] public teamMembers; //list of devs

	uint8 public constant DEV_FEE = 5; //Dev Fee - 5%
	uint8 public constant REFERRAL_FEE = 1; //Referrral Fee - 1%

	//Events
	event ReceivedRandomness(
		uint256 indexed reqId,
		uint256 n1,
		uint256 n2,
		uint256 n3
	);
	event RequestedRandomness(uint256 indexed reqId, address indexed invoker);
	event NewSymbol(Symbols symbol);

	constructor(
		uint64 _subscriptionId,
		address _vrfCoordinator,
		bytes32 _keyHash,
		address _usdtTokenAddress
	) payable VRFConsumerBaseV2(_vrfCoordinator) {
		COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
		keyHash = _keyHash;
		subscriptionId = _subscriptionId;

		prize[0] = 5;
		prize[1] = 14;
		prize[2] = 20;
		prize[3] = 30;
		reel1 = [
			Symbols.DOGE,
			Symbols.DOGE,
			Symbols.DOGE,
			Symbols.DOGE,
			Symbols.DOGE,
			Symbols.BNB,
			Symbols.BNB,
			Symbols.ETH,
			Symbols.ETH,
			Symbols.BTC
		];
		reel2 = [
			Symbols.DOGE,
			Symbols.DOGE,
			Symbols.DOGE,
			Symbols.DOGE,
			Symbols.DOGE,
			Symbols.BNB,
			Symbols.BNB,
			Symbols.ETH,
			Symbols.ETH,
			Symbols.BTC
		];
		reel3 = [
			Symbols.DOGE,
			Symbols.DOGE,
			Symbols.DOGE,
			Symbols.DOGE,
			Symbols.DOGE,
			Symbols.BNB,
			Symbols.BNB,
			Symbols.ETH,
			Symbols.ETH,
			Symbols.BTC
		];

		//Initialize USDT Token
		usdtTokenAddress = _usdtTokenAddress;
		usdtToken = IERC20(_usdtTokenAddress);
	}

	//1. CORE LOGIC

	/**
	 * @dev Allow user to play in the slot machine
	 * @param referringUserAddress user who refer this play
	 */
	function play(
		address referringUserAddress,
		uint256 amountToPlay
	) public payable returns (uint256) {
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

		// Transfer the specified amount of USDT from the player to the contract
		usdtToken.transferFrom(msg.sender, address(this), amountToPlay);

		User storage currentUser = infoPerUser[msg.sender];
		if (currentUser.active == false) {
			currentUser.active = true;
			currentUser.moneyEarned = 0;
			currentUser.earnedByReferrals = 0;
			currentUser.claimedByReferrals = 0;
			currentUser.referringUserAddress = referringUserAddress;
			users += 1;
		}

		//Pay to referring user if exist and if it is not the same user
		if (
			currentUser.referringUserAddress != address(0) &&
			currentUser.referringUserAddress != msg.sender
		) {
			updateReferralEarnings(
				currentUser.referringUserAddress,
				amountToPlay
			);
		}

		uint256 requestId = COORDINATOR.requestRandomWords(
			keyHash,
			subscriptionId,
			requestConfirmations,
			callbackGasLimit,
			numWords
		);

		Round memory currentRound = Round(
			msg.sender,
			INVALID_NUMBER,
			INVALID_NUMBER,
			INVALID_NUMBER,
			amountToPlay
		);

		rounds[requestId] = currentRound;

		emit RequestedRandomness(requestId, msg.sender);

		return requestId;
	}

	/**
	 * It is called when the randomWords are ready to be used
	 * @param requestId Request id
	 * @param randomWords Randow words
	 */
	function fulfillRandomWords(
		uint256 requestId,
		uint256[] memory randomWords
	) internal override {
		uint8 n1 = uint8(randomWords[0] % 10);
		uint8 n2 = uint8(randomWords[1] % 10);
		uint8 n3 = uint8(randomWords[2] % 10);

		Round storage round = rounds[requestId];

		round.number1 = n1;
		round.number2 = n2;
		round.number3 = n3;

		User storage currentUser = infoPerUser[round.userAddress];

		//Check if the user won
		Symbols symbol1 = reel1[n1];
		Symbols symbol2 = reel2[n2];
		Symbols symbol3 = reel3[n3];

		emit NewSymbol(symbol1);
		emit NewSymbol(symbol2);
		emit NewSymbol(symbol3);

		console.log(
			"Symbol1: %s, Symbol2: %s, Symbol3: %s",
			uint8(symbol1),
			uint8(symbol2),
			uint8(symbol3)
		);

		if (
			uint8(symbol1) == uint8(symbol2) && uint8(symbol2) == uint8(symbol3)
		) {
			console.log("All symbols are equal");
			currentUser.moneyEarned += prize[uint8(symbol1)] * round.value;
			totalMoneyEarnedByPlayers += prize[uint8(symbol1)] * round.value;
		}

		//Update user info
		currentUser.moneyAdded += round.value;

		//Update general stats
		totalMoneyAdded += round.value;
		totalMoneyEarnedByDevs += getDevFee(round.value);

		emit ReceivedRandomness(requestId, n1, n2, n3);
	}

	/**
	 *@dev Get total money in contract
	 */
	function getMoneyInContract() public view returns (uint256) {
		return usdtToken.balanceOf(address(this));
	}

	/**
	 *@dev Get total debt in contract
	 */
	function getCurrentDebt() public view returns (uint256) {
		uint256 debtWithPlayers = totalMoneyEarnedByPlayers -
			totalMoneyClaimedByPlayers;
		uint256 debtWithDevs = totalMoneyEarnedByDevs - totalMoneyClaimedByDevs;
		uint256 debtWithReferrals = totalMoneyEarnedByReferrals -
			totalMoneyClaimedByReferrals;

		return debtWithPlayers + debtWithDevs + debtWithReferrals;
	}

	/**
	 * Get the maximum value that any user can add to the game
	 */
	function getMaxValueToPlay() public view returns (uint256) {
		if (
			((getMoneyInContract() - getCurrentDebt()) / 30) <=
			MINIMUM_VALUE_TO_PLAY
		) {
			return MINIMUM_VALUE_TO_PLAY;
		} else {
			return (getMoneyInContract() - getCurrentDebt()) / 30;
		}
	}

	/**
	 * It helps to know if the game is open or closed
	 */
	function isClosed() public view returns (bool) {
		if (
			((getMoneyInContract() - getCurrentDebt()) / 30) <
			MINIMUM_VALUE_TO_PLAY
		) {
			return true;
		} else {
			return false;
		}
	}

	/**
	 *@dev Get dev fee given a specific amount
	 */
	function getDevFee(uint256 amount) private pure returns (uint256) {
		return ((amount * DEV_FEE) / 100);
	}

	/**
	 *@dev Get referral fee given a specific amount
	 */
	function getReferralFee(uint256 amount) private pure returns (uint256) {
		return ((amount * REFERRAL_FEE) / 100);
	}

	/**
	 *@dev Update referral earnings
	 *@param referringUserAddress referring user addresss
	 *@param amountToAdd amount to add to the referring user
	 */
	function updateReferralEarnings(
		address referringUserAddress,
		uint256 amountToAdd
	) private {
		totalMoneyEarnedByReferrals += ((amountToAdd * REFERRAL_FEE) / 100);

		infoPerUser[referringUserAddress].earnedByReferrals += ((amountToAdd *
			REFERRAL_FEE) / 100);
	}

	//2. DEV LOGIC

	/**
	 *@dev Add a dev to the list of members
	 *@param teamMemberAddress the address
	 *@param percentage the share for the user (ex: 10 means 10% of the commission to this dev)
	 */
	function addTeamMember(
		address teamMemberAddress,
		uint8 percentage
	) public onlyOwner {
		bool existingMember = false;
		uint8 currentPercentage = 0;

		for (uint8 i = 0; i < teamMembers.length; i++) {
			TeamMember memory teamMember = teamMembers[i];
			currentPercentage += teamMember.percentage;

			if (teamMemberAddress == teamMember.devAddress) {
				existingMember = true;
			}
		}

		require(!existingMember, "There is a member with given address");

		require(
			currentPercentage < 100,
			"There is not available space to add a team member"
		);

		require(
			(currentPercentage + percentage) <= 100,
			"The total new percentage cannot be more than 100"
		);

		//Add new member
		TeamMember memory newTeamMember = TeamMember(
			teamMemberAddress,
			percentage
		);
		teamMembers.push(newTeamMember);
	}

	/**
	 *@dev Remove a dev from the list of members
	 *@param teamMemberAddress the address
	 */
	function removeTeamMember(address teamMemberAddress) public onlyOwner {
		for (uint8 i = 0; i < teamMembers.length; i++) {
			TeamMember memory teamMember = teamMembers[i];
			if (teamMember.devAddress == teamMemberAddress) {
				//Move last member to spot i
				teamMembers[i] = teamMembers[teamMembers.length - 1];
				//Remove last member in the array
				teamMembers.pop();
				break;
			}
		}
	}

	/**
	 *@dev Claim dev earnings
	 */
	function claimDevEarnings() public onlyTeamMember {
		uint256 totalPendingMoney = totalMoneyEarnedByDevs -
			totalMoneyClaimedByDevs;

		require(
			totalPendingMoney > 0,
			"There is no total pending money to pay to devs"
		);

		for (uint8 i = 0; i < teamMembers.length; i++) {
			TeamMember memory teamMember = teamMembers[i];

			uint256 amountToPay = (totalPendingMoney * teamMember.percentage) /
				100;

			// Transfer USDT to the team member
			require(
				usdtToken.transfer(teamMember.devAddress, amountToPay),
				"Failed to transfer USDT"
			);

			totalMoneyClaimedByDevs += amountToPay;
		}
	}

	/**
	 * Claim player earnings of a specific user
	 * @param userAddress user address
	 */
	function claimPlayerEarnings(address userAddress) public {
		User memory user = infoPerUser[userAddress];
		require(
			user.moneyEarned > 0 || user.earnedByReferrals > 0,
			"User has not earned money"
		);
		uint256 moneyToClaimForPlay = user.moneyEarned - user.moneyClaimed;
		uint256 moneyToClaimForReferring = user.earnedByReferrals -
			user.claimedByReferrals;

		uint256 moneyToClaim = moneyToClaimForPlay + moneyToClaimForReferring;

		require(moneyToClaim > 0, "User has claimed all the earnings");

		// Transfer USDT to the user
		require(
			usdtToken.transfer(userAddress, moneyToClaim),
			"Failed to transfer USDT"
		);

		//Update user and global stats
		infoPerUser[userAddress].moneyClaimed += moneyToClaimForPlay;
		totalMoneyClaimedByPlayers += moneyToClaimForPlay;

		infoPerUser[userAddress].claimedByReferrals += moneyToClaimForReferring;
		totalMoneyClaimedByReferrals += moneyToClaimForReferring;
	}

	/**
	 *@dev Get total team members in contract
	 */
	function getTeamMembersLength() public view returns (uint256) {
		return teamMembers.length;
	}

	/**
	 *@dev Get total team members list
	 */
	function getTeamMemberList() public view returns (TeamMember[] memory) {
		return teamMembers;
	}

	/**
	 * Get round information
	 * @param roundId roundId
	 */
	function getRoundInfo(uint256 roundId) public view returns (Round memory) {
		return rounds[roundId];
	}

	//3. MODIFIERS AND OTHERS

	receive() external payable {}

	/**
	 *@dev Check if current user is part of the member list
	 */
	modifier onlyTeamMember() {
		require(
			teamMembers.length > 0,
			"There are not team members in the list"
		);

		bool isMember = false;

		for (uint8 i = 0; i < teamMembers.length; i++) {
			TeamMember memory teamMember = teamMembers[i];

			if (msg.sender == teamMember.devAddress) {
				isMember = true;
				break;
			}
		}

		require(isMember, "User is not part of the team members");
		_;
	}

	/**
	 * Allow users to deposit usdt tokens in contract
	 * @param amount Number of tokens
	 */
	function depositUsdtTokens(address to, uint256 amount) external {
		require(
			usdtToken.transferFrom(msg.sender, to, amount),
			"Transfer failed"
		);
	}

	/*function withdrawTokens(address to, uint256 amount) external onlyOwner {
		require(usdtToken.transfer(to, amount), "Transfer failed");
		//emit TokensWithdrawn(to, amount);
	}*/
}

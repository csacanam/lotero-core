// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import "@chainlink/contracts/src/v0.8/dev/vrf/libraries/VRFV2PlusClient.sol";
import "@chainlink/contracts/src/v0.8/dev/vrf/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

/**
 * @title VRFCoordinatorV2PlusMock
 * @notice Mock VRF Coordinator V2.5 for local testing (VRF 2.5 compatible)
 * @dev Implements IVRFCoordinatorV2Plus - use with @chainlink/contracts ^1.5.0 for official VRFCoordinatorV2_5Mock
 */
contract VRFCoordinatorV2PlusMock is IVRFCoordinatorV2Plus, ConfirmedOwner {
	uint16 public constant MAX_CONSUMERS = 100;

	error InvalidSubscription();
	error MustBeSubOwner(address owner);
	error TooManyConsumers();
	error InvalidConsumer();
	error InvalidRandomWords();
	error Reentrant();

	event RandomWordsRequested(
		bytes32 indexed keyHash,
		uint256 requestId,
		uint256 indexed subId,
		uint16 minimumRequestConfirmations,
		uint32 callbackGasLimit,
		uint32 numWords,
		address indexed sender
	);
	event RandomWordsFulfilled(uint256 indexed requestId, uint256 outputSeed, bool success);
	event SubscriptionCreated(uint256 indexed subId, address owner);
	event SubscriptionFunded(uint256 indexed subId, uint256 oldBalance, uint256 newBalance);
	event ConsumerAdded(uint256 indexed subId, address consumer);
	event ConsumerRemoved(uint256 indexed subId, address consumer);

	struct Config {
		bool reentrancyLock;
	}
	Config private s_config;
	uint256 s_currentSubId;
	uint256 s_nextRequestId = 1;

	struct Subscription {
		address owner;
		uint96 balance;
		uint96 nativeBalance;
	}
	mapping(uint256 => Subscription) s_subscriptions;
	mapping(uint256 => address[]) s_consumers;

	struct Request {
		uint256 subId;
		address consumer;
		uint32 callbackGasLimit;
		uint32 numWords;
	}
	mapping(uint256 => Request) s_requests;

	constructor() ConfirmedOwner(msg.sender) {}

	function consumerIsAdded(uint256 _subId, address _consumer) public view returns (bool) {
		address[] memory consumers = s_consumers[_subId];
		for (uint256 i = 0; i < consumers.length; i++) {
			if (consumers[i] == _consumer) return true;
		}
		return false;
	}

	modifier onlyValidConsumer(uint256 _subId, address _consumer) {
		if (!consumerIsAdded(_subId, _consumer)) revert InvalidConsumer();
		_;
	}

	modifier nonReentrant() {
		if (s_config.reentrancyLock) revert Reentrant();
		_;
	}

	function requestRandomWords(
		VRFV2PlusClient.RandomWordsRequest calldata req
	) external override nonReentrant onlyValidConsumer(req.subId, msg.sender) returns (uint256) {
		if (s_subscriptions[req.subId].owner == address(0)) revert InvalidSubscription();

		uint256 requestId = s_nextRequestId++;
		s_requests[requestId] = Request({
			subId: req.subId,
			consumer: msg.sender,
			callbackGasLimit: req.callbackGasLimit,
			numWords: req.numWords
		});

		emit RandomWordsRequested(
			req.keyHash, requestId, req.subId,
			req.requestConfirmations, req.callbackGasLimit, req.numWords,
			msg.sender
		);
		return requestId;
	}

	function fulfillRandomWords(uint256 _requestId, address _consumer) external nonReentrant {
		fulfillRandomWordsWithOverride(_requestId, _consumer, new uint256[](0));
	}

	function fulfillRandomWordsWithOverride(
		uint256 _requestId,
		address _consumer,
		uint256[] memory _words
	) public nonReentrant {
		if (s_requests[_requestId].consumer == address(0)) revert("nonexistent request");
		Request memory req = s_requests[_requestId];

		if (_words.length == 0) {
			_words = new uint256[](req.numWords);
			for (uint256 i = 0; i < req.numWords; i++) {
				_words[i] = uint256(keccak256(abi.encode(_requestId, i)));
			}
		} else if (_words.length != req.numWords) {
			revert InvalidRandomWords();
		}

		VRFConsumerBaseV2Plus v;
		bytes memory callReq = abi.encodeWithSelector(v.rawFulfillRandomWords.selector, _requestId, _words);
		s_config.reentrancyLock = true;
		(bool success, ) = _consumer.call{gas: req.callbackGasLimit}(callReq);
		s_config.reentrancyLock = false;

		delete s_requests[_requestId];
		emit RandomWordsFulfilled(_requestId, _requestId, success);
	}

	function fundSubscription(uint256 _subId, uint256 _amount) public {
		if (s_subscriptions[_subId].owner == address(0)) revert InvalidSubscription();
		uint96 oldBalance = s_subscriptions[_subId].balance;
		s_subscriptions[_subId].balance += uint96(_amount);
		emit SubscriptionFunded(_subId, oldBalance, oldBalance + uint96(_amount));
	}

	function fundSubscriptionWithNative(uint256 _subId) external payable override {
		if (s_subscriptions[_subId].owner == address(0)) revert InvalidSubscription();
		uint96 oldBalance = s_subscriptions[_subId].nativeBalance;
		s_subscriptions[_subId].nativeBalance += uint96(msg.value);
		emit SubscriptionFunded(_subId, oldBalance, oldBalance + uint96(msg.value));
	}

	function createSubscription() external override returns (uint256 _subId) {
		s_currentSubId++;
		s_subscriptions[s_currentSubId] = Subscription({owner: msg.sender, balance: 0, nativeBalance: 0});
		emit SubscriptionCreated(s_currentSubId, msg.sender);
		return s_currentSubId;
	}

	function getSubscription(
		uint256 _subId
	) external view override returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] memory consumers) {
		if (s_subscriptions[_subId].owner == address(0)) revert InvalidSubscription();
		return (
			s_subscriptions[_subId].balance,
			s_subscriptions[_subId].nativeBalance,
			0,
			s_subscriptions[_subId].owner,
			s_consumers[_subId]
		);
	}

	function addConsumer(uint256 _subId, address _consumer) external override onlySubOwner(_subId) {
		if (s_consumers[_subId].length == MAX_CONSUMERS) revert TooManyConsumers();
		if (consumerIsAdded(_subId, _consumer)) return;
		s_consumers[_subId].push(_consumer);
		emit ConsumerAdded(_subId, _consumer);
	}

	function removeConsumer(uint256 _subId, address _consumer) external override onlySubOwner(_subId) onlyValidConsumer(_subId, _consumer) nonReentrant {
		address[] storage consumers = s_consumers[_subId];
		for (uint256 i = 0; i < consumers.length; i++) {
			if (consumers[i] == _consumer) {
				consumers[i] = consumers[consumers.length - 1];
				consumers.pop();
				break;
			}
		}
		emit ConsumerRemoved(_subId, _consumer);
	}

	function cancelSubscription(uint256 _subId, address _to) external override onlySubOwner(_subId) nonReentrant {
		emit SubscriptionCanceled(_subId, _to, s_subscriptions[_subId].balance);
		delete s_subscriptions[_subId];
	}

	event SubscriptionCanceled(uint256 indexed subId, address to, uint256 amount);

	modifier onlySubOwner(uint256 _subId) {
		address owner = s_subscriptions[_subId].owner;
		if (owner == address(0)) revert InvalidSubscription();
		if (msg.sender != owner) revert MustBeSubOwner(owner);
		_;
	}

	function acceptSubscriptionOwnerTransfer(uint256 /*_subId*/) external pure override {
		revert("not implemented");
	}

	function requestSubscriptionOwnerTransfer(uint256 /*_subId*/, address /*_newOwner*/) external pure override {
		revert("not implemented");
	}

	function pendingRequestExists(uint256 /*_subId*/) public pure override returns (bool) {
		return false;
	}

	function getActiveSubscriptionIds(uint256 /*_startIndex*/, uint256 /*_maxCount*/) external pure override returns (uint256[] memory) {
		return new uint256[](0);
	}
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.4;

// import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; // ERC20 currencies
// import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol"; // ChainLink Automation
// import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol"; // ChainLink VRF
// import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol"; // ChainLink VRF
// import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol"; // ChainLink VRF

/**
 * @title Verifiable Draws
 * @author Lancelot Chardonnet
 *
 * @notice You can use this contract to create random draws
 * using the protocol defined at verifiabledraws.com/protocol
 */
contract VerifiableDraws 
// is AutomationCompatibleInterface, VRFConsumerBaseV2, ConfirmedOwner 
{
   
    bool private paused = false;

    struct Draw {
        uint64 publishedAt; // block number at which the draw was published on the contract
        uint64 scheduledAt; // timestamp at which the draw should be triggered
        uint64 occuredAt; // block number at which the draw has occurred
        uint64 entropyNeeded; // number of bits of information needed to compute winners
        uint256 entropy; // entropy used to pick winners
    }   
   
    // Draws 
    mapping(bytes32 => Draw) private draws; // Content Identifier (CID) => Draw
    bytes32[] private pendingDraws;

    // Events
    event DrawLaunch(bytes32 cid, uint64 publishedAt, uint64 scheduledAt, uint64 occuredAt, uint64 entropyNeeded);



    event RequestSent(uint256 requestId, uint32 numWords);
    event RequestFulfilled(uint256 requestId, uint256[] randomWords);

    struct RequestStatus {
        bool fulfilled; // whether the request has been successfully fulfilled
        bool exists; // whether a requestId exists
        uint256[] randomWords;
    }
    mapping(uint256 => RequestStatus) public s_requests; /* requestId --> requestStatus */

    // VRFCoordinatorV2Interface COORDINATOR;

    // Sepolia
    // For other networks see https://docs.chain.link/docs/vrf-contracts/#configurations
    address vrfCoordinator = 0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625;
    address link_token_contract = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
    // Gas lane to use, which specifies the maximum gas price to bump to
    bytes32 keyHash = 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c;
    

    // Your subscription ID.
    uint64 private s_subscriptionId;

    // past requests Id.
    uint256[] public requestIds;
    uint256 public lastRequestId;

    

    // Depends on the number of requested values that you want sent to the
    // fulfillRandomWords() function. Storing each word costs about 20,000 gas,
    // so 100,000 is a safe default for this example contract. Test and adjust
    // this limit based on the network that you select, the size of the request,
    // and the processing of the callback request in the fulfillRandomWords()
    // function.
    uint32 callbackGasLimit = 100000;

    // The default is 3, but you can set this higher.
    uint16 requestConfirmations = 3;

    // For this example, retrieve 2 random values in one request.
    // Cannot exceed VRFCoordinatorV2.MAX_NUM_WORDS.
    uint32 numWords = 2;


// VRFConsumerBaseV2(vrfCoordinator)
        // ConfirmedOwner(msg.sender)
    constructor (
        uint64 subscriptionId
    )
        
    {
        // COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        // createOriginalSubscription(subscriptionId);
    }
    

    // function createOriginalSubscription(uint64 subscriptionId) private onlyOwner {
    //     this.createSubscription(subscriptionId);
    // }

    // function createSubscription(uint64 subscriptionId) external onlyOwner {
    //     require(subscriptionId != 0, "Invalid subscription ID");

    //     // Force contract to be consumer of only one subscription by canceling the current subscription
    //     if (s_subscriptionId != 0) {
    //         this.cancelSubscription();
    //     }
    //     s_subscriptionId = subscriptionId;

    //     // Add this contract as a consumer of the desired subscription
    //     COORDINATOR.addConsumer(s_subscriptionId, address(this));
    // }


    // function cancelSubscription() external onlyOwner {
    //     // Cancel the subscription and send the remaining LINK to the owner
    //     COORDINATOR.cancelSubscription(s_subscriptionId, owner());
    //     s_subscriptionId = 0;
    // }

    // function launchDraw(
    //     bytes32 cid,
    //     uint64 scheduledAt,
    //     uint64 occuredAt,
    //     uint64 entropyNeeded
    // )
    //     external
    //     whenNotPaused
    //     onlyOwner
    // {
    //     require(draws[cid].publishedAt == 0, "Draw already exists");
    //     uint64 publishedAt = uint64(block.number);
    //     draws[cid] = Draw(publishedAt, scheduledAt, occuredAt, entropyNeeded, 0);
    //     pendingDraws.push(cid);
    //     emit DrawLaunch(cid, publishedAt, scheduledAt, occuredAt, entropyNeeded);
    // }
    
    // function checkUpkeep(
    //     bytes calldata /* checkData */
    // )
    //     external
    //     view
    //     override
    //     returns (bool upkeepNeeded, bytes memory performData)
    // {
    //     upkeepNeeded = false;
    //     performData = "";

    //     for (uint64 i = 0; i < pendingDraws.length; i++) {
    //         bytes32 cid = pendingDraws[i];
    //         if (block.timestamp >= draws[cid].scheduledAt) {
    //             if (!upkeepNeeded) {
    //                 upkeepNeeded = true;
    //             }

    //             performData = bytes.concat(performData, abi.encode(i));
    //         }
    //     }

    //     return (upkeepNeeded, performData);
    //     // We don't use the checkData in this example. The checkData is defined when the Upkeep was registered.
    // }


    // function performUpkeep(bytes calldata performData) external override {
    //     uint64[] memory requestedDraws = abi.decode(performData, (uint64[]));
    //     bytes32[] memory triggerDraws = new bytes32[](requestedDraws.length);

    //     for (uint64 i = 0; i < requestedDraws.length; i++) {
    //         bytes32 cid = pendingDraws[requestedDraws[i]];

    //         // We revalidate the upkeep in the performUpkeep function to prevent malicious actors
    //         // from triggering draws which have not yet reached their scheduled date
    //         if (block.timestamp >= draws[cid].scheduledAt) {
    //             triggerDraws[i] = cid;
    //         }
    //     }

    //     generateEntropyFor(triggerDraws);
    // }


    // // Assumes the subscription is funded sufficiently.
    // function generateEntropyFor(bytes32[] memory /* triggerDraws */)
    //     private
    //     returns (uint256 requestId)
    // {
    //     // Will revert if subscription is not set and funded.
    //     requestId = COORDINATOR.requestRandomWords(
    //         keyHash,
    //         s_subscriptionId,
    //         requestConfirmations,
    //         callbackGasLimit,
    //         numWords
    //     );
    //     s_requests[requestId] = RequestStatus({
    //         randomWords: new uint256[](0),
    //         exists: true,
    //         fulfilled: false
    //     });
    //     requestIds.push(requestId);
    //     lastRequestId = requestId;
    //     emit RequestSent(requestId, numWords);
    //     return requestId;
    // }


    // function fulfillRandomWords(
    //     uint256 _requestId,
    //     uint256[] memory _randomWords
    // ) internal override {
    //     require(s_requests[_requestId].exists, "request not found");
    //     s_requests[_requestId].fulfilled = true;
    //     s_requests[_requestId].randomWords = _randomWords;
    //     emit RequestFulfilled(_requestId, _randomWords);
    // }


    // function getRequestStatus(
    //     uint256 _requestId
    // ) external view returns (bool fulfilled, uint256[] memory randomWords) {
    //     require(s_requests[_requestId].exists, "request not found");
    //     RequestStatus memory request = s_requests[_requestId];
    //     return (request.fulfilled, request.randomWords);
    // }


    // Withdraw funds
    // function withdraw(address[] calldata _addresses) public onlyOwner whenNotPaused {
    //     bool noFunds = true;
    //     for (uint256 i = 0; i < _addresses.length; i++) {
    //         // Use address(0) to withdraw ETH
    //         if (_addresses[i] == address(0)) {
    //             uint256 ethBalance = address(this).balance;
    //             if (ethBalance > 0) {
    //                 payable(msg.sender).transfer(ethBalance);
    //                 noFunds = false;
    //             }
    //         } else {
    //             uint256 erc20Balance = IERC20(_addresses[i]).balanceOf(address(this));
    //             if (erc20Balance > 0) {
    //                 IERC20(_addresses[i]).transfer(msg.sender, erc20Balance);
    //                 noFunds = false;
    //             }
    //         }
    //     }
    //     require(!noFunds, "Nothing to withdraw");
    // }

    /* CONTRACT PAUSE */

    // function setPause(bool _paused) public onlyOwner {
    //     paused = _paused;
    // }

    // modifier whenNotPaused() {
    //     _requireNotPaused();
    //     _;
    // }

    // function _requireNotPaused() internal view {
    //     require(!paused, "Paused");
    // }

}
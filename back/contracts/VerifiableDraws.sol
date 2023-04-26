// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.19;

import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol"; // ChainLink Automation
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol"; // ChainLink VRF
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol"; // ChainLink VRF
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol"; // Ownership

/**
 * @title Verifiable Draws Coordinator
 * @author Lancelot Chardonnet
 *
 * @notice You can use this contract to create random draws
 * using the protocol defined at verifiabledraws.com/protocol
 */
contract VerifiableDraws is AutomationCompatibleInterface, VRFConsumerBaseV2, ConfirmedOwner {

    error DrawDoesNotExist(bytes32 cid);
    error DrawTooEarly(bytes32 cid);

    struct Draw {
        uint64 publishedAt; // block number at which the draw was published on the contract
        uint64 scheduledAt; // timestamp at which the draw should be triggered
        uint256 occuredAt; // block number at which the draw has occurred
        uint32 entropyNeeded; // number of bytes of information needed to compute winners
        bool entropyPending;
        bytes entropy; // entropy used to pick winners
        bool completed;
    }
   
    // Draws 
    mapping(bytes32 => Draw) private draws; // Content Identifier (CID) => Draw
    bytes32[] private pendingDraws;

    // Events
    event DrawLaunched(bytes32 cid, uint64 publishedAt, uint64 scheduledAt, uint32 entropyNeeded);
    event DrawsTriggered(bytes32[] performData);
    event RequestSent(
        uint256 requestId,
        bytes32[] cids,
        uint32 numWords,
        bytes32 keyHash,
        uint64 s_subscriptionId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit
    );
    event RequestFulfilled(uint256 requestId, uint256[] randomWords);
    event DrawCompleted(bytes32 cid, bytes extractedEntropy);

    struct RequestStatus {
        bool exists; // whether a requestId exists
        bool fulfilled; // whether the request has been successfully fulfilled
        uint256[] randomWords;
        bytes32[] cids;
    }
    mapping(uint256 => RequestStatus) public s_requests; /* requestId --> requestStatus */

    VRFCoordinatorV2Interface COORDINATOR;

    // Sepolia
    // For other networks see https://docs.chain.link/docs/vrf-contracts/#configurations
    address vrfCoordinator = 0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625;
    address link_token_contract = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
    // Gas lane to use, which specifies the maximum gas price to bump to
    bytes32 keyHash = 0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c;
    

    // Your subscription ID.
    uint64 private s_subscriptionId;
    

    // Depends on the number of requested values that you want sent to the
    // fulfillRandomWords() function. Storing each word costs about 20,000 gas,
    // so 100,000 is a safe default for this example contract. Test and adjust
    // this limit based on the network that you select, the size of the request,
    // and the processing of the callback request in the fulfillRandomWords()
    // function.
    uint32 callbackGasLimit = 1000000;

    // The default is 3, but you can set this higher.
    uint16 requestConfirmations = 3;


    constructor (
        uint64 subscriptionId
    )
        VRFConsumerBaseV2(vrfCoordinator)
        ConfirmedOwner(msg.sender)
    {
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;
    }

    function launchDraw(
        bytes32 cid,
        uint64 scheduledAt,
        uint32 entropyNeeded
    )
        external
        onlyOwner
    {
        require(draws[cid].publishedAt == 0, "Draw already exists");
        uint64 publishedAt = uint64(block.number);
        uint256 occuredAt = 0;
        bytes memory entropy = "";
        draws[cid] = Draw(publishedAt, scheduledAt, occuredAt, entropyNeeded, false, entropy, false);
        pendingDraws.push(cid);
        emit DrawLaunched(cid, publishedAt, scheduledAt, entropyNeeded);
    }
    
    function checkUpkeep(
        bytes calldata /* checkData */
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = false;
        bytes32[] memory tempDraws = new bytes32[](pendingDraws.length);
        uint32 count = 0;

        for (uint64 i = 0; i < pendingDraws.length; i++) {
            bytes32 cid = pendingDraws[i];
            if (block.timestamp >= draws[cid].scheduledAt && !draws[cid].entropyPending) {
                if (!upkeepNeeded) {
                    upkeepNeeded = true;
                }

                tempDraws[i] = cid;
                count++;
            }
        }

        if (upkeepNeeded) {
            uint32 j = 0;
            bytes32[] memory finalDraws = new bytes32[](count);
            for (uint64 i = 0; i < tempDraws.length; i++) {
                if (tempDraws[i] != 0x0) {
                    finalDraws[j] = tempDraws[i];
                    j++;
                }
            }
            performData = abi.encode(finalDraws);
        }

        return (upkeepNeeded, performData);
    }


    function performUpkeep(
        bytes calldata performData
    )
        external
        override
    {
        bytes32[] memory requestedDraws = abi.decode(performData, (bytes32[]));

        for (uint64 i = 0; i < requestedDraws.length; i++) {
            bytes32 cid = requestedDraws[i];
            if (draws[cid].publishedAt == 0) {
                revert DrawDoesNotExist(cid);
            }

            // We revalidate the upkeep in the performUpkeep function to prevent malicious actors
            // from triggering draws which have not yet reached their scheduled date
            if (block.timestamp < draws[cid].scheduledAt) {
                revert DrawTooEarly(cid);
            }
        }

        emit DrawsTriggered(requestedDraws);
        generateEntropyFor(requestedDraws);
    }

    function setSubscription(uint64 subscriptionId) external onlyOwner {
        s_subscriptionId = subscriptionId;
    }


    // Assumes the subscription is funded sufficiently.
    function generateEntropyFor(bytes32[] memory triggerDraws)
        private
        returns (uint256 requestId)
    {
        
        uint32 totalEntropyNeeded = 0;
        for (uint64 i = 0; i < triggerDraws.length; i++) {
            totalEntropyNeeded += draws[triggerDraws[i]].entropyNeeded;
            draws[triggerDraws[i]].entropyPending = true;
        }
 
        // Each word gives an entropy of 256 bits (see _randomWords in fulfillRandomWords)
        // i.e. 32 bytes
        uint32 entropyPerWord = 32;
        // Number of random words to generate
        uint32 numWords = divisionRoundUp(totalEntropyNeeded, entropyPerWord);

        // Will revert if subscription is not set and funded.
        requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );

        s_requests[requestId] = RequestStatus({
            randomWords: new uint256[](0),
            cids: triggerDraws,
            exists: true,
            fulfilled: false
        });

        emit RequestSent(
            requestId,
            triggerDraws,
            numWords,
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit
        );

        return requestId;
    }

    function fulfillRandomWords(
        uint256 _requestId,
        uint256[] memory _randomWords
    ) internal override {
        RequestStatus memory request = s_requests[_requestId];
        require(request.exists, "request not found");
        request.fulfilled = true;
        request.randomWords = _randomWords;
        emit RequestFulfilled(_requestId, _randomWords);

        bytes memory totalEntropy = abi.encodePacked(_randomWords);
        uint32 from = 0;
        uint32 bytesNeeded = 0;

        for (uint64 i = 0; i < request.cids.length; i++) {
            bytes32 cid = request.cids[i];

            if (draws[cid].completed == false) {

                bytesNeeded = draws[cid].entropyNeeded;
                bytes memory extractedEntropy = extractBytes(totalEntropy, from, bytesNeeded);
                draws[cid].entropy = extractedEntropy;
                draws[cid].occuredAt = block.number;
                draws[cid].completed = true;
                from += bytesNeeded;
                removePending(cid);
                emit DrawCompleted(cid, draws[cid].entropy);
            }
        }
    }


    function getRequestStatus(
        uint256 _requestId
    ) external view returns (bool fulfilled, uint256[] memory randomWords) {
        require(s_requests[_requestId].exists, "request not found");
        RequestStatus memory request = s_requests[_requestId];
        return (request.fulfilled, request.randomWords);
    }

    function getEntropy(bytes32 cid) external view returns (bytes memory) {
        return draws[cid].entropy;
    }

    // Division rounds down by default in Solidity, this function rounds up
    function divisionRoundUp(uint32 a, uint32 m) private pure returns (uint32) {
        return (a + m - 1) / m;
    }

    function extractBytes(bytes memory data, uint32 from, uint32 n) private pure returns(bytes memory) {
      bytes memory returnValue = new bytes(n);
      for (uint32 i = 0; i < n + from; i++) {
        returnValue[i] = data[i + from]; 
      }
      return returnValue;
    }

    function removePending(bytes32 searchFor) internal {
        for (uint256 i = 0; i < pendingDraws.length; i++) {
            if (pendingDraws[i] == searchFor) {
                pendingDraws[i] = pendingDraws[pendingDraws.length-1];
                pendingDraws.pop();
            }
        }
    }
}
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

    /*** Errors ***/

    error DrawAlreadyExists(string cid);
    error DrawDoesNotExist(string cid);
    error DrawTooEarly(string cid);
    error DrawAlreadyTriggered(string cid);
    error DrawAlreadyCompleted(string cid);
    error NoRandomWordNeeded(string[] cids);
    error RequestDoesNotExist(uint256 id);
    error RequestAlreadyFulfilled(uint256 id);
    error RequestFulfilledButEmpty(uint256 id);


    /*** Events ***/

    event DrawLaunched(string cid, uint64 publishedAt, uint64 scheduledAt, uint32 entropyNeeded);
    event DrawsTriggered(string[] performData);
    event RequestSent(
        uint256 requestId,
        string[] cids,
        uint32 numWords,
        bytes32 keyHash,
        uint64 s_subscriptionId,
        uint16 requestConfirmations,
        uint32 callbackGasLimit
    );
    event RequestFulfilled(uint256 requestId, uint256[] randomWords);
    event DrawCompleted(string cid, bytes extractedEntropy);


    /*** Draws ***/

    struct Draw {
        uint64 publishedAt; // block number at which the draw was published on the contract
        uint64 scheduledAt; // timestamp at which the draw should be triggered
        uint256 occuredAt; // block number at which the draw has occurred
        bytes entropy; // entropy used to pick winners
        uint32 entropyNeeded; // number of bytes of information needed to compute winners
        bool entropyPending; // when the random numbers are being generated
        bool completed; // when the draw is done and entropy as been filled
    }
   
    mapping(string => Draw) private draws; // Content Identifier (CID) => Draw
    string[] private pendingDraws; // draws for which completed = false
    uint32 private drawCount = 0;


    /*** Requests ***/

    struct RequestStatus {
        bool exists; // whether a requestId exists
        bool fulfilled; // whether the request has been successfully fulfilled
        uint256[] randomWords;
        string[] cids;
    }

    mapping(uint256 => RequestStatus) public s_requests; /* requestId --> requestStatus */


    /*** VRF ***/
    
    VRFCoordinatorV2Interface COORDINATOR;
    uint64 private s_subscriptionId;

    // For other networks see https://docs.chain.link/docs/vrf-contracts/#configurations
    address link_token_contract = 0xb0897686c545045aFc77CF20eC7A532E3120E0F1;
    address vrfCoordinator = 0xAE975071Be8F8eE67addBC1A82488F1C24858067;
    // Gas lane to use, which specifies the maximum gas price to bump to
    bytes32 keyHash = 0x6e099d640cde6de9d40ac749b4b594126b0169747122711109c9985d47751f93;
    
    // Depends on the number of requested values that you want sent to the
    // fulfillRandomWords() function. Storing each word costs about 20,000 gas,
    // so 100,000 is a safe default for this contract. Test and adjust
    // this limit based on the network that you select, the size of the request,
    // and the processing of the callback request in the fulfillRandomWords() function.
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
        string memory cid,
        uint64 scheduledAt,
        uint32 entropyNeeded
    )
        external
        onlyOwner
    {
        if (draws[cid].publishedAt != 0) {
            revert DrawAlreadyExists(cid);
        }

        uint64 publishedAt = uint64(block.number);
        uint256 occuredAt = 0;
        bytes memory entropy = "";
        draws[cid] = Draw(publishedAt, scheduledAt, occuredAt, entropy, entropyNeeded, false, false);
        pendingDraws.push(cid);
        drawCount++;
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
        string[] memory tempDraws = new string[](pendingDraws.length);
        uint32 count = 0;

        for (uint64 i = 0; i < pendingDraws.length; i++) {

            string memory cid = pendingDraws[i];

            // Conditions needed in order to trigger a draw
            if (draws[cid].publishedAt > 0 && block.timestamp >= draws[cid].scheduledAt && !draws[cid].entropyPending && !draws[cid].completed) {
                upkeepNeeded = true;
                tempDraws[i] = cid;
                count++;
            }
        }

        if (upkeepNeeded) {
            uint32 j = 0;
            string[] memory finalDraws = new string[](count);
            for (uint64 i = 0; i < tempDraws.length; i++) {
                if (bytes(tempDraws[i]).length != 0) {
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
        string[] memory requestedDraws = abi.decode(performData, (string[]));

        // We revalidate the draws in the performUpkeep to prevent malicious actors
        // from calling performUpkeep with wrong parameters 
        for (uint64 i = 0; i < requestedDraws.length; i++) {

            string memory cid = requestedDraws[i];
            if (draws[cid].publishedAt == 0) {
                revert DrawDoesNotExist(cid);
            }

            if (block.timestamp < draws[cid].scheduledAt) {
                revert DrawTooEarly(cid);
            }

            if (draws[cid].entropyPending) {
                revert DrawAlreadyTriggered(cid);
            } else {
                draws[cid].entropyPending = true;
            }

            if (draws[cid].completed) {
                revert DrawAlreadyCompleted(cid);
            }
        }

        emit DrawsTriggered(requestedDraws);
        generateEntropyFor(requestedDraws);
    }

    function generateEntropyFor(string[] memory triggerDraws)
        private
        returns (uint256 requestId)
    {
        
        uint32 totalEntropyNeeded = 0;
        for (uint64 i = 0; i < triggerDraws.length; i++) {
            totalEntropyNeeded += draws[triggerDraws[i]].entropyNeeded;
        }
 
        // Each word gives an entropy of 256 bits (see _randomWords in fulfillRandomWords)
        // i.e. 32 bytes
        uint32 entropyPerWord = 32;
        // Number of random words to generate
        uint32 numWords = divisionRoundUp(totalEntropyNeeded, entropyPerWord);

        if (numWords == 0) {
            revert NoRandomWordNeeded(triggerDraws);
        }

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

        if (!request.exists) {
            revert RequestDoesNotExist(_requestId);
        }

        if (request.fulfilled) {
            revert RequestAlreadyFulfilled(_requestId);
        }

        if (_randomWords.length == 0) {
            revert RequestFulfilledButEmpty(_requestId);
        }

        request.fulfilled = true;
        request.randomWords = _randomWords;
        emit RequestFulfilled(_requestId, _randomWords);

        bytes memory totalEntropy = abi.encodePacked(_randomWords);
        uint32 from = 0;
        uint32 bytesNeeded = 0;

        for (uint64 i = 0; i < request.cids.length; i++) {
            string memory cid = request.cids[i];

            if (!draws[cid].completed) {
                bytesNeeded = draws[cid].entropyNeeded;
                bytes memory extractedEntropy = extractBytes(totalEntropy, from, bytesNeeded);
                draws[cid].entropy = extractedEntropy;
                draws[cid].occuredAt = block.number;
                draws[cid].entropyPending = false;
                draws[cid].completed = true;
                from += bytesNeeded;
                removePending(cid);
                emit DrawCompleted(cid, draws[cid].entropy);
            } else {
                revert DrawAlreadyCompleted(cid);
            }
        }
    }


    /*** Getters ***/

    function getRequestStatus(
        uint256 _requestId
    ) external view returns (bool fulfilled, uint256[] memory randomWords) {

        RequestStatus memory request = s_requests[_requestId];

        if (!request.exists) {
            revert RequestDoesNotExist(_requestId);
        }

        return (request.fulfilled, request.randomWords);
    }

    function getDrawCount() external view onlyOwner returns (uint32) {
        return drawCount;
    }

    function getDrawDetails(string memory cid) external view onlyOwner returns (Draw memory) {
        return draws[cid];
    }

    function getRandomnessForDraw(string memory cid) external view returns (bytes memory) {
        return draws[cid].entropy;
    }

    function getPendingDraws() external view onlyOwner returns (string[] memory) {
        return pendingDraws;
    }


    /*** Setters ***/

    function setSubscription(uint64 subscriptionId) external onlyOwner {
        s_subscriptionId = subscriptionId;
    }


    /*** Utils ***/

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

    function removePending(string memory searchFor) internal {
        for (uint256 i = 0; i < pendingDraws.length; i++) {
            if (keccak256(bytes(pendingDraws[i])) == keccak256(bytes(searchFor))) {
                pendingDraws[i] = pendingDraws[pendingDraws.length-1];
                pendingDraws.pop();
            }
        }
    }

}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol"; // ChainLink Automation
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol"; // Ownership
import "./VDRandomInterface.sol";

/**
 * @title Verifiable Draws Coordinator
 * @author Lancelot Chardonnet
 *
 * @notice You can use this contract to create random draws
 * using the protocol defined at verifiabledraws.com/protocol
 */
contract VDCoordinator is AutomationCompatibleInterface, ConfirmedOwner {

    VDRandomInterface VDRandom; // Address of the VDRandom contract

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


    constructor (
        address VDBaseAddress
    )
        ConfirmedOwner(msg.sender) 
    {
        VDRandom = VDRandomInterface(VDBaseAddress);
    }

    function launchDraw(
        bytes32 cid,
        uint64 scheduledAt,
        uint64 occuredAt,
        uint64 entropyNeeded
    )
        external
        onlyOwner
    {
        require(draws[cid].publishedAt == 0, "Draw already exists");
        uint64 publishedAt = uint64(block.number);
        draws[cid] = Draw(publishedAt, scheduledAt, occuredAt, entropyNeeded, 0);
        pendingDraws.push(cid);
        emit DrawLaunch(cid, publishedAt, scheduledAt, occuredAt, entropyNeeded);
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
        performData = "";

        for (uint64 i = 0; i < pendingDraws.length; i++) {
            bytes32 cid = pendingDraws[i];
            if (block.timestamp >= draws[cid].scheduledAt) {
                if (!upkeepNeeded) {
                    upkeepNeeded = true;
                }

                performData = bytes.concat(performData, abi.encode(i));
            }
        }

        return (upkeepNeeded, performData);
        // We don't use the checkData in this example. The checkData is defined when the Upkeep was registered.
    }


    function performUpkeep(
        bytes calldata performData
    )
        external
        override
    {
        uint64[] memory requestedDraws = abi.decode(performData, (uint64[]));
        bytes32[] memory triggerDraws = new bytes32[](requestedDraws.length);

        for (uint64 i = 0; i < requestedDraws.length; i++) {
            bytes32 cid = pendingDraws[requestedDraws[i]];

            // We revalidate the upkeep in the performUpkeep function to prevent malicious actors
            // from triggering draws which have not yet reached their scheduled date
            if (block.timestamp >= draws[cid].scheduledAt) {
                triggerDraws[i] = cid;
            }
        }

        VDRandom.generateEntropyFor(triggerDraws);
    }

}
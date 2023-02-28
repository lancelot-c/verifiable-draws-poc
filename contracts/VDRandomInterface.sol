// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface VDRandomInterface {
    function generateEntropyFor(bytes32[] memory triggerDraws) external returns (uint256);
}
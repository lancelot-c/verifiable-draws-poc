// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/AccessControl.sol"; // Roles
import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; // ERC20 currencies

/**
 * @title Verifiable Draws
 * @author Lancelot Chardonnet
 *
 * @notice You can use this contract to create random draws
 * using the protocol defined at verifiabledraws.com/protocol
 */
contract VerifiableDraws is AccessControl {
   
    string public name;
    string public symbol;
    address public owner;
    bool private paused = false;

    struct Draw {
        uint256 launchedAt; // block number at which the draw was launched on the contract
        uint256 drawAt; // block number at which the draw will occur
        uint256 entropyNeeded; // number of bits of information needed to compute winners
        uint256 entropy; // entropy used to pick winners
    }   
   
    // Draws 
    mapping(string => Draw) private draws; // IPFS hash to Draw

    // Events
    event DrawLaunch(string ipfsHash, uint256 launchedAt, uint256 drawAt, uint256 entropyNeeded);

    // Define access control roles
    bytes32 private constant ADMIN  = keccak256("ADMIN_ROLE");

    /**
     * @param _name should be "Verifiable Draws"
     * @param _symbol should be "VD"
     */
    constructor (
        string memory _name,
        string memory _symbol
    ) {
        // Set the contract default settings
        name = _name;
        symbol = _symbol;
        owner  = msg.sender;
        // Setup the access control roles
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN, msg.sender);
    }
    

    function launchDraw(
        string ipfsHash,
        uint256 drawAt,
        uint256 entropyNeeded
    )
        external
        whenNotPaused
        onlyRole(ADMIN)
    {
        require(draws[ipfsHash].launchedAt == 0, "Draw already exists");
        uint256 launchedAt = block.number;
        draws[ipfsHash] = Draw(launchedAt, drawAt, entropyNeeded, 0);
        emit DrawLaunch(ipfsHash, launchedAt, drawAt, entropyNeeded);
    }
    

    /* ADMIN CAN WITHDRAW FUNDS */
    function withdraw(address[] calldata _addresses) public onlyRole(ADMIN) whenNotPaused {
        bool noFunds = true;
        for (uint256 i = 0; i < _addresses.length; i++) {
            // Use address(0) to withdraw ETH
            if (_addresses[i] == address(0)) {
                uint256 ethBalance = address(this).balance;
                if (ethBalance > 0) {
                    payable(msg.sender).transfer(ethBalance);
                    noFunds = false;
                }
            } else {
                uint256 erc20Balance = IERC20(_addresses[i]).balanceOf(address(this));
                if (erc20Balance > 0) {
                    IERC20(_addresses[i]).transfer(msg.sender, erc20Balance);
                    noFunds = false;
                }
            }
        }
        require(!noFunds, "Nothing to withdraw");
    }

    /* CONTRACT PAUSE */

    function setPause(bool _paused) public onlyRole(ADMIN) {
        paused = _paused;
    }

    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    function _requireNotPaused() internal view {
        require(!paused, "Paused");
    }

}
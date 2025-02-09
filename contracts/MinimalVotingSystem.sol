
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MinimalVotingSystem {
    address public admin;

    constructor() {
        admin = msg.sender;
    }

    function getAdmin() public view returns (address) {
        return admin;
    }
}

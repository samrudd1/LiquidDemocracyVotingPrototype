// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


contract Election {
    mapping(bytes => string) public votes; // Most recent votes
    mapping(bytes => string[]) public overflowVotes; // Overflow votes
    bytes[] public voters;
    string public electionName;

    constructor(string memory _electionName) {
        electionName = _electionName;
    }

    function vote(bytes memory voterId, string memory encryptedVote) public {
        if (bytes(votes[voterId]).length != 0) {
            // Move the existing vote to the overflow array
            overflowVotes[voterId].push(votes[voterId]);
        } else {
            // Add the voterId to the voters array
            voters.push(voterId);
        }
        // Update the most recent vote
        votes[voterId] = encryptedVote;
    }

    function getVoters() public view returns (bytes[] memory) {
        return voters;
    }

    function getEncryptedVotes() public view returns (string[] memory) {
        string[] memory encryptedVotes = new string[](voters.length);
        for (uint i = 0; i < voters.length; i++) {
            bytes memory voterId = voters[i];
            encryptedVotes[i] = votes[voterId];
        }
        return encryptedVotes;
    }

    function getOverflowVotes(bytes memory voterId) public view returns (string[] memory) {
        return overflowVotes[voterId];
    }
}
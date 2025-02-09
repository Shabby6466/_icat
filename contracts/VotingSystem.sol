
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VotingSystem {
    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }

    struct Election {
        uint id;
        string name;
        bool isActive;
        uint candidateCount;
        uint deadline;
        mapping(uint => Candidate) candidates;
        mapping(address => bool) hasVoted;
    }

    struct Voter {
        string CNIC;
        bool isRegistered;
    }

    uint public electionCount;
    mapping(uint => Election) public elections;
    mapping(address => Voter) public voters;
    address public admin;

    event ElectionCreated(uint electionId, string name, uint deadline);
    event CandidateAdded(uint electionId, uint candidateId, string name);
    event VoterRegistered(address voter, string CNIC);
    event VoteCasted(uint electionId, uint candidateId, address voter);
    event ElectionClosed(uint electionId);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyActiveElection(uint _electionId) {
        require(elections[_electionId].isActive, "Election is not active");
        require(block.timestamp < elections[_electionId].deadline, "Election deadline has passed");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function createElection(string memory _name, uint _deadline) public onlyAdmin {
        require(_deadline > block.timestamp, "Deadline must be in the future");
        electionCount++;
        Election storage newElection = elections[electionCount];
        newElection.id = electionCount;
        newElection.name = _name;
        newElection.isActive = true;
        newElection.deadline = _deadline;

        emit ElectionCreated(electionCount, _name, _deadline);
    }

    function registerVoter(string memory _CNIC) public {
        require(!voters[msg.sender].isRegistered, "Voter already registered");
        voters[msg.sender] = Voter(_CNIC, true);
        emit VoterRegistered(msg.sender, _CNIC);
    }

    function addCandidate(uint _electionId, string memory _name) public onlyAdmin onlyActiveElection(_electionId) {
        Election storage election = elections[_electionId];
        election.candidateCount++;
        election.candidates[election.candidateCount] = Candidate(election.candidateCount, _name, 0);

        emit CandidateAdded(_electionId, election.candidateCount, _name);
    }

    function vote(uint _electionId, uint _candidateId) public onlyActiveElection(_electionId) {
        Election storage election = elections[_electionId];
        require(voters[msg.sender].isRegistered, "Voter is not registered");
        require(!election.hasVoted[msg.sender], "You have already voted");
        require(_candidateId > 0 && _candidateId <= election.candidateCount, "Invalid candidate");

        election.hasVoted[msg.sender] = true;
        election.candidates[_candidateId].voteCount++;

        emit VoteCasted(_electionId, _candidateId, msg.sender);
    }

    function getCandidate(uint _electionId, uint _candidateId) public view returns (uint, string memory, uint) {
        require(_electionId <= electionCount && _electionId > 0, "Invalid election ID");
        Election storage election = elections[_electionId];
        require(_candidateId <= election.candidateCount && _candidateId > 0, "Invalid candidate ID");
        Candidate storage candidate = election.candidates[_candidateId];
        return (candidate.id, candidate.name, candidate.voteCount);
    }

    function getElectionStatus(uint _electionId) public view returns (bool isActive, uint deadline, uint timeLeft) {
        require(_electionId <= electionCount && _electionId > 0, "Invalid election ID");
        Election storage election = elections[_electionId];
        isActive = election.isActive;
        deadline = election.deadline;
        timeLeft = block.timestamp < deadline ? deadline - block.timestamp : 0;
    }

    function closeElection(uint _electionId) public onlyAdmin {
        require(elections[_electionId].isActive, "Election is already closed");
        elections[_electionId].isActive = false;
        emit ElectionClosed(_electionId);
    }
}

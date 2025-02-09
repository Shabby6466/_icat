const VotingSystem = artifacts.require("VotingSystem");
const truffleAssert = require('truffle-assertions');

contract("VotingSystem", (accounts) => {
    let votingInstance;

    beforeEach(async () => {
        votingInstance = await VotingSystem.new();
    });

    it("should create an election with a deadline", async () => {
        let result = await votingInstance.createElection("Presidential Election", 60); // 60 minutes duration
        assert.equal(result.logs[0].event, "ElectionCreated", "ElectionCreated event should be emitted");
        let election = await votingInstance.elections(1);
        assert.isTrue(election.deadline > Math.floor(Date.now() / 1000), "Deadline should be in the future");
    });

    it("should register a voter", async () => {
        let result = await votingInstance.registerVoter("1234567890123", { from: accounts[1] });
        truffleAssert.eventEmitted(result, 'VoterRegistered', (ev) => {
            return ev.cnic === "1234567890123" && ev.voter === accounts[1];
        });
    });

    it("should not allow duplicate voter registration", async () => {
        await votingInstance.registerVoter("1234567890123", { from: accounts[1] });
        await truffleAssert.reverts(
            votingInstance.registerVoter("1234567890123", { from: accounts[2] }),
            "CNIC already registered"
        );
    });

    it("should add a candidate to an election", async () => {
        await votingInstance.createElection("Presidential Election", 60);
        let result = await votingInstance.addCandidate(1, "Alice");
        assert.equal(result.logs[0].event, "CandidateAdded", "CandidateAdded event should be emitted");
    });

    it("should allow a registered user to vote", async () => {
        await votingInstance.createElection("Presidential Election", 60);
        await votingInstance.addCandidate(1, "Alice");
        await votingInstance.registerVoter("1234567890123", { from: accounts[0] });

        let result = await votingInstance.vote(1, 1, { from: accounts[0] });
        assert.equal(result.logs[0].event, "VoteCasted", "VoteCasted event should be emitted");
    });

    it("should not allow voting after deadline", async () => {
        await votingInstance.createElection("Presidential Election", 0); // 0 minutes duration
        await votingInstance.addCandidate(1, "Alice");
        await votingInstance.registerVoter("1234567890123", { from: accounts[0] });

        await truffleAssert.reverts(
            votingInstance.vote(1, 1, { from: accounts[0] }),
            "Election has ended"
        );
    });

    it("should not allow double voting", async () => {
        await votingInstance.createElection("Presidential Election", 60);
        await votingInstance.addCandidate(1, "Alice");
        await votingInstance.registerVoter("1234567890123", { from: accounts[0] });

        await votingInstance.vote(1, 1, { from: accounts[0] });
        await truffleAssert.reverts(
            votingInstance.vote(1, 1, { from: accounts[0] }),
            "You have already voted"
        );
    });

    it("should return election results", async () => {
        await votingInstance.createElection("Presidential Election", 60);
        await votingInstance.addCandidate(1, "Alice");
        await votingInstance.registerVoter("1234567890123", { from: accounts[0] });
        await votingInstance.vote(1, 1, { from: accounts[0] });

        let candidate = await votingInstance.getCandidate(1, 1);
        assert.equal(candidate[2].toNumber(), 1, "Candidate should have one vote");
    });

    it("should close an election", async () => {
        await votingInstance.createElection("Presidential Election", 60);
        await votingInstance.closeElection(1);
        let election = await votingInstance.elections(1);
        assert.equal(election.isActive, false, "Election should be closed");
    });
});

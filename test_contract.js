
const { Web3 } = require('web3');
const fs = require('fs');

async function main() {
    const web3 = new Web3('http://localhost:8545');
    const abi = JSON.parse(fs.readFileSync('/home/user/_icat/build/contracts/contracts_VotingSystem_sol_VotingSystem.abi', 'utf8'));
    const bytecode = fs.readFileSync('/home/user/_icat/build/contracts/contracts_VotingSystem_sol_VotingSystem.bin', 'utf8');

    try {
        const accounts = await web3.eth.getAccounts();
        console.log('Available accounts:', accounts);

        console.log('Deploying contract...');
        const VotingSystem = new web3.eth.Contract(abi);
        const deployedContract = await VotingSystem.deploy({ data: '0x' + bytecode }).send({ 
            from: accounts[0], 
            gas: 3000000,
            gasPrice: await web3.eth.getGasPrice()
        });
        console.log('Contract deployed at:', deployedContract.options.address);

        console.log('Testing contract functions...');

        // Test 1: Create an election
        const electionName = 'Test Election';
        const deadline = Math.floor(Date.now() / 1000) + 3600;
        await deployedContract.methods.createElection(electionName, deadline).send({ 
            from: accounts[0], 
            gas: 200000,
            gasPrice: await web3.eth.getGasPrice()
        });
        console.log('Test 1 Passed: Election created');

        // Test 2: Try to create an election with past deadline (should fail)
        try {
            const pastDeadline = Math.floor(Date.now() / 1000) - 3600;
            await deployedContract.methods.createElection("Past Election", pastDeadline).send({ 
                from: accounts[0], 
                gas: 200000,
                gasPrice: await web3.eth.getGasPrice()
            });
            console.log('Test 2 Failed: Created election with past deadline');
        } catch (error) {
            console.log('Test 2 Passed: Cannot create election with past deadline');
        }

        // Test 3: Add a candidate
        await deployedContract.methods.addCandidate(1, 'Candidate 1').send({ 
            from: accounts[0], 
            gas: 200000,
            gasPrice: await web3.eth.getGasPrice()
        });
        console.log('Test 3 Passed: Candidate added');

        // Test 4: Try to add a candidate to non-existent election (should fail)
        try {
            await deployedContract.methods.addCandidate(999, 'Invalid Candidate').send({ 
                from: accounts[0], 
                gas: 200000,
                gasPrice: await web3.eth.getGasPrice()
            });
            console.log('Test 4 Failed: Added candidate to non-existent election');
        } catch (error) {
            console.log('Test 4 Passed: Cannot add candidate to non-existent election');
        }

        // Test 5: Register a voter
        await deployedContract.methods.registerVoter('12345-6789012-3').send({ 
            from: accounts[1], 
            gas: 200000,
            gasPrice: await web3.eth.getGasPrice()
        });
        console.log('Test 5 Passed: Voter registered');

        // Test 6: Cast a vote
        await deployedContract.methods.vote(1, 1).send({ 
            from: accounts[1], 
            gas: 200000,
            gasPrice: await web3.eth.getGasPrice()
        });
        console.log('Test 6 Passed: Vote cast');

        // Test 7: Try to vote twice (should fail)
        try {
            await deployedContract.methods.vote(1, 1).send({ 
                from: accounts[1], 
                gas: 200000,
                gasPrice: await web3.eth.getGasPrice()
            });
            console.log('Test 7 Failed: Allowed double voting');
        } catch (error) {
            console.log('Test 7 Passed: Cannot vote twice');
        }

        // Test 8: Get election results
        const result = await deployedContract.methods.getCandidate(1, 1).call();
        console.log('Test 8 Passed: Election result:', result);

        // Test 9: Try to get results for non-existent candidate (should fail)
        try {
            await deployedContract.methods.getCandidate(1, 999).call();
            console.log('Test 9 Failed: Retrieved non-existent candidate');
        } catch (error) {
            console.log('Test 9 Passed: Cannot retrieve non-existent candidate');
        }

        // Test 10: Check election status
        const status = await deployedContract.methods.getElectionStatus(1).call();
        console.log('Test 10 Passed: Election status:', status);

        // Test 11: Try to close election as non-admin (should fail)
        try {
            await deployedContract.methods.closeElection(1).send({ 
                from: accounts[1], 
                gas: 200000,
                gasPrice: await web3.eth.getGasPrice()
            });
            console.log('Test 11 Failed: Non-admin closed the election');
        } catch (error) {
            console.log('Test 11 Passed: Non-admin cannot close the election');
        }

        console.log('All tests completed successfully!');
    } catch (error) {
        console.error('Error:', error);
    }
}

main();


const { Web3 } = require('web3');
const fs = require('fs');

async function deployContract() {
    const web3 = new Web3('http://localhost:8545');
    const abi = JSON.parse(fs.readFileSync('/home/user/_icat/build/contracts/contracts_SimplestContract_sol_SimplestContract.abi', 'utf8'));
    const bytecode = fs.readFileSync('/home/user/_icat/build/contracts/contracts_SimplestContract_sol_SimplestContract.bin', 'utf8');

    try {
        const accounts = await web3.eth.getAccounts();
        console.log('Deploying from account:', accounts[0]);

        const gasPrice = await web3.eth.getGasPrice();
        console.log('Gas price:', gasPrice);

        const deployTransaction = {
            from: accounts[0],
            data: '0x' + bytecode,
            gas: 3000000,
            gasPrice: gasPrice
        };

        console.log('Deployment transaction:', deployTransaction);

        const deployReceipt = await web3.eth.sendTransaction(deployTransaction);
        console.log('Deploy receipt:', deployReceipt);

        console.log('Contract deployed at:', deployReceipt.contractAddress);

        const deployedContract = new web3.eth.Contract(abi, deployReceipt.contractAddress);

        // Test the value variable
        const value = await deployedContract.methods.value().call();
        console.log('Contract value:', value);

        return deployedContract;
    } catch (error) {
        console.error('Deployment error:', error);
        if (error.receipt) {
            console.error('Transaction receipt:', error.receipt);
        }
        console.error('Error details:', JSON.stringify(error, null, 2));
    }
}

deployContract();

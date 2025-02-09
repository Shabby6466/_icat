
const { Web3 } = require('web3');

async function checkNetwork() {
    const web3 = new Web3('http://localhost:8545');

    try {
        // Check network status
        const blockNumber = await web3.eth.getBlockNumber();
        console.log('Current block number:', blockNumber);

        const accounts = await web3.eth.getAccounts();
        console.log('Available accounts:', accounts);

        const balance = await web3.eth.getBalance(accounts[0]);
        console.log('Balance of first account:', web3.utils.fromWei(balance, 'ether'), 'ETH');

        // Send a simple transaction using legacy format
        const tx = {
            from: accounts[0],
            to: accounts[1],
            value: web3.utils.toWei('0.1', 'ether'),
            gas: 21000,
            gasPrice: await web3.eth.getGasPrice()
        };

        const receipt = await web3.eth.sendTransaction(tx);
        console.log('Transaction receipt:', receipt);

        console.log('Network check completed successfully');
    } catch (error) {
        console.error('Network check error:', error);
    }
}

checkNetwork();

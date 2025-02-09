// Connect to Ethereum node (e.g., MetaMask)
let web3;

async function initWeb3() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            web3 = new Web3(window.ethereum);
        } catch (error) {
            console.error("User denied account access");
            showNotification('Please connect MetaMask to use this application.', 'error');
            return;
        }
    } else if (typeof web3 !== 'undefined') {
        web3 = new Web3(web3.currentProvider);
    } else {
        console.log('No web3 instance detected, using local provider');
        web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
    }

    // Initialize contract after web3 is set up
    initContract();
}

// Replace with your contract's ABI and address
let votingSystem;

async function initContract() {
    const response = await fetch('./build/contracts/VotingSystem.json');
    const data = await response.json();
    const contractABI = data.abi;
    const networkId = await web3.eth.net.getId();
    const deployedNetwork = data.networks[networkId];
    
    if (!deployedNetwork) {
        showNotification('Contract not deployed on the current network.', 'error');
        return;
    }
    
    const contractAddress = deployedNetwork.address;
    votingSystem = new web3.eth.Contract(contractABI, contractAddress);
}

// Function to show notifications
function showNotification(message, type = 'info') {
    const notificationArea = document.getElementById('notificationArea');
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notificationArea.appendChild(notification);
    setTimeout(() => notificationArea.removeChild(notification), 5000);
}

// Function to validate input
function validateInput(input, type) {
    if (type === 'text' && input.trim() === '') {
        return false;
    }
    if (type === 'number' && (isNaN(input) || parseInt(input) <= 0)) {
        return false;
    }
    return true;
}

// Function to create an election
async function createElection() {
    const electionName = document.getElementById('electionName').value;
    if (!validateInput(electionName, 'text')) {
        showNotification('Please enter a valid election name.', 'error');
        return;
    }
    try {
        const accounts = await web3.eth.getAccounts();
        await votingSystem.methods.createElection(electionName).send({ from: accounts[0] });
        showNotification('Election created successfully!', 'success');
    } catch (error) {
        console.error(error);
        showNotification('Failed to create election. Check console for details.', 'error');
    }
}

// Function to add a candidate
async function addCandidate() {
    const electionId = document.getElementById('electionId').value;
    const candidateName = document.getElementById('candidateName').value;
    if (!validateInput(electionId, 'number') || !validateInput(candidateName, 'text')) {
        showNotification('Please enter valid election ID and candidate name.', 'error');
        return;
    }
    try {
        const accounts = await web3.eth.getAccounts();
        await votingSystem.methods.addCandidate(electionId, candidateName).send({ from: accounts[0] });
        showNotification('Candidate added successfully!', 'success');
    } catch (error) {
        console.error(error);
        showNotification('Failed to add candidate. Check console for details.', 'error');
    }
}

// Function to vote
async function vote() {
    const electionId = document.getElementById('voteElectionId').value;
    const candidateId = document.getElementById('candidateId').value;
    if (!validateInput(electionId, 'number') || !validateInput(candidateId, 'number')) {
        showNotification('Please enter valid election ID and candidate ID.', 'error');
        return;
    }
    try {
        const accounts = await web3.eth.getAccounts();
        await votingSystem.methods.vote(electionId, candidateId).send({ from: accounts[0] });
        showNotification('Vote cast successfully!', 'success');
    } catch (error) {
        console.error(error);
        showNotification('Failed to cast vote. Check console for details.', 'error');
    }
}

// Function to get election results
async function getResults() {
    const electionId = document.getElementById('resultsElectionId').value;
    if (!validateInput(electionId, 'number')) {
        showNotification('Please enter a valid election ID.', 'error');
        return;
    }
    try {
        const results = await votingSystem.methods.getResults(electionId).call();
        const resultsDisplay = document.getElementById('resultsDisplay');
        resultsDisplay.innerHTML = '';

        results.forEach(candidate => {
            const candidateInfo = document.createElement('div');
            candidateInfo.textContent = `Candidate ID: ${candidate.id}, Name: ${candidate.name}, Votes: ${candidate.voteCount}`;
            resultsDisplay.appendChild(candidateInfo);
        });
    } catch (error) {
        console.error(error);
        showNotification('Failed to get results. Check console for details.', 'error');
    }
}

// Function to close an election
async function closeElection() {
    const electionId = document.getElementById('closeElectionId').value;
    if (!validateInput(electionId, 'number')) {
        showNotification('Please enter a valid election ID.', 'error');
        return;
    }
    try {
        const accounts = await web3.eth.getAccounts();
        await votingSystem.methods.closeElection(electionId).send({ from: accounts[0] });
        showNotification('Election closed successfully!', 'success');
    } catch (error) {
        console.error(error);
        showNotification('Failed to close election. Check console for details.', 'error');
    }
}

// Initialize web3 when the page loads
window.addEventListener('load', initWeb3);

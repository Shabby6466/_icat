// Connect to Ethereum node (e.g., MetaMask)
let web3;
let votingSystem;
let isAdmin = false;

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
    await initContract();
    await checkAdminStatus();
    initInterface();
}

async function initContract() {
    try {
        const response = await fetch('/build/contracts/VotingSystem.json');
        const data = await response.json();
        const contractABI = data.abi;
        
        // For development purposes, we'll use a placeholder address
        // In a real-world scenario, you'd get this from the deployment process
        const contractAddress = '0x1234567890123456789012345678901234567890';
        
        votingSystem = new web3.eth.Contract(contractABI, contractAddress);
        showNotification('Contract initialized successfully', 'success');
    } catch (error) {
        console.error('Error initializing contract:', error);
        showNotification('Failed to initialize contract. Check console for details.', 'error');
    }
}

async function checkAdminStatus() {
    const accounts = await web3.eth.getAccounts();
    const admin = await votingSystem.methods.admin().call();
    isAdmin = accounts[0].toLowerCase() === admin.toLowerCase();
}

function initInterface() {
    if (isAdmin) {
        initAdminInterface();
    } else {
        initVoterInterface();
    }
}

function initAdminInterface() {
    document.getElementById('adminSection').style.display = 'block';
    document.getElementById('voterSection').style.display = 'none';
}

function initVoterInterface() {
    document.getElementById('adminSection').style.display = 'none';
    document.getElementById('voterSection').style.display = 'block';
}

// Function to show loading indicator
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    element.disabled = true;
    element.innerHTML = 'Processing...';
}

// Function to hide loading indicator
function hideLoading(elementId, originalText) {
    const element = document.getElementById(elementId);
    element.disabled = false;
    element.innerHTML = originalText;
}

async function createElection() {
    const electionName = document.getElementById('electionName').value;
    const deadline = new Date(document.getElementById('electionDeadline').value).getTime() / 1000;
    if (!validateInput(electionName, 'string') || !validateInput(deadline, 'number')) {
        showNotification('Please enter a valid election name and deadline.', 'error');
        return;
    }
    try {
        showLoading('createElectionButton');
        const accounts = await web3.eth.getAccounts();
        await votingSystem.methods.createElection(electionName, deadline).send({ from: accounts[0] });
        showNotification('Election created successfully!', 'success');
    } catch (error) {
        console.error(error);
        showNotification('Failed to create election. Check console for details.', 'error');
    } finally {
        hideLoading('createElectionButton', 'Create Election');
    }
}

async function registerVoter() {
    const CNIC = document.getElementById('voterCNIC').value;
    if (!validateInput(CNIC, 'string')) {
        showNotification('Please enter a valid CNIC.', 'error');
        return;
    }
    try {
        showLoading('registerVoterButton');
        const accounts = await web3.eth.getAccounts();
        await votingSystem.methods.registerVoter(CNIC).send({ from: accounts[0] });
        showNotification('Voter registered successfully!', 'success');
    } catch (error) {
        console.error(error);
        showNotification('Failed to register voter. Check console for details.', 'error');
    } finally {
        hideLoading('registerVoterButton', 'Register');
    }
}

async function vote() {
    const electionId = document.getElementById('voteElectionId').value;
    const candidateId = document.getElementById('candidateId').value;
    if (!validateInput(electionId, 'number') || !validateInput(candidateId, 'number')) {
        showNotification('Please enter valid election ID and candidate ID.', 'error');
        return;
    }
    try {
        showLoading('voteButton');
        const accounts = await web3.eth.getAccounts();
        await votingSystem.methods.vote(electionId, candidateId).send({ from: accounts[0] });
        showNotification('Vote cast successfully!', 'success');
    } catch (error) {
        console.error(error);
        showNotification('Failed to cast vote. Check console for details.', 'error');
    } finally {
        hideLoading('voteButton', 'Vote');
    }
}

async function getResults() {
    const electionId = document.getElementById('resultsElectionId').value;
    if (!validateInput(electionId, 'number')) {
        showNotification('Please enter a valid election ID.', 'error');
        return;
    }
    try {
        showLoading('getResultsButton');
        const candidateCount = await votingSystem.methods.elections(electionId).call();
        const resultsDisplay = document.getElementById('resultsDisplay');
        resultsDisplay.innerHTML = '';
        for (let i = 1; i <= candidateCount; i++) {
            const candidate = await votingSystem.methods.getCandidate(electionId, i).call();
            const candidateInfo = document.createElement('div');
            candidateInfo.textContent = `Candidate ID: ${candidate[0]}, Name: ${candidate[1]}, Votes: ${candidate[2]}`;
            resultsDisplay.appendChild(candidateInfo);
        }
    } catch (error) {
        console.error(error);
        showNotification('Failed to get results. Check console for details.', 'error');
    } finally {
        hideLoading('getResultsButton', 'Get Results');
    }
}

function validateInput(input, type) {
    if (type === 'number') {
        return !isNaN(input) && input.trim() !== '';
    } else if (type === 'string') {
        return input.trim() !== '';
    }
    return false;
}

function showNotification(message, type) {
    const notificationArea = document.getElementById('notificationArea');
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notificationArea.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Real-time results update
function setupResultsListener(electionId) {
    votingSystem.events.VoteCasted({ filter: { electionId: electionId } })
        .on('data', async (event) => {
            await getResults();
        })
        .on('error', console.error);
}

// Display running time for active elections
async function displayElectionTimer(electionId) {
    const timerElement = document.getElementById(`electionTimer_${electionId}`);
    if (!timerElement) return;

    const updateTimer = async () => {
        const { isActive, deadline, timeLeft } = await votingSystem.methods.getElectionStatus(electionId).call();
        if (isActive) {
            const hours = Math.floor(timeLeft / 3600);
            const minutes = Math.floor((timeLeft % 3600) / 60);
            const seconds = timeLeft % 60;
            timerElement.textContent = `Time left: ${hours}h ${minutes}m ${seconds}s`;
            setTimeout(updateTimer, 1000);
        } else {
            timerElement.textContent = 'Election closed';
        }
    };

    updateTimer();
}

// Initialize the application
window.addEventListener('load', async () => {
    await initWeb3();
});

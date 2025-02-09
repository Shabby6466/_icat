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
    try {
        const response = await fetch('/build/contracts/VotingSystem.json');
        const data = await response.json();
        const contractABI = data.abi;
        
        // For development purposes, we'll use a placeholder address
        // In a real-world scenario, you'd get this from the deployment process
        const contractAddress = '0x1234567890123456789012345678901234567890';
        
        votingSystem = new web3.eth.Contract(contractABI, contractAddress);
        showNotification('Contract initialized successfully', 'success');
        displayActiveElections();
    } catch (error) {
        console.error('Error initializing contract:', error);
        showNotification('Failed to initialize contract. Check console for details.', 'error');
    }
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

// Update existing functions and add new ones

// New function for voter registration
async function registerVoter() {
    const cnic = document.getElementById('voterCNIC').value;
    if (!validateInput(cnic, 'string')) {
        showNotification('Please enter a valid CNIC number.', 'error');
        return;
    }
    try {
        showLoading('registerVoterButton');
        const accounts = await web3.eth.getAccounts();
        await votingSystem.methods.registerVoter(cnic).send({ from: accounts[0] });
        showNotification('Voter registered successfully!', 'success');
    } catch (error) {
        console.error(error);
        if (error.message.includes('CNIC already registered')) {
            showNotification('This CNIC is already registered.', 'error');
        } else if (error.message.includes('User denied transaction')) {
            showNotification('Transaction cancelled by user.', 'error');
        } else {
            showNotification('Failed to register voter. Check console for details.', 'error');
        }
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
        
        // Check if the voter has already voted
        const hasVoted = await votingSystem.methods.hasVoted(electionId, accounts[0]).call();
        if (hasVoted) {
            showNotification('You have already voted in this election.', 'error');
            return;
        }
        
        // Check if the election is still active
        const election = await votingSystem.methods.elections(electionId).call();
        if (!election.isActive || new Date(election.deadline * 1000) <= new Date()) {
            showNotification('This election has ended.', 'error');
            return;
        }
        
        await votingSystem.methods.vote(electionId, candidateId).send({ from: accounts[0] });
        showNotification('Vote cast successfully!', 'success');
        
        // Refresh the active elections display
        await displayActiveElections();
    } catch (error) {
        console.error(error);
        if (error.message.includes('User denied transaction')) {
            showNotification('Transaction cancelled by user.', 'error');
        } else if (error.message.includes('Invalid candidate')) {
            showNotification('Invalid candidate ID.', 'error');
        } else {
            showNotification('Failed to cast vote. Check console for details.', 'error');
        }
    } finally {
        hideLoading('voteButton', 'Vote');
    }
}

// Function to check network connection
async function checkConnection() {
    try {
        await web3.eth.net.isListening();
        return true;
    } catch (error) {
        console.error('Lost connection to the network:', error);
        showNotification('Lost connection to the network. Please check your internet connection and reload the page.', 'error');
        return false;
    }
}

// Periodically check network connection
setInterval(checkConnection, 30000); // Check every 30 seconds

async function getResults() {
    const electionId = document.getElementById('resultsElectionId').value;
    if (!validateInput(electionId, 'number')) {
        showNotification('Please enter a valid election ID.', 'error');
        return;
    }
    try {
        showLoading('getResultsButton');
        await updateResults(electionId);
        // Set up real-time updates
        const updateInterval = setInterval(async () => {
            const election = await votingSystem.methods.elections(electionId).call();
            if (!election.isActive) {
                clearInterval(updateInterval);
                showNotification('Election has ended. Final results displayed.', 'info');
            } else {
                await updateResults(electionId);
            }
        }, 10000); // Update every 10 seconds
    } catch (error) {
        console.error(error);
        showNotification('Failed to get results. Check console for details.', 'error');
    } finally {
        hideLoading('getResultsButton', 'Get Results');
    }
}

async function updateResults(electionId) {
    const results = await votingSystem.methods.getResults(electionId).call();
    const resultsDisplay = document.getElementById('resultsDisplay');
    resultsDisplay.innerHTML = '';
    results.forEach(candidate => {
        const candidateInfo = document.createElement('div');
        candidateInfo.className = 'candidate-result';
        candidateInfo.innerHTML = `
            <h4>${candidate.name}</h4>
            <p>Votes: <span class="vote-count">${candidate.voteCount}</span></p>
            <div class="progress-bar" style="width: ${(candidate.voteCount / results.reduce((sum, c) => sum + parseInt(c.voteCount), 0)) * 100}%"></div>
        `;
        resultsDisplay.appendChild(candidateInfo);
    });
}

// Function to display active elections
async function displayActiveElections() {
    try {
        const activeElectionsList = document.getElementById('activeElectionsList');
        const voteElectionSelect = document.getElementById('voteElectionId');
        activeElectionsList.innerHTML = '';
        voteElectionSelect.innerHTML = '<option value="">Select an active election</option>';
        const electionCount = await votingSystem.methods.electionCount().call();
        for (let i = 1; i <= electionCount; i++) {
            const election = await votingSystem.methods.elections(i).call();
            const deadline = new Date(election.deadline * 1000);
            const timeLeft = deadline - Date.now();
            
            if (election.isActive && timeLeft > 0) {
                const electionInfo = document.createElement('div');
                const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                electionInfo.innerHTML = `
                    <h3>Election ID: ${election.id}</h3>
                    <p>Name: ${election.name}</p>
                    <p>Deadline: ${deadline.toLocaleString()}</p>
                    <p class="time-left">Time left: ${hoursLeft}h ${minutesLeft}m</p>
                `;
                activeElectionsList.appendChild(electionInfo);
                
                // Add election to the vote select element
                const option = document.createElement('option');
                option.value = election.id;
                option.textContent = `${election.name} (ID: ${election.id})`;
                voteElectionSelect.appendChild(option);
                
                // Update time left every minute
                const intervalId = setInterval(() => {
                    const newTimeLeft = deadline - Date.now();
                    if (newTimeLeft <= 0) {
                        clearInterval(intervalId);
                        electionInfo.remove();
                        option.remove();
                        showNotification(`Election "${election.name}" has ended.`, 'info');
                    } else {
                        const newHoursLeft = Math.floor(newTimeLeft / (1000 * 60 * 60));
                        const newMinutesLeft = Math.floor((newTimeLeft % (1000 * 60 * 60)) / (1000 * 60));
                        electionInfo.querySelector('.time-left').textContent = `Time left: ${newHoursLeft}h ${newMinutesLeft}m`;
                    }
                }, 60000);
            } else if (election.isActive && timeLeft <= 0) {
                // Automatically close expired elections
                try {
                    const accounts = await web3.eth.getAccounts();
                    await votingSystem.methods.closeElection(election.id).send({ from: accounts[0] });
                    showNotification(`Election "${election.name}" has been automatically closed.`, 'info');
                } catch (error) {
                    console.error(`Failed to automatically close election ${election.id}:`, error);
                }
            }
        }
    } catch (error) {
        console.error(error);
        showNotification('Failed to fetch active elections. Check console for details.', 'error');
    }
}

async function closeElection() {
    const electionId = document.getElementById('closeElectionId').value;
    if (!validateInput(electionId, 'number')) {
        showNotification('Please enter a valid election ID.', 'error');
        return;
    }
    try {
        showLoading('closeElectionButton');
        const accounts = await web3.eth.getAccounts();
        await votingSystem.methods.closeElection(electionId).send({ from: accounts[0] });
        showNotification('Election closed successfully!', 'success');
    } catch (error) {
        console.error(error);
        showNotification('Failed to close election. Check console for details.', 'error');
    } finally {
        hideLoading('closeElectionButton', 'Close Election');
    }
}

// Initialize web3 when the page loads
window.addEventListener('load', initWeb3);

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

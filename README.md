
# Voting System DApp

This is a decentralized application (DApp) for a voting system built on Ethereum.

## Prerequisites

- Node.js and npm
- Truffle
- Ganache (for local blockchain)
- MetaMask browser extension

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/voting-system-dapp.git
   cd voting-system-dapp
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start Ganache and make sure it's running on `http://localhost:7545`.

4. Compile and migrate the smart contracts:
   ```
   truffle compile
   truffle migrate --network development
   ```

5. Copy the contract address from the migration output and update it in `src/app.js`.

## Running the Application

1. Start the development server:
   ```
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:3000`.

3. Make sure MetaMask is connected to your local Ganache network (usually `http://localhost:7545`).

4. Interact with the DApp through the web interface.

## Testing

To run the tests for the smart contracts:

```
truffle test
```

## Troubleshooting

- If you encounter issues with contract deployment, make sure Ganache is running and your `truffle-config.js` is correctly configured.
- If the web interface is not connecting to the contract, check that the contract address in `src/app.js` matches the deployed contract address.
- Ensure MetaMask is connected to the correct network and you have sufficient ETH for gas fees.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
# decentrealized

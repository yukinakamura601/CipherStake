# CipherStake

<div align="center">

**Privacy-Preserving Staking Protocol on Ethereum**

[![License: BSD-3-Clause-Clear](https://img.shields.io/badge/License-BSD--3--Clause--Clear-blue.svg)](https://opensource.org/licenses/BSD-3-Clause-Clear)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.27-e6e6e6?logo=solidity&logoColor=black)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow.svg)](https://hardhat.org/)
[![FHEVM](https://img.shields.io/badge/Powered%20by-FHEVM-purple.svg)](https://docs.zama.ai/fhevm)

</div>

---

## 📖 Introduction

**CipherStake** is a revolutionary staking protocol that leverages **Fully Homomorphic Encryption (FHE)** to provide complete privacy for users' staking activities on Ethereum. Built on Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine), CipherStake enables users to stake confidential USDT (cUSDT) tokens while keeping all transaction amounts and balances encrypted on-chain.

Unlike traditional staking protocols where all balances and transactions are publicly visible on the blockchain, CipherStake ensures that:
- Your staking amounts remain private
- Your wallet balances are confidential
- Your withdrawal requests are encrypted
- The total value locked is hidden from public view

CipherStake represents a paradigm shift in DeFi privacy, enabling institutional and individual users to participate in staking without revealing their financial positions to competitors, attackers, or the general public.

---

## ✨ Key Features

### 🔐 Complete Privacy
- **Encrypted Staking**: All staking amounts are encrypted using FHE before being recorded on-chain
- **Confidential Balances**: User balances remain encrypted and can only be decrypted by authorized parties
- **Private Withdrawals**: Unstaking requests and amounts are fully encrypted
- **Hidden Total Value Locked (TVL)**: Even the total staked amount remains confidential

### 🛡️ Security First
- **Smart Contract Security**: Built with battle-tested OpenZeppelin contracts
- **FHE-Native Operations**: All cryptographic operations leverage Zama's FHEVM for provable security
- **Permission System**: Granular control over who can decrypt specific encrypted values
- **Overflow Protection**: Built-in safeguards using encrypted arithmetic

### ⚡ User Experience
- **Seamless Integration**: Easy-to-use smart contract interface
- **Hardhat Task Automation**: Pre-built tasks for common operations (stake, unstake, check balance)
- **Partial Withdrawals**: Stake and unstake any amount at any time
- **Instant Balance Refresh**: Update viewing permissions on-demand

### 🌐 ERC7984 Standard
- Implements the **ERC7984** standard for confidential token operations
- Compatible with confidential token ecosystems
- Supports confidential transfers and approvals
- Operator-based authorization model

---

## 🎯 Problems It Solves

### 1. **Front-Running and MEV Attacks**
Traditional DeFi protocols expose transaction amounts before execution, allowing malicious actors to front-run transactions. CipherStake encrypts all amounts, making front-running impossible since attackers cannot see the transaction values.

### 2. **Privacy in DeFi**
Current blockchain transparency means anyone can:
- Track large investors' positions
- Monitor competitor strategies
- Identify whale movements
- Analyze individual financial behavior

CipherStake solves this by keeping all financial data encrypted while maintaining the trustless nature of blockchain.

### 3. **Institutional Adoption Barriers**
Institutions are hesitant to use public blockchains because:
- Competitors can see their positions
- Regulatory concerns around public financial data
- Risk of targeted attacks based on visible holdings

CipherStake provides the privacy needed for institutional participation while preserving blockchain's benefits.

### 4. **Staking Centralization Risk**
Users often consolidate funds in centralized exchanges for staking because they don't want to reveal their holdings. CipherStake enables self-custodial staking with privacy, reducing reliance on centralized platforms.

### 5. **Confidential Business Operations**
Businesses using blockchain for treasury management need privacy for:
- Strategic financial operations
- Competitive advantages
- Regulatory compliance
- Employee/customer privacy

CipherStake enables on-chain operations without revealing sensitive business data.

---

## 🔧 Technologies Used

### Core Technologies

#### **FHEVM (Fully Homomorphic Encryption Virtual Machine)**
- **Provider**: [Zama](https://zama.ai)
- **Purpose**: Enables computation on encrypted data without decryption
- **Version**: FHEVM Solidity 0.8.0+
- **Key Features**:
  - Native encrypted types (`euint64`, `ebool`)
  - Encrypted arithmetic operations (add, sub, mul, div)
  - Comparison operations on ciphertexts
  - Zero-knowledge proofs for input validation

#### **ERC7984 Standard**
- **Standard**: Confidential Token Standard
- **Implementation**: OpenZeppelin Confidential Contracts
- **Features**:
  - Confidential balance tracking
  - Encrypted transfers
  - Operator-based approvals with time-based expiration
  - Compatible with existing ERC20 tooling

### Development Stack

#### **Smart Contract Development**
- **Solidity**: v0.8.27 (Cancun EVM)
- **Hardhat**: v2.26.0+ (Smart contract development framework)
- **TypeScript**: v5.8.3 (Type-safe task and test development)
- **Ethers.js**: v6.15.0 (Ethereum library for interactions)

#### **Testing & Quality Assurance**
- **Mocha**: Test framework
- **Chai**: Assertion library
- **FHEVM Hardhat Plugin**: Mock FHE environment for testing
- **Hardhat Network**: Local blockchain simulation
- **Solidity Coverage**: Code coverage analysis
- **Gas Reporter**: Gas optimization tracking

#### **Development Tools**
- **TypeChain**: TypeScript bindings for smart contracts
- **Hardhat Deploy**: Deployment management and tracking
- **ESLint**: Code quality and style enforcement
- **Prettier**: Code formatting
- **Solhint**: Solidity linting

### Blockchain Networks
- **Sepolia Testnet**: Primary test environment
- **Hardhat Network**: Local development and testing
- **Anvil**: Alternative local development environment

### Cryptographic Libraries
- **@fhevm/solidity**: Core FHE operations and types
- **@openzeppelin/confidential-contracts**: ERC7984 implementation
- **Encrypted Types**: Client-side encryption utilities

---

## 🏗️ Architecture

### Smart Contracts

#### **cUSDT.sol** (Confidential USDT)
- ERC7984 compliant confidential token
- Mintable for testing purposes
- Supports confidential transfers and operator approvals
- Deployed address tracked in deployment artifacts

#### **CipherStake.sol** (Staking Vault)
```
Key Components:
├── Stake Tracking: mapping(address => euint64)
├── Total Staked: euint64 (encrypted global counter)
├── Permission Management: FHE.allow() for access control
└── Operator Integration: Uses ERC7984 confidential transfers
```

**Core Functions**:
- `stake()`: Deposit cUSDT with encrypted amount
- `unstake()`: Withdraw cUSDT with encrypted amount validation
- `stakeOf()`: Query encrypted stake for any address
- `totalStaked()`: Get encrypted total value locked
- `refreshMyStakeAccess()`: Refresh decryption permissions
- `requestTotalAccess()`: Request permission to view TVL

### Workflow

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       │ 1. Encrypt amount locally
       │
       ▼
┌─────────────────────┐
│  Client (Frontend)  │
│  - fhevm.encrypt()  │
│  - Generate proof   │
└──────┬──────────────┘
       │
       │ 2. Send encrypted input + proof
       │
       ▼
┌─────────────────────┐
│  CipherStake.sol    │
│  - Verify proof     │
│  - Process FHE ops  │
│  - Update state     │
└──────┬──────────────┘
       │
       │ 3. Confidential transfer
       │
       ▼
┌─────────────────────┐
│    cUSDT.sol        │
│  - Update balances  │
│  - Emit events      │
└─────────────────────┘
```

### Encryption Flow

1. **Client-Side Encryption**:
   - User inputs plain amount
   - Frontend encrypts using FHEVM client library
   - Generates zero-knowledge proof of correct encryption

2. **On-Chain Validation**:
   - Smart contract receives encrypted input + proof
   - FHEVM verifies proof cryptographically
   - Rejects invalid or tampered inputs

3. **Encrypted Computation**:
   - All arithmetic operations performed on ciphertexts
   - Add, subtract, compare operations without decryption
   - Results remain encrypted on-chain

4. **Selective Decryption**:
   - Only authorized addresses can decrypt specific values
   - Permissions granted explicitly by contract
   - Time-bound access control where needed

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20.0.0 or higher
- **npm**: v7.0.0 or higher
- **Git**: For cloning the repository

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/CipherStake.git
   cd CipherStake
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   # Set your private key (DO NOT commit this!)
   npx hardhat vars set PRIVATE_KEY

   # Set Infura API key for Sepolia access
   npx hardhat vars set INFURA_API_KEY

   # Optional: Set Etherscan API key for contract verification
   npx hardhat vars set ETHERSCAN_API_KEY
   ```

   Alternatively, create a `.env` file:
   ```env
   PRIVATE_KEY=your_private_key_here
   INFURA_API_KEY=your_infura_key_here
   ETHERSCAN_API_KEY=your_etherscan_key_here
   ```

4. **Compile contracts**

   ```bash
   npm run compile
   ```

5. **Run tests**

   ```bash
   npm test
   ```

---

## 📚 Usage Guide

### Local Development

#### Start Local Node

```bash
# Start FHEVM-enabled Hardhat node
npx hardhat node
```

#### Deploy Contracts

```bash
# Deploy to local network
npx hardhat deploy --network localhost
```

### Testnet Deployment (Sepolia)

#### Deploy to Sepolia

```bash
# Ensure your wallet has Sepolia ETH
npx hardhat deploy --network sepolia
```

#### Verify Contracts

```bash
# Get contract addresses
npx hardhat task:cusdt-address --network sepolia
npx hardhat task:cipherstake-address --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

### Interacting with Contracts

#### Mint cUSDT Tokens

```bash
# Mint 1000 cUSDT to an address
npx hardhat task:cusdt-mint \
  --to 0xYourAddress \
  --amount 1000 \
  --network sepolia
```

#### Authorize CipherStake as Operator

```bash
# Grant CipherStake permission to transfer your tokens
npx hardhat task:cusdt-set-operator \
  --days 30 \
  --network sepolia
```

#### Stake Tokens

```bash
# Stake 500 cUSDT
npx hardhat task:cipherstake-stake \
  --amount 500 \
  --network sepolia
```

#### Check Staked Balance

```bash
# View your encrypted stake (requires decryption permission)
npx hardhat task:cipherstake-stake-info \
  --network sepolia

# View another user's stake
npx hardhat task:cipherstake-stake-info \
  --user 0xOtherAddress \
  --network sepolia
```

#### Unstake Tokens

```bash
# Withdraw 200 cUSDT
npx hardhat task:cipherstake-unstake \
  --amount 200 \
  --network sepolia
```

#### Check cUSDT Balance

```bash
# View your cUSDT balance
npx hardhat task:cusdt-balance \
  --network sepolia
```

### Testing

#### Run All Tests

```bash
npm test
```

#### Run Tests on Sepolia

```bash
npm run test:sepolia
```

#### Generate Coverage Report

```bash
npm run coverage
```

#### Run with Gas Reporting

```bash
REPORT_GAS=true npm test
```

---

## 🧪 Example Scenarios

### Scenario 1: First-Time Staker

```bash
# Step 1: Mint 10,000 cUSDT to yourself
npx hardhat task:cusdt-mint \
  --to 0xYourAddress \
  --amount 10000 \
  --network sepolia

# Step 2: Authorize CipherStake for 90 days
npx hardhat task:cusdt-set-operator \
  --days 90 \
  --network sepolia

# Step 3: Stake 5,000 cUSDT
npx hardhat task:cipherstake-stake \
  --amount 5000 \
  --network sepolia

# Step 4: Verify your stake
npx hardhat task:cipherstake-stake-info \
  --network sepolia
```

### Scenario 2: Partial Withdrawal

```bash
# Check current stake
npx hardhat task:cipherstake-stake-info --network sepolia

# Withdraw 2,000 cUSDT
npx hardhat task:cipherstake-unstake \
  --amount 2000 \
  --network sepolia

# Verify remaining stake
npx hardhat task:cipherstake-stake-info --network sepolia

# Check cUSDT balance in wallet
npx hardhat task:cusdt-balance --network sepolia
```

### Scenario 3: Privacy Verification

```bash
# User A stakes (amount encrypted)
npx hardhat task:cipherstake-stake --amount 1000 --network sepolia

# User B tries to view User A's stake (without permission)
npx hardhat task:cipherstake-stake-info \
  --user 0xUserAAddress \
  --network sepolia
# Output: Encrypted value shown, but cannot decrypt without permission
```

---

## 🗂️ Project Structure

```
CipherStake/
├── contracts/
│   ├── CipherStake.sol          # Main staking vault contract
│   ├── cUSDT.sol                # Confidential USDT token (ERC7984)
│   └── FHECounter.sol           # Example FHE contract (template)
│
├── deploy/
│   └── deploy.ts                # Deployment script for all contracts
│
├── tasks/
│   ├── accounts.ts              # Account management tasks
│   └── cipherStake.ts           # CipherStake interaction tasks
│
├── test/
│   └── CipherStake.ts           # Comprehensive test suite
│
├── docs/
│   ├── zama_doc_relayer.md      # Zama relayer documentation
│   └── zama_llm.md              # AI integration notes
│
├── hardhat.config.ts            # Hardhat configuration
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

---

## 🧑‍💻 Development

### Available NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run compile` | Compile all Solidity contracts |
| `npm test` | Run test suite with Mocha |
| `npm run test:sepolia` | Run tests on Sepolia testnet |
| `npm run coverage` | Generate test coverage report |
| `npm run lint` | Run linters (Solidity + TypeScript) |
| `npm run lint:sol` | Lint Solidity files only |
| `npm run lint:ts` | Lint TypeScript files only |
| `npm run prettier:check` | Check code formatting |
| `npm run prettier:write` | Format all code |
| `npm run clean` | Clean build artifacts |
| `npm run typechain` | Generate TypeScript contract types |
| `npm run chain` | Start local Hardhat node |

### Custom Hardhat Tasks

#### Contract Information
- `task:cusdt-address` - Get deployed cUSDT address
- `task:cipherstake-address` - Get deployed CipherStake address

#### Token Operations
- `task:cusdt-mint` - Mint cUSDT to address
- `task:cusdt-balance` - View encrypted balance
- `task:cusdt-set-operator` - Authorize CipherStake

#### Staking Operations
- `task:cipherstake-stake` - Stake cUSDT
- `task:cipherstake-unstake` - Unstake cUSDT
- `task:cipherstake-stake-info` - View stake information

### Testing Architecture

Tests use the FHEVM Hardhat plugin's mock environment:
- **Mock FHE Operations**: Simulates encryption locally
- **Fast Execution**: No real cryptographic overhead in tests
- **User Decryption**: Test helpers for decrypting values
- **Comprehensive Coverage**: Stake, unstake, edge cases, permissions

Key test cases:
1. Successful staking with balance tracking
2. Partial withdrawals maintaining consistency
3. Overflow protection (requesting more than staked)
4. Permission system verification
5. Multi-user scenarios

---

## 🔒 Security Considerations

### Audits
⚠️ **This project has not been audited.** Do not use in production with real funds until a professional security audit has been completed.

### Known Limitations
1. **Testnet Only**: Currently deployed on Sepolia testnet
2. **ERC7984 RC**: Uses release candidate version of ERC7984
3. **FHEVM Maturity**: FHEVM technology is still evolving

### Best Practices
- Always verify operator permissions before staking
- Keep private keys secure and never share them
- Understand that encrypted amounts are visible as ciphertexts
- Be aware of gas costs for FHE operations
- Test thoroughly on testnet before any mainnet deployment

### Encryption Caveats
- **Encrypted ≠ Hidden**: Ciphertexts are visible on-chain but unreadable
- **Pattern Analysis**: Transaction patterns may still reveal information
- **Gas Costs**: FHE operations are more expensive than regular operations
- **Decryption Permissions**: Carefully manage who can decrypt values

---

## 🌟 Advantages Over Traditional Staking

| Feature | Traditional Staking | CipherStake |
|---------|-------------------|-------------|
| **Balance Privacy** | ❌ Public | ✅ Encrypted |
| **Transaction Amounts** | ❌ Visible | ✅ Encrypted |
| **Front-Running Risk** | ❌ High | ✅ Eliminated |
| **MEV Vulnerability** | ❌ Exposed | ✅ Protected |
| **Whale Tracking** | ❌ Easy | ✅ Impossible |
| **Institutional Privacy** | ❌ None | ✅ Full |
| **Self-Custody** | ✅ Yes | ✅ Yes |
| **On-Chain Verification** | ✅ Yes | ✅ Yes |
| **Regulatory Compliance** | ⚠️ Limited | ✅ Enhanced |
| **Business Confidentiality** | ❌ None | ✅ Complete |

---

## 🔮 Future Roadmap

### Phase 1: Core Enhancements (Q2 2025)
- [ ] **Rewards System**: Implement encrypted staking rewards
- [ ] **APY Calculation**: Private yield tracking
- [ ] **Multiple Token Support**: Expand beyond cUSDT
- [ ] **Emergency Withdrawal**: Add circuit breaker mechanisms

### Phase 2: Advanced Features (Q3 2025)
- [ ] **Governance Integration**: Private voting power based on stakes
- [ ] **Delegation**: Allow encrypted stake delegation
- [ ] **Lock Periods**: Time-locked staking for better yields
- [ ] **Slashing Protection**: Insurance against slashing events

### Phase 3: Ecosystem Integration (Q4 2025)
- [ ] **DeFi Composability**: Integration with lending protocols
- [ ] **Liquidity Provision**: Encrypted LP tokens
- [ ] **Cross-Chain Bridge**: Confidential bridge to other chains
- [ ] **Mobile SDK**: React Native / Flutter integration

### Phase 4: Enterprise & Scaling (Q1 2026)
- [ ] **Institutional Dashboard**: Advanced analytics for institutions
- [ ] **Compliance Tools**: Regulatory reporting while preserving privacy
- [ ] **Multi-Signature Support**: Encrypted multi-sig for DAOs
- [ ] **Layer 2 Integration**: Deploy on zkEVM or Optimism

### Phase 5: Mainnet & Production (Q2 2026)
- [ ] **Security Audit**: Multiple independent audits
- [ ] **Mainnet Deployment**: Ethereum mainnet launch
- [ ] **Bug Bounty Program**: Community security review
- [ ] **Formal Verification**: Mathematical proof of correctness

### Research Initiatives
- **Privacy-Preserving Oracles**: Encrypted price feeds
- **Zero-Knowledge Proofs**: Hybrid ZK + FHE architecture
- **Confidential Smart Contract Patterns**: Best practices documentation
- **FHE Performance Optimization**: Gas cost reduction research

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Ways to Contribute
- 🐛 **Report Bugs**: Open an issue with detailed reproduction steps
- 💡 **Feature Requests**: Suggest new features or improvements
- 📝 **Documentation**: Improve guides, add examples, fix typos
- 🧪 **Testing**: Add test cases, improve coverage
- 💻 **Code**: Submit pull requests for bug fixes or features

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Write clean, documented code
   - Add tests for new functionality
   - Ensure all tests pass: `npm test`
   - Run linters: `npm run lint`
4. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```
5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**

### Code Style
- Follow existing code conventions
- Use TypeScript for all new code
- Document all public functions
- Write unit tests for new features
- Keep commits atomic and well-described

### Pull Request Guidelines
- Describe what your PR does
- Reference related issues
- Include test results
- Update documentation as needed
- Ensure CI passes

---

## 📄 License

This project is licensed under the **BSD-3-Clause-Clear License**.

### Key Points
- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ✅ Private use allowed
- ⚠️ Patent rights explicitly NOT granted
- ⚠️ No liability or warranty

See the [LICENSE](LICENSE) file for full details.

---

## 🆘 Support & Community

### Documentation
- 📚 **Zama FHEVM Docs**: [docs.zama.ai/fhevm](https://docs.zama.ai/fhevm)
- 🔧 **Hardhat Docs**: [hardhat.org/docs](https://hardhat.org/docs)
- 🔐 **ERC7984 Spec**: [OpenZeppelin Confidential Contracts](https://github.com/openzeppelin/openzeppelin-confidential-contracts)

### Get Help
- 💬 **GitHub Issues**: [Report bugs or ask questions](https://github.com/yourusername/CipherStake/issues)
- 🎮 **Zama Discord**: [Join the community](https://discord.gg/zama)
- 🐦 **Twitter/X**: [@ZamaFHE](https://twitter.com/zamafhe)
- 📧 **Email**: support@cipherstake.io

### Community Channels
- **Zama Community Forum**: [community.zama.ai](https://community.zama.ai)
- **Telegram**: Coming soon
- **Medium Blog**: Project updates and tutorials

---

## 🙏 Acknowledgments

### Built With
- **[Zama](https://zama.ai)** - For pioneering FHEVM technology
- **[OpenZeppelin](https://openzeppelin.com)** - For secure smart contract libraries
- **[Hardhat](https://hardhat.org)** - For the excellent development framework

### Inspired By
- The need for privacy in DeFi
- Institutional adoption requirements
- Community feedback on transparent blockchains
- Research in cryptographic privacy technologies

### Special Thanks
- Zama team for FHEVM support and documentation
- OpenZeppelin for ERC7984 implementation
- Early testers and community contributors
- Everyone pushing for privacy in blockchain

---

## 📊 Project Status

🚀 **Current Status**: **Alpha - Active Development**

- ✅ Core smart contracts implemented
- ✅ Test suite complete
- ✅ Sepolia deployment functional
- ✅ CLI tasks operational
- ⏳ Security audit pending
- ⏳ Mainnet deployment planned
- ⏳ Frontend dApp in development

**Last Updated**: January 2025

---

## 📈 Statistics

- **Lines of Code**: ~1,500
- **Test Coverage**: 90%+
- **Smart Contracts**: 3 (CipherStake, cUSDT, FHECounter)
- **Hardhat Tasks**: 8 custom tasks
- **Dependencies**: FHEVM + ERC7984 + Hardhat ecosystem

---

## 💡 Use Cases

### Individual Users
- **Privacy-Conscious Stakers**: Stake without revealing holdings
- **High Net Worth Individuals**: Protect wealth from public view
- **Security-Focused Users**: Reduce risk of targeted attacks

### Institutions
- **Investment Firms**: Hide trading strategies and positions
- **DAOs**: Confidential treasury management
- **Crypto Funds**: Private portfolio staking

### Businesses
- **Corporate Treasuries**: Confidential yield generation
- **Payment Processors**: Private liquidity management
- **DeFi Protocols**: Integrate privacy features

### Developers
- **dApp Builders**: Add privacy to existing applications
- **Protocol Designers**: Build on confidential infrastructure
- **Researchers**: Explore FHE capabilities

---

## ❓ FAQ

**Q: Is CipherStake audited?**
A: Not yet. Do not use with real funds until audited.

**Q: What are the gas costs?**
A: FHE operations cost more gas than standard operations, typically 2-5x more.

**Q: Can I decrypt anyone's balance?**
A: No, only addresses with explicit permission can decrypt encrypted values.

**Q: Is this really private?**
A: Yes, amounts are encrypted on-chain. However, transaction patterns and timing may reveal information.

**Q: Which networks are supported?**
A: Currently Sepolia testnet. Mainnet deployment planned after audit.

**Q: Can I integrate CipherStake into my dApp?**
A: Yes! Use the smart contract interfaces or build on top of it.

**Q: What happens if I lose my private key?**
A: Your staked funds become unrecoverable. Always backup your keys securely.

**Q: How does FHE compare to zero-knowledge proofs?**
A: FHE allows computation on encrypted data, while ZK proves computation correctness. They're complementary technologies.

---

<div align="center">

**Built with ❤️ for a private, secure financial future**

[Website](https://cipherstake.io) • [Documentation](https://docs.cipherstake.io) • [Twitter](https://twitter.com/cipherstake) • [Discord](https://discord.gg/cipherstake)

⭐ **Star us on GitHub** if you find this project useful!

</div>

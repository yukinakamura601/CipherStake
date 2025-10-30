import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { Contract } from "ethers";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("CipherStake", function () {
  let signers: Signers;
  let token: Contract;
  let staking: Contract;
  let tokenAddress: string;
  let stakingAddress: string;

  before(async function () {
    const accounts = await ethers.getSigners();
    signers = { deployer: accounts[0], alice: accounts[1], bob: accounts[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("CipherStake tests require the mock FHEVM environment");
      this.skip();
    }

    const cusdtFactory = await ethers.getContractFactory("cUSDT");
    token = await cusdtFactory.deploy();
    await token.waitForDeployment();
    tokenAddress = await token.getAddress();

    const stakingFactory = await ethers.getContractFactory("CipherStake");
    staking = await stakingFactory.deploy(tokenAddress);
    await staking.waitForDeployment();
    stakingAddress = await staking.getAddress();

  });

  async function grantOperator(signer: HardhatEthersSigner) {
    const latestBlock = await ethers.provider.getBlock("latest");
    const now = BigInt(latestBlock?.timestamp ?? 0);
    const oneYear = 365n * 24n * 60n * 60n;
    await token.connect(signer).setOperator(stakingAddress, now + oneYear);
  }

  it("stakes tokens and tracks encrypted balances", async function () {
    const amount = 1_000n * 10n ** 6n;

    await token.connect(signers.deployer).mint(signers.alice.address, amount);
    await grantOperator(signers.alice);

    const stakeInput = await fhevm
      .createEncryptedInput(stakingAddress, signers.alice.address)
      .add64(amount)
      .encrypt();

    await staking.connect(signers.alice).stake(stakeInput.handles[0], stakeInput.inputProof);

    const encryptedStake = await staking.stakeOf(signers.alice.address);
    const clearStake = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedStake,
      stakingAddress,
      signers.alice,
    );
    expect(clearStake).to.eq(amount);

    const encryptedTotal = await staking.totalStaked();
    const clearTotal = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedTotal,
      stakingAddress,
      signers.alice,
    );
    expect(clearTotal).to.eq(amount);

    const encryptedBalance = await token.confidentialBalanceOf(signers.alice.address);
    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      tokenAddress,
      signers.alice,
    );
    expect(clearBalance).to.eq(0n);
  });

  it("allows partial withdrawals while keeping totals consistent", async function () {
    const amount = 2_000n * 10n ** 6n;

    await token.connect(signers.deployer).mint(signers.alice.address, amount);
    await grantOperator(signers.alice);

    const stakeInput = await fhevm
      .createEncryptedInput(stakingAddress, signers.alice.address)
      .add64(amount)
      .encrypt();

    await staking.connect(signers.alice).stake(stakeInput.handles[0], stakeInput.inputProof);

    const half = amount / 2n;
    const withdrawInput = await fhevm
      .createEncryptedInput(stakingAddress, signers.alice.address)
      .add64(half)
      .encrypt();

    await staking.connect(signers.alice).unstake(withdrawInput.handles[0], withdrawInput.inputProof);

    const remainingStakeEnc = await staking.stakeOf(signers.alice.address);
    const remainingStake = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      remainingStakeEnc,
      stakingAddress,
      signers.alice,
    );
    expect(remainingStake).to.eq(amount - half);

    const totalAfter = await staking.totalStaked();
    const clearTotalAfter = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      totalAfter,
      stakingAddress,
      signers.alice,
    );
    expect(clearTotalAfter).to.eq(amount - half);

    const encryptedBalance = await token.confidentialBalanceOf(signers.alice.address);
    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      tokenAddress,
      signers.alice,
    );
    expect(clearBalance).to.eq(half);
  });

  it("returns zero when attempting to withdraw more than staked", async function () {
    const amount = 500n * 10n ** 6n;

    await token.connect(signers.deployer).mint(signers.alice.address, amount);
    await grantOperator(signers.alice);

    const stakeInput = await fhevm
      .createEncryptedInput(stakingAddress, signers.alice.address)
      .add64(amount)
      .encrypt();
    await staking.connect(signers.alice).stake(stakeInput.handles[0], stakeInput.inputProof);

    const oversized = amount * 2n;
    const withdrawInput = await fhevm
      .createEncryptedInput(stakingAddress, signers.alice.address)
      .add64(oversized)
      .encrypt();

    await staking.connect(signers.alice).unstake(withdrawInput.handles[0], withdrawInput.inputProof);

    const stakeEnc = await staking.stakeOf(signers.alice.address);
    const remaining = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      stakeEnc,
      stakingAddress,
      signers.alice,
    );
    expect(remaining).to.eq(amount);
  });

  it("reissues viewing permissions on demand", async function () {
    const amount = 100n * 10n ** 6n;

    await token.connect(signers.deployer).mint(signers.alice.address, amount);
    await grantOperator(signers.alice);

    const stakeInput = await fhevm
      .createEncryptedInput(stakingAddress, signers.alice.address)
      .add64(amount)
      .encrypt();
    await staking.connect(signers.alice).stake(stakeInput.handles[0], stakeInput.inputProof);

    await expect(staking.connect(signers.alice).refreshMyStakeAccess()).to.not.be.reverted;
    await expect(staking.connect(signers.alice).requestTotalAccess()).to.not.be.reverted;
  });
});

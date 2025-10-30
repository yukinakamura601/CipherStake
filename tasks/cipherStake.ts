import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { FhevmType } from "@fhevm/hardhat-plugin";

function parseTokenAmount(rawAmount: string): bigint {
  const trimmed = rawAmount.trim();
  if (trimmed.length === 0) {
    throw new Error("Amount must be provided");
  }

  const [integerPart, fractionPart = ""] = trimmed.split(".");
  const normalizedFraction = (fractionPart + "000000").slice(0, 6);
  const joined = `${integerPart}${normalizedFraction}`.replace(/^0+/, "");
  return BigInt(joined === "" ? "0" : joined);
}

task("task:cusdt-address", "Prints the deployed cUSDT address").setAction(async (_args, hre) => {
  const deployment = await hre.deployments.get("cUSDT");
  console.log(`cUSDT address: ${deployment.address}`);
});

task("task:cipherstake-address", "Prints the deployed CipherStake address").setAction(async (_args, hre) => {
  const deployment = await hre.deployments.get("CipherStake");
  console.log(`CipherStake address: ${deployment.address}`);
});

task("task:cusdt-mint", "Mints cUSDT to a recipient")
  .addParam("to", "Recipient address")
  .addParam("amount", "Token amount (supports up to 6 decimals)")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();
    const deployment = await hre.deployments.get("cUSDT");
    const contract = await ethers.getContractAt("cUSDT", deployment.address);

    const amount = parseTokenAmount(args.amount);

    const tx = await contract.connect(signer).mint(args.to, amount);
    console.log(`Mint transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log(`Minted ${args.amount} cUSDT to ${args.to}`);
  });

task("task:cusdt-set-operator", "Authorizes CipherStake to move caller tokens")
  .addOptionalParam("days", "Authorization duration in days", "30")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();

    const tokenDeployment = await hre.deployments.get("cUSDT");
    const vaultDeployment = await hre.deployments.get("CipherStake");
    const contract = await ethers.getContractAt("cUSDT", tokenDeployment.address);

    const durationDays = BigInt(args.days ?? "30");
    const latestBlock = await ethers.provider.getBlock("latest");
    const now = BigInt(latestBlock?.timestamp ?? 0);
    const expiry = now + durationDays * 24n * 60n * 60n;

    const tx = await contract.connect(signer).setOperator(vaultDeployment.address, expiry);
    console.log(`Operator transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log(
      `Authorized CipherStake(${vaultDeployment.address}) as operator for ${durationDays} day(s).`,
    );
  });

task("task:cusdt-balance", "Decrypts a user's cUSDT balance")
  .addOptionalParam("user", "Address to inspect")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const deployment = await hre.deployments.get("cUSDT");
    const contract = await ethers.getContractAt("cUSDT", deployment.address);
    const [defaultSigner] = await ethers.getSigners();
    const target = (args.user as string | undefined) ?? defaultSigner.address;

    const balance = await contract.confidentialBalanceOf(target);
    if (balance === ethers.ZeroHash) {
      console.log(`Encrypted balance: ${balance}`);
      console.log("Clear balance   : 0");
      return;
    }

    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      balance,
      deployment.address,
      defaultSigner,
    );
    console.log(`Encrypted balance: ${balance}`);
    console.log(`Clear balance   : ${decrypted}`);
  });

task("task:cipherstake-stake", "Stakes cUSDT into the vault")
  .addParam("amount", "Token amount to stake (up to 6 decimals)")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const tokenDeployment = await hre.deployments.get("cUSDT");
    const vaultDeployment = await hre.deployments.get("CipherStake");

    const vault = await ethers.getContractAt("CipherStake", vaultDeployment.address);
    const [signer] = await ethers.getSigners();

    const amount = parseTokenAmount(args.amount);

    const encrypted = await fhevm
      .createEncryptedInput(vaultDeployment.address, signer.address)
      .add64(amount)
      .encrypt();

    const tx = await vault
      .connect(signer)
      .stake(encrypted.handles[0], encrypted.inputProof);
    console.log(`Stake transaction: ${tx.hash}`);
    await tx.wait();
    console.log(`Staked ${args.amount} cUSDT`);
  });

task("task:cipherstake-unstake", "Withdraws staked cUSDT from the vault")
  .addParam("amount", "Token amount to withdraw (up to 6 decimals)")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const vaultDeployment = await hre.deployments.get("CipherStake");
    const vault = await ethers.getContractAt("CipherStake", vaultDeployment.address);
    const [signer] = await ethers.getSigners();

    const amount = parseTokenAmount(args.amount);

    const encrypted = await fhevm
      .createEncryptedInput(vaultDeployment.address, signer.address)
      .add64(amount)
      .encrypt();

    const tx = await vault
      .connect(signer)
      .unstake(encrypted.handles[0], encrypted.inputProof);
    console.log(`Unstake transaction: ${tx.hash}`);
    await tx.wait();
    console.log(`Requested withdrawal of ${args.amount} cUSDT`);
  });

task("task:cipherstake-stake-info", "Decrypts a user's staked balance")
  .addOptionalParam("user", "Address to inspect")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const vaultDeployment = await hre.deployments.get("CipherStake");
    const vault = await ethers.getContractAt("CipherStake", vaultDeployment.address);

    const [defaultSigner] = await ethers.getSigners();
    const target = (args.user as string | undefined) ?? defaultSigner.address;

    const encryptedStake = await vault.stakeOf(target);
    if (encryptedStake === ethers.ZeroHash) {
      console.log(`Encrypted stake : ${encryptedStake}`);
      console.log("Clear stake    : 0");
      return;
    }

    const decrypted = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedStake,
      vaultDeployment.address,
      defaultSigner,
    );
    console.log(`Encrypted stake : ${encryptedStake}`);
    console.log(`Clear stake    : ${decrypted}`);
  });

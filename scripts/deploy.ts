import { network } from "hardhat";

async function main() {
  console.log("Initializing Hardhat 3 Network Context...");

  const { viem, networkName } = await network.create();

  console.log(`Starting deployment process to network: ${networkName}...`);
  console.log("Deploying PiggyBank smart contract via Viem...");

  // Get the deployer account to use as treasury
  const [deployer] = await viem.getWalletClients();
  const treasuryAddress = deployer.account.address;

  console.log(`Deployer / Treasury address: ${treasuryAddress}`);

  // Pass treasury address to the constructor
  const piggyBank = await viem.deployContract("PiggyBank", [treasuryAddress]);

  console.log("---------------------------------------------------------");
  console.log(`🎉 SUCCESS! PiggyBank deployed to ${networkName}!`);
  console.log(`Smart Contract Address: ${piggyBank.address}`);
  console.log(`Treasury Address:       ${treasuryAddress}`);
  console.log("---------------------------------------------------------");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
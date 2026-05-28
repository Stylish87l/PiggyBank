import { describe, it } from "node:test";
import assert from "node:assert";
import hre from "hardhat";
import { parseEther, zeroAddress } from "viem";

describe("PiggyBank Comprehensive Tests", async function () {
  
  async function deployPiggyBankFixture() {
    const { viem } = await hre.network.create();
    
    const [owner, treasury, user, hacker] = await viem.getWalletClients();
    const publicClient = await viem.getPublicClient();

    const piggyBank = await viem.deployContract("PiggyBank", [
      treasury.account.address,
    ]);

    return { piggyBank, publicClient, owner, treasury, user, hacker };
  }

  // --- EXISTING TESTS ---
  it("Should correctly set the treasury on deployment", async function () {
    const { piggyBank, treasury } = await deployPiggyBankFixture();
    const currentTreasury = await piggyBank.read.treasury();
    assert.strictEqual(currentTreasury.toLowerCase(), treasury.account.address.toLowerCase());
  });

  it("Should block deposits if no lock time has been set", async function () {
    const { piggyBank, user } = await deployPiggyBankFixture();
    await assert.rejects(
      async () => {
        await piggyBank.write.deposit([zeroAddress, 0n, 0n], {
          value: parseEther("1"),
          account: user.account,
        });
      },
      (err: any) => err.message.includes("Must set unlock time before depositing")
    );
  });

  it("Should allow deposit after setting a valid lock time", async function () {
    const { piggyBank, publicClient, user } = await deployPiggyBankFixture();
    const latestBlock = await publicClient.getBlock();
    const unlockTime = latestBlock.timestamp + BigInt(8 * 24 * 60 * 60);

    await piggyBank.write.setOrExtendLock([unlockTime], { account: user.account });
    const depositAmount = parseEther("1");
    await piggyBank.write.deposit([zeroAddress, 0n, 0n], {
      value: depositAmount,
      account: user.account,
    });

    const contractBalance = await piggyBank.read.getBalance([user.account.address, zeroAddress]);
    assert.strictEqual(contractBalance, depositAmount);
  });

  // --- NEW SECURITY & LOGIC TESTS ---

  it("Should reject standard withdrawal attempts before the lock expires", async function () {
    const { piggyBank, publicClient, user } = await deployPiggyBankFixture();
    const latestBlock = await publicClient.getBlock();
    const unlockTime = latestBlock.timestamp + BigInt(8 * 24 * 60 * 60);

    await piggyBank.write.setOrExtendLock([unlockTime], { account: user.account });
    await piggyBank.write.deposit([zeroAddress, 0n, 0n], { value: parseEther("1"), account: user.account });

    // Attempting a standard withdrawal early should fail
    await assert.rejects(
      async () => {
        await piggyBank.write.withdraw([zeroAddress, parseEther("1")], { account: user.account });
      },
      (err: any) => err.message.includes("Vault is still locked")
    );
  });

  it("Should allow a standard withdrawal after time travel past expiration", async function () {
    const { piggyBank, publicClient, user } = await deployPiggyBankFixture();
    const latestBlock = await publicClient.getBlock();
    const unlockTime = latestBlock.timestamp + BigInt(8 * 24 * 60 * 60);

    await piggyBank.write.setOrExtendLock([unlockTime], { account: user.account });
    await piggyBank.write.deposit([zeroAddress, 0n, 0n], { value: parseEther("1"), account: user.account });

    // Hardhat Time Travel: Warp the local chain node 9 days into the future and mine a block
    await publicClient.transport.request({
      method: "evm_increaseTime",
      params: [9 * 24 * 60 * 60],
    });
    await publicClient.transport.request({ method: "evm_mine" });

    // Withdrawal should now execute flawlessly
    await piggyBank.write.withdraw([zeroAddress, parseEther("1")], { account: user.account });
    
    const finalBalance = await piggyBank.read.getBalance([user.account.address, zeroAddress]);
    assert.strictEqual(finalBalance, 0n);
  });

  it("Should process emergency exits cleanly and send the fee to the treasury", async function () {
    const { piggyBank, publicClient, owner, treasury, user } = await deployPiggyBankFixture();
    
    // 1. Owner enables global emergency exits
    await piggyBank.write.setEmergencyEnabled([true], { account: owner.account });

    const latestBlock = await publicClient.getBlock();
    await piggyBank.write.setOrExtendLock([latestBlock.timestamp + BigInt(8 * 24 * 60 * 60)], { account: user.account });
    await piggyBank.write.deposit([zeroAddress, 0n, 0n], { value: parseEther("10"), account: user.account });

    // Track the treasury balance before the exit
    const treasuryBalBefore = await publicClient.getBalance({ address: treasury.account.address });

    // 2. User executes emergency exit early
    await piggyBank.write.emergencyWithdraw([zeroAddress, parseEther("10")], { account: user.account });

    // 3. Verify fee processing (1% of 10 ETH = 0.1 ETH)
    const treasuryBalAfter = await publicClient.getBalance({ address: treasury.account.address });
    const feeEarned = treasuryBalAfter - treasuryBalBefore;
    
    assert.strictEqual(feeEarned, parseEther("0.1"));
  });

  it("Should completely block non-owners from admin functions", async function () {
    const { piggyBank, hacker } = await deployPiggyBankFixture();

    // Random malicious user tries to flip the emergency switch
    await assert.rejects(
      async () => {
        await piggyBank.write.setEmergencyEnabled([true], { account: hacker.account });
      },
      (err: any) => err.message.includes("OwnableUnauthorizedAccount")
    );
  });
});
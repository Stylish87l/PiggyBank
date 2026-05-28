import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PiggyBankModule = buildModule("PiggyBankModule", (m) => {
  // Account index 1 will act as our local treasury wallet helper
  const defaultTreasury = m.getAccount(1);

  // Deploy PiggyBank and pass the treasury address to the constructor
  const piggyBank = m.contract("PiggyBank", [defaultTreasury]);

  return { piggyBank };
});

export default PiggyBankModule;
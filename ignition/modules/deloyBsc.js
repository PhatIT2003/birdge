const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const TokenTBC = "0x8E5200E40c7eD6AC3F4575C2196560D8BC8C215f"
const TokenModule = buildModule("TokenModule", (m) => {
  const bridgeBsc = m.contract("BridgeBsc", [TokenTBC]);

  return { bridgeBsc };
});

module.exports = TokenModule;

// TokenTBC - 0x8E5200E40c7eD6AC3F4575C2196560D8BC8C215f
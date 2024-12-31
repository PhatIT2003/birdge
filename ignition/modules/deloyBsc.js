const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const TokenTBC = "0xcE029b435e9cB3150aE7dba760Ea392548e2fd9b"
const TokenModule = buildModule("TokenModule", (m) => {
  const bridgeBsc = m.contract("BridgeBsc", [TokenTBC]);

  return { bridgeBsc };
});

module.exports = TokenModule;

// TokenTBC - 0xcE029b435e9cB3150aE7dba760Ea392548e2fd9b

// const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

// const TokenModule = buildModule("TokenModule", (m) => {
//   const TokenTBC = m.contract("TokenTBC");

//     return { TokenTBC };
// });

// module.exports = TokenModule;
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const TokenTBC = "0x06AA72A1C349f6F679b8739B5EF516Ad2D56d71d"
const TokenModule = buildModule("TokenModule", (m) => {
  const BridgeEth = m.contract("BridgeEth", [TokenTBC]);

    return { BridgeEth };
});

module.exports = TokenModule;

// TokenTBC - 0x06AA72A1C349f6F679b8739B5EF516Ad2D56d71d

// const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

// const TokenModule = buildModule("TokenModule", (m) => {
//   const TokenTBC = m.contract("TokenTBC");

//     return { TokenTBC };
// });

// module.exports = TokenModule;
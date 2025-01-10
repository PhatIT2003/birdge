const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const TokenTBC = "0x81E7698c2E9444339E563ED69a1A67bAe552eC9e"
const TokenModule = buildModule("TokenModule", (m) => {
  const Bridge = m.contract("Bridge", [TokenTBC]);

    return { Bridge };
});
module.exports = TokenModule;

// bridge_Eth - 0xb279FF68C10A7e7836e01bF78b7a4f656cA3DA88
// TokenTBC -  0x81E7698c2E9444339E563ED69a1A67bAe552eC9e

// const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

// const TokenModule = buildModule("TokenModule", (m) => {
//   const TokenTBC = m.contract("TokenTBC");

//     return { TokenTBC };
// });

// module.exports = TokenModule;
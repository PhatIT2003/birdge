// const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

// const TokenTBC = "0xBF294B3668cA15649d3085388eadbF77c6D15dD3"
// const TokenModule = buildModule("TokenModule", (m) => {
//   const bridge = m.contract("Bridge", [TokenTBC]);

//   return { bridge };
// });

// module.exports = TokenModule;

// TokenTBC -  0xBF294B3668cA15649d3085388eadbF77c6D15dD3
// bridge_Bsc - 0x42C9233Ca89a051Ea63d1b24F66F5E437d595bF6

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const TokenModule = buildModule("TokenModule", (m) => {
  const TokenTBC = m.contract("TokenTBC");

    return { TokenTBC };
});

module.exports = TokenModule;
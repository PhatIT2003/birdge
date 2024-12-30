const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const TokenTBC = "0xA45AeBCAEe2f80493310B2d38ae5A7d397546fdA"
const TokenModule = buildModule("TokenModule", (m) => {
  const BridgeEth = m.contract("BridgeEth", [TokenTBC]);

    return { BridgeEth };
});

module.exports = TokenModule;

// TokenTBC - 0xA45AeBCAEe2f80493310B2d38ae5A7d397546fdA
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IToken is IERC20 {
    function burn(address account, uint amount) external;
    function mint(address account, uint amount) external;
}

contract BridgeBase {
    address public admin;
    IToken public token;
    uint public nonce;
    mapping(uint => bool) public processedNonces;

    enum Step { Burn, Mint }
    event Transfer(
        address from,
        address to,
        uint amount,
        uint date,
        uint nonce,
        Step indexed step
    );

    constructor(address _token) {
        admin = msg.sender;
        token = IToken(_token);
    }

    function burn(address to, uint amount) external {
        token.burn(msg.sender, amount);
        emit Transfer(
            msg.sender,
            to,
            amount,
            block.timestamp,
            nonce,
            Step.Burn
        );
        nonce++;
    }

    function mint(address to, uint amount, uint otherChainNonce) external {
        require(msg.sender == admin, "only admin");
        require(!processedNonces[otherChainNonce], "transfer already processed");
        processedNonces[otherChainNonce] = true;
        token.mint(to, amount);
        emit Transfer(
            msg.sender,
            to,
            amount,
            block.timestamp,
            otherChainNonce,
            Step.Mint
        );
    }
}

contract BridgeEth is BridgeBase {
    constructor(address token) BridgeBase(token) {}
}

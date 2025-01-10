// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

interface IToken is IERC20 {
    function burn(address account, uint amount) external;
    function mint(address account, uint amount) external;

    // Hàm permit từ EIP-2612
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

contract BridgeBase {
    address public admin;
    IToken public token;
    uint public nonce;
    mapping(uint => bool) public processedNonces;
    bool public paused;

    enum StepBurn { Burn }
    event Burn(
        address from,
        address to,
        uint amount,
        uint date,
        uint nonce,
        StepBurn indexed step
    );
    enum StepMint { Mint }
      event Mint(
        address from,
        address to,
        uint amount,
        uint date,
        uint nonce,
        StepMint indexed step
    );

modifier whenNotPaused() {
    require(!paused, "contract is paused");
    _;
}
    constructor(address _token) {
        admin = msg.sender;
        token = IToken(_token);
    }
    function pause() external {
    require(msg.sender == admin, "only admin");
    paused = true;
}

function unpause() external {
    require(msg.sender == admin, "only admin");
    paused = false;
}

   function burn(
    address to,
    uint amount,
    uint deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external whenNotPaused {
    // Cấp quyền sử dụng token thông qua permit
    token.permit(msg.sender, address(this), amount, deadline, v, r, s);

    // Thực hiện đốt token
    token.burn(msg.sender, amount);

    // Ghi lại sự kiện
    emit Burn(
        msg.sender,
        to,
        amount,
        block.timestamp,
        nonce,
        StepBurn.Burn
    );

    // Tăng nonce
    nonce++;
}

    function mint(address to, uint amount, uint otherChainNonce) external {
        require(msg.sender == admin, "only admin");
        require(!processedNonces[otherChainNonce], "transfer already processed");
        processedNonces[otherChainNonce] = true;
        token.mint(to, amount);
        emit Mint(
            msg.sender,
            to,
            amount,
            block.timestamp,
            otherChainNonce,
            StepMint.Mint
        );
    }
    function changeAdmin(address newAdmin) external {
    require(msg.sender == admin, "only admin");
    admin = newAdmin;
}
      function getCurrentTimestamp() public view returns (uint) {
        return block.timestamp;
    }

}

contract Bridge is BridgeBase {
    constructor(address token) BridgeBase(token) {}
}

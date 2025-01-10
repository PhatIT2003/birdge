const { ethers } = require("ethers");
require('dotenv').config();
const TokenABI = require('./ABI/tokenABI.json');
const provider = new ethers.JsonRpcProvider('https://bsc-testnet-dataseed.bnbchain.org');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const domainName = "Tobe Chain";
const domainVersion = "1";
const chainId = 97;
const contractAddress = "0xBF294B3668cA15649d3085388eadbF77c6D15dD3";

const domain = {
    name: domainName,
    version: domainVersion,
    verifyingContract: contractAddress,
    chainId
};

const Permit = [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
];

async function createPermit(spender, value, nonce) {
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 giờ từ hiện tại
    
    const message = {
        owner: wallet.address,
        spender,
        value,
        nonce,
        deadline
    };

    const signature = await wallet.signTypedData(
        domain,
        {
            Permit: Permit
        },
        message
    );

    const sig = ethers.Signature.from(signature);

    return {
        r: sig.r,
        s: sig.s,
        v: sig.v,
        signature,
        deadline,
        owner: wallet.address,
        value,
        spender
    };
}
const permitABI = [
    "function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)"
];

async function executePermit(permitData) {
    const contract = new ethers.Contract(contractAddress, permitABI, wallet);
    
    try {
        const tx = await contract.permit(
            permitData.owner,
            permitData.spender,
            permitData.value,
            permitData.deadline,
            permitData.v,
            permitData.r,
            permitData.s
        );
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("Transaction confirmed!");
    } catch (error) {
        console.error("Error:", error);
    }
}

async function main() {
    // Lấy nonce từ contract
    const contractABI =  TokenABI;
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    const nonce = await contract.nonces(wallet.address);

    const permit = await createPermit(
        "0xd21d67a79fe7fB26194AB9a0974f3bc78936415F",
        ethers.parseUnits("1000000000", 18), // Giả sử token có 18 số thập phân
        nonce
    );
    await executePermit(permit)
    console.log("Permit data:", permit);
    console.log({
        r: permit.r,
        s: permit.s,
        v: permit.v,
        signature: permit.signature,
        deadline: permit.deadline,
        owner: permit.owner,
        spender: permit.spender,
        value: permit.value
    });
}

main().catch(console.error);
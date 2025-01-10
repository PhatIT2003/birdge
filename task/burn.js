const { ethers } = require("ethers");
require('dotenv').config();

const tokenABI = require("./ABI/tokenABI.json");
const bridgeABI = require("./ABI/bridgeABI.json");

const tokenAddress = "0xBF294B3668cA15649d3085388eadbF77c6D15dD3";
const bridgeAddress = "0xd21d67a79fe7fB26194AB9a0974f3bc78936415F";

const provider = new ethers.JsonRpcProvider("https://bsc-testnet-dataseed.bnbchain.org");
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

async function burnTokens(to, amount) {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);


    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const nonce = await tokenContract.nonces(wallet.address);
    
    const domain = {
        name: "Tobe Chain",
        version: "1",
        chainId: 97,
        verifyingContract: tokenAddress,
    };

    const types = {
        Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint256" },
        ],
    };

    const value = {
        owner: wallet.address,
        spender: bridgeAddress,
        value: amount,
        nonce,
        deadline,
    };

    const signature = await wallet.signTypedData(domain, types, value);
    const sig = ethers.Signature.from(signature);

    return {
        to,
        amount,
        deadline,
        v: sig.v,
        r: sig.r,
        s: sig.s
    };
}

async function executePermit(permitData) {
    const bridgeContract = new ethers.Contract(bridgeAddress, bridgeABI, wallet);
    
    try {
        console.log("Executing burn transaction...");
        const tx = await bridgeContract.burn(
            permitData.to,
            permitData.amount,
            permitData.deadline,
            permitData.v,
            permitData.r,
            permitData.s
        );
        
        console.log("Transaction hash:", tx.hash);
        console.log("Waiting for confirmation...");
        
        const receipt = await tx.wait();
        console.log("Transaction confirmed in block:", receipt.blockNumber);
        return receipt;
    } catch (error) {
        console.error("Error executing burn transaction:", error.message);
        throw error;
    }
}

async function main() {
    try {
        // Example usage - replace with actual values
        const recipientAddress = "0xdc2436650c1Ab0767aB0eDc1267a219F54cf7147"; // Add recipient address
        const amount =  ethers.parseUnits("1000", 18) // Amount in ether units
        
        const permitData = await burnTokens(recipientAddress, amount);
        await executePermit(permitData);
        console.log(
            permitData
        )
    } catch (error) {
        console.error("Error in main execution:", error);
    }
}

main();
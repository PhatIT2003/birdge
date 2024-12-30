require('dotenv').config();
const Web3 = require('web3');
const BridgeABI = require('./ABI/bridgeABI.json');


const bridgeBsc = async () => {
    const web3 = new Web3("https://bsc-testnet-dataseed.bnbchain.org");
    const BridgeBscAddress = "0x487B028ecbdE12739EC57094E97f3f97E4e3FfE1";
    const fromAddress = "0xdc2436650c1Ab0767aB0eDc1267a219F54cf7147";
    const ToAddress = "0xdc2436650c1Ab0767aB0eDc1267a219F54cf7147";
    const amount = web3.utils.toWei('10000', 'ether');
    const privateKey = process.env.PRIVATE_KEY;
    
    const BridgeBscContract = new web3.eth.Contract(BridgeABI, BridgeBscAddress);
    web3.eth.accounts.wallet.add(privateKey);

    try {
        // Gửi giao dịch burn
        const burnTx = await BridgeBscContract.methods.burn(ToAddress, amount).send({
            from: fromAddress,
            gas: 2000000,
        });

        console.log("Burn thành công:", burnTx);


    } catch (error) {
        console.error("Lỗi khi gọi burn:", error.message);
    }
};
bridgeBsc();

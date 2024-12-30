require('dotenv').config();
const Web3 = require('web3');
const BridgeABI = require('./ABI/bridgeABI.json');

const bridgeBsc = async () => {
    const web3 = new Web3("https://bsc-testnet-dataseed.bnbchain.org");

    const BridgeBscAddress = "0x487B028ecbdE12739EC57094E97f3f97E4e3FfE1";
    const privateKey = process.env.PRIVATE_KEY;
    const fromAddress = "0xdc2436650c1Ab0767aB0eDc1267a219F54cf7147";
    const ToAddress = "0xdc2436650c1Ab0767aB0eDc1267a219F54cf7147";
    const amount = web3.utils.toWei('10000', 'ether');

    const BridgeBscContract = new web3.eth.Contract(BridgeABI, BridgeBscAddress);
    web3.eth.accounts.wallet.add(privateKey);

    try {
        // Gửi giao dịch burn
        const burnTx = await BridgeBscContract.methods.burn(ToAddress, amount).send({
            from: fromAddress,
            gas: 2000000,
        });

        console.log("Burn thành công:", burnTx);

        // Kiểm tra nếu có sự kiện Transfer
        const transferEvent = burnTx.events.Transfer; // Sử dụng event Transfer
        if (transferEvent) {
            const recipient = transferEvent.returnValues.to;
            const burnedAmount = transferEvent.returnValues.amount;
            const nonce = transferEvent.returnValues.nonce; // Không có nonce trong Transfer, bạn có thể cần một cách khác để xác định nonce

            console.log("Dữ liệu sự kiện Transfer:", { recipient, burnedAmount, nonce });

            // Gọi hàm mint với dữ liệu từ sự kiện transfer
             await bridgeEth(recipient, burnedAmount, nonce);
        } else {
            console.log("Không có sự kiện Transfer.");
        }

    } catch (error) {
        console.error("Lỗi khi gọi burn:", error.message);
    }
};

const bridgeEth = async (recipient, amount, nonce) => {
    const web3 = new Web3("https://sepolia.infura.io/v3/082f3c154c4d4ccdbd305e854d654836");

    const BridgeEthAddress = "0x9d5a22502BE1922a16d168A062A875212f994d12";
    const privateKey = process.env.PRIVATE_KEY;
    const fromAddress = "0xdc2436650c1Ab0767aB0eDc1267a219F54cf7147";

    const BridgeEthContract = new web3.eth.Contract(BridgeABI, BridgeEthAddress);
    web3.eth.accounts.wallet.add(privateKey);

    try {
        // Gửi giao dịch mint
        const mintTx = await BridgeEthContract.methods.mint(recipient, amount, nonce).send({
            from: fromAddress,
            gas: 2000000,
        });

        console.log("Mint thành công:", mintTx);
    } catch (error) {
        console.error("Lỗi khi gọi mint:", error.message);
    }
};

const main = async () => {
    await bridgeBsc();

};

main();

require('dotenv').config();
const Web3 = require('web3');
const BridgeABI = require('./ABI/bridgeABI.json');

let web3Bsc, web3Eth, BridgeBscContract, BridgeEthContract;
const BridgeBscAddress = "0x487B028ecbdE12739EC57094E97f3f97E4e3FfE1";
const BridgeEthAddress = "0x9d5a22502BE1922a16d168A062A875212f994d12";
const privateKey = process.env.PRIVATE_KEY;
const fromAddress = "0xdc2436650c1Ab0767aB0eDc1267a219F54cf7147";

let lastProcessedBlock = 0;
const processedEvents = new Set();

function initializeWeb3Connections() {
    web3Bsc = new Web3(new Web3.providers.WebsocketProvider('wss://bsc-testnet.publicnode.com', {
        reconnect: {
            auto: true,
            delay: 5000,
            maxAttempts: 5,
            onTimeout: false
        }
    }));
    
    web3Eth = new Web3(new Web3.providers.WebsocketProvider('wss://sepolia.infura.io/ws/v3/082f3c154c4d4ccdbd305e854d654836', {
        reconnect: {
            auto: true,
            delay: 5000,
            maxAttempts: 5,
            onTimeout: false
        }
    }));

    BridgeBscContract = new web3Bsc.eth.Contract(BridgeABI, BridgeBscAddress);
    BridgeEthContract = new web3Eth.eth.Contract(BridgeABI, BridgeEthAddress);
    web3Eth.eth.accounts.wallet.add(privateKey);

    web3Bsc.eth.net.isListening()
        .then(() => console.log('BSC WebSocket đã kết nối'))
        .catch(e => console.log('Lỗi kết nối BSC:', e));

    web3Eth.eth.net.isListening()
        .then(() => console.log('ETH WebSocket đã kết nối'))
        .catch(e => console.log('Lỗi kết nối ETH:', e));
}

//  Kiểm tra số dư và chi phí gas
async function checkBalanceAndGas(fromAddress, gasLimit) {
    try {
        const balance = await web3Eth.eth.getBalance(fromAddress);
        const gasPrice = await web3Eth.eth.getGasPrice();
        const adjustedGasPrice = Math.floor(Number(gasPrice) * 1.5);
        const estimatedGasCost = BigInt(adjustedGasPrice) * BigInt(gasLimit);
        
        console.log(`Số dư hiện tại: ${web3Eth.utils.fromWei(balance, 'ether')} ETH`);
        console.log(`Chi phí gas ước tính: ${web3Eth.utils.fromWei(estimatedGasCost.toString(), 'ether')} ETH`);
        
        if (BigInt(balance) < estimatedGasCost) {
            throw new Error(`Không đủ ETH để trả gas. Cần thêm ${web3Eth.utils.fromWei((estimatedGasCost - BigInt(balance)).toString(), 'ether')} ETH`);
        }
        
        return adjustedGasPrice.toString();
    } catch (error) {
        throw new Error(`Lỗi khi kiểm tra số dư và gas: ${error.message}`);
    }
}

async function handleMint(recipient, amount, nonce, retryCount = 0) {
    const MAX_RETRIES = 3;
    const DELAY_BETWEEN_TXS = 30000;

    try {
        if (retryCount > 0) {
            console.log(`Thử lại lần ${retryCount}/${MAX_RETRIES} cho nonce ${nonce}`);
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_TXS));
        }

        console.log(`Xử lý mint token...`);
        console.log(`Người nhận: ${recipient}`);
        console.log(`Số lượng: ${amount}`);
        console.log(`Nonce: ${nonce}`);

        const gasLimit = 2000000;
        const gasPrice = await checkBalanceAndGas(fromAddress, gasLimit);

        const mintTx = await BridgeEthContract.methods.mint(recipient, amount, nonce).send({
            from: fromAddress,
            gas: gasLimit,
            gasPrice: gasPrice
        });

        let receipt = null;
        for (let i = 0; i < 60; i++) {
            receipt = await web3Eth.eth.getTransactionReceipt(mintTx.transactionHash);
            if (receipt) break;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        if (!receipt) {
            throw new Error("Không nhận được transaction receipt sau 5 phút");
        }

        if (receipt.status) {
            console.log("Mint thành công, hash giao dịch:", mintTx.transactionHash);
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_TXS));
            return mintTx;
        } else {
            throw new Error("Giao dịch thất bại");
        }
    } catch (error) {
        console.error("Lỗi trong quá trình mint:", error.message);
        
        if (retryCount < MAX_RETRIES) {
            console.log(`Đợi ${DELAY_BETWEEN_TXS/1000}s trước khi thử lại...`);
            return handleMint(recipient, amount, nonce, retryCount + 1);
        }
        
        throw error;
    }
}

//  Xử lý sự kiện từ mạng BSC
async function processEvent(event) {
    const eventId = `${event.transactionHash}-${event.logIndex}`;
    
    if (processedEvents.has(eventId)) {
        console.log(`Sự kiện ${eventId} đã được xử lý trước đó`);
        return;
    }

    console.log(`Xử lý sự kiện mới: ${eventId}`);
    const { returnValues: { to: recipient, amount, nonce } } = event;

    try {
        await handleMint(recipient, amount, nonce);
        processedEvents.add(eventId);
        console.log(`Đã xử lý thành công sự kiện ${eventId}`);
    } catch (error) {
        console.error(`Lỗi xử lý sự kiện ${eventId}:`, error.message);
        throw error;
    }
}

// Lắng nghe sự kiện
async function startEventListener() {
    console.log("Bắt đầu lắng nghe sự kiện...");

    if (lastProcessedBlock === 0) {
        lastProcessedBlock = await web3Bsc.eth.getBlockNumber();
        console.log("Khởi tạo block bắt đầu:", lastProcessedBlock);
    }

    while (true) {
        try {
            if (!web3Bsc.currentProvider.connected || !web3Eth.currentProvider.connected) {
                console.log("Phát hiện mất kết nối, đang kết nối lại...");
                initializeWeb3Connections();
                await new Promise(resolve => setTimeout(resolve, 5000));
                continue;
            }

            const currentBlock = await web3Bsc.eth.getBlockNumber();
            
            if (currentBlock > lastProcessedBlock) {
                console.log(`Quét các block từ ${lastProcessedBlock} đến ${currentBlock}`);
                
                const events = await BridgeBscContract.getPastEvents('Transfer', {
                    fromBlock: lastProcessedBlock + 1,
                    toBlock: currentBlock
                });
                // console.log(events);
                const sortedEvents = events.sort((a, b) => {
                    if (a.blockNumber === b.blockNumber) {
                        return a.logIndex - b.logIndex;
                    }
                    return a.blockNumber - b.blockNumber;
                });

                for (const event of sortedEvents) {
                    await processEvent(event);
                }

                lastProcessedBlock = currentBlock;
            }

            await new Promise(resolve => setTimeout(resolve, 15000));
        } catch (error) {
            console.error("Lỗi trong quá trình lắng nghe:", error.message);
            if (error.message.includes('connection not open')) {
                console.log("Đang thử kết nối lại...");
                initializeWeb3Connections();
            }
            await new Promise(resolve => setTimeout(resolve, 15000));
        }
    }
}

// Điều phối kết nối
async function maintainConnection() {
    try {
        await startEventListener();
    } catch (error) {
        console.error('Lỗi kết nối:', error.message);
        console.log('Thử kết nối lại sau 15 giây...');
        setTimeout(maintainConnection, 15000);
    }
}

initializeWeb3Connections();
maintainConnection();

// Xử lý lỗi không mong muốn
process.on('unhandledRejection', (error) => {
    console.error('Lỗi promise không được xử lý:', error.message);
});

process.on('SIGINT', async () => {
    console.log('Đóng kết nối...');
    if (web3Bsc.currentProvider && web3Bsc.currentProvider.disconnect) {
        web3Bsc.currentProvider.disconnect();
    }
    if (web3Eth.currentProvider && web3Eth.currentProvider.disconnect) {
        web3Eth.currentProvider.disconnect();
    }
    process.exit();
});
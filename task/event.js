require('dotenv').config();
const Web3 = require('web3');
const BridgeABI = require('./ABI/bridgeABI.json');

// Sử dụng WebSocket thay vì HTTP
const web3Bsc = new Web3('wss://bsc-testnet.publicnode.com');
const web3Eth = new Web3('wss://sepolia.infura.io/ws/v3/082f3c154c4d4ccdbd305e854d654836');

// Địa chỉ contract
const BridgeBscAddress = "0x487B028ecbdE12739EC57094E97f3f97E4e3FfE1";
const BridgeEthAddress = "0x9d5a22502BE1922a16d168A062A875212f994d12";

// Khởi tạo contracts
const BridgeBscContract = new web3Bsc.eth.Contract(BridgeABI, BridgeBscAddress);
const BridgeEthContract = new web3Eth.eth.Contract(BridgeABI, BridgeEthAddress);

// Thêm ví
const privateKey = process.env.PRIVATE_KEY;
const fromAddress = "0xdc2436650c1Ab0767aB0eDc1267a219F54cf7147";
web3Eth.eth.accounts.wallet.add(privateKey);

// Hàm kiểm tra số dư và ước tính gas
async function checkBalanceAndGas(fromAddress, gasLimit) {
    try {
        // Lấy số dư của ví
        const balance = await web3Eth.eth.getBalance(fromAddress);
        
        // Lấy giá gas hiện tại
        const gasPrice = await web3Eth.eth.getGasPrice();
        
        // Tính tổng chi phí gas dự kiến
        const estimatedGasCost = BigInt(gasPrice) * BigInt(gasLimit);
        
        console.log(`Số dư hiện tại: ${web3Eth.utils.fromWei(balance, 'ether')} ETH`);
        console.log(`Chi phí gas ước tính: ${web3Eth.utils.fromWei(estimatedGasCost.toString(), 'ether')} ETH`);
        
        // Kiểm tra xem có đủ ETH để trả gas không
        if (BigInt(balance) < estimatedGasCost) {
            throw new Error(`Không đủ ETH để trả gas. Cần thêm ${web3Eth.utils.fromWei((estimatedGasCost - BigInt(balance)).toString(), 'ether')} ETH`);
        }
        
        return gasPrice;
    } catch (error) {
        throw new Error(`Lỗi khi kiểm tra số dư và gas: ${error.message}`);
    }
}

// Hàm xử lý mint
async function handleMint(recipient, amount, nonce) {
    try {
        console.log(`Chuẩn bị mint token...`);
        console.log(`Người nhận: ${recipient}`);
        console.log(`Số lượng: ${amount}`);
        console.log(`Nonce: ${nonce}`);

        // Ước tính gas limit
        const gasLimit = 2000000;
        
        // Kiểm tra số dư và lấy giá gas
        const gasPrice = await checkBalanceAndGas(fromAddress, gasLimit);

        // Thực hiện giao dịch mint với gas price đã được tính toán
        const mintTx = await BridgeEthContract.methods.mint(recipient, amount, nonce).send({
            from: fromAddress,
            gas: gasLimit,
            gasPrice: gasPrice
        });
        try {
            const txReceipt = await web3Eth.eth.getTransactionReceipt(mintTx.transactionHash);
            console.log('Receipt test:', txReceipt.status);
            if (txReceipt === null) {
              console.log("Transaction is still pending...");
              setTimeout(handleMint, 200);
            } else if (txReceipt.status) {
              console.log("Transaction was successful!");
            } else {
              console.log("Transaction failed!");
            }
          } catch (error) {
            console.error("Error:", error);
        }
        console.log("Mint thành công, hash giao dịch:", mintTx.transactionHash);
        return mintTx;
    } catch (error) {
        console.error("Lỗi trong quá trình mint:", error.message);
        throw error;
        
    }
    
}

// Hàm lắng nghe sự kiện sử dụng polling
async function startEventListener() {
    console.log("Bắt đầu lắng nghe sự kiện...");

    // Theo dõi các sự kiện đã xử lý để tránh trùng lặp
    const processedEvents = new Set();

    // Lấy block hiện tại
    let currentBlock = await web3Bsc.eth.getBlockNumber();
    console.log("Block hiện tại:", currentBlock);

    // Hàm để xử lý từng sự kiện
    async function processEvent(event) {
        const eventId = `${event.transactionHash}-${event.logIndex}`;
        if (processedEvents.has(eventId)) return;

        processedEvents.add(eventId);
        console.log("Phát hiện sự kiện Transfer mới:", event);

        const {
            returnValues: { to: recipient, amount, nonce }
        } = event;

        try {
            console.log(`Xử lý mint token cho người nhận ${recipient}`);
            await handleMint(recipient, amount, nonce);
            console.log(`Hoàn tất xử lý sự kiện cho nonce: ${nonce}`);
        } catch (error) {
            console.error("Lỗi khi xử lý sự kiện:", error.message);

            // Nếu lỗi là do không đủ gas, gửi thông báo chi tiết
            if (error.message.includes('insufficient funds')) {
                console.log('Vui lòng nạp thêm ETH vào ví để thực hiện giao dịch.');
            }
        }
    }

    // Vòng lặp chính để lấy và xử lý sự kiện tuần tự
    while (true) {
        try {
            // Lấy danh sách sự kiện từ block hiện tại đến block mới nhất
            const events = await BridgeBscContract.getPastEvents('Transfer', {
                fromBlock: currentBlock,
                toBlock: 'latest'
            });

            // Xử lý từng sự kiện tuần tự
            for (const event of events) {
                await processEvent(event);
            }

            // Cập nhật block hiện tại sau khi xử lý xong tất cả sự kiện
            currentBlock = await web3Bsc.eth.getBlockNumber();
        } catch (error) {
            console.error("Lỗi khi kiểm tra sự kiện:", error.message);
        }

        // Đợi 15 giây trước khi kiểm tra sự kiện tiếp theo
        await new Promise(resolve => setTimeout(resolve, 15000));
    }
}

// Xử lý lỗi và chức năng khởi động lại
async function maintainConnection() {
    try {
        await startEventListener();
    } catch (error) {
        console.error('Lỗi kết nối:', error.message);
        console.log('Thử kết nối lại sau 5 giây...');
        setTimeout(maintainConnection, 15000);
    }
}

// Khởi động listener
maintainConnection();

// Giữ cho process tiếp tục chạy
process.on('unhandledRejection', (error) => {
    console.error('Lỗi promise không được xử lý:', error.message);
});

// Xử lý khi process bị đóng
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
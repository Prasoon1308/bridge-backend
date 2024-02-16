require("dotenv").config();
const config = require("../config/config.json");
const ethers = require("ethers");
const fs = require("fs");
const { INFURA_API_KEY, PRIVATE_KEY } = process.env;
const {
  saveL1Deposit,
  completeL1Deposit,
  saveL2Burn,
  completeL2Burn,
} = require("./service");
const {
  generateSignatureL1,
  generateSignatureL2,
} = require("./generateSignature");

const bridgeFactoryV3Abi = require("../ABI/BridgeFactoryV3.json");
const bridgeDeployerV3Abi = require("../ABI/BridgeDeployerV3.json");
const tokenL1Abi = require("../ABI/TokenL1.json");
const tokenL2Abi = require("../ABI/TokenL2.json");

const bridgeFactoryV3Address = config.BridgeFactoryV3.goerli;
const bridgeDeployerV3Address = config.BridgeDeployerV3.mumbai;
console.log("BridgeFactoryV3 Address on L1:", bridgeFactoryV3Address);
console.log("BridgeDeployerV3 Address on L2:", bridgeDeployerV3Address);

const L1Provider = new ethers.WebSocketProvider(
  `wss://goerli.infura.io/ws/v3/${INFURA_API_KEY}`
);
const adminWalletL1 = new ethers.Wallet(`0x${PRIVATE_KEY}`).connect(L1Provider);
const L2Provider = new ethers.WebSocketProvider(
  `wss://polygon-mumbai.infura.io/ws/v3/${INFURA_API_KEY}`
);
const adminWalletL2 = new ethers.Wallet(`0x${PRIVATE_KEY}`).connect(L2Provider);

const bridgeFactoryV3 = new ethers.Contract(
  bridgeFactoryV3Address,
  bridgeFactoryV3Abi,
  L1Provider
);
const bridgeDeployerV3 = new ethers.Contract(
  bridgeDeployerV3Address,
  bridgeDeployerV3Abi,
  L2Provider
);

console.log("starting");

const filter1 = bridgeFactoryV3.filters.DepositLog; // Deposit on L1
const filter2 = bridgeFactoryV3.filters.WithdrawLog; // Withdraw on L1
const filter3 = bridgeDeployerV3.filters.bridgeDeployedLog; // Bridge Deployed on L2
const filter4 = bridgeDeployerV3.filters.mintLog; // Mint on L2
const filter5 = bridgeDeployerV3.filters.burnLog; // Burn on L2

// DEPOSIT ON L1 --> MINT ON L2
const depositOnL1 = async () => {
  let transactionHashL1;
  try {
    bridgeFactoryV3.on(
      filter1,
      async (rootTokenAddress, fromAddress, amount, nonce, event) => {
        const transactionAmountL1 = ethers.toNumber(amount);
        const transactionNonceL1 = ethers.toNumber(nonce);
        transactionHashL1 = event.log.transactionHash;
        console.log(
          "RootToken Address: ",
          rootTokenAddress,
          "Deposited on L1 from: ",
          fromAddress,
          "Amount: ",
          transactionAmountL1,
          "Nonce: ",
          transactionNonceL1,
          "Transaction Hash: ",
          transactionHashL1
        );

        const signatureGen = generateSignatureL2(
          rootTokenAddress,
          fromAddress,
          transactionAmountL1,
          transactionNonceL1
        );

        const depositPushDb = saveL1Deposit(
          rootTokenAddress,
          fromAddress,
          transactionAmountL1,
          transactionNonceL1,
          "Deposit",
          transactionHashL1
        );
      }
    );
    bridgeDeployerV3.on(
      filter4,
      async (childTokenAddress, fromAddress, amount, nonce, event) => {
        const transactionAmountL2 = ethers.toNumber(amount);
        const transactionNonceL2 = ethers.toNumber(nonce);
        const transactionHashL2 = event.log.transactionHash;
        console.log(
          "ChildToken Address: ",
          childTokenAddress,
          "Deposited on L2 from: ",
          fromAddress,
          "Amount: ",
          transactionAmountL2,
          "Nonce: ",
          transactionNonceL2,
          "Transaction Hash: ",
          transactionHashL2
        );
        // update L2 transaction hash in L1 db
        const completeDeposit = completeL1Deposit(
          transactionHashL1,
          transactionHashL2
        );
      }
    );
  } catch (error) {
    console.log("Error in tracking Deposit on L1!");
    console.log(error);
  }
};

// // BURN ON L2 ---> WITHDRAW ON L1
const burnOnL2 = async () => {
  let transactionHashL2;
  try {
    bridgeDeployerV3.on(
      filter5,
      async (childTokenAddress, fromAddress, amount, nonce, event) => {
        transactionHashL2 = event.log.transactionHash;
        const transactionAmountL2 = ethers.toNumber(amount);
        const transactionNonceL2 = ethers.toNumber(nonce);
        console.log(
          "ChildToken Address: ",
          childTokenAddress,
          "Burn on L2 from: ",
          fromAddress,
          "Amount: ",
          transactionAmountL2,
          "Nonce: ",
          transactionNonceL2
        );
        const signatureGen = generateSignatureL1(
          childTokenAddress,
          fromAddress,
          transactionAmountL2,
          transactionNonceL2
        );
        const burnDbPush = saveL2Burn(
          childTokenAddress,
          fromAddress,
          transactionAmountL2,
          transactionNonceL2,
          "Burn",
          transactionHashL2
        );
      }
    );

    bridgeFactoryV3.on(
      filter2,
      async (rootTokenAddress, fromAddress, amount, nonce, event) => {
        const transactionHashL1 = event.log.transactionHash;
        const transactionAmountL1 = ethers.toNumber(amount);
        const transactionNonceL1 = ethers.toNumber(nonce);
        console.log(
          "RootToken Address: ",
          rootTokenAddress,
          "Withdraw on L1 from: ",
          fromAddress,
          "Amount: ",
          transactionAmountL1,
          "Nonce: ",
          transactionNonceL1,
          "Transaction Hash: ",
          transactionHashL1
        );

        const completeBurn = completeL2Burn(
          transactionHashL1,
          transactionHashL2
        );
      }
    );
  } catch (error) {
    console.log("Error in tracking Burn on L2!");
    console.log(error);
  }
};

const deployNewBridge = async() => {
    try {
        bridgeDeployerV3.on(
          filter3,
          async (rootTokenAddress, childTokenAddress, event) => {
            console.log("New Bridge Deployed on L2");
            console.log(
              "RootToken Address:",
              rootTokenAddress,
              "ChildToken Address: ",
              childTokenAddress
            );
            const tx = await bridgeFactoryV3
              .connect(adminWalletL1)
              .setBridge(rootTokenAddress, childTokenAddress);
            receipt = await tx.wait();
          //   console.log(receipt);
            console.log("Bridge connected on L1");
            console.log(
              "RootToken Address:",
              rootTokenAddress,
              "ChildToken Address: ",
              childTokenAddress
            );
          }
        );
      } catch (error) {
        console.log("Error while connecting bridge on L1!");
        console.log(error);
      }
      
}
depositOnL1();
burnOnL2();
deployNewBridge();

require("dotenv").config();
const config = require("../config/config.json");
const ethers = require("ethers");
const { INFURA_API_KEY, PRIVATE_KEY } = process.env;

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

const filter3 = bridgeDeployerV3.filters.bridgeDeployedLog(); // Bridge Deployed on L2

console.log("starting");

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

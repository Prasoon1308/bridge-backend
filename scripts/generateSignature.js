const { ethers } = require("ethers");
require("dotenv").config();
const config = require("../config/config.json");
const { INFURA_API_KEY, PRIVATE_KEY } = process.env;

const bridgeFactoryV3Address = config.BridgeFactoryV3.goerli;
const bridgeDeployerV3Address = config.BridgeDeployerV3.mumbai;

const generateSignatureL1 = async (
  childTokenAddress,
  fromAddress,
  transactionAmount,
  transactionNonce
) => {
  const domainL1 = {
    name: "BridgeFactoryV3",
    version: "3",
    chainId: 5,
    verifyingContract: bridgeFactoryV3Address, // BridgeFactory address on L1
  };

  const types = {
    WithdrawOnL1: [
      { name: "childToken", type: "address" },
      { name: "userAddress", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "transactionNonce", type: "uint256" },
    ],
  };

  const value = {
    childToken: childTokenAddress, // TokenL2 address on L2
    userAddress: fromAddress, // User address
    amount: transactionAmount,
    transactionNonce: transactionNonce,
  };
  const L1Provider = new ethers.WebSocketProvider(
    `wss://goerli.infura.io/ws/v3/${INFURA_API_KEY}`
  );
  const adminWalletL1 = new ethers.Wallet(`0x${PRIVATE_KEY}`).connect(
    L1Provider
  );
//   console.log("wallet---", adminWalletL1.address);

  const WITHDRAW_TYPEHASH = await ethers.keccak256(
    ethers.solidityPacked(
      ["string"],
      [
        "WithdrawOnL1(address childToken,address userAddress,uint256 amount,uint256 transactionNonce)",
      ]
    )
  );
//   console.log("WITHDRAW_TYPEHASH---:", WITHDRAW_TYPEHASH);

  const abiCoder = new ethers.AbiCoder();
  const data = await abiCoder.encode(
    ["bytes32", "address", "address", "uint256", "uint256"],
    [
      WITHDRAW_TYPEHASH,
      value.childToken,
      value.userAddress,
      value.amount,
      value.transactionNonce,
    ]
  );
  console.log("data---", data);

  const dataHash = await ethers.keccak256(data);
//   console.log("structHash---", dataHash);

  const signature = await adminWalletL1.signTypedData(domainL1, types, value);
  console.log("signature---", signature);
};

const generateSignatureL2 = async (
  rootTokenAddress,
  fromAddress,
  transactionAmount,
  transactionNonce
) => {
  const domainL2 = {
    name: "BridgeDeployerV3",
    version: "3",
    chainId: 80001,
    verifyingContract: bridgeDeployerV3Address, // BridgeDeployer address on L2
  };

  const types = {
    MintOnL2: [
      { name: "rootToken", type: "address" },
      { name: "userAddress", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "transactionNonce", type: "uint256" },
    ],
  };

  const value = {
    rootToken: rootTokenAddress, // TokenL1 address on L1
    userAddress: fromAddress, // User address
    amount: transactionAmount,
    transactionNonce: transactionNonce,
  };
  const L2Provider = new ethers.WebSocketProvider(
    `wss://polygon-mumbai.infura.io/ws/v3/${INFURA_API_KEY}`
  );
  const adminWalletL2 = new ethers.Wallet(`0x${PRIVATE_KEY}`).connect(
    L2Provider
  );
//   console.log("wallet---", adminWalletL2.address);

  const MINT_TYPEHASH = await ethers.keccak256(
    ethers.solidityPacked(
      ["string"],
      [
        "MintOnL2(address rootToken,address userAddress,uint256 amount,uint256 transactionNonce)",
      ]
    )
  );
//   console.log("MINT_TYPEHASH---------:", MINT_TYPEHASH);

  const abiCoder = new ethers.AbiCoder();
  const data = await abiCoder.encode(
    ["bytes32", "address", "address", "uint256", "uint256"],
    [
      MINT_TYPEHASH,
      value.rootToken,
      value.userAddress,
      value.amount,
      value.transactionNonce,
    ]
  );
  console.log("data---", data);

  const dataHash = await ethers.keccak256(data);
//   console.log("structHash---", dataHash);

  const signature = await adminWalletL2.signTypedData(domainL2, types, value);
  console.log("signature---", signature);
};

module.exports = {
  generateSignatureL1,
  generateSignatureL2,
};

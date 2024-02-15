require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Function to save L1 transaction data to the database
const saveL1Deposit = async (
  rootTokenAddress,
  fromAddress,
  transactionAmountL1,
  transactionNonceL1,
  eventType,
  l1TransactionHash
) => {
  try {
    const savedL1Deposit = await prisma.l1Transaction.create({
      data: {
        rootTokenAddress: rootTokenAddress,
        fromAddress: fromAddress,
        amount: transactionAmountL1,
        nonce: transactionNonceL1,
        eventType: eventType,
        l1Hash: l1TransactionHash,
        l2Hash: null
      },
    });
    console.log("L1 Transaction saved to the database:", savedL1Deposit);
  } catch (error) {
    console.error("Error saving L1 deposit to the database:", error);
  }
};

const completeL1Deposit = async(
  l1TransactionHash,
  l2TransactionHash
) => {
  try {
    const updatedL1Deposit = await prisma.l1Transaction.update({
      where: {
        l1Hash: l1TransactionHash
      },
      data: {
        l2Hash: l2TransactionHash
      }
    })
    console.log("L1 Transaction updated in the database:", updatedL1Deposit);
  } catch (error) {
    console.log("Error in completing L1 deposit:", error);
  }
}

// Function to save L2 transaction data to the database
const saveL2Burn = async (
  childTokenAddress,
  fromAddress,
  transactionAmountL2,
  transactionNonceL2,
  eventType,
  l2TransactionHash
) => {
  try {
    const savedL2Burn = await prisma.l2Transaction.create({
      data: {
        childTokenAddress: childTokenAddress,
        fromAddress: fromAddress,
        amount: transactionAmountL2,
        nonce: transactionNonceL2,
        eventType: eventType,
        l1Hash: null,
        l2Hash: l2TransactionHash
      },
    });
    console.log("L2 Transaction saved to the database:", savedL2Burn);
  } catch (error) {
    console.error("Error saving L2 burn to the database:", error);
  }
};
const completeL2Burn = async(
  l1TransactionHash,
  l2TransactionHash
) => {
  try {
    const updatedL2Burn = await prisma.l2Transaction.update({
      where: {
        l2Hash: l2TransactionHash
      },
      data: {
        l1Hash: l1TransactionHash
      }
    })
    console.log("L2 Transaction updated in the database:", updatedL2Burn);
  } catch (error) {
    console.log("Error in completing L2 burn:", error);
  }
}

const getL1Transaction = async(userAddress) => {
  try {
    const details = await prisma.l1Transaction.findMany({
      where: {
        fromAddress: userAddress
      },
      orderBy: {
        timestamp: "desc"
      },
      take: 1
    })
    console.log(details[0].rootTokenAddress)
  } catch (error) {
    console.log("Error in fetching L1 transaction from the database:", error);
  }
}

module.exports = {
  saveL1Deposit,
  completeL1Deposit,
  saveL2Burn,
  completeL2Burn
};

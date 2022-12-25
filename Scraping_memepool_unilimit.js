//-------------Getting swaps fron SwaprouterV2 on Goerli ------------
import { ethers } from "ethers";
import abiSwapRouterV2 from "./constants/abiSwapRouterV2.json" assert { type: "json" };
import abiFlashBotTest from "./constants/abiFlashBotTest.json" assert { type: "json" };
import contractAddress from "./constants/contractAddress.json" assert { type: "json" };
import fs from "fs";
import { config } from "dotenv";
config();

export async function listenMemepool() {
  const newInterface = new ethers.utils.Interface(abiSwapRouterV2);
  const provider = new ethers.providers.AlchemyProvider.getWebSocketProvider(
    "goerli",
    //"homestead",
    process.env.ALCHEMY_API_KEY
  );

  const weth_address = contractAddress.WETH_Goerli;
  const rooter = contractAddress.SwapRouterV2; //current pool we track
  const filter1 = rooter;
  //const functionEvent = "createOrder(bool,uint160,uint256)";
  //const functionEvent = "swap(address,address,int256,int256,uint160,uint128,int24)";
  const functionEvent = "multicall(uint256,bytes[])";
  //const functionSignature = "0x623efcbe"; //createOrder signature
  //const functionSignature = "0xa5f54bcc"; // swap
  const functionSignature = "0x5ae401dc"; //multicall

  provider.on("pending", async (tx) => {
    const txData = await provider.getTransaction(tx);
    console.log(txData.to);
    if (txData) {
      if (txData.to == filter1 && txData.data.includes(functionSignature)) {
        console.log("found");
        console.log("txdata");
        console.log(txData);
        const gasPrice = txData.gasPrice;
        const gasLimit = txData.gasLimit;
        const from = txData.from;
        const to = txData.to;
        const value = txData.value;

        let decoded = newInterface.decodeFunctionData(
          functionEvent,
          txData.data
        );
        const stringDecoded = String(decoded);
        const decodedAddresses = stringDecoded
          .split("00")
          .filter((str) => str.length > 24);

        let finalAddresses = [];
        for (let i in decodedAddresses) {
          let currentAddress = decodedAddresses[i];
          if (currentAddress.length < 40) {
            while (currentAddress.length < 40) {
              currentAddress = "0" + currentAddress;
            }
          } else if (currentAddress.length > 40) {
            while (currentAddress.length > 40) {
              currentAddress = currentAddress.substr(1);
            }
          }
          currentAddress = "0x" + currentAddress;
          finalAddresses.push(currentAddress);
        }

        let tradedTokenAddress = finalAddresses.filter(
          (address) => address != from.toLowerCase()
        );
        let logData = {
          decodedData: txData.data,
          finalAddresses: finalAddresses,
          tradedTokenAddress: tradedTokenAddress,
          gasPrice: gasPrice,
          gasLimit: gasLimit,
          from: from,
          to: to,
          value: value,
        };
        saveSwapOrder(logData);
        logTxData(logData);

        //call settleFuntion
        return;
      }
    }
  });
}

async function saveSwapOrder(logData) {
  fs.readFile(
    "trackMempoolOrders.json",
    "utf-8",
    async function readFileCallback(err, data) {
      if (err) {
        console.log(err);
      } else {
        let obj = JSON.parse(data);
        obj.mempoolOrders.push(logData);
        let json = JSON.stringify(obj);
        fs.writeFile("trackMempoolOrders.json", json, "utf8", (err) => {
          if (err) {
            console.log(err);
          } else {
            console.log("written success");
          }
        });
      }
    }
  );
}

async function logTxData(logData) {
  console.log(`data: ${logData.decodedData}`);
  console.log(`dataAddresses: ${logData.finalAddresses}`);
  console.log(`tradedTokenAddress: ${logData.tradedTokenAddress}`);
  console.log(`gasPrice: ${logData.gasPrice}`);
  console.log(`gasLimit: ${logData.gasLimit}`);
  console.log(`from: ${logData.from}`);
  console.log(`value: ${logData.value}`);
  console.log(
    "-------------------------------------------------------------------"
  );
}

/*
export async function main() {
  try {
    listenMemepool();
  } catch (err) {
    console.error(err);
    setTimeout(() => {
      listenMemepool();
    }, 1000);
  }
}
*/

listenMemepool().catch((err) => {
  console.error(err);
  //process.exitCode = 1;
  setTimeout(() => {
    listenMemepool();
  }, 1000);
});

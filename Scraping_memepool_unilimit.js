//-------------Getting swaps fron SwaprouterV2 on Goerli ------------
import { ethers } from "ethers";
import abiSwapRouterV2 from "./constants/abiSwapRouterV2.json" assert { type: "json" };
import abiFlashBotTest from "./constants/abiFlashBotTest.json" assert { type: "json" };
import contractAddress from "./constants/contractAddress.json" assert { type: "json" };
import { config } from "dotenv";
config();

export async function listenMemepool() {
  const newInterface = new ethers.utils.Interface(abiSwapRouterV2);
  const provider = new ethers.providers.AlchemyProvider.getWebSocketProvider(
    "goerli",
    //"homestead",
    process.env.ALCHEMY_API_KEY
  );

  const txFound = [];
  const currentPool = contractAddress.SwapRouterV2; //current pool we track
  const filter1 = currentPool;
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
        let logData = {
          decodedData: txData.data,
          gasPrice: gasPrice,
          gasLimit: gasLimit,
          from: from,
          to: to,
          value: value,
        };
        txFound.push(logData);
        logTxData(decoded, gasPrice, gasLimit, from, value);
        //call settleFuntion
        return;
      }
    }
  });
}

async function logTxData(data, gasPrice, gasLimit, from, value) {
  console.log(`data: ${data}`);
  console.log(`gasPrice: ${gasPrice}`);
  console.log(`gasLimit: ${gasLimit}`);
  console.log(`from: ${from}`);
  console.log(`value: ${value}`);
  console.log(
    "-------------------------------------------------------------------"
  );
}

listenMemepool().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

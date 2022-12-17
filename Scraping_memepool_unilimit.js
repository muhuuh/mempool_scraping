import { ethers } from "ethers";
import abiUnilimitGoerli from "./constants/abiUnilimitGoerli.json" assert { type: "json" };
import abiFlashBotTest from "./constants/abiFlashBotTest.json" assert { type: "json" };
import contractAddress from "./constants/contractAddress.json" assert { type: "json" };
import { config } from "dotenv";
config();

export async function listenMemepool() {
  const newInterface = new ethers.utils.Interface(abiFlashBotTest);
  const provider = new ethers.providers.AlchemyProvider.getWebSocketProvider(
    "goerli",
    //"homestead",
    process.env.ALCHEMY_API_KEY
  );

  const txFound = [];
  const currentPool = contractAddress.UnilimitGoerli; //current pool we track
  const filter1 = currentPool;
  const functionEvent = "createOrder(bool,uint160,uint256)";
  const functionSignature = "0x623efcbe"; //createOrder signature

  provider.on("pending", async (tx) => {
    const txData = await provider.getTransaction(tx);
    console.log(txData.to);
    if (txData) {
      if (txData.to == filter1 && txData.data.includes(functionSignature)) {
        const gasPrice = txData.gasPrice;
        const gasLimit = txData.gasLimit;
        const from = txData.from;
        const to = txData.to;
        const value = txData.value;
        console.log("found");
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
  console.log("--------------------------------------------------");
}

listenMemepool().catch((err) => {
  console.error(err);
  process.exitCode = 1;
  listenMemepool();
});

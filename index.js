import {
  createWalletClient,
  custom,
  createPublicClient,
  parseEther,
  defineChain,
  formatEther,
} from "https://esm.sh/viem";

import { contractAddress, coffeeAbi } from "./constants.js";

const connectButton = document.getElementById("connectButton");
const fundButton = document.getElementById("fundButton");
const ethAmountInput = document.getElementById("ethAmount");
const balanceButton = document.getElementById("balanceButton");
const withdrawButton = document.getElementById("withdrawButton");

let walletClient;
let publicClient;

async function connect() {
  if (typeof window.ethereum !== "undefined") {
    walletClient = createWalletClient({
      transport: custom(window.ethereum),
    });
    await walletClient.requestAddresses();
    connectButton.innerHTML = "Coonected!";
  } else {
    connectButton.innerHTML = "Please install MetaMask!";
  }
}

async function fund() {
  const ethAmount = ethAmountInput.value;
  console.log(`Funding with ${ethAmount} ETH...`);

  if (typeof window.ethereum !== "undefined") {
    walletClient = createWalletClient({
      transport: custom(window.ethereum),
    });
    const [connectedAccount] = await walletClient.requestAddresses();
    const currentChain = await getCurrentChain(walletClient);

    publicClient = createPublicClient({
      transport: custom(window.ethereum),
    });
    const { request } = await publicClient.simulateContract({
      address: contractAddress,
      abi: coffeeAbi,
      functionName: "fund",
      account: connectedAccount,
      chain: currentChain,
      value: parseEther(ethAmount),
    });

    const hash = await walletClient.writeContract(request);
    console.log(hash);
  } else {
    connectButton.innerHTML = "Please install MetaMask!";
  }
}

async function getCurrentChain(client) {
  const chainId = await client.getChainId();
  const currentChain = defineChain({
    id: chainId,
    name: "Custom Chain",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: ["http://localhost:8545"],
      },
    },
  });
  return currentChain;
}

async function getBalance() {
  if (typeof window.ethereum !== "undefined") {
    publicClient = createPublicClient({
      transport: custom(window.ethereum),
    });
    const balance = await publicClient.getBalance({
      address: contractAddress,
    });
    console.log(formatEther(balance));
  }
}

async function withdraw() {
  console.log("Withdrawing funds...");

  if (typeof window.ethereum !== "undefined") {
    try {
      // Create wallet client if not exists
      if (!walletClient) {
        walletClient = createWalletClient({
          transport: custom(window.ethereum),
        });
      }

      // Get connected account
      const [connectedAccount] = await walletClient.requestAddresses();
      const currentChain = await getCurrentChain(walletClient);

      // Create public client for simulation
      publicClient = createPublicClient({
        transport: custom(window.ethereum),
      });

      // Simulate the withdraw transaction
      const { request } = await publicClient.simulateContract({
        address: contractAddress,
        abi: coffeeAbi,
        functionName: "withdraw",
        account: connectedAccount,
        chain: currentChain,
        // No ETH sent with withdraw
      });

      // Execute the withdraw transaction
      const hash = await walletClient.writeContract(request);
      console.log("Withdraw transaction sent:", hash);

      // Wait for transaction confirmation (optional)
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("Withdraw confirmed in block:", receipt.blockNumber);

      // Update UI or show success message
      withdrawButton.innerHTML = "Withdrawn!";
      setTimeout(() => {
        withdrawButton.innerHTML = "Withdraw";
      }, 3000);
    } catch (error) {
      console.error("Error withdrawing:", error);

      // Handle specific error cases
      if (error.message.includes("Ownable: caller is not the owner")) {
        alert("Only the contract owner can withdraw funds!");
      } else if (error.message.includes("insufficient funds")) {
        alert("Insufficient funds in contract!");
      } else {
        alert("Failed to withdraw: " + error.message);
      }

      withdrawButton.innerHTML = "Withdraw Failed";
      setTimeout(() => {
        withdrawButton.innerHTML = "Withdraw";
      }, 3000);
    }
  } else {
    alert("Please install MetaMask!");
  }
}

connectButton.onclick = connect;
fundButton.onclick = fund;
balanceButton.onclick = getBalance;
withdrawButton.onclick = withdraw;

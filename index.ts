import {
  createWalletClient,
  custom,
  createPublicClient,
  parseEther,
  defineChain,
  formatEther,
  WalletClient,
  PublicClient,
  Chain,
  SimulateContractReturnType,
  Hash,
  TransactionReceipt,
} from "https://esm.sh/viem";

import { contractAddress, abi } from "./constants.ts";

// Type assertions for DOM elements
const connectButton = document.getElementById(
  "connectButton",
) as HTMLButtonElement;
const fundButton = document.getElementById("fundButton") as HTMLButtonElement;
const ethAmountInput = document.getElementById("ethAmount") as HTMLInputElement;
const balanceButton = document.getElementById(
  "balanceButton",
) as HTMLButtonElement;
const withdrawButton = document.getElementById(
  "withdrawButton",
) as HTMLButtonElement;

// Type definitions
let walletClient: WalletClient | undefined;
let publicClient: PublicClient | undefined;

// Check if window.ethereum exists
declare global {
  interface Window {
    ethereum?: any;
  }
}

async function connect(): Promise<void> {
  if (typeof window.ethereum !== "undefined") {
    walletClient = createWalletClient({
      transport: custom(window.ethereum),
    });
    await walletClient.requestAddresses();
    connectButton.innerHTML = "Connected!";
  } else {
    connectButton.innerHTML = "Please install MetaMask!";
  }
}

async function fund(): Promise<void> {
  const ethAmount = ethAmountInput.value;
  console.log(`Funding with ${ethAmount} ETH...`);

  if (typeof window.ethereum !== "undefined") {
    if (!walletClient) {
      walletClient = createWalletClient({
        transport: custom(window.ethereum),
      });
    }

    const [connectedAccount] = await walletClient.requestAddresses();
    const currentChain = await getCurrentChain(walletClient);

    publicClient = createPublicClient({
      transport: custom(window.ethereum),
    });

    const { request } = await publicClient.simulateContract({
      address: contractAddress,
      abi: abi,
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

async function getCurrentChain(client: WalletClient): Promise<Chain> {
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

async function getBalance(): Promise<void> {
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

async function withdraw(): Promise<void> {
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
        abi: abi,
        functionName: "withdraw",
        account: connectedAccount,
        chain: currentChain,
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

      // Type guard for error object
      if (error instanceof Error) {
        // Handle specific error cases
        if (error.message.includes("Ownable: caller is not the owner")) {
          alert("Only the contract owner can withdraw funds!");
        } else if (error.message.includes("insufficient funds")) {
          alert("Insufficient funds in contract!");
        } else {
          alert("Failed to withdraw: " + error.message);
        }
      } else {
        alert("An unknown error occurred");
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

// Event listeners
connectButton.onclick = connect;
fundButton.onclick = fund;
balanceButton.onclick = getBalance;
withdrawButton.onclick = withdraw;

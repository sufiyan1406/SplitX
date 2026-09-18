const { ethers } = require("ethers");
require("dotenv").config();
const contractAddresses = require("../shared/integration/contract-addresses.json");
const entitlementAbi = require("../shared/integration/abis/SplitXEntitlement.json");

async function main() {
  const rpcUrl = process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error("PRIVATE_KEY not set in .env");

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log("Using deployer/owner wallet:", wallet.address);

  const entitlementAddress = contractAddresses.SplitXEntitlement;
  console.log("SplitXEntitlement address:", entitlementAddress);

  const contract = new ethers.Contract(entitlementAddress, entitlementAbi, wallet);

  const existingServiceIds = await contract.getAllServiceIds();
  console.log("Existing on-chain services:", existingServiceIds);

  const services = [
    {
      id: "FORGE",
      provider: "MOCK_FORGE",
      name: "Forge Workspace",
      pricePerDay: ethers.parseEther("0.0006"), // 30 days = 0.018 ETH
    },
    {
      id: "forge",
      provider: "MOCK_FORGE",
      name: "Forge Workspace",
      pricePerDay: ethers.parseEther("0.0006"),
    },
    {
      id: "LUMEN",
      provider: "MOCK_LUMEN",
      name: "Lumen Learn",
      pricePerDay: ethers.parseEther("0.0005"), // 30 days = 0.015 ETH
    },
    {
      id: "lumen",
      provider: "MOCK_LUMEN",
      name: "Lumen Learn",
      pricePerDay: ethers.parseEther("0.0005"),
    },
    {
      id: "APEX",
      provider: "MOCK_APEX",
      name: "Apex Game Pass",
      pricePerDay: ethers.parseEther("0.000733333333333333"), // 30 days = 0.022 ETH
    },
    {
      id: "apex",
      provider: "MOCK_APEX",
      name: "Apex Game Pass",
      pricePerDay: ethers.parseEther("0.000733333333333333"),
    },
    {
      id: "NIMBUS",
      provider: "MOCK_NIMBUS",
      name: "Nimbus Cloud",
      pricePerDay: ethers.parseEther("0.001333333333333333"), // 30 days = 0.04 ETH
    },
    {
      id: "nimbus",
      provider: "MOCK_NIMBUS",
      name: "Nimbus Cloud",
      pricePerDay: ethers.parseEther("0.001333333333333333"),
    },
    {
      id: "netflix",
      provider: "MOCK_NETFLIX",
      name: "Netflix Premium",
      pricePerDay: ethers.parseEther("0.001"), // 30 days = 0.03 ETH
    },
    {
      id: "spotify",
      provider: "MOCK_SPOTIFY",
      name: "Spotify Premium",
      pricePerDay: ethers.parseEther("0.000666666666666666"), // 30 days = 0.02 ETH
    },
    {
      id: "ai-api",
      provider: "MOCK_OPENAI",
      name: "AI API Credits",
      pricePerDay: ethers.parseEther("0.000333333333333333"), // 30 days = 0.01 ETH
    },
  ];

  for (const s of services) {
    let alreadyActive = false;
    try {
      const existing = await contract.getService(s.id);
      if (existing && existing.active) {
        alreadyActive = true;
        console.log(`Service '${s.id}' already active on-chain.`);
      }
    } catch {
      alreadyActive = false;
    }

    if (!alreadyActive) {
      console.log(`Registering '${s.id}' (${s.name}) on Arbitrum Sepolia...`);
      const feeData = await provider.getFeeData();
      const tx = await contract.registerService(
        s.id,
        s.provider,
        s.name,
        s.pricePerDay,
        wallet.address,
        {
          maxFeePerGas: (feeData.maxFeePerGas || 100000000n) * 2n,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || 10000000n,
        }
      );
      console.log(`Tx submitted: ${tx.hash}, waiting for confirmation...`);
      await tx.wait(1);
      console.log(`Successfully registered: ${s.id}`);
    }
  }

  const updatedIds = await contract.getAllServiceIds();
  console.log("\nAll registered services on-chain now:", updatedIds);
}

main().catch((err) => {
  console.error("Error in script:", err);
  process.exit(1);
});

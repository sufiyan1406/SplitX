const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("==================================================");
  console.log("Deploying SplitX Contracts with account:", deployer.address);
  
  const network = await ethers.provider.getNetwork();
  console.log("Network Name:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("==================================================");

  // 1. Deploy MockProviderAdapter
  console.log("Deploying MockProviderAdapter...");
  const MockProviderAdapter = await ethers.getContractFactory("MockProviderAdapter");
  const mockProviderAdapter = await MockProviderAdapter.deploy(deployer.address);
  await mockProviderAdapter.waitForDeployment();
  const adapterAddress = await mockProviderAdapter.getAddress();
  console.log("MockProviderAdapter deployed to:", adapterAddress);

  // 2. Deploy SplitXEntitlement
  console.log("Deploying SplitXEntitlement...");
  const SplitXEntitlement = await ethers.getContractFactory("SplitXEntitlement");
  const entitlementContract = await SplitXEntitlement.deploy(deployer.address);
  await entitlementContract.waitForDeployment();
  const entitlementAddress = await entitlementContract.getAddress();
  console.log("SplitXEntitlement deployed to:", entitlementAddress);

  // 3. Deploy SplitXMarketplace
  console.log("Deploying SplitXMarketplace...");
  const SplitXMarketplace = await ethers.getContractFactory("SplitXMarketplace");
  const marketplace = await SplitXMarketplace.deploy(
    deployer.address,
    entitlementAddress,
    adapterAddress,
    deployer.address // Platform fee wallet
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("SplitXMarketplace deployed to:", marketplaceAddress);

  // 4. Configure permissions
  console.log("\nConfiguring contract permissions...");
  await (await entitlementContract.setProviderAdapter(adapterAddress)).wait();
  await (await entitlementContract.setMarketplace(marketplaceAddress)).wait();
  await (await mockProviderAdapter.setAuthorizedCaller(entitlementAddress, true)).wait();
  await (await mockProviderAdapter.setAuthorizedCaller(marketplaceAddress, true)).wait();
  console.log("Permissions successfully set!");

  // 5. Register Mock Demo Services
  console.log("\nRegistering Mock Services...");
  const services = [
    {
      id: "NETFLIX_PREMIUM",
      provider: "MOCK_NETFLIX",
      name: "Netflix Premium",
      pricePerDay: ethers.parseEther("0.001"), // 30 days = 0.03 ETH
    },
    {
      id: "SPOTIFY_PREMIUM",
      provider: "MOCK_SPOTIFY",
      name: "Spotify Premium",
      pricePerDay: ethers.parseEther("0.000666666666666666"), // 30 days = 0.02 ETH
    },
    {
      id: "AI_API_CREDITS",
      provider: "MOCK_OPENAI",
      name: "AI API Credits (1000 Requests)",
      pricePerDay: ethers.parseEther("0.000333333333333333"), // 30 days = 0.01 ETH
    },
    {
      id: "CLOUD_STORAGE",
      provider: "MOCK_DRIVE",
      name: "Cloud Storage 100GB",
      pricePerDay: ethers.parseEther("0.0005"), // 30 days = 0.015 ETH
    },
  ];

  for (const s of services) {
    await (
      await entitlementContract.registerService(
        s.id,
        s.provider,
        s.name,
        s.pricePerDay,
        deployer.address // provider wallet simulation
      )
    ).wait();
    console.log(`Registered Service: ${s.name} (${s.id})`);
  }

  // 6. Export Integration Artifacts
  console.log("\nExporting integration artifacts to /shared/integration/ ...");

  const integrationDir = path.join(__dirname, "..", "shared", "integration");
  const abisDir = path.join(integrationDir, "abis");

  if (!fs.existsSync(abisDir)) {
    fs.mkdirSync(abisDir, { recursive: true });
  }

  // Write contract-addresses.json
  const addressArtifact = {
    chainId: Number(network.chainId),
    chainName: network.chainId === 421614n ? "Arbitrum Sepolia" : "Local Hardhat Network",
    deploymentTimestamp: new Date().toISOString(),
    SplitXEntitlement: entitlementAddress,
    SplitXMarketplace: marketplaceAddress,
    MockProviderAdapter: adapterAddress,
  };

  fs.writeFileSync(
    path.join(integrationDir, "contract-addresses.json"),
    JSON.stringify(addressArtifact, null, 2)
  );
  console.log("Wrote contract-addresses.json");

  // Copy ABIs from artifacts
  const copyArtifactAbi = (contractName) => {
    const artifactPath = path.join(
      __dirname,
      "..",
      "artifacts",
      "contracts",
      `${contractName}.sol`,
      `${contractName}.json`
    );
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      fs.writeFileSync(
        path.join(abisDir, `${contractName}.json`),
        JSON.stringify(artifact.abi, null, 2)
      );
      console.log(`Wrote abis/${contractName}.json`);
    }
  };

  copyArtifactAbi("SplitXEntitlement");
  copyArtifactAbi("SplitXMarketplace");
  copyArtifactAbi("MockProviderAdapter");

  console.log("\n==================================================");
  console.log("DEPLOYMENT COMPLETE!");
  console.log("SplitXEntitlement:", entitlementAddress);
  console.log("SplitXMarketplace:", marketplaceAddress);
  console.log("MockProviderAdapter:", adapterAddress);
  console.log("==================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Load contract addresses and ABIs
const addressesPath = path.join(__dirname, "..", "shared", "integration", "contract-addresses.json");
const abisDir = path.join(__dirname, "..", "shared", "integration", "abis");

let addresses = {};
let entitlementAbi = [];
let marketplaceAbi = [];
let adapterAbi = [];

if (fs.existsSync(addressesPath)) {
  addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
}
if (fs.existsSync(path.join(abisDir, "SplitXEntitlement.json"))) {
  entitlementAbi = JSON.parse(fs.readFileSync(path.join(abisDir, "SplitXEntitlement.json"), "utf8"));
}
if (fs.existsSync(path.join(abisDir, "SplitXMarketplace.json"))) {
  marketplaceAbi = JSON.parse(fs.readFileSync(path.join(abisDir, "SplitXMarketplace.json"), "utf8"));
}
if (fs.existsSync(path.join(abisDir, "MockProviderAdapter.json"))) {
  adapterAbi = JSON.parse(fs.readFileSync(path.join(abisDir, "MockProviderAdapter.json"), "utf8"));
}

const RPC_URL = process.env.ARBITRUM_SEPOLIA_RPC_URL || "http://127.0.0.1:8545";
const provider = new ethers.JsonRpcProvider(RPC_URL);

let entitlementContract = null;
let marketplaceContract = null;
let adapterContract = null;

if (addresses.SplitXEntitlement && entitlementAbi.length > 0) {
  entitlementContract = new ethers.Contract(addresses.SplitXEntitlement, entitlementAbi, provider);
}
if (addresses.SplitXMarketplace && marketplaceAbi.length > 0) {
  marketplaceContract = new ethers.Contract(addresses.SplitXMarketplace, marketplaceAbi, provider);
}
if (addresses.MockProviderAdapter && adapterAbi.length > 0) {
  adapterContract = new ethers.Contract(addresses.MockProviderAdapter, adapterAbi, provider);
}

// Routes
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "SplitX Read-Only Backend API",
    chainId: addresses.chainId || 421614,
    timestamp: new Date().toISOString(),
    contracts: addresses,
  });
});

app.get("/api/services", async (req, res) => {
  try {
    if (!entitlementContract) {
      return res.status(503).json({ error: "Entitlement contract not initialized" });
    }
    const serviceIds = await entitlementContract.getAllServiceIds();
    const services = [];
    for (const id of serviceIds) {
      const s = await entitlementContract.getService(id);
      services.push({
        serviceId: s.serviceId,
        providerId: s.providerId,
        serviceName: s.serviceName,
        pricePerDayWei: s.pricePerDayWei.toString(),
        pricePerDayEth: ethers.formatEther(s.pricePerDayWei),
        active: s.active,
        providerWallet: s.providerWallet,
      });
    }
    res.json({ success: true, count: services.length, services });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/entitlements/:tokenId", async (req, res) => {
  try {
    if (!entitlementContract) {
      return res.status(503).json({ error: "Entitlement contract not initialized" });
    }
    const tokenId = req.params.tokenId;
    const ent = await entitlementContract.getEntitlement(tokenId);
    const owner = await entitlementContract.ownerOf(tokenId);

    res.json({
      success: true,
      entitlement: {
        tokenId: ent.tokenId.toString(),
        providerId: ent.providerId,
        serviceId: ent.serviceId,
        serviceName: ent.serviceName,
        originalDuration: ent.originalDuration.toString(),
        remainingDuration: ent.remainingDuration.toString(),
        startTime: ent.startTime.toString(),
        expiryTime: ent.expiryTime.toString(),
        status: Number(ent.status),
        owner: owner,
      },
    });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

app.get("/api/marketplace/listings", async (req, res) => {
  try {
    if (!marketplaceContract) {
      return res.status(503).json({ error: "Marketplace contract not initialized" });
    }
    const rawListings = await marketplaceContract.getActiveListings();
    const listings = [];

    for (const l of rawListings) {
      let entitlement = null;
      if (entitlementContract) {
        try {
          const e = await entitlementContract.getEntitlement(l.tokenId);
          entitlement = {
            providerId: e.providerId,
            serviceId: e.serviceId,
            serviceName: e.serviceName,
            remainingDuration: e.remainingDuration.toString(),
            expiryTime: e.expiryTime.toString(),
          };
        } catch (_) {}
      }

      listings.push({
        tokenId: l.tokenId.toString(),
        seller: l.seller,
        priceWei: l.priceWei.toString(),
        priceEth: ethers.formatEther(l.priceWei),
        listedAt: l.listedAt.toString(),
        active: l.active,
        entitlement,
      });
    }

    res.json({ success: true, count: listings.length, listings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/provider/entitlements/:address", async (req, res) => {
  try {
    if (!adapterContract || !entitlementContract) {
      return res.status(503).json({ error: "Contracts not initialized" });
    }
    const userAddress = req.params.address;
    const serviceIds = await entitlementContract.getAllServiceIds();
    const providerStatuses = [];

    for (const sid of serviceIds) {
      const [durationSec, active] = await adapterContract.getProviderEntitlement(userAddress, sid);
      providerStatuses.push({
        serviceId: sid,
        user: userAddress,
        remainingDurationSec: durationSec.toString(),
        remainingDurationDays: (Number(durationSec) / 86400).toFixed(2),
        active: active,
      });
    }

    res.json({ success: true, user: userAddress, services: providerStatuses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SplitX API Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;

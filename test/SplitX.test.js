const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SplitX Core System", function () {
  let owner, alice, bob, providerWallet, platformWallet;
  let mockProviderAdapter, entitlementContract, marketplace;

  const ONE_DAY_SEC = 86400;
  const NETFLIX_PRICE_PER_DAY = ethers.parseEther("0.001"); // 0.03 ETH for 30 days
  const SPOTIFY_PRICE_PER_DAY = ethers.parseEther("0.0005"); // 0.015 ETH for 30 days

  beforeEach(async function () {
    [owner, alice, bob, providerWallet, platformWallet] = await ethers.getSigners();

    // 1. Deploy MockProviderAdapter
    const MockProviderAdapter = await ethers.getContractFactory("MockProviderAdapter");
    mockProviderAdapter = await MockProviderAdapter.deploy(owner.address);
    await mockProviderAdapter.waitForDeployment();

    // 2. Deploy SplitXEntitlement
    const SplitXEntitlement = await ethers.getContractFactory("SplitXEntitlement");
    entitlementContract = await SplitXEntitlement.deploy(owner.address);
    await entitlementContract.waitForDeployment();

    // 3. Deploy SplitXMarketplace
    const SplitXMarketplace = await ethers.getContractFactory("SplitXMarketplace");
    marketplace = await SplitXMarketplace.deploy(
      owner.address,
      await entitlementContract.getAddress(),
      await mockProviderAdapter.getAddress(),
      platformWallet.address
    );
    await marketplace.waitForDeployment();

    // 4. Configure permissions & addresses
    await entitlementContract.setProviderAdapter(await mockProviderAdapter.getAddress());
    await entitlementContract.setMarketplace(await marketplace.getAddress());

    await mockProviderAdapter.setAuthorizedCaller(await entitlementContract.getAddress(), true);
    await mockProviderAdapter.setAuthorizedCaller(await marketplace.getAddress(), true);

    // 5. Register Mock Services
    await entitlementContract.registerService(
      "NETFLIX_PREMIUM",
      "MOCK_NETFLIX",
      "Netflix Premium 4K",
      NETFLIX_PRICE_PER_DAY,
      providerWallet.address
    );

    await entitlementContract.registerService(
      "SPOTIFY_PREMIUM",
      "MOCK_SPOTIFY",
      "Spotify Premium Individual",
      SPOTIFY_PRICE_PER_DAY,
      providerWallet.address
    );
  });

  describe("1. Service Registration & Pricing", function () {
    it("should allow owner to register services and query prices", async function () {
      const service = await entitlementContract.getService("NETFLIX_PREMIUM");
      expect(service.serviceName).to.equal("Netflix Premium 4K");
      expect(service.providerId).to.equal("MOCK_NETFLIX");
      expect(service.providerWallet).to.equal(providerWallet.address);

      const price30Days = await entitlementContract.getServicePrice("NETFLIX_PREMIUM", 30);
      expect(price30Days).to.equal(NETFLIX_PRICE_PER_DAY * 30n);

      const price10Days = await entitlementContract.getServicePrice("NETFLIX_PREMIUM", 10);
      expect(price10Days).to.equal(NETFLIX_PRICE_PER_DAY * 10n);
    });

    it("should revert if non-owner attempts to register service", async function () {
      await expect(
        entitlementContract.connect(alice).registerService(
          "INVALID_SERVICE",
          "MOCK_INVALID",
          "Invalid Service",
          NETFLIX_PRICE_PER_DAY,
          providerWallet.address
        )
      ).to.be.revertedWithCustomError(entitlementContract, "OwnableUnauthorizedAccount");
    });
  });

  describe("2. Buy Entitlement (Full & Exact Duration)", function () {
    it("should allow Alice to buy a full 30-day entitlement", async function () {
      const price30 = await entitlementContract.getServicePrice("NETFLIX_PREMIUM", 30);
      
      const tx = await entitlementContract.connect(alice).purchaseService("NETFLIX_PREMIUM", 30, {
        value: price30,
      });

      await expect(tx)
        .to.emit(entitlementContract, "EntitlementCreated")
        .withArgs(1, alice.address, "NETFLIX_PREMIUM", 30, price30);

      expect(await entitlementContract.ownerOf(1)).to.equal(alice.address);

      const ent = await entitlementContract.getEntitlement(1);
      expect(ent.tokenId).to.equal(1);
      expect(ent.originalDuration).to.equal(30n * BigInt(ONE_DAY_SEC));
      expect(ent.remainingDuration).to.equal(30n * BigInt(ONE_DAY_SEC));
      expect(ent.status).to.equal(0); // Status.ACTIVE

      // Verify MockProviderAdapter was provisioned for Alice
      const [remainingSec, active] = await mockProviderAdapter.getProviderEntitlement(alice.address, "NETFLIX_PREMIUM");
      expect(active).to.be.true;
      expect(remainingSec).to.equal(30n * BigInt(ONE_DAY_SEC));
    });

    it("should allow Alice to buy an exact 10-day partial entitlement", async function () {
      const price10 = await entitlementContract.getServicePrice("SPOTIFY_PREMIUM", 10);

      await entitlementContract.connect(alice).purchaseService("SPOTIFY_PREMIUM", 10, {
        value: price10,
      });

      const ent = await entitlementContract.getEntitlement(1);
      expect(ent.serviceId).to.equal("SPOTIFY_PREMIUM");
      expect(ent.remainingDuration).to.equal(10n * BigInt(ONE_DAY_SEC));

      const [remainingSec, active] = await mockProviderAdapter.getProviderEntitlement(alice.address, "SPOTIFY_PREMIUM");
      expect(active).to.be.true;
      expect(remainingSec).to.equal(10n * BigInt(ONE_DAY_SEC));
    });

    it("should revert purchase if insufficient ETH sent", async function () {
      await expect(
        entitlementContract.connect(alice).purchaseService("NETFLIX_PREMIUM", 30, {
          value: ethers.parseEther("0.001"),
        })
      ).to.be.revertedWith("Insufficient ETH sent");
    });
  });

  describe("3. Entitlement Splitting", function () {
    beforeEach(async function () {
      // Alice purchases a 30-day Netflix entitlement (#1)
      const price30 = await entitlementContract.getServicePrice("NETFLIX_PREMIUM", 30);
      await entitlementContract.connect(alice).purchaseService("NETFLIX_PREMIUM", 30, {
        value: price30,
      });
    });

    it("should successfully split a 30-day entitlement into 20-day and 10-day NFTs", async function () {
      // Alice splits 10 days out of token #1
      const tx = await entitlementContract.connect(alice).splitEntitlement(1, 10);

      await expect(tx)
        .to.emit(entitlementContract, "EntitlementSplit")
        .withArgs(1, 2, 20n * BigInt(ONE_DAY_SEC), 10n * BigInt(ONE_DAY_SEC));

      // Token #1 (Parent) check
      const parent = await entitlementContract.getEntitlement(1);
      expect(parent.remainingDuration).to.equal(20n * BigInt(ONE_DAY_SEC));

      // Token #2 (Child) check
      expect(await entitlementContract.ownerOf(2)).to.equal(alice.address);
      const child = await entitlementContract.getEntitlement(2);
      expect(child.tokenId).to.equal(2);
      expect(child.remainingDuration).to.equal(10n * BigInt(ONE_DAY_SEC));
      expect(child.status).to.equal(0); // Status.ACTIVE
    });

    it("should revert invalid split duration (0 or >= remaining)", async function () {
      // Split 0 days
      await expect(
        entitlementContract.connect(alice).splitEntitlement(1, 0)
      ).to.be.revertedWith("Split duration must be > 0");

      // Split 30 days (equal to remaining duration)
      await expect(
        entitlementContract.connect(alice).splitEntitlement(1, 30)
      ).to.be.revertedWith("Split duration must be less than remaining duration");

      // Split 35 days (greater than remaining duration)
      await expect(
        entitlementContract.connect(alice).splitEntitlement(1, 35)
      ).to.be.revertedWith("Split duration must be less than remaining duration");
    });

    it("should revert split attempt by non-owner", async function () {
      await expect(
        entitlementContract.connect(bob).splitEntitlement(1, 10)
      ).to.be.revertedWith("SplitXEntitlement: caller is not owner");
    });
  });

  describe("4. Marketplace Listing & Provider Detachment", function () {
    beforeEach(async function () {
      // Alice buys 30 days and splits 10 days (Token #2 = 10 days)
      const price30 = await entitlementContract.getServicePrice("NETFLIX_PREMIUM", 30);
      await entitlementContract.connect(alice).purchaseService("NETFLIX_PREMIUM", 30, { value: price30 });
      await entitlementContract.connect(alice).splitEntitlement(1, 10);
    });

    it("should escrow NFT and detach seller entitlement upon listing", async function () {
      // Approve marketplace
      await entitlementContract.connect(alice).approve(await marketplace.getAddress(), 2);

      // List Token #2 for 0.01 ETH
      const listPrice = ethers.parseEther("0.01");
      const tx = await marketplace.connect(alice).listEntitlement(2, listPrice);

      await expect(tx)
        .to.emit(marketplace, "EntitlementListed")
        .withArgs(2, alice.address, listPrice);

      // Marketplace now owns NFT #2 (Escrow)
      expect(await entitlementContract.ownerOf(2)).to.equal(await marketplace.getAddress());

      // Status is LISTED (1)
      const ent = await entitlementContract.getEntitlement(2);
      expect(ent.status).to.equal(1); // Status.LISTED

      // Provider access detached from Alice for token #2 (Alice had 30 days originally, token #1 has 20 days remaining)
      const [aliceSec, aliceActive] = await mockProviderAdapter.getProviderEntitlement(alice.address, "NETFLIX_PREMIUM");
      expect(aliceSec).to.equal(20n * BigInt(ONE_DAY_SEC)); // 30 - 10 detached = 20
    });

    it("should allow seller to cancel listing, returning NFT and re-provisioning service", async function () {
      await entitlementContract.connect(alice).approve(await marketplace.getAddress(), 2);
      const listPrice = ethers.parseEther("0.01");
      await marketplace.connect(alice).listEntitlement(2, listPrice);

      // Cancel listing
      await marketplace.connect(alice).cancelListing(2);

      // NFT returned to Alice
      expect(await entitlementContract.ownerOf(2)).to.equal(alice.address);

      // Status reset to ACTIVE
      const ent = await entitlementContract.getEntitlement(2);
      expect(ent.status).to.equal(0); // Status.ACTIVE

      // Re-provisioned to Alice (20 + 10 = 30)
      const [aliceSec, aliceActive] = await mockProviderAdapter.getProviderEntitlement(alice.address, "NETFLIX_PREMIUM");
      expect(aliceSec).to.equal(30n * BigInt(ONE_DAY_SEC));
    });
  });

  describe("5. Marketplace Buying & Revenue Split", function () {
    const listPrice = ethers.parseEther("0.01");

    beforeEach(async function () {
      // Alice buys 30 days and splits 10 days (Token #2 = 10 days)
      const price30 = await entitlementContract.getServicePrice("NETFLIX_PREMIUM", 30);
      await entitlementContract.connect(alice).purchaseService("NETFLIX_PREMIUM", 30, { value: price30 });
      await entitlementContract.connect(alice).splitEntitlement(1, 10);

      // Alice lists Token #2
      await entitlementContract.connect(alice).approve(await marketplace.getAddress(), 2);
      await marketplace.connect(alice).listEntitlement(2, listPrice);
    });

    it("should process purchase, transfer NFT, provision Bob, and split revenue (90% seller, 5% provider, 5% platform)", async function () {
      const aliceBalanceBefore = await ethers.provider.getBalance(alice.address);
      const providerBalanceBefore = await ethers.provider.getBalance(providerWallet.address);
      const platformBalanceBefore = await ethers.provider.getBalance(platformWallet.address);

      // Bob buys Token #2 for 0.01 ETH
      const tx = await marketplace.connect(bob).buyEntitlement(2, { value: listPrice });

      await expect(tx)
        .to.emit(marketplace, "EntitlementPurchased")
        .withArgs(2, alice.address, bob.address, listPrice);

      // NFT ownership transferred to Bob
      expect(await entitlementContract.ownerOf(2)).to.equal(bob.address);

      // Token status back to ACTIVE
      const ent = await entitlementContract.getEntitlement(2);
      expect(ent.status).to.equal(0);

      // Bob is provisioned in MockProviderAdapter with 10 days of Netflix
      const [bobSec, bobActive] = await mockProviderAdapter.getProviderEntitlement(bob.address, "NETFLIX_PREMIUM");
      expect(bobActive).to.be.true;
      expect(bobSec).to.equal(10n * BigInt(ONE_DAY_SEC));

      // Revenue Split Verification:
      // Seller (Alice): 90% of 0.01 = 0.009 ETH
      // Provider: 5% of 0.01 = 0.0005 ETH
      // Platform: 5% of 0.01 = 0.0005 ETH
      const aliceBalanceAfter = await ethers.provider.getBalance(alice.address);
      const providerBalanceAfter = await ethers.provider.getBalance(providerWallet.address);
      const platformBalanceAfter = await ethers.provider.getBalance(platformWallet.address);

      expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(ethers.parseEther("0.009"));
      expect(providerBalanceAfter - providerBalanceBefore).to.equal(ethers.parseEther("0.0005"));
      expect(platformBalanceAfter - platformBalanceBefore).to.equal(ethers.parseEther("0.0005"));
    });

    it("should revert if Bob attempts to buy with wrong price or double purchase", async function () {
      // Underpay
      await expect(
        marketplace.connect(bob).buyEntitlement(2, { value: ethers.parseEther("0.005") })
      ).to.be.revertedWith("Exact payment amount required");

      // Successful purchase
      await marketplace.connect(bob).buyEntitlement(2, { value: listPrice });

      // Attempt double purchase
      await expect(
        marketplace.connect(bob).buyEntitlement(2, { value: listPrice })
      ).to.be.revertedWith("Listing is not active");
    });
  });

  describe("6. Expiry & Safeguards", function () {
    it("should prevent listing or splitting an expired entitlement", async function () {
      const price10 = await entitlementContract.getServicePrice("SPOTIFY_PREMIUM", 10);
      await entitlementContract.connect(alice).purchaseService("SPOTIFY_PREMIUM", 10, { value: price10 });

      // Fast forward 11 days in EVM
      await ethers.provider.send("evm_increaseTime", [11 * ONE_DAY_SEC]);
      await ethers.provider.send("evm_mine", []);

      // Check status reports EXPIRED
      const ent = await entitlementContract.getEntitlement(1);
      expect(ent.status).to.equal(3); // Status.EXPIRED

      // Split attempt fails
      await expect(
        entitlementContract.connect(alice).splitEntitlement(1, 2)
      ).to.be.revertedWith("Entitlement has expired");

      // List attempt fails
      await entitlementContract.connect(alice).approve(await marketplace.getAddress(), 1);
      await expect(
        marketplace.connect(alice).listEntitlement(1, ethers.parseEther("0.005"))
      ).to.be.revertedWith("Token has expired");
    });
  });
});

/**
 * Known ERC-721 custom error selectors (OpenZeppelin v5).
 * When the Marketplace contract calls `safeTransferFrom` on the Entitlement contract,
 * these errors bubble up with their original selector — but the Marketplace ABI
 * may not include them, so viem cannot decode the revert.  We match by selector.
 */
const KNOWN_SELECTORS: Record<string, string> = {
  "0x177e802f": "NFT approval required. Please approve the marketplace contract first.",
  "0x7e273289": "This entitlement token does not exist on the blockchain.",
  "0x64283d7b": "You are not the on-chain owner of this entitlement.",
  "0x1b4657d4": "You are not the on-chain owner of this entitlement.",
  "0x4b7da3c8": "You are not authorized to approve this entitlement.",
};

export function formatBlockchainError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  // ── Wallet-level rejections ────────────────────────────────────────────
  if (lower.includes("user rejected") || lower.includes("denied") || lower.includes("user denied")) {
    return "Transaction rejected in wallet.";
  }

  // ── Insufficient balance ───────────────────────────────────────────────
  if (lower.includes("insufficient funds") || lower.includes("exceeds balance") || lower.includes("insufficient eth")) {
    return "Insufficient ETH on Arbitrum Sepolia.";
  }

  // ── Wrong network ─────────────────────────────────────────────────────
  if (lower.includes("wrong chain") || lower.includes("chain mismatch")) {
    return "Wrong network. Please switch to Arbitrum Sepolia.";
  }

  // ── ERC-721 custom errors (by name or selector in message) ────────────
  if (lower.includes("erc721insufficientapproval") || lower.includes("0x177e802f")) {
    return "NFT approval required. Please approve the marketplace contract first.";
  }
  if (lower.includes("erc721nonexistenttoken") || lower.includes("0x7e273289")) {
    return "This entitlement token does not exist on the blockchain.";
  }
  if (lower.includes("erc721incorrectowner") || lower.includes("0x64283d7b") || lower.includes("0x1b4657d4")) {
    return "You are not the on-chain owner of this entitlement.";
  }

  // ── Contract-level human-readable reasons ─────────────────────────────
  if (lower.includes("caller is not owner") || lower.includes("caller is not token owner") || lower.includes("not owner")) {
    return "You don't own this entitlement.";
  }
  if (lower.includes("has expired") || lower.includes("token has expired") || lower.includes("expired")) {
    return "Entitlement has expired.";
  }
  if (lower.includes("already listed") || lower.includes("token is not active")) {
    return "Entitlement is already listed or not active.";
  }
  if (lower.includes("listing is not active") || lower.includes("no longer available")) {
    return "Listing is no longer active.";
  }
  if (lower.includes("less than remaining duration") || lower.includes("must be > 0")) {
    return "Invalid split duration.";
  }
  if (lower.includes("approval required") || lower.includes("insufficient approval")) {
    return "NFT approval required.";
  }
  if (lower.includes("exact payment amount required")) {
    return "Payment amount does not match the listing price.";
  }

  // ── Structured viem BaseError walk (ContractFunctionRevertedError) ─────
  if (err && typeof (err as any).walk === "function") {
    const revertErr = (err as any).walk(
      (e: any) => e?.name === "ContractFunctionRevertedError",
    );
    if (revertErr) {
      const errName: string | undefined = revertErr.data?.errorName;
      if (errName === "ERC721InsufficientApproval") {
        return "NFT approval required. Please approve the marketplace contract first.";
      }
      if (errName === "ERC721NonexistentToken") {
        return "This entitlement token does not exist on the blockchain.";
      }
      if (errName === "ERC721IncorrectOwner") {
        return "You are not the on-chain owner of this entitlement.";
      }
      if (revertErr.reason) {
        return `Contract reverted: ${revertErr.reason}`;
      }
    }
  }

  // ── Viem "reverted with the following reason:" pattern ─────────────────
  const viemReason = msg.match(/reverted with the following reason:\s*\n?\s*([^\r\n]+)/i);
  if (viemReason?.[1]) {
    const reason = viemReason[1].trim();
    if (reason && !/^version:/i.test(reason) && !/^docs:/i.test(reason)) {
      return `Contract reverted: ${reason}`;
    }
  }

  // ── Viem "reverted with the following signature:" (unknown selector) ───
  const sigMatch = msg.match(/reverted with the following signature:\s*\n?\s*(0x[a-f0-9]+)/i);
  if (sigMatch?.[1]) {
    const mapped = KNOWN_SELECTORS[sigMatch[1].toLowerCase()];
    if (mapped) return mapped;
    return "Contract transaction reverted. Check that the entitlement exists and you have the right permissions.";
  }

  // ── Classic "execution reverted: <reason>" (ethers / older viem) ───────
  // Only match the reason on the SAME line — never across newlines.
  const reasonMatch = msg.match(/execution reverted:[ \t]+([^\n\r"]+)/i);
  if (reasonMatch?.[1]) {
    const reason = reasonMatch[1].trim();
    if (reason && !/^version:/i.test(reason) && !/^details:/i.test(reason)) {
      return `Contract reverted: ${reason}`;
    }
  }

  // ── Generic "execution reverted" without reason ────────────────────────
  if (lower.includes("execution reverted")) {
    return "Contract transaction reverted. Check that the entitlement exists on-chain and you are the owner.";
  }

  // ── Use viem shortMessage if available (but filter out version lines) ──
  if (err && typeof (err as any).shortMessage === "string") {
    const short: string = (err as any).shortMessage;
    if (!/version:/i.test(short)) {
      return short;
    }
  }

  return msg || "Transaction failed.";
}

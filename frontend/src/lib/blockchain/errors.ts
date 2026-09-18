export function formatBlockchainError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("denied") || lower.includes("user denied")) {
    return "Transaction rejected in wallet.";
  }
  if (lower.includes("insufficient funds") || lower.includes("exceeds balance") || lower.includes("insufficient eth")) {
    return "Insufficient ETH on Arbitrum Sepolia.";
  }
  if (lower.includes("wrong chain") || lower.includes("chain mismatch")) {
    return "Wrong network. Please switch to Arbitrum Sepolia.";
  }
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
  if (lower.includes("execution reverted")) {
    const reasonMatch = msg.match(/execution reverted:?\s*([^\n\r"]+)/i);
    if (reasonMatch?.[1]) return `Contract reverted: ${reasonMatch[1].trim()}`;
    return "Contract transaction reverted.";
  }
  return msg || "Transaction failed.";
}

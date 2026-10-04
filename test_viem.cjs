const { BaseError, ContractFunctionRevertedError } = require('./frontend/node_modules/viem');

function formatBlockchainError(err) {
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
  if (
    lower.includes("erc721insufficientapproval") ||
    lower.includes("0x177e802f") ||
    lower.includes("approval required") ||
    lower.includes("insufficient approval")
  ) {
    return "Marketplace contract is not approved to transfer this entitlement.";
  }
  if (
    lower.includes("erc721nonexistenttoken") ||
    lower.includes("0x7e273289") ||
    lower.includes("token does not exist")
  ) {
    return "This entitlement token does not exist on-chain.";
  }
  if (
    lower.includes("caller is not owner") ||
    lower.includes("caller is not token owner") ||
    lower.includes("not owner") ||
    lower.includes("erc721incorrectowner") ||
    lower.includes("0x1b4657d4")
  ) {
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
    return "Invalid split duration. Duration must be greater than 0 and less than remaining days.";
  }

  // Check structured viem ContractFunctionRevertedError if available
  if (err && typeof err.walk === "function") {
    const revertErr = err.walk((e) => e.name === "ContractFunctionRevertedError");
    if (revertErr) {
      const errName = revertErr.data?.errorName;
      if (errName === "ERC721InsufficientApproval") {
        return "Marketplace contract is not approved to transfer this entitlement.";
      }
      if (errName === "ERC721NonexistentToken") {
        return "This entitlement token does not exist on-chain.";
      }
      if (revertErr.reason) {
        return `Contract reverted: ${revertErr.reason}`;
      }
    }
  }

  // Check for viem explicit reason: "reverted with the following reason:\n<reason>"
  const viemReason = msg.match(/reverted with the following reason:\s*([^\r\n]+)/i);
  if (viemReason?.[1] && !viemReason[1].toLowerCase().startsWith("version:")) {
    return `Contract reverted: ${viemReason[1].trim()}`;
  }

  // Check for viem custom signature
  const sigMatch = msg.match(/reverted with the following signature:\s*(0x[a-f0-9]+)/i);
  if (sigMatch?.[1]) {
    const sig = sigMatch[1].toLowerCase();
    if (sig === "0x177e802f") {
      return "Marketplace contract is not approved to transfer this entitlement.";
    }
    if (sig === "0x7e273289") {
      return "This entitlement token does not exist on-chain.";
    }
    return `Contract reverted with signature: ${sigMatch[1]}`;
  }

  // Check for execution reverted followed by reason on same line
  const reasonMatch = msg.match(/execution reverted:?[ \t]+([^\r\n"]+)/i);
  if (reasonMatch?.[1]) {
    const reason = reasonMatch[1].trim();
    if (!reason.toLowerCase().startsWith("version:")) {
      return `Contract reverted: ${reason}`;
    }
  }

  if (err && err.shortMessage && !err.shortMessage.toLowerCase().includes("version:")) {
    return err.shortMessage;
  }

  return "Contract transaction reverted.";
}

// Test cases
const err1 = new Error(`The contract function "listEntitlement" reverted with the following signature:
0x177e802f

Unable to decode signature "0x177e802f" as it was not found on the provided ABI.

Docs: https://viem.sh/docs/contract/estimateContractGas
Details: execution reverted
Version: viem@2.56.5`);

const err2 = new Error(`The contract function "getApproved" reverted.

Error: ERC721NonexistentToken(uint256 tokenId)
                             (21)

Docs: https://viem.sh/docs/contract/readContract
Details: execution reverted
Version: viem@2.56.5`);

const err3 = new Error(`The contract function "splitEntitlement" reverted with the following reason:
Split duration must be less than remaining duration

Docs: https://viem.sh/docs/contract/simulateContract
Details: execution reverted: Split duration must be less than remaining duration
Version: viem@2.56.5`);

const err4 = new Error(`Details: execution reverted
Version: viem@2.56.5`);

console.log('Test 1 (0x177e802f):', formatBlockchainError(err1));
console.log('Test 2 (Nonexistent token 21):', formatBlockchainError(err2));
console.log('Test 3 (Split duration):', formatBlockchainError(err3));
console.log('Test 4 (Unknown revert):', formatBlockchainError(err4));

import { MerkleTree } from 'merkletreejs';
import { encodePacked, getAddress, isAddress, keccak256 } from 'viem';

export interface AllowlistGenerationResult {
  root: `0x${string}`;
  totalAddresses: number;
  validAddresses: `0x${string}`[];
  invalidLines: string[];
  proofs: Record<`0x${string}`, `0x${string}`[]>;
  tree: MerkleTree;
}

/**
 * Hash an address leaf according to OpenZeppelin MerkleProof conventions
 * keccak256(encodePacked(['address'], [address])) or keccak256(address)
 */
export function hashLeaf(address: string): Buffer {
  const checksummed = getAddress(address.trim());
  const hexHash = keccak256(encodePacked(['address'], [checksummed]));
  return Buffer.from(hexHash.slice(2), 'hex');
}

/**
 * Parse raw text (newline, comma, or space-separated) or CSV into list of addresses
 */
export function parseAddressList(rawInput: string): {
  validAddresses: `0x${string}`[];
  invalidLines: string[];
} {
  const rawEntries = rawInput
    .split(/[\n,;\s]+/)
    .map((e) => e.trim())
    .filter(Boolean);

  const validAddresses: `0x${string}`[] = [];
  const invalidLines: string[] = [];
  const seen = new Set<string>();

  for (const entry of rawEntries) {
    if (isAddress(entry)) {
      try {
        const checksummed = getAddress(entry);
        if (!seen.has(checksummed.toLowerCase())) {
          seen.add(checksummed.toLowerCase());
          validAddresses.push(checksummed);
        }
      } catch {
        invalidLines.push(entry);
      }
    } else if (entry.length > 0) {
      invalidLines.push(entry);
    }
  }

  return { validAddresses, invalidLines };
}

/**
 * Build Merkle Tree and calculate root + all proofs
 */
export function generateMerkleAllowlist(addresses: string[]): AllowlistGenerationResult {
  const parsed = parseAddressList(addresses.join('\n'));
  
  if (parsed.validAddresses.length === 0) {
    return {
      root: '0x0000000000000000000000000000000000000000000000000000000000000000',
      totalAddresses: 0,
      validAddresses: [],
      invalidLines: parsed.invalidLines,
      proofs: {},
      tree: new MerkleTree([], () => Buffer.alloc(32)),
    };
  }

  const leaves = parsed.validAddresses.map((addr) => hashLeaf(addr));
  
  // OpenZeppelin standard requires keccak256 and sortPairs: true
  const tree = new MerkleTree(leaves, (buf: Buffer) => {
    const hex = keccak256(`0x${buf.toString('hex')}` as `0x${string}`);
    return Buffer.from(hex.slice(2), 'hex');
  }, {
    sortPairs: true,
  });

  const rootHex = `0x${tree.getRoot().toString('hex')}` as `0x${string}`;
  const proofs: Record<`0x${string}`, `0x${string}`[]> = {};

  parsed.validAddresses.forEach((addr) => {
    const leaf = hashLeaf(addr);
    const proofHexArray = tree
      .getProof(leaf)
      .map((p) => `0x${p.data.toString('hex')}` as `0x${string}`);
    proofs[addr.toLowerCase() as `0x${string}`] = proofHexArray;
  });

  return {
    root: rootHex,
    totalAddresses: parsed.validAddresses.length,
    validAddresses: parsed.validAddresses,
    invalidLines: parsed.invalidLines,
    proofs,
    tree,
  };
}

/**
 * Client-side verify if an address + proof matches the root
 */
export function verifyAddressProof(
  address: string,
  proof: `0x${string}`[],
  root: `0x${string}`
): boolean {
  try {
    if (!isAddress(address)) return false;
    let computedHash = hashLeaf(address);
    const proofBuffers = proof.map((p) => Buffer.from(p.slice(2), 'hex'));
    const rootBuffer = Buffer.from(root.slice(2), 'hex');

    for (const proofElement of proofBuffers) {
      if (Buffer.compare(computedHash, proofElement) <= 0) {
        // Hash(computedHash + proofElement)
        const combined = Buffer.concat([computedHash, proofElement]);
        const hex = keccak256(`0x${combined.toString('hex')}` as `0x${string}`);
        computedHash = Buffer.from(hex.slice(2), 'hex');
      } else {
        // Hash(proofElement + computedHash)
        const combined = Buffer.concat([proofElement, computedHash]);
        const hex = keccak256(`0x${combined.toString('hex')}` as `0x${string}`);
        computedHash = Buffer.from(hex.slice(2), 'hex');
      }
    }

    return Buffer.compare(computedHash, rootBuffer) === 0;
  } catch (err) {
    console.error('Error verifying proof:', err);
    return false;
  }
}

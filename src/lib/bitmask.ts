/**
 * Helper to compute and decode the uint8 flags bitmask used by `registerEvent`.
 * 
 * Bit mapping:
 * - Bit 0 (0b00000001, 1): isPublic (true = open public minting allowed)
 * - Bit 1 (0b00000010, 2): isSoulbound (true = non-transferable ERC-1155 token)
 */

export function computeFlags(isPublic: boolean, isSoulbound: boolean): number {
  let flags = 0;
  if (isPublic) {
    flags |= 1 << 0; // Bit 0
  }
  if (isSoulbound) {
    flags |= 1 << 1; // Bit 1
  }
  return flags;
}

export function decodeFlags(flags: number): { isPublic: boolean; isSoulbound: boolean } {
  return {
    isPublic: (flags & 0b00000001) !== 0,
    isSoulbound: (flags & 0b00000010) !== 0,
  };
}

export function getFlagBitBreakdown(isPublic: boolean, isSoulbound: boolean): {
  bit0: number;
  bit1: number;
  totalDecimal: number;
  binaryString: string;
} {
  const decimal = computeFlags(isPublic, isSoulbound);
  return {
    bit0: isPublic ? 1 : 0,
    bit1: isSoulbound ? 2 : 0,
    totalDecimal: decimal,
    binaryString: `0b${decimal.toString(2).padStart(8, "0")}`,
  };
}

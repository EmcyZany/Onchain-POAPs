import { encodePacked, getAddress, isAddress, keccak256 } from 'viem';
import { POAP_CONTRACT_ADDRESS } from '../types/contract';

export interface SignatureMintPayload {
  eventId: bigint;
  recipient: `0x${string}`;
  contractAddress: `0x${string}`;
  signature?: `0x${string}`;
}

/**
 * Computes the message hash for signature minting:
 * keccak256(abi.encodePacked(recipient, eventId))
 */
export function computeSignatureMessageHash(
  recipient: `0x${string}`,
  eventId: bigint | number
): `0x${string}` {
  const checksummedRecipient = getAddress(recipient);
  const idBigInt = typeof eventId === 'bigint' ? eventId : BigInt(eventId);
  
  return keccak256(
    encodePacked(
      ['address', 'uint256'],
      [checksummedRecipient, idBigInt]
    )
  );
}

/**
 * Alternative standard digest including contract address for replay protection:
 * keccak256(abi.encodePacked(contractAddress, recipient, eventId))
 */
export function computeContractSignatureMessageHash(
  recipient: `0x${string}`,
  eventId: bigint | number,
  contractAddress: `0x${string}` = POAP_CONTRACT_ADDRESS
): `0x${string}` {
  const checksummedRecipient = getAddress(recipient);
  const idBigInt = typeof eventId === 'bigint' ? eventId : BigInt(eventId);
  
  return keccak256(
    encodePacked(
      ['address', 'address', 'uint256'],
      [contractAddress, checksummedRecipient, idBigInt]
    )
  );
}

/**
 * Generate a shareable URL or QR code payload
 */
export function generateSignatureShareUrl(
  eventId: bigint | number,
  signature: `0x${string}`,
  recipient?: `0x${string}`,
  baseUrl?: string
): string {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const idStr = eventId.toString();
  const url = new URL(`/event/${idStr}`, origin || 'https://poaps.base.org');
  url.searchParams.set('sig', signature);
  if (recipient && isAddress(recipient)) {
    url.searchParams.set('recipient', getAddress(recipient));
  }
  return url.toString();
}

/**
 * Parses query params from location search
 */
export function parseSignatureQueryParams(): {
  sig?: `0x${string}`;
  recipient?: `0x${string}`;
} {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const sigParam = params.get('sig');
  const recipientParam = params.get('recipient');

  const result: { sig?: `0x${string}`; recipient?: `0x${string}` } = {};

  if (sigParam && sigParam.startsWith('0x')) {
    result.sig = sigParam as `0x${string}`;
  }
  if (recipientParam && isAddress(recipientParam)) {
    result.recipient = getAddress(recipientParam);
  }

  return result;
}

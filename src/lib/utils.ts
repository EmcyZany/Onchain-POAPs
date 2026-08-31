import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortenAddress(address?: string, chars = 4): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatDate(timestamp: bigint | number): string {
  if (!timestamp) return "TBD";
  const num = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  const date = new Date(num * 1000);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(timestamp: bigint | number): string {
  if (!timestamp) return "TBD";
  const num = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  const date = new Date(num * 1000);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function safeBase64Decode(str: string): string {
  try {
    const binary = atob(str);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    try {
      return atob(str);
    } catch {
      return '';
    }
  }
}

/**
 * Parses any POAP token URI / raw SVG / metadata representation into a direct renderable image source (data URI or URL)
 */
export function parsePOAPImageUri(uriStr?: string): string | undefined {
  if (!uriStr || typeof uriStr !== 'string') return undefined;
  const trimmed = uriStr.trim();
  if (!trimmed) return undefined;

  // 1. Direct Image Data URI (SVG, PNG, etc.)
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // 2. Direct HTTP or IPFS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('ipfs://')) {
    return trimmed.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }

  // 3. Base64 JSON Metadata (ERC1155 URI standard: data:application/json;base64,...)
  if (trimmed.startsWith('data:application/json;base64,')) {
    try {
      const b64 = trimmed.replace('data:application/json;base64,', '');
      const jsonText = safeBase64Decode(b64);
      if (jsonText) {
        const parsed = JSON.parse(jsonText);
        if (parsed && typeof parsed.image === 'string' && parsed.image.trim().length > 0) {
          return parsePOAPImageUri(parsed.image);
        }
      }
    } catch (err) {
      console.debug('Failed to parse base64 JSON metadata:', err);
    }
  }

  // 4. UTF8 or Percent-Encoded JSON Metadata
  if (trimmed.startsWith('data:application/json;utf8,') || trimmed.startsWith('data:application/json,')) {
    try {
      const jsonText = decodeURIComponent(trimmed.replace(/^data:application\/json(;utf8)?,/, ''));
      const parsed = JSON.parse(jsonText);
      if (parsed && typeof parsed.image === 'string' && parsed.image.trim().length > 0) {
        return parsePOAPImageUri(parsed.image);
      }
    } catch (err) {
      console.debug('Failed to parse JSON metadata:', err);
    }
  }

  // 5. Raw SVG Markup
  if (trimmed.includes('<svg') && trimmed.includes('</svg>')) {
    const startIndex = trimmed.indexOf('<svg');
    const endIndex = trimmed.lastIndexOf('</svg>') + 6;
    const svgCode = trimmed.slice(startIndex, endIndex);
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgCode)}`;
  }

  return undefined;
}


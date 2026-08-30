import { useState, useCallback, useMemo } from 'react';
import { generateMerkleAllowlist, parseAddressList, verifyAddressProof, AllowlistGenerationResult } from '../lib/merkle';

export function useAllowlist() {
  const [rawInput, setRawInput] = useState<string>('');
  const [targetSearchAddress, setTargetSearchAddress] = useState<string>('');

  const parsed = useMemo(() => {
    return parseAddressList(rawInput);
  }, [rawInput]);

  const treeResult = useMemo<AllowlistGenerationResult>(() => {
    return generateMerkleAllowlist(parsed.validAddresses);
  }, [parsed.validAddresses]);

  const handleCsvUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setRawInput((prev) => (prev ? `${prev}\n${content}` : content));
      }
    };
    reader.readAsText(file);
  }, []);

  const getProofForAddress = useCallback(
    (address: string): `0x${string}`[] | undefined => {
      const lower = address.trim().toLowerCase() as `0x${string}`;
      return treeResult.proofs[lower];
    },
    [treeResult.proofs]
  );

  const searchVerification = useMemo(() => {
    if (!targetSearchAddress.trim()) return null;
    const proof = getProofForAddress(targetSearchAddress);
    if (!proof) {
      return { isEligible: false, proof: [] };
    }
    const isValid = verifyAddressProof(targetSearchAddress, proof, treeResult.root);
    return { isEligible: isValid, proof };
  }, [targetSearchAddress, getProofForAddress, treeResult.root]);

  return {
    rawInput,
    setRawInput,
    validAddresses: parsed.validAddresses,
    invalidLines: parsed.invalidLines,
    merkleRoot: treeResult.root,
    totalCount: treeResult.totalAddresses,
    proofs: treeResult.proofs,
    handleCsvUpload,
    getProofForAddress,
    targetSearchAddress,
    setTargetSearchAddress,
    searchVerification,
  };
}

import { useState, useCallback } from 'react';
import { useAccount, useSignMessage, useWalletClient } from 'wagmi';
import { isAddress, getAddress } from 'viem';
import { computeSignatureMessageHash, generateSignatureShareUrl } from '../lib/signatures';

export function useSignatureMint(eventId?: bigint | number) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { signMessageAsync } = useSignMessage();

  const [recipientInput, setRecipientInput] = useState<string>('');
  const [generatedSignature, setGeneratedSignature] = useState<`0x${string}` | null>(null);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const signForRecipient = useCallback(
    async (targetRecipient: string, targetEventId?: bigint | number) => {
      setError(null);
      setGeneratedSignature(null);

      const eId = targetEventId ?? eventId;
      if (eId === undefined) {
        setError('Missing event ID.');
        return null;
      }

      if (!isAddress(targetRecipient.trim())) {
        setError('Please enter a valid Ethereum recipient address.');
        return null;
      }

      const cleanRecipient = getAddress(targetRecipient.trim());
      const messageHash = computeSignatureMessageHash(cleanRecipient, eId);

      setIsSigning(true);
      try {
        let sig: `0x${string}`;
        if (walletClient && address) {
          sig = await (walletClient.signMessage as any)({
            account: address,
            message: { raw: messageHash },
          });
        } else {
          sig = await (signMessageAsync as any)({
            account: address,
            message: { raw: messageHash },
          });
        }

        setGeneratedSignature(sig);
        return sig;
      } catch (err: any) {
        console.error('Signature signing error:', err);
        setError(err?.message || 'Failed to sign message.');
        return null;
      } finally {
        setIsSigning(false);
      }
    },
    [eventId, walletClient, signMessageAsync]
  );

  const getShareUrl = useCallback(
    (sig?: `0x${string}`, recipient?: string) => {
      const activeSig = sig || generatedSignature;
      const eId = eventId;
      if (!activeSig || eId === undefined) return '';
      return generateSignatureShareUrl(
        eId,
        activeSig,
        recipient && isAddress(recipient) ? getAddress(recipient) : undefined
      );
    },
    [eventId, generatedSignature]
  );

  return {
    recipientInput,
    setRecipientInput,
    generatedSignature,
    setGeneratedSignature,
    isSigning,
    error,
    signForRecipient,
    getShareUrl,
    connectedAddress: address,
  };
}

import { useState, useCallback, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { ONCHAIN_POAPS_ABI, POAP_CONTRACT_ADDRESS, POAPEvent } from '../types/contract';
import { parsePOAPImageUri } from '../lib/utils';

export interface UserPOAPItem {
  event: POAPEvent;
  balance: bigint;
}

export function useUserPOAPs() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [userPOAPs, setUserPOAPs] = useState<UserPOAPItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchUserPOAPs = useCallback(async () => {
    if (!publicClient || !address) {
      setUserPOAPs([]);
      return;
    }

    setIsLoading(true);
    try {
      let count = 0;
      try {
        const totalEvents = await (publicClient.readContract as any)({
          address: POAP_CONTRACT_ADDRESS,
          abi: ONCHAIN_POAPS_ABI,
          functionName: 'totalEvents',
        });
        count = Number(totalEvents);
      } catch (err) {
        console.warn('Could not read totalEvents for user poaps:', err);
      }

      if (count === 0) {
        setUserPOAPs([]);
        setIsLoading(false);
        return;
      }

      // 1. First batch: Check balanceOf for all events
      const balanceCalls: any[] = [];
      for (let i = 1; i <= count; i++) {
        balanceCalls.push({
          address: POAP_CONTRACT_ADDRESS,
          abi: ONCHAIN_POAPS_ABI,
          functionName: 'balanceOf',
          args: [address, BigInt(i)],
        });
      }

      const balanceResults = await (publicClient.multicall as any)({
        contracts: balanceCalls,
        allowFailure: true,
      });

      const ownedIds: { id: bigint; balance: bigint }[] = [];
      for (let i = 1; i <= count; i++) {
        const res = balanceResults[i - 1];
        if (res && res.status === 'success' && (res.result as bigint) > 0n) {
          ownedIds.push({ id: BigInt(i), balance: res.result as bigint });
        }
      }

      if (ownedIds.length === 0) {
        setUserPOAPs([]);
        setIsLoading(false);
        return;
      }

      // 2. Second batch: Fetch events and uri for only the owned IDs
      const detailCalls: any[] = [];
      for (const item of ownedIds) {
        detailCalls.push({
          address: POAP_CONTRACT_ADDRESS,
          abi: ONCHAIN_POAPS_ABI,
          functionName: 'events',
          args: [item.id],
        });
        detailCalls.push({
          address: POAP_CONTRACT_ADDRESS,
          abi: ONCHAIN_POAPS_ABI,
          functionName: 'uri',
          args: [item.id],
        });
      }

      const detailResults = await (publicClient.multicall as any)({
        contracts: detailCalls,
        allowFailure: true,
      });

      const ownedItems: UserPOAPItem[] = [];
      for (let idx = 0; idx < ownedIds.length; idx++) {
        const item = ownedIds[idx];
        const evRes = detailResults[idx * 2];
        const uriRes = detailResults[idx * 2 + 1];

        if (evRes && evRes.status === 'success' && evRes.result) {
          const evData = evRes.result as [
            string,
            string,
            bigint,
            string,
            `0x${string}`,
            `0x${string}`,
            `0x${string}`,
            bigint,
            string,
            boolean,
            boolean
          ];

          const uriStr = uriRes && uriRes.status === 'success' ? (uriRes.result as string) : '';

          ownedItems.push({
            balance: item.balance,
            event: {
              id: item.id,
              name: evData[0],
              description: evData[1],
              eventDate: evData[2],
              location: evData[3],
              allowlistRoot: evData[4],
              svgImage: evData[5],
              creator: evData[6],
              createdAt: evData[7],
              externalUrl: evData[8],
              isSoulbound: evData[9],
              isPublic: evData[10],
              rawSvg: parsePOAPImageUri(uriStr) || (uriStr && uriStr.startsWith('data:') ? uriStr : undefined),
            },
          });
        }
      }

      setUserPOAPs(ownedItems);
    } catch (err) {
      console.warn('Error fetching user POAPs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, address]);

  useEffect(() => {
    fetchUserPOAPs();
  }, [fetchUserPOAPs]);

  return {
    userPOAPs,
    isLoading,
    refetchUserPOAPs: fetchUserPOAPs,
  };
}

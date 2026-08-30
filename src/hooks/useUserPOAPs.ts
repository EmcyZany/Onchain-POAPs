import { useState, useCallback, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { ONCHAIN_POAPS_ABI, POAP_CONTRACT_ADDRESS, POAPEvent } from '../types/contract';

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
      const totalEvents = await (publicClient.readContract as any)({
        address: POAP_CONTRACT_ADDRESS,
        abi: ONCHAIN_POAPS_ABI,
        functionName: 'totalEvents',
      });

      const count = Number(totalEvents);
      if (count === 0) {
        setUserPOAPs([]);
        setIsLoading(false);
        return;
      }

      const ownedItems: UserPOAPItem[] = [];

      for (let i = 1; i <= count; i++) {
        try {
          const balance = (await (publicClient.readContract as any)({
            address: POAP_CONTRACT_ADDRESS,
            abi: ONCHAIN_POAPS_ABI,
            functionName: 'balanceOf',
            args: [address, BigInt(i)],
          })) as bigint;

          if (balance > 0n) {
            const evData = (await (publicClient.readContract as any)({
              address: POAP_CONTRACT_ADDRESS,
              abi: ONCHAIN_POAPS_ABI,
              functionName: 'events',
              args: [BigInt(i)],
            })) as [
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

            let uriStr = '';
            try {
              uriStr = (await (publicClient.readContract as any)({
                address: POAP_CONTRACT_ADDRESS,
                abi: ONCHAIN_POAPS_ABI,
                functionName: 'uri',
                args: [BigInt(i)],
              })) as string;
            } catch {
              uriStr = '';
            }

            ownedItems.push({
              balance,
              event: {
                id: BigInt(i),
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
                rawSvg: uriStr.startsWith('data:') ? uriStr : undefined,
              },
            });
          }
        } catch (err) {
          console.warn(`Error checking balance for POAP ${i}:`, err);
        }
      }

      setUserPOAPs(ownedItems);
    } catch (err) {
      console.error('Error fetching user POAPs:', err);
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

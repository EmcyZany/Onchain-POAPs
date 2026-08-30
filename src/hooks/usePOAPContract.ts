import { useState, useCallback, useEffect } from 'react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from 'wagmi';
import { ONCHAIN_POAPS_ABI, POAP_CONTRACT_ADDRESS, POAPEvent } from '../types/contract';

export function usePOAPContract() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [txAction, setTxAction] = useState<string>('');

  const { isLoading: isTxConfirming, isSuccess: isTxSuccess, error: txError } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Read total events count
  const {
    data: totalEventsBigInt,
    isLoading: isTotalEventsLoading,
    refetch: refetchTotalEvents,
  } = useReadContract({
    address: POAP_CONTRACT_ADDRESS,
    abi: ONCHAIN_POAPS_ABI,
    functionName: 'totalEvents',
  });

  // Read Creator Timelock
  const { data: creatorTimelockBigInt, isLoading: isTimelockLoading } = useReadContract({
    address: POAP_CONTRACT_ADDRESS,
    abi: ONCHAIN_POAPS_ABI,
    functionName: 'CREATOR_TIMELOCK',
  });

  // Fetch all events onchain
  const [allEvents, setAllEvents] = useState<POAPEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);

  const fetchAllEvents = useCallback(async () => {
    if (!publicClient) return;
    setIsLoadingEvents(true);
    try {
      const total = await (publicClient.readContract as any)({
        address: POAP_CONTRACT_ADDRESS,
        abi: ONCHAIN_POAPS_ABI,
        functionName: 'totalEvents',
      });

      const count = Number(total);
      if (count === 0) {
        setAllEvents([]);
        setIsLoadingEvents(false);
        return;
      }

      // Fetch all event structs (contract IDs usually 1..total or 0..total-1)
      const promises = [];
      for (let i = 1; i <= count; i++) {
        promises.push(
          (async () => {
            try {
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

              let claimed = false;
              if (address) {
                try {
                  claimed = (await (publicClient.readContract as any)({
                    address: POAP_CONTRACT_ADDRESS,
                    abi: ONCHAIN_POAPS_ABI,
                    functionName: 'hasClaimed',
                    args: [BigInt(i), address],
                  })) as boolean;
                } catch {
                  claimed = false;
                }
              }

              let supply = 0n;
              try {
                supply = (await (publicClient.readContract as any)({
                  address: POAP_CONTRACT_ADDRESS,
                  abi: ONCHAIN_POAPS_ABI,
                  functionName: 'totalSupply',
                  args: [BigInt(i)],
                })) as bigint;
              } catch {
                supply = 0n;
              }

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

              const poap: POAPEvent = {
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
                totalSupply: supply,
                hasClaimed: claimed,
                rawSvg: uriStr.startsWith('data:') ? uriStr : undefined,
              };
              return poap;
            } catch (err) {
              console.warn(`Error reading event ${i}:`, err);
              return null;
            }
          })()
        );
      }

      const results = await Promise.all(promises);
      const validEvents = results.filter((e): e is POAPEvent => e !== null && e.name.length > 0);
      setAllEvents(validEvents.reverse()); // latest first
    } catch (err) {
      console.error('Error fetching onchain events:', err);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [publicClient, address]);

  useEffect(() => {
    fetchAllEvents();
  }, [fetchAllEvents, totalEventsBigInt]);

  // Refetch when a transaction confirms
  useEffect(() => {
    if (isTxSuccess) {
      refetchTotalEvents();
      fetchAllEvents();
    }
  }, [isTxSuccess, refetchTotalEvents, fetchAllEvents]);

  // 1. Register Event
  const registerEvent = async (params: {
    name: string;
    description: string;
    eventDate: bigint;
    location: string;
    allowlistRoot: `0x${string}`;
    svgImage: string;
    externalUrl: string;
    flags: number;
  }) => {
    setTxAction('Registering new onchain POAP...');
    const hash = await (writeContractAsync as any)({
      address: POAP_CONTRACT_ADDRESS,
      abi: ONCHAIN_POAPS_ABI,
      functionName: 'registerEvent',
      args: [
        params.name,
        params.description,
        params.eventDate,
        params.location,
        params.allowlistRoot,
        params.svgImage,
        params.externalUrl,
        params.flags,
      ],
    });
    setTxHash(hash);
    return hash;
  };

  // 2. Public Mint
  const mint = async (eventId: bigint) => {
    setTxAction(`Minting POAP #${eventId.toString()}...`);
    const hash = await (writeContractAsync as any)({
      address: POAP_CONTRACT_ADDRESS,
      abi: ONCHAIN_POAPS_ABI,
      functionName: 'mint',
      args: [eventId],
    });
    setTxHash(hash);
    return hash;
  };

  // 3. Allowlist Mint
  const allowlistMint = async (eventId: bigint, merkleProof: `0x${string}`[]) => {
    setTxAction(`Minting POAP #${eventId.toString()} via allowlist...`);
    const hash = await (writeContractAsync as any)({
      address: POAP_CONTRACT_ADDRESS,
      abi: ONCHAIN_POAPS_ABI,
      functionName: 'allowlistMint',
      args: [eventId, merkleProof],
    });
    setTxHash(hash);
    return hash;
  };

  // 4. Mint With Signature
  const mintWithSignature = async (eventId: bigint, signature: `0x${string}`) => {
    setTxAction(`Minting POAP #${eventId.toString()} with cryptographic signature...`);
    const hash = await (writeContractAsync as any)({
      address: POAP_CONTRACT_ADDRESS,
      abi: ONCHAIN_POAPS_ABI,
      functionName: 'mintWithSignature',
      args: [eventId, signature],
    });
    setTxHash(hash);
    return hash;
  };

  // 5. Creator Mint / Airdrop
  const creatorMint = async (eventId: bigint, recipients: `0x${string}`[]) => {
    setTxAction(`Airdropping POAP #${eventId.toString()} to ${recipients.length} recipients...`);
    const hash = await (writeContractAsync as any)({
      address: POAP_CONTRACT_ADDRESS,
      abi: ONCHAIN_POAPS_ABI,
      functionName: 'creatorMint',
      args: [eventId, recipients],
    });
    setTxHash(hash);
    return hash;
  };

  // 6. Update Allowlist Root
  const updateAllowlistRoot = async (eventId: bigint, newRoot: `0x${string}`) => {
    setTxAction(`Updating allowlist root for POAP #${eventId.toString()}...`);
    const hash = await (writeContractAsync as any)({
      address: POAP_CONTRACT_ADDRESS,
      abi: ONCHAIN_POAPS_ABI,
      functionName: 'updateAllowlistRoot',
      args: [eventId, newRoot],
    });
    setTxHash(hash);
    return hash;
  };

  // 7. Update Event Public
  const updateEventPublic = async (eventId: bigint, isPublic: boolean) => {
    setTxAction(`${isPublic ? 'Enabling' : 'Disabling'} public minting for POAP #${eventId.toString()}...`);
    const hash = await (writeContractAsync as any)({
      address: POAP_CONTRACT_ADDRESS,
      abi: ONCHAIN_POAPS_ABI,
      functionName: 'updateEventPublic',
      args: [eventId, isPublic],
    });
    setTxHash(hash);
    return hash;
  };

  return {
    totalEvents: totalEventsBigInt ? Number(totalEventsBigInt) : 0,
    creatorTimelock: creatorTimelockBigInt ?? 2592000n, // 30 days default fallback
    isTimelockLoading,
    isTotalEventsLoading,
    events: allEvents,
    allEvents,
    isLoadingEvents,
    refetchEvents: fetchAllEvents,
    fetchAllEvents,
    // Transactions
    txHash,
    txAction,
    isWritePending,
    isTxConfirming,
    isTxSuccess,
    txError,
    clearTx: () => {
      setTxHash(undefined);
      setTxAction('');
    },
    // Write functions
    registerEvent,
    mint,
    allowlistMint,
    mintWithSignature,
    creatorMint,
    updateAllowlistRoot,
    updateEventPublic,
  };
}

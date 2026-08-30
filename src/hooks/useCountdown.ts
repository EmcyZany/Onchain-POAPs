import { useEffect, useState } from 'react';

export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formatted: string;
  totalSecondsRemaining: number;
  targetDate: Date | null;
}

export function useCountdown(
  createdAt?: bigint | number,
  timelockDuration?: bigint | number
): CountdownResult {
  const [now, setNow] = useState<number>(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!createdAt || !timelockDuration) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: false,
      formatted: 'Loading...',
      totalSecondsRemaining: 0,
      targetDate: null,
    };
  }

  const createdSec = typeof createdAt === 'bigint' ? Number(createdAt) : createdAt;
  const durationSec = typeof timelockDuration === 'bigint' ? Number(timelockDuration) : timelockDuration;
  const deadlineSec = createdSec + durationSec;
  const remaining = Math.max(0, deadlineSec - now);
  const isExpired = remaining <= 0;

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  let formatted = '';
  if (isExpired) {
    formatted = 'Timelock Expired';
  } else if (days > 0) {
    formatted = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m ${seconds}s`;
  } else {
    formatted = `${minutes}m ${seconds}s`;
  }

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired,
    formatted,
    totalSecondsRemaining: remaining,
    targetDate: new Date(deadlineSec * 1000),
  };
}

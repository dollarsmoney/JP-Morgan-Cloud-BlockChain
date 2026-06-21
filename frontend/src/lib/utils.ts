import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatAmount(value: string | number, currency = 'BFC'): string {
  const n = Number(value);
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${currency}`;
}

export function shortAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

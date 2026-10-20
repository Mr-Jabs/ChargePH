import records from '@/data/ph_stations.json';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export type Station = {
  id: number; title: string; address: string; town: string; state: string;
  latitude: number; longitude: number; operator: string; usage_type?: string;
  is_dc_fast: boolean;
  connections: { title: string; power_kw: number | null; level?: string }[];
};
export const stations: Station[] = records.filter(s => Number.isFinite(s.latitude) && Number.isFinite(s.longitude));
export function standard(title: string) {
  if (/ccs|combo/i.test(title)) return 'CCS2';
  if (/gb\s*\/?\s*t/i.test(title)) return 'GB/T';
  if (/type\s*2|mennekes/i.test(title)) return 'Type 2';
  return /unknown/i.test(title) ? 'Unknown' : title;
}
export function maxPower(station: Station) { return Math.max(0, ...station.connections.map(c => c.power_kw ?? 0)); }
export function directions(station: Station) { return `https://www.google.com/maps/search/?api=1&query=${station.latitude},${station.longitude}`; }

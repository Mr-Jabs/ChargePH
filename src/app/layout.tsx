import type { Metadata } from 'next';
import './globals.css';
import './controls.css';

export const metadata: Metadata = {
  title: 'ChargePH — Infrastructure Analytics',
  description: 'Explore the Philippine EV charging landscape. Discover stations, compare infrastructure, and find your next charge.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Keep & Care | Service Operations',description:'AC service job, staff, payment and accounting management for Supun Group of Companies.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}

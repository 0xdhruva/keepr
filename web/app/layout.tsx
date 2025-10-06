'use client';

import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "./_components/WalletProvider";
import { Header } from "./_components/Header";
import { TopBar } from "./_components/TopBar";
import { SlideOutMenu } from "./_components/SlideOutMenu";
import { BottomNav } from "./_components/BottomNav";
import { NotificationPanel } from "./_components/NotificationPanel";
import { NotificationProvider } from "./_contexts/NotificationContext";
import { useState } from "react";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  return (
    <html lang="en">
      <head>
        <title>Keepr — Peace of mind in minutes</title>
        <meta name="description" content="Lock USDC into a time-locked vault that automatically becomes claimable by your beneficiary after a set unlock time." />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-gray-50 text-gray-900`}
      >
        <WalletProvider>
          <NotificationProvider>
            {/* Desktop Header */}
            <Header />

            {/* Mobile Top Bar */}
            <TopBar
              onMenuClick={() => setIsMenuOpen(true)}
              onNotificationClick={() => setIsNotificationOpen(true)}
            />

            {/* Slide-out Menu */}
            <SlideOutMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            {/* Notification Panel */}
            <NotificationPanel isOpen={isNotificationOpen} onClose={() => setIsNotificationOpen(false)} />

            {/* Main Content */}
            <main className="min-h-[calc(100vh-4rem)] pb-24 lg:pb-8">
              {children}
            </main>

            {/* Mobile Bottom Navigation */}
            <BottomNav />
          </NotificationProvider>
        </WalletProvider>
      </body>
    </html>
  );
}

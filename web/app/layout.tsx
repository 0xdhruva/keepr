import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "./_components/WalletProvider";
import { Header } from "./_components/Header";

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

export const metadata: Metadata = {
  title: "Keepr — Peace of mind in minutes",
  description: "Lock USDC into a time-locked vault that automatically becomes claimable by your beneficiary after a set unlock time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-gray-50 text-gray-900`}
      >
        <WalletProvider>
          <Header />
          <main className="min-h-[calc(100vh-4rem)] pb-20">
            {children}
          </main>
        </WalletProvider>
      </body>
    </html>
  );
}

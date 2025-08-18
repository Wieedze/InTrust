"use client";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useInitializeNativeCurrencyPrice } from "~~/hooks/scaffold-eth";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";

const IntudexApp = ({ children }: { children: React.ReactNode }) => {
  useInitializeNativeCurrencyPrice();

  return (
    <>
      <div className="h-screen bg-black flex flex-col overflow-hidden">
        {/* Header with logo and connect wallet */}
        <header className="relative z-50 flex justify-between items-center px-4 py-2 flex-shrink-0">
          {/* Logo and title on the left */}
          <div className="flex items-center gap-3">
            <img 
              src="/intudex.png" 
              alt="INTUDEX" 
              className="w-16 h-16 rounded-xl"
            />
            <h1 className="text-3xl font-bold text-white">
              INTUDEX
            </h1>
          </div>
          
          {/* Connect wallet on the right with white background */}
          <div className="[&_button]:!bg-white [&_button]:!text-black [&_button]:hover:!bg-gray-100 [&_button]:!border-0 [&_button]:!shadow-lg">
            <ConnectButton />
          </div>
        </header>
        <main className="relative flex-1 flex flex-col overflow-hidden">{children}</main>
      </div>
      <Toaster />
    </>
  );
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const IntudexAppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          avatar={BlockieAvatar}
          theme={darkTheme({
            accentColor: '#ffffff',
            accentColorForeground: '#000000',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
        >
          <ProgressBar height="3px" color="#2299dd" />
          <IntudexApp>{children}</IntudexApp>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

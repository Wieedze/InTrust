import { Space_Grotesk } from "next/font/google";
import { IntudexAppProviders } from "~~/components/IntudexAppProviders";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";
import "@rainbow-me/rainbowkit/styles.css";
import "~~/styles/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata = getMetadata({
  title: "Decentralized Exchange",
  description: "Trade TRUST and INTUIT tokens on Intuition Testnet. A decentralized exchange for seamless token swapping.",
});

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning className={`${spaceGrotesk.variable} font-space-grotesk`}>
      <body>
        <IntudexAppProviders>{children}</IntudexAppProviders>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;

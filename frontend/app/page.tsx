"use client";

import { WalletConnectButton } from "@/components/wallet-connect-button";
import { VaultCard } from "@/components/deposit-withdraw";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-3">
        <div className="flex justify-center">
          <WalletConnectButton />
        </div>
        <VaultCard />
      </div>
    </div>
  );
}

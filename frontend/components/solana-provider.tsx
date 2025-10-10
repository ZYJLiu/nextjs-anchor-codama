"use client";

import React, { createContext, useContext, useState, useMemo } from "react";
import {
  useWallets,
  type UiWallet,
  type UiWalletAccount,
} from "@wallet-standard/react";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { StandardConnect } from "@wallet-standard/core";
import { createRecentSignatureConfirmationPromiseFactory } from "@solana/transaction-confirmation";

// Create RPC connection
const RPC_ENDPOINT = "https://api.devnet.solana.com";
const WS_ENDPOINT = "wss://api.devnet.solana.com";
const chain = "solana:devnet";
const rpc = createSolanaRpc(RPC_ENDPOINT);
const rpcSubscriptions = createSolanaRpcSubscriptions(WS_ENDPOINT);

const getRecentSignatureConfirmationPromise =
  createRecentSignatureConfirmationPromiseFactory({
    rpc: rpc,
    rpcSubscriptions: rpcSubscriptions,
  });

interface SolanaContextState {
  // RPC
  rpc: ReturnType<typeof createSolanaRpc>;
  rpcSubscriptions: ReturnType<typeof createSolanaRpcSubscriptions>;
  getRecentSignatureConfirmationPromise: ReturnType<
    typeof createRecentSignatureConfirmationPromiseFactory
  >;
  chain: typeof chain;

  // Wallet State
  wallets: UiWallet[];
  selectedWallet: UiWallet | null;
  selectedAccount: UiWalletAccount | null;
  isConnected: boolean;

  // Wallet Actions
  setWalletAndAccount: (
    wallet: UiWallet | null,
    account: UiWalletAccount | null
  ) => void;
}

const SolanaContext = createContext<SolanaContextState | undefined>(undefined);

export function useSolana() {
  const context = useContext(SolanaContext);
  if (!context) {
    throw new Error("useSolana must be used within a SolanaProvider");
  }
  return context;
}

export function SolanaProvider({ children }: { children: React.ReactNode }) {
  const allWallets = useWallets();

  // Filter for Solana wallets only that support signAndSendTransaction
  const wallets = useMemo(() => {
    return allWallets.filter(
      (wallet) =>
        wallet.chains?.some((c) => c.startsWith("solana:")) &&
        wallet.features.includes(StandardConnect) &&
        wallet.features.includes("solana:signAndSendTransaction")
    );
  }, [allWallets]);

  // State management
  const [selectedWallet, setSelectedWallet] = useState<UiWallet | null>(null);
  const [selectedAccount, setSelectedAccount] =
    useState<UiWalletAccount | null>(null);

  // Check if connected (account must exist in the wallet's accounts)
  const isConnected = useMemo(() => {
    if (!selectedAccount || !selectedWallet) return false;

    // Find the wallet and check if it still has this account
    const currentWallet = wallets.find((w) => w.name === selectedWallet.name);
    return !!(
      currentWallet &&
      currentWallet.accounts.some(
        (acc) => acc.address === selectedAccount.address
      )
    );
  }, [selectedAccount, selectedWallet, wallets]);

  const setWalletAndAccount = (
    wallet: UiWallet | null,
    account: UiWalletAccount | null
  ) => {
    setSelectedWallet(wallet);
    setSelectedAccount(account);
  };

  // Create context value
  const contextValue = useMemo<SolanaContextState>(
    () => ({
      // Static RPC values
      rpc,
      rpcSubscriptions,
      chain,

      // Transaction confirmation
      getRecentSignatureConfirmationPromise,

      // Dynamic wallet values
      wallets,
      selectedWallet,
      selectedAccount,
      isConnected,
      setWalletAndAccount,
    }),
    [wallets, selectedWallet, selectedAccount, isConnected]
  );

  return (
    <SolanaContext.Provider value={contextValue}>
      {children}
    </SolanaContext.Provider>
  );
}

"use client";

import { useState } from "react";
import { useSolana } from "@/components/solana-provider";
import { useWalletAccountTransactionSendingSigner } from "@solana/react";
import { type UiWalletAccount } from "@wallet-standard/react";
import {
  pipe,
  createTransactionMessage,
  appendTransactionMessageInstruction,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  getBase58Decoder,
  type Signature,
} from "@solana/kit";
import { getInitializeInstruction } from "program-client";

// Component that only renders when wallet is connected
function ConnectedInitializeCard({ account }: { account: UiWalletAccount }) {
  const { rpc, chain } = useSolana();
  const [isLoading, setIsLoading] = useState(false);
  const [txSignature, setTxSignature] = useState("");
  const [error, setError] = useState("");

  const signer = useWalletAccountTransactionSendingSigner(account, chain);

  const sendInitialize = async () => {
    if (!signer) return;

    setIsLoading(true);
    setError("");
    try {
      const { value: latestBlockhash } = await rpc
        .getLatestBlockhash({ commitment: "confirmed" })
        .send();

      // Create the initialize instruction using the generated client
      const initializeInstruction = getInitializeInstruction();

      const message = pipe(
        createTransactionMessage({ version: 0 }),
        (m) => setTransactionMessageFeePayerSigner(signer, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
        (m) => appendTransactionMessageInstruction(initializeInstruction, m)
      );

      const signature = await signAndSendTransactionMessageWithSigners(message);

      const signatureStr = getBase58Decoder().decode(signature) as Signature;

      setTxSignature(signatureStr);
    } catch (error) {
      console.error("Initialize failed:", error);
      setError(error instanceof Error ? error.message : "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Click the button below to send an initialize instruction to the program.
      </p>

      <button
        onClick={sendInitialize}
        disabled={isLoading}
        className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isLoading ? "Initializing..." : "Initialize"}
      </button>

      {error && (
        <div className="p-2 border border-red-300 rounded text-sm text-red-600 bg-red-50">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {txSignature && (
        <div className="p-2 border rounded text-sm">
          <a
            href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            View on Solana Explorer →
          </a>
        </div>
      )}
    </div>
  );
}

// Main initialize component
export function InitializeCard() {
  const { selectedAccount, isConnected } = useSolana();

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">Initialize Instruction</h3>
      {isConnected && selectedAccount ? (
        <ConnectedInitializeCard account={selectedAccount} />
      ) : (
        <p className="text-gray-500 text-center py-4">
          Connect your wallet to initialize the program
        </p>
      )}
    </div>
  );
}

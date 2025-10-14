"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  lamports,
  getProgramDerivedAddress,
  type Signature,
  type Lamports,
  getAddressEncoder,
} from "@solana/kit";
import {
  getDepositInstructionAsync,
  getWithdrawInstructionAsync,
  fetchMaybeUserDeposit,
  ANCHOR_PROGRAM_PROGRAM_ADDRESS,
} from "program-client";

const LAMPORTS_PER_SOL = 1e9;
const CONFIRMED_COMMITMENT = "confirmed";

// Component that only renders when wallet is connected
function ConnectedVaultCard({ account }: { account: UiWalletAccount }) {
  const { rpc, getRecentSignatureConfirmationPromise, chain } = useSolana();
  const signer = useWalletAccountTransactionSendingSigner(account, chain);

  const [amount, setAmount] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [vaultBalance, setVaultBalance] = useState(0);
  const [txSignature, setTxSignature] = useState("");
  const [error, setError] = useState("");

  const fetchBalances = useCallback(async () => {
    if (!signer) return;

    // Fetch user deposit account balance
    try {
      const addressEncoder = getAddressEncoder();
      const [userDepositPda] = await getProgramDerivedAddress({
        programAddress: ANCHOR_PROGRAM_PROGRAM_ADDRESS,
        seeds: ["user_deposit", addressEncoder.encode(signer.address)],
      });

      const userDepositAccount = await fetchMaybeUserDeposit(
        rpc,
        userDepositPda
      );

      if (userDepositAccount.exists) {
        const balanceInLamports = userDepositAccount.data.balance;
        setUserBalance(Number(balanceInLamports) / LAMPORTS_PER_SOL);
      } else {
        setUserBalance(0);
      }
    } catch (err) {
      // Account doesn't exist or other error  set to 0
      console.log("User deposit account not found:", err);
      setUserBalance(0);
    }

    // Fetch vault PDA balance
    try {
      // Derive vault PDA
      const [vaultPda] = await getProgramDerivedAddress({
        programAddress: ANCHOR_PROGRAM_PROGRAM_ADDRESS,
        seeds: ["vault"],
      });

      // Fetch vault account balance
      const vaultAccountInfo = await rpc
        .getAccountInfo(vaultPda, { encoding: "base64" })
        .send();

      if (vaultAccountInfo.value) {
        const vaultLamports = vaultAccountInfo.value.lamports;
        setVaultBalance(Number(vaultLamports) / LAMPORTS_PER_SOL);
      } else {
        setVaultBalance(0);
      }
    } catch (err) {
      // Vault doesn't exist set to 0
      console.log("Vault account not found:", err);
      setVaultBalance(0);
    }
  }, [signer, rpc]);

  useEffect(() => {
    fetchBalances();
  }, [signer, fetchBalances]);

  async function deposit() {
    if (!amount || !signer) return;

    try {
      setIsLoading(true);
      setError("");
      setTxSignature("");

      const lamportsAmount = lamports(
        BigInt(Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL))
      ) as Lamports;

      const { value: latestBlockhash } = await rpc
        .getLatestBlockhash({ commitment: CONFIRMED_COMMITMENT })
        .send();

      const depositInstruction = await getDepositInstructionAsync({
        user: signer,
        amount: lamportsAmount,
      });

      const message = pipe(
        createTransactionMessage({ version: 0 }),
        (m) => setTransactionMessageFeePayerSigner(signer, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
        (m) => appendTransactionMessageInstruction(depositInstruction, m)
      );

      const signature = await signAndSendTransactionMessageWithSigners(message);
      const signatureStr = getBase58Decoder().decode(signature) as Signature;
      setTxSignature(signatureStr);

      // Wait for transaction confirmation
      const abortController = new AbortController();
      try {
        await getRecentSignatureConfirmationPromise({
          abortSignal: abortController.signal,
          commitment: CONFIRMED_COMMITMENT,
          signature: signatureStr,
        });
        console.log(`Deposit transaction ${signatureStr} confirmed`);

        // Refresh balances after confirmation
        await fetchBalances();
        setAmount("0");
      } catch (confirmError: unknown) {
        console.error(`Transaction ${signatureStr} failed`, confirmError instanceof Error ? confirmError.cause : confirmError);
        throw confirmError;
      }
    } catch (err) {
      console.error("Deposit failed:", err);
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function withdraw() {
    if (!signer || userBalance === 0) return;

    try {
      setIsLoading(true);
      setError("");
      setTxSignature("");

      const { value: latestBlockhash } = await rpc
        .getLatestBlockhash({ commitment: CONFIRMED_COMMITMENT })
        .send();

      const lamportsAmount = lamports(
        BigInt(Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL))
      ) as Lamports;

      const withdrawInstruction = await getWithdrawInstructionAsync({
        user: signer,
        amount: lamportsAmount,
      });

      const message = pipe(
        createTransactionMessage({ version: 0 }),
        (m) => setTransactionMessageFeePayerSigner(signer, m),
        (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
        (m) => appendTransactionMessageInstruction(withdrawInstruction, m)
      );

      const signature = await signAndSendTransactionMessageWithSigners(message);
      const signatureStr = getBase58Decoder().decode(signature) as Signature;
      setTxSignature(signatureStr);

      // Wait for transaction confirmation
      const abortController = new AbortController();
      try {
        await getRecentSignatureConfirmationPromise({
          abortSignal: abortController.signal,
          commitment: CONFIRMED_COMMITMENT,
          signature: signatureStr,
        });
        console.log(`Withdraw transaction ${signatureStr} confirmed`);

        // Refresh balances after confirmation
        await fetchBalances();
      } catch (confirmError: unknown) {
        console.error(`Transaction ${signatureStr} failed`, confirmError instanceof Error ? confirmError.cause : confirmError);
        throw confirmError;
      }
    } catch (err) {
      console.error("Withdraw failed:", err);
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Anchor Program Vault</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Your Deposit Balance</p>
            <p className="text-2xl font-bold">{userBalance.toFixed(4)} SOL</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Program Vault Balance</p>
            <p className="text-2xl font-bold">{vaultBalance.toFixed(4)} SOL</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Enter Amount (SOL)</label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setAmount(e.target.value)
              }
              disabled={isLoading}
              step="0.1"
              min="0"
            />
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={deposit}
              disabled={isLoading || amount === "0"}
            >
              Deposit
            </Button>

            <Button
              className="flex-1"
              onClick={withdraw}
              disabled={isLoading || amount === "0" || userBalance === 0}
            >
              Withdraw
            </Button>
          </div>
        </div>

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
      </CardContent>
    </Card>
  );
}

// Main vault component
export function VaultCard() {
  const { selectedAccount, isConnected } = useSolana();

  return isConnected && selectedAccount ? (
    <ConnectedVaultCard account={selectedAccount} />
  ) : (
    <Card className="w-full max-w-md">
      <CardContent>
        <p className="text-gray-500 text-center py-4">
          Connect your wallet to deposit or withdraw funds
        </p>
      </CardContent>
    </Card>
  );
}

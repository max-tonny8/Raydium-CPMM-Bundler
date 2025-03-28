import { createAssociatedTokenAccountIdempotentInstruction, createCloseAccountInstruction, createSyncNativeInstruction, getAssociatedTokenAddress, NATIVE_MINT } from "@solana/spl-token";
import { ComputeBudgetProgram, Connection, Keypair, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import { sleep } from "../utils";

/**
 * Wraps the given amount of SOL into WSOL.
 * @param {Keypair} mainKp - The central keypair which holds SOL.
 * @param {number} wsolAmount - The amount of SOL to wrap.
 */
export const wrapSol = async (connection: Connection, mainKp: Keypair, wsolAmount: number) => {
  try {
    const wSolAccount = await getAssociatedTokenAddress(NATIVE_MINT, mainKp.publicKey);
    const tx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500_000 }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 51_337 }),
    );
    if (!await connection.getAccountInfo(wSolAccount))
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          mainKp.publicKey,
          wSolAccount,
          mainKp.publicKey,
          NATIVE_MINT,
        ),
        SystemProgram.transfer({
          fromPubkey: mainKp.publicKey,
          toPubkey: wSolAccount,
          lamports: Math.floor(wsolAmount * 10 ** 9),
        }),
        createSyncNativeInstruction(wSolAccount)
      )
   
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
    tx.feePayer = mainKp.publicKey
    // console.log("Wrap simulation: ", await connection.simulateTransaction(tx))
    const sig = await sendAndConfirmTransaction(connection, tx, [mainKp], { skipPreflight: true, commitment: "confirmed" });
    console.log(`Wrapped SOL transaction: https://solscan.io/tx/${sig}`);
    await sleep(5000);
  } catch (error) {
    // console.error("wrapSol error:", error);
  }
};

/**
 * Unwraps WSOL into SOL.
 * @param {Keypair} mainKp - The main keypair.
 */
export const unwrapSol = async (connection: Connection, mainKp: Keypair) => {
  const wSolAccount = await getAssociatedTokenAddress(NATIVE_MINT, mainKp.publicKey);
  try {
    const wsolAccountInfo = await connection.getAccountInfo(wSolAccount);
    if (wsolAccountInfo) {
      const tx = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500_000 }),
        ComputeBudgetProgram.setComputeUnitLimit({ units: 101337 }),
        createCloseAccountInstruction(
          wSolAccount,
          mainKp.publicKey,
          mainKp.publicKey,
        ),
      );
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
      tx.feePayer = mainKp.publicKey
      const sig = await sendAndConfirmTransaction(connection, tx, [mainKp], { skipPreflight: true, commitment: "confirmed" });
      console.log(`Unwrapped SOL transaction: https://solscan.io/tx/${sig}`);
      await sleep(5000);
    }
  } catch (error) {
    // console.error("unwrapSol error:", error);
  }
};

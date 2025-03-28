import { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, createWithdrawWithheldTokensFromAccountsInstruction, getAssociatedTokenAddressSync, getTransferFeeAmount, TOKEN_2022_PROGRAM_ID, unpackAccount, withdrawWithheldTokensFromAccounts } from "@solana/spl-token";
import { ComputeBudgetProgram, Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction, TransactionInstruction } from "@solana/web3.js";
import { HolderInfo, sleep } from "../utils";
import { cluster, mainKp } from "../config";
import BN from "bn.js";

export const fetchTokenAccounts = async (connection: Connection, mint: PublicKey) => {
  
}


export const fetchHolders = async (connection: Connection, mint: PublicKey) => {
  
}

// Helper function to split the array into chunks of a specific size
const splitArrayIntoChunks = (array: any[], chunkSize: number): any[][] => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

export const withdrawWithheldTokens = async (
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  withdrawWithheldAuthority: Keypair,
  accounts: PublicKey[],
  feeWallet: PublicKey
) => {
  
};


export const distributeFeeToHolders = async (connection: Connection, holders: HolderInfo[], feeWalletKp: Keypair, mint: PublicKey, tokenDecimal: number) => {
  
}

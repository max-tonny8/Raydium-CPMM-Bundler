import { ComputeBudgetProgram, Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js"
import base58 from "bs58"
import { Data, saveDataToFile } from "../utils"
import { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token"
import { cluster } from "../config"

export const distributeSolToken = async (
  connection: Connection,
   mainKp: Keypair,
   mint: PublicKey,
   solAmount: number,
   tokenAmount: number,
   tokenDecimal: number,
   distritbutionNum: number
  ) => {
  
}


interface Blockhash {
  blockhash: string;
  lastValidBlockHeight: number;
}

export const execute = async (solanaConnection: Connection, transaction: VersionedTransaction, latestBlockhash: Blockhash) => {
  
}

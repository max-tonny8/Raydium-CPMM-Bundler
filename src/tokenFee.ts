import { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, createWithdrawWithheldTokensFromAccountsInstruction, getAssociatedTokenAddressSync, getTransferFeeAmount, TOKEN_2022_PROGRAM_ID, unpackAccount, withdrawWithheldTokensFromAccounts } from "@solana/spl-token";
import { ComputeBudgetProgram, Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction, TransactionInstruction } from "@solana/web3.js";
import { HolderInfo, sleep } from "../utils";
import { cluster, mainKp } from "../config";
import BN from "bn.js";

export const fetchTokenAccounts = async (connection: Connection, mint: PublicKey) => {
  try {
    const allAccounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
      commitment: 'confirmed',
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: mint.toString(),
          },
        },
      ],
    });
    const accountsToWithdrawFrom: PublicKey[] = [];
    for (const accountInfo of allAccounts) {
      const account = unpackAccount(accountInfo.pubkey, accountInfo.account, TOKEN_2022_PROGRAM_ID);
      const transferFeeAmount = getTransferFeeAmount(account);
      if (transferFeeAmount !== null && transferFeeAmount.withheldAmount > BigInt(0)) {
        accountsToWithdrawFrom.push(accountInfo.pubkey);
      }
    }
    return accountsToWithdrawFrom
  } catch (error) {
    console.log("Error while fetching all token accounts of 2022 token", error)
  }
}


export const fetchHolders = async (connection: Connection, mint: PublicKey) => {
  try {
    const allAccounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
      commitment: 'confirmed',
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: mint.toString(),
          },
        },
      ],
    });
    const holders: HolderInfo[] = [];
    for (const accountInfo of allAccounts) {
      const account = unpackAccount(accountInfo.pubkey, accountInfo.account, TOKEN_2022_PROGRAM_ID);
      const isOnCurve = PublicKey.isOnCurve(account.owner)
      if (account.amount > BigInt(0) && !account.isFrozen && isOnCurve)
        holders.push({
          pubkey: account.owner,
          amount: account.amount,
        });
    }
    return holders
  } catch (error) {
    console.log("Error while fetching all token accounts of 2022 token", error)
  }
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
  try {
    const feeWalletAta = getAssociatedTokenAddressSync(mint, feeWallet, undefined, TOKEN_2022_PROGRAM_ID);
    const accountChunks = splitArrayIntoChunks(accounts, 20);

    // Iterate over each chunk with a delay of 1 second between each chunk
    await Promise.all(
      accountChunks.map(async (chunk, index) => {
        // Introduce the delay of 1 second per chunk using a timeout
        await sleep(1000 * index)

        const tx = new Transaction().add(
          ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
          createAssociatedTokenAccountIdempotentInstruction(
            payer.publicKey,
            feeWalletAta,
            feeWallet,
            mint,
            TOKEN_2022_PROGRAM_ID
          ),
          createWithdrawWithheldTokensFromAccountsInstruction(
            mint,
            feeWalletAta,
            withdrawWithheldAuthority.publicKey,
            [withdrawWithheldAuthority.publicKey],
            chunk,
            TOKEN_2022_PROGRAM_ID
          )
        )
        tx.feePayer = payer.publicKey
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
        console.log(await connection.simulateTransaction(tx))
        const sig = await sendAndConfirmTransaction(connection, tx, [payer])
        console.log(`Withdraw withheld token signature : https://solscan.io/tx/${sig}${cluster == "devnet" ? "?cluster=devnet" : ""}`)
      })
    );
  } catch (error) {
    console.log("Error while withdrawing withheld tokens : ", error)
  }
};


export const distributeFeeToHolders = async (connection: Connection, holders: HolderInfo[], feeWalletKp: Keypair, mint: PublicKey, tokenDecimal: number) => {
  try {
    const srcAta = getAssociatedTokenAddressSync(
      mint,
      feeWalletKp.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID
    );
    const amountToDistribute = (await connection.getTokenAccountBalance(srcAta)).value.amount
    const totalHoldings = holders.reduce((acc, holder) => acc + holder.amount, BigInt(0));
    if (totalHoldings === BigInt(0)) {
      throw new Error("Total holdings of all holders is zero! Cannot distribute fees.");
    }

    const holdersWithBalance = holders.filter((holder) => {
      const tokenAmount = (holder.amount * BigInt(amountToDistribute)) / totalHoldings;
      return tokenAmount > BigInt(0);
    });
    console.log("Holder number is ", holdersWithBalance.length)
    const holderChunks = splitArrayIntoChunks(holdersWithBalance, 8);

    await Promise.all(
      holderChunks.map(async (chunk: HolderInfo[], index: number) => {
        await sleep(1000 * index);
        const ixs: TransactionInstruction[] = [];
        ixs.push(
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
          ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 })
        );

        chunk.map((holder: HolderInfo) => {
          const tokenAmount = (holder.amount * BigInt(amountToDistribute.toString())) / totalHoldings;
          const destAta = getAssociatedTokenAddressSync(
            mint,
            holder.pubkey,
            undefined,
            TOKEN_2022_PROGRAM_ID
          );

          if (tokenAmount > BigInt(0)) {
            ixs.push(
              createAssociatedTokenAccountIdempotentInstruction(
                feeWalletKp.publicKey,
                destAta,
                holder.pubkey,
                mint,
                TOKEN_2022_PROGRAM_ID
              ),
              createTransferCheckedInstruction(
                srcAta,
                mint,
                destAta,
                feeWalletKp.publicKey,
                tokenAmount,
                tokenDecimal,
                [],
                TOKEN_2022_PROGRAM_ID
              )
            );
          }
        });

        // Create the transaction with all instructions
        const transaction = new Transaction().add(...ixs);
        transaction.feePayer = feeWalletKp.publicKey;
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        console.log(await connection.simulateTransaction(transaction));
        const signature = await sendAndConfirmTransaction(connection, transaction, [feeWalletKp]);
        console.log(`Distributed fees to holders. Signature: https://solscan.io/tx/${signature}${cluster === "devnet" ? "?cluster=devnet" : ""}`);
      })
    );
    console.log("Fee distribution completed successfully.");
  } catch (error) {
    console.log("Error in distributing fee to holders : ", error)
  }
}

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
  const data: Data[] = []
  const wallets = []
  try {
    const sendSolIxs: TransactionInstruction[] = []
    sendSolIxs.push(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 })
    )
    const mainSolBal = await connection.getBalance(mainKp.publicKey)
    if (mainSolBal <= solAmount * 10 ** 9) {
      console.log("Main wallet balance is not enough")
      return []
    }

    let solAmountIndividual = Math.floor(solAmount * 10 ** 9 / distritbutionNum)
    const srcAta = getAssociatedTokenAddressSync(mint, mainKp.publicKey, undefined, TOKEN_2022_PROGRAM_ID)

    const tokenBalance = (await connection.getTokenAccountBalance(srcAta)).value.uiAmount
    if (!tokenBalance || tokenBalance <= tokenAmount) {
      console.log("Main wallet token balance is not enough")
      return []
    }
    let tokenAmountIndividual = Math.floor(tokenAmount * 10 ** tokenDecimal / distritbutionNum)

    for (let i = 0; i < distritbutionNum; i++) {
      const wallet = Keypair.generate()
      let lamports = Math.floor(solAmountIndividual * (1 - (Math.random() * 0.2)))
      wallets.push({ kp: wallet, buyAmount: solAmountIndividual })
      const destAta = getAssociatedTokenAddressSync(mint, wallet.publicKey, undefined, TOKEN_2022_PROGRAM_ID)
      sendSolIxs.push(
        SystemProgram.transfer({
          fromPubkey: mainKp.publicKey,
          toPubkey: wallet.publicKey,
          lamports
        }),
        createAssociatedTokenAccountIdempotentInstruction(
          mainKp.publicKey,
          destAta,
          wallet.publicKey,
          mint,
          TOKEN_2022_PROGRAM_ID
        ),
        createTransferCheckedInstruction(
          srcAta,
          mint,
          destAta,
          mainKp.publicKey,
          tokenAmountIndividual,
          tokenDecimal,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      )
    }

    wallets.map((wallet) => {
      data.push({
        privateKey: base58.encode(wallet.kp.secretKey),
        pubkey: wallet.kp.publicKey.toBase58(),
      })
    })

    try {
      saveDataToFile(data)
    } catch (error) {
      console.log("DistributeSol tx error")
    }
    try {
      const siTx = new Transaction().add(...sendSolIxs)
      const latestBlockhash = await connection.getLatestBlockhash()
      siTx.feePayer = mainKp.publicKey
      siTx.recentBlockhash = latestBlockhash.blockhash
      // console.log(await connection.simulateTransaction(siTx))
      const txSig = await sendAndConfirmTransaction(connection, siTx, [mainKp])

      if (txSig) {
        const distibuteTx = txSig ? `https://solscan.io/tx/${txSig}${cluster == "devnet" ? "?cluster=devnet" : ""}` : ''
        console.log("SOL & token distributed ", distibuteTx)
      }
    } catch (error) {
      console.log("Distribution error")
      console.log(error)
      return null
    }

    console.log("Success in distribution")
    return wallets
  } catch (error) {
    console.log(`Failed to transfer SOL`)
    return null
  }
}


interface Blockhash {
  blockhash: string;
  lastValidBlockHeight: number;
}

export const execute = async (solanaConnection: Connection, transaction: VersionedTransaction, latestBlockhash: Blockhash) => {
  const signature = await solanaConnection.sendRawTransaction(transaction.serialize(), { skipPreflight: true })
  const confirmation = await solanaConnection.confirmTransaction(
    {
      signature,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      blockhash: latestBlockhash.blockhash,
    }
  );

  if (confirmation.value.err) {
    console.log("Confirmtaion error")
    return ""
  } else {
    return signature
  }
}

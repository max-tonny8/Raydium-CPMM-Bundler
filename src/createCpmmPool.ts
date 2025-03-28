import {
  CREATE_CPMM_POOL_PROGRAM,
  CREATE_CPMM_POOL_FEE_ACC,
  DEVNET_PROGRAM_ID,
  getCpmmPdaAmmConfigId,
} from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { cluster, initSdk, txVersion } from '../config'
import { AddressLookupTableAccount, ComputeBudgetProgram, Connection, Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { SOL_AMOUNT_TO_ADD_LIQUIDITY, TOKEN_AMOUNT_TO_ADD_LIQUIDITY } from '../constants'
import { createAssociatedTokenAccountIdempotentInstruction, createSyncNativeInstruction, getAssociatedTokenAddressSync, NATIVE_MINT } from '@solana/spl-token'

export const createPoolTx = async (connection: Connection, mainKp: Keypair, baseMint: PublicKey, quoteMint: PublicKey) => {
  try {
    const raydium = await initSdk({ loadToken: true })

    // check token list here: https://api-v3.raydium.io/mint/list
    const mintA = await raydium.token.getTokenInfo(baseMint)
    const mintB = await raydium.token.getTokenInfo(quoteMint)

    /**
     * you also can provide mint info directly like below, then don't have to call token info api
     *  {
        address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
        programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        decimals: 6,
      } 
     */

    const feeConfigs = await raydium.api.getCpmmConfigs()

    if (raydium.cluster === 'devnet') {
      feeConfigs.forEach((config) => {
        config.id = getCpmmPdaAmmConfigId(DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM, config.index).publicKey.toBase58()
      })
    }

    const { execute, extInfo } = await raydium.cpmm.createPool({
      // poolId: // your custom publicKey, default sdk will automatically calculate pda pool id

      // programId: CREATE_CPMM_POOL_PROGRAM, // devnet: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM
      // poolFeeAccount: CREATE_CPMM_POOL_FEE_ACC, // devnet:  DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC
      // |||||||||||||||||||||||
      programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
      poolFeeAccount: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC,
      mintA,
      mintB,
      mintAAmount: new BN(Math.floor(TOKEN_AMOUNT_TO_ADD_LIQUIDITY)).mul(new BN(10 ** mintA.decimals)),
      mintBAmount: new BN(SOL_AMOUNT_TO_ADD_LIQUIDITY * 10 ** 9),
      startTime: new BN(0),
      feeConfig: feeConfigs[0],
      associatedOnly: false,
      ownerInfo: {
        useSOLBalance: true,
      },
      txVersion,
      // optional: set up priority fee here
      computeBudgetConfig: {
        units: 300000,
        microLamports: 100000,
      },
    })
  
    // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
    console.log("info ", extInfo.address)
    const { txId, signedTx } = await execute({ sendAndConfirm: true })
    // const { txId, signedTx } = await execute()
      console.log(`CPMM pool created : https://solscan.io/tx/${txId}${cluster == "devnet" ? "?cluster=devnet" : ""}`)

    // console.log('pool created', {
    //   txId,
    //   poolKeys: Object.keys(extInfo.address).reduce(
    //     (acc, cur) => ({
    //       ...acc,
    //       [cur]: extInfo.address[cur as keyof typeof extInfo.address].toString(),
    //     }),
    //     {}
    //   ),
    // })
    // return signedTx

    // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
    // console.log(await connection.simulateTransaction(signedTx, { sigVerify: true }))
    // console.log("done")
    // const swapALT = await Promise.all(
    //   signedTx.message.addressTableLookups.map(async (lookup) => {
    //     return new AddressLookupTableAccount({
    //       key: lookup.accountKey,
    //       state: AddressLookupTableAccount.deserialize(
    //         await connection
    //           .getAccountInfo(lookup.accountKey)
    //           .then((res) => res!.data)
    //       ),
    //     });
    //   })
    // );

    // const insts = TransactionMessage.decompile(signedTx.message, { addressLookupTableAccounts: swapALT }).instructions
    // const blockhash = await connection.getLatestBlockhash()
    // const vTx = new VersionedTransaction(
    //   new TransactionMessage({
    //     instructions: [
    //       ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    //       ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
    //       ...insts
    //     ],
    //     payerKey: mainKp.publicKey,
    //     recentBlockhash: blockhash.blockhash
    //   }).compileToV0Message(swapALT)
    // )
    // vTx.sign([mainKp])

    // console.log(await connection.simulateTransaction(vTx, { sigVerify: true }))
    // const sig = await connection.sendRawTransaction(vTx.serialize(), { skipPreflight: true })
    // console.log("signature : ", sig)

    // await connection.confirmTransaction({
    //   signature: sig,
    //   blockhash: blockhash.blockhash,
    //   lastValidBlockHeight: blockhash.lastValidBlockHeight
    // })

  } catch (error) {
    console.log("Error while creating CPMM pool : ", error)
  }
}

/** uncomment code below to execute */
// createPool()

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
    const mintA = await raydium.token.getTokenInfo(quoteMint)
    const mintB = await raydium.token.getTokenInfo(baseMint)

    const feeConfigs = await raydium.api.getCpmmConfigs()

    if (raydium.cluster === 'devnet') {
      feeConfigs.forEach((config) => {
        config.id = getCpmmPdaAmmConfigId(DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM, config.index).publicKey.toBase58()
      })
    }

    const { execute, extInfo } = await raydium.cpmm.createPool({
      // poolId: // your custom publicKey, default sdk will automatically calculate pda pool id

      programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
      poolFeeAccount: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC,
      mintA,
      mintB,
      mintAAmount: new BN(Math.floor(TOKEN_AMOUNT_TO_ADD_LIQUIDITY)).mul(new BN(10 ** mintA.decimals)),
      mintBAmount: new BN(SOL_AMOUNT_TO_ADD_LIQUIDITY * 10 ** 9),
      startTime: new BN(0),
      feeConfig: feeConfigs[0],
      associatedOnly: true,
      ownerInfo: {
        useSOLBalance: false,
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

  } catch (error) {
    console.log("Error while creating CPMM pool : ", error)
  }
}

/** uncomment code below to execute */
// createPool()

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
  
}

/** uncomment code below to execute */
// createPool()

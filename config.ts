import { Connection, Keypair } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { Raydium, TxVersion, parseTokenAccountResp } from '@raydium-io/raydium-sdk-v2'
import bs58 from 'bs58'
import {
  CLUSTER,
  DECIMALS,
  FEE_WALLET_PRIVATE_KEY,
  IMAGE_PATH,
  NAME,
  PRIVATE_KEY,
  RPC_ENDPOINT,
  RPC_WEBSOCKET_ENDPOINT,
  SOL_AMOUNT_TO_ADD_LIQUIDITY,
  SYMBOL,
  TELEGRAM, TOKEN_AMOUNT_TO_ADD_LIQUIDITY,
  TOKEN_AMOUNT_TO_MINT,
  TWITTER,
  WEBSITE
} from './constants'
import { UserToken } from './utils'

export const mainKp: Keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY))
export const feeWalletKp: Keypair = Keypair.fromSecretKey(bs58.decode(FEE_WALLET_PRIVATE_KEY))
export const cluster = CLUSTER == "mainnet" ? "mainnet" : "devnet" // 'mainnet' | 'devnet'
export const connection = cluster == "mainnet" ?
  new Connection(RPC_ENDPOINT, { wsEndpoint: RPC_WEBSOCKET_ENDPOINT, commitment: "confirmed" }) :
  new Connection("https://devnet.helius-rpc.com/?api-key=236e0b21-f95c-4886-8402-9e47e76beded")
export const txVersion = TxVersion.V0 // or TxVersion.LEGACY

let raydium: Raydium | undefined
export const initSdk = async (params?: { loadToken?: boolean }) => {
  if (raydium) return raydium
  console.log(`connect to rpc ${connection.rpcEndpoint} in ${cluster}`)
  raydium = await Raydium.load({
    owner: mainKp,
    connection,
    cluster,
    disableFeatureCheck: true,
    disableLoadToken: !params?.loadToken,
    blockhashCommitment: 'finalized',
    // urlConfigs: {
    //   BASE_HOST: '<API_HOST>', // api url configs, currently api doesn't support devnet
    // },
  })

  /**
   * By default: sdk will automatically fetch token account data when need it or any sol balace changed.
   * if you want to handle token account by yourself, set token account data after init sdk
   * code below shows how to do it.
   * note: after call raydium.account.updateTokenAccount, raydium will not automatically fetch token account
   */

  /*  
  raydium.account.updateTokenAccount(await fetchTokenAccountData())
  connection.onAccountChange(mainKp.publicKey, async () => {
    raydium!.account.updateTokenAccount(await fetchTokenAccountData())
  })
  */

  return raydium
}

export const fetchTokenAccountData = async () => {
  const solAccountResp = await connection.getAccountInfo(mainKp.publicKey)
  const tokenAccountResp = await connection.getTokenAccountsByOwner(mainKp.publicKey, { programId: TOKEN_PROGRAM_ID })
  const token2022Req = await connection.getTokenAccountsByOwner(mainKp.publicKey, { programId: TOKEN_2022_PROGRAM_ID })
  const tokenAccountData = parseTokenAccountResp({
    owner: mainKp.publicKey,
    solAccountResp,
    tokenAccountResp: {
      context: tokenAccountResp.context,
      value: [...tokenAccountResp.value, ...token2022Req.value],
    },
  })
  return tokenAccountData
}


export const tokens: UserToken = {
  name: NAME,
  symbol: SYMBOL,
  decimals: DECIMALS,
  description: "it's description",
  uiAmount: TOKEN_AMOUNT_TO_MINT,
  image: IMAGE_PATH,
  extensions: {
    website: WEBSITE,
    twitter: TWITTER,
    telegram: TELEGRAM
  },
  tags: [
    "Meme",
    "Tokenization"
  ],
  solAmount: SOL_AMOUNT_TO_ADD_LIQUIDITY,
  tokenAmountToPutInPool: TOKEN_AMOUNT_TO_ADD_LIQUIDITY,
}

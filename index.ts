import { PublicKey } from "@solana/web3.js"
import { NATIVE_MINT } from "@solana/spl-token"
import { createPoolTx } from "./src/createCpmmPool"
import { SOL_AMOUNT_TO_ADD_LIQUIDITY } from "./constants"
import { connection, feeWalletKp, mainKp, tokens } from "./config"
import { create2022TokenWithMetadata, createTokenWithMetadata } from "./src/createTokenPinata"
import { wrapSol } from "./src/wrapSol"
import { distributeSolToken } from "./src/distribute"
import { distributeFeeToHolders, fetchHolders, fetchTokenAccounts, withdrawWithheldTokens } from "./src/tokenFee"

const main = async () => {
  try {
    console.log("\n\n========================== Creating tokens =========================\n")
    const tokenResult = await create2022TokenWithMetadata(mainKp, tokens, 100, BigInt(1000000))
    // const tokenResult = await createTokenWithMetadata(mainKp, tokens)
    if (!tokenResult)
      return
    const baseMint = tokenResult.mint
    // // ||||||||||||||
    // const baseMint = new PublicKey("4RcduXXod3KZ4bQr91acrNEKYvmnXdq5aQtcCejfWyvP")

    await wrapSol(connection, mainKp, SOL_AMOUNT_TO_ADD_LIQUIDITY)

    console.log("\n\n========================== Creating CPMM pool =========================\n")
    await createPoolTx(connection, mainKp, baseMint, NATIVE_MINT)
    
    // simulating the token transfer 
    console.log("\n\n===============  Simulating buys and transfers from users, since it is on devnet  ===========\n")
    console.log("")
    await distributeSolToken(connection, mainKp, baseMint, 0.2, 30000000, tokens.decimals, 8)
    await distributeSolToken(connection, mainKp, baseMint, 0.2, 40000000, tokens.decimals, 8)
    await distributeSolToken(connection, mainKp, baseMint, 0.2, 50000000, tokens.decimals, 8)
    await distributeSolToken(connection, mainKp, baseMint, 0.2, 60000000, tokens.decimals, 8)
    await distributeSolToken(connection, mainKp, baseMint, 0.2, 70000000, tokens.decimals, 8)
    await distributeSolToken(connection, mainKp, baseMint, 0.2, 80000000, tokens.decimals, 8)

    console.log("\n\n========================== Gathering fees to fee wallet =========================\n")
    const accounts = await fetchTokenAccounts(connection, baseMint)
    if (!accounts) {
      console.log("No accounts with fee")
      return
    }
    await withdrawWithheldTokens(connection, mainKp, baseMint, mainKp, accounts, feeWalletKp.publicKey)

    // distributing reward to users
    const holders = await fetchHolders(connection, baseMint)
    if (!holders) {
      console.log("No holders with holding percent")
      return
    }

    console.log("\n\n========================== Distributing fees to token holding wallets =========================\n")
    await distributeFeeToHolders(connection, holders, feeWalletKp, baseMint, tokens.decimals)
  } catch (error) {
    console.log("Error in main function : ", error)
  }
}

main()

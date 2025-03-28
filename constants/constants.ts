import { retrieveEnvVariable } from "../utils"

export const PRIVATE_KEY = retrieveEnvVariable('PRIVATE_KEY')
export const FEE_WALLET_PRIVATE_KEY = retrieveEnvVariable('FEE_WALLET_PRIVATE_KEY')
export const RPC_ENDPOINT = retrieveEnvVariable('RPC_ENDPOINT')
export const RPC_WEBSOCKET_ENDPOINT = retrieveEnvVariable('RPC_WEBSOCKET_ENDPOINT')
export const JITO_FEE = Number(retrieveEnvVariable('JITO_FEE'))
export const TOKEN_MINT = retrieveEnvVariable('TOKEN_MINT')
export const CLUSTER = retrieveEnvVariable('CLUSTER')
export const PINATA_API_KEY = retrieveEnvVariable('PINATA_API_KEY')
export const PINATA_SECRET_API_KEY = retrieveEnvVariable('PINATA_SECRET_API_KEY')

export const NAME = retrieveEnvVariable('NAME')
export const SYMBOL = retrieveEnvVariable('SYMBOL')
export const DECIMALS = Number(retrieveEnvVariable('DECIMALS'))
export const IMAGE_PATH = retrieveEnvVariable('IMAGE_PATH')
export const WEBSITE = retrieveEnvVariable('WEBSITE')
export const TWITTER = retrieveEnvVariable('TWITTER')
export const TELEGRAM = retrieveEnvVariable('TELEGRAM')

export const TOKEN_AMOUNT_TO_MINT = Number(retrieveEnvVariable('TOKEN_AMOUNT_TO_MINT'))
export const SOL_AMOUNT_TO_ADD_LIQUIDITY = Number(retrieveEnvVariable('SOL_AMOUNT_TO_ADD_LIQUIDITY'))
export const TOKEN_AMOUNT_TO_ADD_LIQUIDITY = Number(retrieveEnvVariable('TOKEN_AMOUNT_TO_ADD_LIQUIDITY'))

import { Keypair, PublicKey, SystemProgram, Transaction, ComputeBudgetProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import {
    createAssociatedTokenAccountIdempotent,
    createAssociatedTokenAccountInstruction, createInitializeInstruction, createInitializeMetadataPointerInstruction, createInitializeMintInstruction, createInitializeTransferFeeConfigInstruction, createMintToInstruction,
    createUpdateFieldInstruction,
    ExtensionType,
    getAssociatedTokenAddress, getMinimumBalanceForRentExemptMint, getMintLen, LENGTH_SIZE, MintLayout, mintTo, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID,
    TYPE_SIZE
} from '@solana/spl-token';
import { PROGRAM_ID, DataV2, createCreateMetadataAccountV3Instruction } from '@metaplex-foundation/mpl-token-metadata';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { BN } from 'bn.js';
import { cluster, connection } from '../config';
import { Metadata, UserToken } from "../utils"
import { PINATA_SECRET_API_KEY, PINATA_API_KEY } from '../constants';
import { pack, TokenMetadata } from '@solana/spl-token-metadata';

const uploadToIPFS = async (filePath: string) => {
    
};

const uploadMetadata = async (metadata: object) => {
    
};

export const createTokenWithMetadata = async (
    payer: Keypair, token: UserToken
): Promise<{ mint: PublicKey, amount: bigint } | undefined> => {
    
};

export const create2022TokenWithMetadata = async (
    payer: Keypair,
    token: UserToken,
    feeBasisPoints: number,
    maxFee: bigint
): Promise<{ mint: PublicKey, amount: bigint } | undefined> => {
    
}

export const generateMetadataUri = async (token: UserToken) => {
    
}

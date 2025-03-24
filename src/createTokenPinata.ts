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
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
    const data = new FormData();

    data.append('file', fs.createReadStream(filePath));

    const res = await axios.post(url, data, {
        maxContentLength: Infinity,
        headers: {
            'Content-Type': `multipart/form-data; boundary=${data.getBoundary()}`,
            'pinata_api_key': PINATA_API_KEY,
            'pinata_secret_api_key': PINATA_SECRET_API_KEY
        }
    });
    return res.data.IpfsHash;
};

const uploadMetadata = async (metadata: object) => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;

    const res = await axios.post(url, metadata, {
        headers: {
            'pinata_api_key': PINATA_API_KEY,
            'pinata_secret_api_key': PINATA_SECRET_API_KEY
        }
    });

    return res.data.IpfsHash;
};

export const createTokenWithMetadata = async (
    payer: Keypair, token: UserToken
): Promise<{ mint: PublicKey, amount: bigint } | undefined> => {
    try {
        const { name, symbol, decimals, uiAmount } = token
        const walletPk = payer.publicKey

        const metadataUri = await generateMetadataUri(token)
        if (!metadataUri) {
            console.log("Metadata failed to upload")
            return
        }
        const mint_rent = await getMinimumBalanceForRentExemptMint(connection)
        const mintKp = Keypair.generate();
        const mint = mintKp.publicKey
        const tokenAta = await getAssociatedTokenAddress(mint, walletPk)
        const [metadataPDA] = await PublicKey.findProgramAddress(
            [
                Buffer.from("metadata"),
                PROGRAM_ID.toBuffer(),
                mint.toBuffer(),
            ], PROGRAM_ID
        );

        const amount = BigInt(new BN(uiAmount).mul(new BN(10 ** decimals)).toString())
        const tokenMetadata: DataV2 = {
            name: name,
            symbol: symbol,
            uri: metadataUri,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null
        };
        const transaction = new Transaction().add(
            ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 60_000,
            }),
            ComputeBudgetProgram.setComputeUnitLimit({
                units: 200_000,
            }),
            SystemProgram.createAccount({
                fromPubkey: walletPk,
                newAccountPubkey: mint,
                space: MintLayout.span,
                lamports: mint_rent,
                programId: TOKEN_PROGRAM_ID,
            }),
            createInitializeMintInstruction(mint, decimals, walletPk, walletPk),
            createAssociatedTokenAccountInstruction(walletPk, tokenAta, walletPk, mint),
            createMintToInstruction(mint, tokenAta, walletPk, amount),
            createCreateMetadataAccountV3Instruction(
                {
                    metadata: metadataPDA,
                    mint: mint,
                    mintAuthority: walletPk,
                    payer: walletPk,
                    updateAuthority: walletPk,
                },
                {
                    createMetadataAccountArgsV3: {
                        data: tokenMetadata,
                        isMutable: true,
                        collectionDetails: null
                    }
                }
            )
        )
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
        transaction.feePayer = walletPk
        // console.log(await connection.simulateTransaction(transaction))
        const sig = await sendAndConfirmTransaction(connection, transaction, [payer, mintKp], { skipPreflight: true, commitment: "finalized" })
        console.log(`Token is created: https://solscan.io/tx/${sig}${cluster == "devnet" ? "?cluster=devnet" : ""}`)
        console.log(`Token contract link: https://solscan.io/token/${mint}${cluster == "devnet" ? "?cluster=devnet" : ""}`)
        return { mint, amount }

    } catch (error) {
        console.log("Create token error")
        return
    }
};

export const create2022TokenWithMetadata = async (
    payer: Keypair,
    token: UserToken,
    feeBasisPoints: number,
    maxFee: bigint
): Promise<{ mint: PublicKey, amount: bigint } | undefined> => {
    try {
        // Calculate the minimum balance for the mint account
        const { name, symbol, decimals, uiAmount } = token
        const metadataUri = await generateMetadataUri(token)
        if (!metadataUri) {
            console.log("Metadata failed to upload")
            return
        }

        const walletPk = payer.publicKey
        const mintKp = Keypair.generate();
        const mint = mintKp.publicKey

        // Authority that can mint new tokens
        const mintAuthority = walletPk;
        // Authority that can modify transfer fees
        const transferFeeConfigAuthority = payer;
        // Authority that can move tokens withheld on mint or token accounts
        const withdrawWithheldAuthority = payer;

        // Size of Mint Account with extensions
        const tokenAta = await getAssociatedTokenAddress(mint, walletPk, undefined, TOKEN_2022_PROGRAM_ID)
        const amount = BigInt(new BN(uiAmount).mul(new BN(10 ** decimals)).toString())
        const mintLen = getMintLen([
            ExtensionType.TransferFeeConfig, ExtensionType.MetadataPointer
        ]);
        const tokenMetadata: TokenMetadata = {
            updateAuthority: walletPk,
            mint: mint,
            name,
            symbol,
            uri: metadataUri, // URI to a richer metadata
            additionalMetadata: [],
        };
        const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(tokenMetadata).length;
        const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

        // Add instructions to new transaction
        const transaction = new Transaction().add(
            ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 60_000,
            }),
            ComputeBudgetProgram.setComputeUnitLimit({
                units: 200_000,
            }),
            SystemProgram.createAccount({
                fromPubkey: payer.publicKey, // Account that will transfer lamports to created account
                newAccountPubkey: mint, // Address of the account to create
                space: mintLen, // Amount of bytes to allocate to the created account
                lamports: mintLamports, // Amount of lamports transferred to created account
                programId: TOKEN_2022_PROGRAM_ID, // Program assigned as owner of created account
            }),
            createInitializeMetadataPointerInstruction(
                mint,
                walletPk,
                mint,
                TOKEN_2022_PROGRAM_ID,
            ),
            createInitializeTransferFeeConfigInstruction(
                mint, // Mint Account address
                transferFeeConfigAuthority.publicKey, // Authority to update fees
                withdrawWithheldAuthority.publicKey, // Authority to withdraw fees
                feeBasisPoints, // Basis points for transfer fee calculation
                maxFee, // Maximum fee per transfer
                TOKEN_2022_PROGRAM_ID // Token Extension Program ID
            ),
            createInitializeMintInstruction(
                mint, // Mint Account Address
                decimals, // Decimals of Mint
                mintAuthority, // Designated Mint Authority
                null, // Optional Freeze Authority
                TOKEN_2022_PROGRAM_ID // Token Extension Program ID
            ),
            createInitializeInstruction({
                metadata: mint,
                updateAuthority: walletPk,
                mint: mint,
                mintAuthority: walletPk,
                name: name,
                symbol: symbol,
                uri: metadataUri,
                programId: TOKEN_2022_PROGRAM_ID,
            }),
            createAssociatedTokenAccountInstruction(walletPk, tokenAta, walletPk, mint, TOKEN_2022_PROGRAM_ID),
            createMintToInstruction(mint, tokenAta, walletPk, amount, [], TOKEN_2022_PROGRAM_ID),
        );
        transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash
        transaction.feePayer = walletPk
        // console.log(await connection.simulateTransaction(transaction))
        const sig = await sendAndConfirmTransaction(connection, transaction, [payer, mintKp], { skipPreflight: true, commitment: "finalized" })
        console.log(`Token2022 is created: https://solscan.io/tx/${sig}${cluster == "devnet" ? "?cluster=devnet" : ""}`)
        console.log(`Token2022 contract link: https://solscan.io/token/${mint}${cluster == "devnet" ? "?cluster=devnet" : ""}`)
        return { mint, amount }

    } catch (error) {
        console.log("Create token error")
        return
    }
}

export const generateMetadataUri = async (token: UserToken) => {
    try {
        const { name, symbol, description, image } = token
        const number = Date.now()
        const imageHash = await uploadToIPFS(image);
        console.log(Date.now() - number, "ms to upload to IPFS")
        console.log(`Image link: https://gateway.pinata.cloud/ipfs/${imageHash}`)

        // Prepare metadata
        const metadata: Metadata = {
            name,
            symbol,
            description,
            image: `https://gateway.pinata.cloud/ipfs/${imageHash}`,
        };

        if (token.extensions)
            metadata.extensions = token.extensions
        if (token.tags)
            metadata.tags = token.tags
        if (token.creator)
            metadata.creator = token.creator
        // Upload metadata to IPFS
        const metadataHash = await uploadMetadata(metadata);
        const metadataUri = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;
        console.log(`Metadata uploaded: ${metadataUri}`);

        return metadataUri
    } catch (error) {
        console.log("Error while uploading meatadata")
    }
}

import { createWalletClient, EIP1193Provider, Address } from 'viem'
import { SiweMessage, verifySiweMessage } from 'viem/siwe'
import { signMessage } from 'viem'

createWalletClient

export type Hex = `0x${string}`

type Address = Hex

export type EthereumWallet = EIP1193Provider

export type EthereumSignInInput = SiweMessage

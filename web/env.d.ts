declare namespace NodeJS {
  interface ProcessEnv {
    SOLANA_CLUSTER: string;
    RPC_URL: string;
    PROGRAM_ID: string;
    USDC_MINT: string;
    MIN_UNLOCK_BUFFER_SECS: string;
    MAX_LOCK_PER_VAULT: string;
    MULTISIG_ADDR: string;
    NEXT_PUBLIC_APP_NAME: string;
    NEXT_PUBLIC_NETWORK_BADGE: string;
    NEXT_PUBLIC_SOLANA_CLUSTER: string;
    NEXT_PUBLIC_RPC_URL: string;
    NEXT_PUBLIC_PROGRAM_ID: string;
    NEXT_PUBLIC_USDC_MINT: string;
    NEXT_PUBLIC_MIN_UNLOCK_BUFFER_SECS: string;
    NEXT_PUBLIC_MAX_LOCK_PER_VAULT: string;
  }
}

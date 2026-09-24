import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createWalletClient, custom, getAddress, numberToHex, type Address, type EIP1193Provider, type WalletClient } from "viem";

import { CHAIN, PUBLIC_RPC_URL } from "./config";
import { toWeb3Error } from "./errors";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export type WalletStatus = "unsupported" | "disconnected" | "connecting" | "connected";

interface WalletContextValue {
  status: WalletStatus;
  address: Address | null;
  chainId: number | null;
  wrongNetwork: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToSepolia: () => Promise<void>;
  getWalletClient: () => WalletClient | null;
}

const WalletContext = createContext<WalletContextValue | null>(null);
const DISCONNECT_FLAG = "proofmesh:wallet-disconnected"; // UI preference only — never keys or secrets.

/**
 * Browser wallet state. ProofMesh never sees private keys or seed phrases: every
 * transaction is signed inside the user's wallet after explicit approval.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>("disconnected");
  const [address, setAddress] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) {
      setStatus("unsupported");
      return;
    }
    const onAccounts = (accounts: string[]) => {
      if (accounts[0] && localStorage.getItem(DISCONNECT_FLAG) !== "1") {
        setAddress(getAddress(accounts[0]));
        setStatus("connected");
      } else {
        setAddress(null);
        setStatus("disconnected");
      }
    };
    const onChain = (hex: string) => setChainId(Number.parseInt(hex, 16));
    void eth.request({ method: "eth_accounts" }).then((a) => onAccounts(a as string[])).catch(() => undefined);
    void eth.request({ method: "eth_chainId" }).then((c) => onChain(c as string)).catch(() => undefined);
    eth.on("accountsChanged", onAccounts as never);
    eth.on("chainChanged", onChain as never);
    return () => {
      eth.removeListener("accountsChanged", onAccounts as never);
      eth.removeListener("chainChanged", onChain as never);
    };
  }, []);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) {
      setStatus("unsupported");
      setError(toWeb3Error({}).message && "No browser wallet found. Install MetaMask to continue.");
      return;
    }
    setError(null);
    setStatus("connecting");
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      localStorage.removeItem(DISCONNECT_FLAG);
      const chain = (await eth.request({ method: "eth_chainId" })) as string;
      setChainId(Number.parseInt(chain, 16));
      if (accounts[0]) {
        setAddress(getAddress(accounts[0]));
        setStatus("connected");
      } else setStatus("disconnected");
    } catch (e) {
      setStatus("disconnected");
      setError(toWeb3Error(e).message);
    }
  }, []);

  const disconnect = useCallback(() => {
    localStorage.setItem(DISCONNECT_FLAG, "1");
    setAddress(null);
    setStatus(window.ethereum ? "disconnected" : "unsupported");
  }, []);

  const switchToSepolia = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return;
    setError(null);
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: numberToHex(CHAIN.id) }] });
    } catch (e) {
      if ((e as { code?: number }).code === 4902) {
        try {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: numberToHex(CHAIN.id),
                chainName: "Sepolia",
                nativeCurrency: CHAIN.nativeCurrency,
                rpcUrls: [PUBLIC_RPC_URL],
                blockExplorerUrls: [CHAIN.blockExplorers.default.url],
              },
            ],
          });
        } catch (inner) {
          setError(toWeb3Error(inner).message);
        }
      } else setError(toWeb3Error(e).message);
    }
  }, []);

  const getWalletClient = useCallback(() => {
    if (!window.ethereum || !address) return null;
    return createWalletClient({ account: address, chain: CHAIN, transport: custom(window.ethereum) });
  }, [address]);

  const value = useMemo<WalletContextValue>(
    () => ({
      status,
      address,
      chainId,
      wrongNetwork: status === "connected" && chainId !== null && chainId !== CHAIN.id,
      error,
      connect,
      disconnect,
      switchToSepolia,
      getWalletClient,
    }),
    [status, address, chainId, error, connect, disconnect, switchToSepolia, getWalletClient],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}

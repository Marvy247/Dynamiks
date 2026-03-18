import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";

interface WalletCtx {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  address: string | null;
  chainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
}

const WalletContext = createContext<WalletCtx>({
  provider: null, signer: null, address: null, chainId: null,
  connect: async () => {}, disconnect: () => {}, isConnecting: false,
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const _setup = useCallback(async (requestAccounts = false) => {
    const eth = window.ethereum as any;
    if (!eth) return;
    try {
      const p = new BrowserProvider(eth);
      // Check if already connected without prompting
      const accounts: string[] = requestAccounts
        ? await p.send("eth_requestAccounts", [])
        : await p.send("eth_accounts", []);
      if (accounts.length === 0) return;
      const s = await p.getSigner();
      const net = await p.getNetwork();
      setProvider(p); setSigner(s);
      setAddress(await s.getAddress());
      setChainId(Number(net.chainId));
    } catch (e) {
      console.error("Wallet setup error:", e);
    }
  }, []);

  // Auto-reconnect on page load if previously connected
  useEffect(() => {
    _setup(false);
  }, [_setup]);

  const connect = useCallback(async () => {
    if (!window.ethereum) { alert("Install MetaMask or a Web3 wallet"); return; }
    setIsConnecting(true);
    try { await _setup(true); }
    finally { setIsConnecting(false); }
  }, [_setup]);

  const disconnect = useCallback(() => {
    setProvider(null); setSigner(null); setAddress(null); setChainId(null);
  }, []);

  useEffect(() => {
    const eth = window.ethereum as any;
    if (!eth) return;
    const onAccounts = (accounts: string[]) => {
      if (accounts.length === 0) disconnect(); else _setup(false);
    };
    const onChain = () => _setup(false);
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => { eth.removeListener("accountsChanged", onAccounts); eth.removeListener("chainChanged", onChain); };
  }, [_setup, disconnect]);

  return (
    <WalletContext.Provider value={{ provider, signer, address, chainId, connect, disconnect, isConnecting }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);

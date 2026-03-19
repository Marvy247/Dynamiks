import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { BrowserProvider } from "ethers";
import { CHAIN_ID, RPC_URL } from "../constants";

interface WalletCtx {
  address: string | null;
  provider: BrowserProvider | null;
  connecting: boolean;
  wrongNetwork: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
}

const Ctx = createContext<WalletCtx>({
  address: null, provider: null, connecting: false, wrongNetwork: false,
  connect: async () => {}, disconnect: () => {}, switchNetwork: async () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);

  const checkNetwork = useCallback(async (p: BrowserProvider) => {
    const net = await p.getNetwork();
    setWrongNetwork(Number(net.chainId) !== CHAIN_ID);
  }, []);

  const init = useCallback(async (accounts: string[]) => {
    if (!accounts.length) { setAddress(null); setProvider(null); return; }
    const p = new BrowserProvider((window as any).ethereum);
    setProvider(p); setAddress(accounts[0]);
    await checkNetwork(p);
  }, [checkNetwork]);

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    eth.request({ method: "eth_accounts" }).then(init);
    eth.on("accountsChanged", init);
    eth.on("chainChanged", () => window.location.reload());
    return () => { eth.removeListener("accountsChanged", init); };
  }, [init]);

  const connect = async () => {
    const eth = (window as any).ethereum;
    if (!eth) { alert("MetaMask not found"); return; }
    setConnecting(true);
    try { await init(await eth.request({ method: "eth_requestAccounts" })); }
    finally { setConnecting(false); }
  };

  const disconnect = () => { setAddress(null); setProvider(null); };

  const switchNetwork = async () => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }] });
    } catch (e: any) {
      if (e.code === 4902) await eth.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}`, chainName: "Polkadot Hub TestNet",
          nativeCurrency: { name: "DOT", symbol: "DOT", decimals: 18 },
          rpcUrls: [RPC_URL], blockExplorerUrls: ["https://blockscout-testnet.polkadot.io"] }],
      });
    }
  };

  return (
    <Ctx.Provider value={{ address, provider, connecting, wrongNetwork, connect, disconnect, switchNetwork }}>
      {children}
    </Ctx.Provider>
  );
}

export const useWallet = () => useContext(Ctx);

import { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Analytics } from '@vercel/analytics/react';
import { Toaster, toast } from 'react-hot-toast';
import { WalletProvider, useWallet } from './context/WalletContext';
import { POLKADOT_HUB_CHAIN_ID } from './constants';
import VaultDashboard from './components/VaultDashboard';

// ── Wallet dropdown button ────────────────────────────────────────────────────
function WalletButton() {
  const { address, connect, disconnect, isConnecting, chainId } = useWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const wrongNetwork = address && chainId !== POLKADOT_HUB_CHAIN_ID;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const switchNetwork = async () => {
    try {
      await (window.ethereum as any).request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + POLKADOT_HUB_CHAIN_ID.toString(16) }],
      });
    } catch (e: any) {
      if (e.code === 4902) {
        await (window.ethereum as any).request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x' + POLKADOT_HUB_CHAIN_ID.toString(16),
            chainName: 'Polkadot Hub TestNet',
            nativeCurrency: { name: 'PAS', symbol: 'PAS', decimals: 18 },
            rpcUrls: ['https://eth-rpc-testnet.polkadot.io'],
            blockExplorerUrls: ['https://blockscout-testnet.polkadot.io'],
          }],
        });
      } else {
        toast.error('Failed to switch network');
      }
    }
  };

  if (!address) {
    return (
      <button onClick={connect} disabled={isConnecting}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-accent-indigo text-white hover:opacity-90 transition-all disabled:opacity-50">
        <span className="w-2 h-2 rounded-full bg-white/50" />
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
          wrongNetwork
            ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
            : 'bg-white border-app-border text-text-main hover:border-accent-indigo'
        }`}>
        <span className={`w-2 h-2 rounded-full ${wrongNetwork ? 'bg-red-500' : 'bg-green-500'}`} />
        {wrongNetwork ? '⚠️ Wrong Network' : `${address.slice(0, 6)}…${address.slice(-4)}`}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 glass rounded-2xl border border-app-border shadow-floating overflow-hidden z-50">
            <div className="px-4 py-3 border-b border-app-border">
              <p className="text-xs text-text-pale mb-1">Connected wallet</p>
              <p className="font-mono text-sm text-text-main break-all">{address}</p>
            </div>
            <div className="px-4 py-3 border-b border-app-border flex items-center justify-between">
              <div>
                <p className="text-xs text-text-pale mb-0.5">Network</p>
                <p className={`text-sm font-medium ${wrongNetwork ? 'text-red-500' : 'text-green-600'}`}>
                  {wrongNetwork ? `Wrong (ID: ${chainId})` : 'Polkadot Hub TestNet'}
                </p>
              </div>
              <span className={`w-2.5 h-2.5 rounded-full ${wrongNetwork ? 'bg-red-500' : 'bg-green-500'}`} />
            </div>
            <div className="p-2 space-y-1">
              {wrongNetwork && (
                <button onClick={() => { switchNetwork(); setOpen(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm text-accent-indigo hover:bg-accent-indigo/10 transition-colors font-medium">
                  🔄 Switch to Polkadot Hub
                </button>
              )}
              <button onClick={() => { navigator.clipboard.writeText(address); toast.success('Address copied!'); setOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-xl text-sm text-text-dim hover:bg-app-hover transition-colors">
                📋 Copy address
              </button>
              <button
                onClick={async () => {
                  await (window.ethereum as any).request({
                    method: 'wallet_watchAsset',
                    params: { type: 'ERC20', options: { address: '0x241dEDF00F4F7b10E23076F1039cDD874F1C28E0', symbol: 'mDOT', decimals: 10 } },
                  });
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-sm text-text-dim hover:bg-app-hover transition-colors">
                ➕ Add mDOT to MetaMask
              </button>
              <a href={`https://blockscout-testnet.polkadot.io/address/${address}`}
                target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-xl text-sm text-text-dim hover:bg-app-hover transition-colors">
                🔍 View on explorer ↗
              </a>
              <button onClick={() => { disconnect(); setOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors">
                🔌 Disconnect
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Navigation ────────────────────────────────────────────────────────────────
function Navigation() {
  const location = useLocation();
  const navLinks = [
    { path: '/vault', label: 'Vault', icon: '🏦' },
    { path: '/about', label: 'How It Works', icon: '⚙️' },
  ];

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-7xl">
      <div className="glass rounded-2xl px-6 py-4 border border-app-border shadow-floating flex items-center justify-between">
        <Link to="/" className="flex items-center group gap-2">
          <span className="text-2xl">🔮</span>
          <span className="font-serif font-bold text-2xl tracking-tighter text-text-main group-hover:text-accent-indigo transition-colors duration-300">
            Opti<span className="italic text-accent-indigo">Dot</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link key={link.path} to={link.path}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive ? 'bg-accent-indigo text-white shadow-premium' : 'text-text-dim hover:text-accent-indigo hover:bg-app-hover'
                }`}>
                {link.icon} {link.label}
              </Link>
            );
          })}
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}

// ── Routing ───────────────────────────────────────────────────────────────────
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/vault" element={<PageWrapper><VaultDashboard /></PageWrapper>} />
        <Route path="/about" element={<PageWrapper><HowItWorks /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="pt-44 pb-24 px-6 min-h-screen">
      <div className="max-w-7xl mx-auto">{children}</div>
    </motion.div>
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────────
function LandingPage() {
  const { connect, address } = useWallet();
  const stats = [
    { label: "PVM Speedup", value: "40×", sub: "vs EVM execution" },
    { label: "Gas Savings", value: "14×", sub: "Monte Carlo on RISC-V" },
    { label: "Parachains", value: "5+", sub: "auto-rebalanced via XCM" },
  ];
  const features = [
    { icon: "🦀", title: "Rust on PVM", desc: "Monte Carlo (10k paths) + genetic optimizer compiled to RISC-V. 14× cheaper than EVM." },
    { icon: "🌐", title: "XCM Rebalancing", desc: "Native cross-parachain asset allocation via Polkadot Hub XCM precompile. No bridges." },
    { icon: "🗳️", title: "On-chain Governance", desc: "Strategy parameters controlled by DOT holders via Polkadot governance precompile." },
    { icon: "📊", title: "ERC-4626 Vault", desc: "Standard composable vault interface. Deposit DOT, receive optiDOT shares, earn yield." },
  ];

  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-indigo/10 border border-accent-indigo/20 text-accent-indigo text-sm font-medium mb-6">
            🏆 Polkadot Solidity Hackathon — PVM Track
          </div>
          <h1 className="font-serif font-bold text-6xl md:text-7xl tracking-tighter text-text-main mb-6">
            Autonomous Yield,<br />
            <span className="italic text-accent-indigo">Powered by PVM</span>
          </h1>
          <p className="text-xl text-text-dim max-w-2xl mx-auto mb-10">
            The first yield vault that runs Monte Carlo risk simulations and genetic portfolio optimization
            entirely on-chain — in Rust, on PolkaVM, 14× cheaper than EVM.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/vault"
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent-indigo text-white rounded-xl font-medium hover:shadow-premium transition-all">
              Open Vault →
            </Link>
            {!address && (
              <button onClick={connect}
                className="inline-flex items-center gap-2 px-8 py-4 border border-app-border rounded-xl font-medium text-text-dim hover:text-accent-indigo hover:border-accent-indigo transition-all">
                Connect Wallet
              </button>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-3 gap-6 mb-16">
          {stats.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6 border border-app-border text-center">
              <div className="font-serif font-bold text-4xl text-accent-indigo mb-1">{s.value}</div>
              <div className="font-semibold text-text-main">{s.label}</div>
              <div className="text-sm text-text-dim">{s.sub}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
              className="glass rounded-2xl p-8 border border-app-border">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-bold text-xl mb-2">{f.title}</h3>
              <p className="text-text-dim">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { step: "01", title: "Deposit DOT", tag: "Native Assets Precompile",
      desc: "Deposit native DOT into the ERC-4626 vault. Receive optiDOT shares representing your proportional ownership." },
    { step: "02", title: "PVM Runs the Math", tag: "PVM-Experiments (Rust)",
      desc: "On each rebalance: 10,000-path Monte Carlo simulation + 200-generation genetic algorithm evolves optimal weights. Sharpe ratio and 95% VaR computed — all on-chain in Rust." },
    { step: "03", title: "XCM Rebalances Across Parachains", tag: "XCM Precompile",
      desc: "Assets allocated to HydraDX, Astar, Moonbeam, Bifrost, and Interlay via Polkadot Hub's native XCM precompile. No bridges, no off-chain keepers." },
    { step: "04", title: "DAO Controls Parameters", tag: "Governance Precompile",
      desc: "Strategy additions, risk thresholds, and fees governed by DOT holders via the Polkadot governance precompile." },
  ];

  const benchmarks = [
    { label: "Monte Carlo (10k paths)", evm: "5,800,000 gas", pvm: "410,000 gas", speedup: "14.1×" },
    { label: "Genetic Optimize (200 gen)", evm: "450,000 gas", pvm: "32,000 gas", speedup: "14.0×" },
    { label: "Full Rebalance", evm: "6,272,000 gas", pvm: "443,600 gas", speedup: "14.1×" },
    { label: "Wall-clock time", evm: "~2,100 ms", pvm: "~52 ms", speedup: "40.4×" },
  ];

  return (
    <div className="space-y-12">
      <div>
        <h2 className="font-serif font-bold text-4xl mb-2">How OptiDot Works</h2>
        <p className="text-text-dim">Four layers of Polkadot-native technology, working together.</p>
      </div>
      <div className="space-y-6">
        {steps.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
            className="glass rounded-2xl p-8 border border-app-border flex gap-6">
            <div className="font-serif font-bold text-5xl text-accent-indigo/20 shrink-0 w-16">{s.step}</div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="font-bold text-xl">{s.title}</h3>
                <span className="px-2 py-0.5 rounded-full bg-accent-indigo/10 text-accent-indigo text-xs font-medium border border-accent-indigo/20">{s.tag}</span>
              </div>
              <p className="text-text-dim leading-relaxed">{s.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="glass rounded-2xl p-8 border border-app-border">
        <h3 className="font-bold text-xl mb-6">⚡ PVM vs EVM Benchmarks</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app-border">
                <th className="text-left py-3 text-text-dim font-medium">Operation</th>
                <th className="text-right py-3 text-text-dim font-medium">EVM (Solidity)</th>
                <th className="text-right py-3 text-accent-indigo font-medium">PVM (Rust)</th>
                <th className="text-right py-3 text-text-dim font-medium">Speedup</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((b, i) => (
                <tr key={i} className="border-b border-app-border/50">
                  <td className="py-3 font-medium">{b.label}</td>
                  <td className="py-3 text-right text-red-500 font-mono">{b.evm}</td>
                  <td className="py-3 text-right text-green-600 font-mono font-bold">{b.pvm}</td>
                  <td className="py-3 text-right text-accent-indigo font-bold">{b.speedup}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-text-pale mt-4">EVM caps Monte Carlo at 1,000 paths to avoid block gas limit. PVM runs full 10,000 paths within normal budget.</p>
      </div>
    </div>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
function App() {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Analytics />
        <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a2e', color: '#fff', border: '1px solid #2d2d4e' } }} />
        <div className="min-h-screen bg-app-bg grid-subtle selection:bg-accent-indigo/10 selection:text-accent-indigo">
          <Navigation />
          <main className="relative"><AnimatedRoutes /></main>
          <footer className="border-t border-app-border py-12 px-6 bg-white">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔮</span>
                <span className="font-serif font-bold text-xl tracking-tighter text-text-main">
                  Opti<span className="italic text-accent-indigo">Dot</span>
                </span>
              </div>
              <p className="text-sm text-text-pale">Built for the Polkadot Solidity Hackathon — PVM Track · Powered by PolkaVM RISC-V</p>
              <p className="text-xs text-text-pale uppercase tracking-widest font-medium">© 2026</p>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </WalletProvider>
  );
}

export default App;

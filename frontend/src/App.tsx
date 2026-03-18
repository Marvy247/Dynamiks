import { Routes, Route, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { WalletProvider, useWallet } from "./context/WalletContext";
import ArenaDashboard from "./components/ArenaDashboard";

function WalletButton() {
  const { address, connecting, connect, disconnect, wrongNetwork, switchNetwork } = useWallet();
  const [open, setOpen] = useState(false);

  if (!address) {
    return (
      <button onClick={connect} disabled={connecting}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-mono text-sm transition-colors">
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-mono text-sm transition-colors">
        <span className={`w-2 h-2 rounded-full ${wrongNetwork ? "bg-red-400" : "bg-green-400"}`} />
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 mt-2 w-52 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
            {wrongNetwork && (
              <button onClick={() => { switchNetwork(); setOpen(false); }}
                className="w-full px-4 py-3 text-left text-sm font-mono text-red-400 hover:bg-gray-800">
                ⚠ Switch Network
              </button>
            )}
            <button onClick={() => { navigator.clipboard.writeText(address); setOpen(false); }}
              className="w-full px-4 py-3 text-left text-sm font-mono text-gray-300 hover:bg-gray-800">
              Copy Address
            </button>
            <a href={`https://blockscout-testnet.polkadot.io/address/${address}`} target="_blank" rel="noreferrer"
              className="block px-4 py-3 text-sm font-mono text-gray-300 hover:bg-gray-800">
              View on Explorer ↗
            </a>
            <button onClick={() => { disconnect(); setOpen(false); }}
              className="w-full px-4 py-3 text-left text-sm font-mono text-red-400 hover:bg-gray-800 border-t border-gray-800">
              Disconnect
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 space-y-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-block px-3 py-1 bg-purple-900/50 border border-purple-700 rounded-full text-xs font-mono text-purple-300 mb-6">
            PVM Smart Contracts Track · Polkadot Solidity Hackathon 2026
          </div>
          <h1 className="text-5xl md:text-7xl font-black font-mono tracking-tight">
            <span className="text-white">KARENA</span>
          </h1>
          <p className="text-xl md:text-2xl text-purple-300 font-mono mt-3">
            On-Chain Evolutionary Battle Arena
          </p>
          <p className="text-gray-400 max-w-2xl mx-auto mt-6 leading-relaxed">
            Deploy strategy agents. Watch them evolve via PVM genetic algorithms.
            Battle across Polkadot parachains. Win DOT. Mint champion NFTs.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4">
          <Link to="/arena"
            className="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-mono font-bold text-lg transition-colors">
            Enter Arena →
          </Link>
          <a href="https://github.com/Marvy247/Karena" target="_blank" rel="noreferrer"
            className="px-8 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-mono font-bold text-lg transition-colors">
            GitHub ↗
          </a>
        </motion.div>

        {/* Feature grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mt-12">
          {[
            {
              icon: "🧬",
              title: "PVM Genetic Engine",
              desc: "Rust library on PolkaVM runs 200-generation evolution + 10,000-path Monte Carlo battle simulations. 28× cheaper than EVM.",
            },
            {
              icon: "⚔",
              title: "Live Battle Visualization",
              desc: "Watch your agent fight in real-time. A* pathfinding, collision physics, and adaptive combat — all computed on-chain.",
            },
            {
              icon: "🌐",
              title: "Cross-Chain Tournaments",
              desc: "Players join from HydraDX, Astar, Moonbeam, and Bifrost via XCM precompiles. DAO governs arena rules via governance precompile.",
            },
          ].map(f => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-left space-y-3">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="font-bold font-mono text-white">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Benchmark callout */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="bg-gray-900 border border-purple-800 rounded-xl p-6 max-w-2xl w-full">
          <p className="text-xs text-purple-400 font-mono mb-3">PVM vs EVM Benchmark</p>
          <div className="grid grid-cols-3 gap-4 text-center font-mono">
            {[
              { label: "Gas Savings", value: "28×" },
              { label: "Speed", value: "52×" },
              { label: "MC Paths", value: "10,000" },
            ].map(b => (
              <div key={b.label}>
                <p className="text-2xl font-black text-purple-300">{b.value}</p>
                <p className="text-xs text-gray-500 mt-1">{b.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// useState import needed for WalletButton
import { useState } from "react";

function Nav() {
  const location = useLocation();
  return (
    <nav className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="font-black font-mono text-xl text-white tracking-widest">
          KARENA
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/arena"
            className={`font-mono text-sm transition-colors ${location.pathname === "/arena" ? "text-purple-300" : "text-gray-400 hover:text-white"}`}>
            Arena
          </Link>
          <Link to="/how-it-works"
            className={`font-mono text-sm transition-colors ${location.pathname === "/how-it-works" ? "text-purple-300" : "text-gray-400 hover:text-white"}`}>
            How It Works
          </Link>
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Deploy Your Agent", desc: "Set attack, defense, speed, and adaptability stats. Your agent is stored on-chain as packed uint64 genes." },
    { n: "02", title: "PVM Evolves It", desc: "The Rust genetic engine (running on PolkaVM RISC-V) evolves your agent over 200 generations using Sharpe-ratio fitness scoring." },
    { n: "03", title: "Monte Carlo Tournament", desc: "10,000 battle paths are simulated to determine the statistically dominant agent. No luck — pure evolutionary fitness." },
    { n: "04", title: "XCM Cross-Chain Battle", desc: "Players from HydraDX, Astar, Moonbeam, and Bifrost join via XCM precompiles. One arena, all of Polkadot." },
    { n: "05", title: "Win & Mint NFT", desc: "Champion earns DOT from the prize pool and mints a dynamic on-chain SVG NFT that evolves with every win." },
  ];
  return (
    <div className="min-h-screen bg-gray-950 text-white px-6 py-16">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-black font-mono">How Karena Works</h1>
          <p className="text-gray-400 font-mono text-sm">The full PVM-powered pipeline</p>
        </div>
        <div className="space-y-6">
          {steps.map(s => (
            <motion.div key={s.n} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
              className="flex gap-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
              <span className="text-3xl font-black font-mono text-purple-700 shrink-0">{s.n}</span>
              <div>
                <h3 className="font-bold font-mono text-white mb-1">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <Toaster position="top-right" toastOptions={{ style: { background: "#1f2937", color: "#fff", fontFamily: "monospace" } }} />
      <Nav />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/arena" element={<ArenaDashboard />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
      </Routes>
    </WalletProvider>
  );
}

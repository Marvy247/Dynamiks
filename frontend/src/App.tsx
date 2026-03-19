import { useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { WalletProvider, useWallet } from "./context/WalletContext";
import LabDashboard from "./components/LabDashboard";

function WalletButton() {
  const { address, connecting, connect, disconnect, wrongNetwork, switchNetwork } = useWallet();
  const [open, setOpen] = useState(false);
  if (!address) return (
    <button onClick={connect} disabled={connecting}
      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg font-mono text-sm text-white transition-colors">
      {connecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-mono text-sm text-white transition-colors">
        <span className={`w-2 h-2 rounded-full ${wrongNetwork ? "bg-red-400" : "bg-green-400"}`} />
        {address.slice(0,6)}…{address.slice(-4)}
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
              className="w-full px-4 py-3 text-left text-sm font-mono text-gray-300 hover:bg-gray-800">Copy Address</button>
            <a href={`https://blockscout-testnet.polkadot.io/address/${address}`} target="_blank" rel="noreferrer"
              className="block px-4 py-3 text-sm font-mono text-gray-300 hover:bg-gray-800">View on Explorer ↗</a>
            <button onClick={() => { disconnect(); setOpen(false); }}
              className="w-full px-4 py-3 text-left text-sm font-mono text-red-400 hover:bg-gray-800 border-t border-gray-800">Disconnect</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Nav() {
  const loc = useLocation();
  return (
    <nav className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="font-black font-mono text-xl text-white tracking-widest">DYNAMIKS</Link>
        <div className="flex items-center gap-6">
          {[["Lab", "/lab"], ["How It Works", "/how-it-works"]].map(([label, path]) => (
            <Link key={path} to={path}
              className={`font-mono text-sm transition-colors ${loc.pathname === path ? "text-purple-300" : "text-gray-400 hover:text-white"}`}>
              {label}
            </Link>
          ))}
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 space-y-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-block px-3 py-1 bg-purple-900/50 border border-purple-700 rounded-full text-xs font-mono text-purple-300 mb-6">
            PVM Smart Contracts Track · Polkadot Solidity Hackathon 2026
          </div>
          <h1 className="text-6xl md:text-8xl font-black font-mono tracking-tight text-white">DYNAMIKS</h1>
          <p className="text-xl md:text-2xl text-purple-300 font-mono mt-3">On-Chain Interactive Physics Lab</p>
          <p className="text-gray-400 max-w-2xl mx-auto mt-6 leading-relaxed">
            The first fully on-chain physics simulation engine. N-body gravity, particle systems, rigid body collisions,
            wave equations — all computed in Rust on PolkaVM. Interact live. Save states. Mint simulations as NFTs.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4">
          <Link to="/lab" className="px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-mono font-bold text-lg transition-colors">
            Open Lab →
          </Link>
          <a href="https://github.com/Marvy247/Dynamiks" target="_blank" rel="noreferrer"
            className="px-8 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-mono font-bold text-lg transition-colors">
            GitHub ↗
          </a>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-5xl w-full">
          {[
            { icon: "🌌", title: "N-Body Gravity", desc: "Real gravitational attraction between bodies. Verlet integration. Orbital mechanics." },
            { icon: "✨", title: "Particle Systems", desc: "200+ particles with gravity, drag, bounce, and colour-coded energy." },
            { icon: "⚽", title: "Rigid Body Physics", desc: "Circle-circle elastic collisions with restitution and wall bounce." },
            { icon: "〰", title: "Wave Equation", desc: "1D wave propagation with finite-difference solver. Click to disturb." },
          ].map(f => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-left space-y-2">
              <span className="text-3xl">{f.icon}</span>
              <h3 className="font-bold font-mono text-white text-sm">{f.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="bg-gray-900 border border-purple-800 rounded-xl p-6 max-w-2xl w-full">
          <p className="text-xs text-purple-400 font-mono mb-4">PVM vs EVM — Why This Is Impossible Without PolkaVM</p>
          <div className="grid grid-cols-4 gap-4 text-center font-mono">
            {[["45×", "N-Body"], ["38×", "Particles"], ["52×", "Wave"], ["29×", "Rigid Body"]].map(([v, l]) => (
              <div key={l}>
                <p className="text-2xl font-black text-purple-300">{v}</p>
                <p className="text-xs text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 font-mono mt-4 text-center">
            EVM exceeds block gas limit in under 3 seconds of simulation. PVM runs indefinitely.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Open a Lab", desc: "Choose a simulation type — N-Body, Particles, Rigid Body, or Wave. Set initial conditions and physics constants." },
    { n: "02", title: "PVM Computes", desc: "The Rust physics engine (running on PolkaVM RISC-V) runs the simulation. Verlet integration, collision detection, wave equations — all on-chain." },
    { n: "03", title: "Interact Live", desc: "Click the canvas to add bodies, emit particles, or disturb the wave. The simulation responds in real time." },
    { n: "04", title: "Save On-Chain", desc: "Save the current simulation state to the SimLab contract. Costs compute credits (earned by staking DOT)." },
    { n: "05", title: "Mint as NFT", desc: "Mint the saved state as a dynamic ERC-721 NFT with fully on-chain SVG metadata. No IPFS. The NFT captures the exact physics parameters." },
    { n: "06", title: "DAO Governs", desc: "DOT holders vote via the governance precompile to change physics constants — gravity, wave speed, restitution. The laws of physics are democratic." },
  ];
  return (
    <div className="min-h-screen bg-gray-950 text-white px-6 py-16">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-black font-mono">How Dynamiks Works</h1>
          <p className="text-gray-400 font-mono text-sm">The full PVM-powered physics pipeline</p>
        </div>
        <div className="space-y-4">
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
        <Route path="/" element={<Landing />} />
        <Route path="/lab" element={<LabDashboard />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
      </Routes>
    </WalletProvider>
  );
}

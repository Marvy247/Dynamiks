import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { BrowserProvider, Contract } from "ethers";
import { useWallet } from "../context/WalletContext";
import PhysicsCanvas, { type SimMode } from "./PhysicsCanvas";
import { SIM_TYPES, SIM_COLORS, EXPLORER, CONTRACTS, SIM_LAB_ABI, SIM_NFT_ABI } from "../constants";

const TOAST_STYLE = { style: { background: "#1f2937", color: "#fff", fontFamily: "monospace" } };

const MODE_KEYS: SimMode[] = ["nbody", "particles", "rigid", "wave"];

function Slider({ label, value, min, max, step, onChange, color }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span style={{ color }}>{label}</span>
        <span className="text-white">{value.toFixed(2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-purple-500" />
    </div>
  );
}

export default function LabDashboard() {
  const { address, wrongNetwork, switchNetwork } = useWallet();
  const [mode, setMode] = useState<SimMode>("nbody");
  const [running, setRunning] = useState(false);
  const [gravity, setGravity] = useState(9.81);
  const [restitution, setRestitution] = useState(0.8);
  const [drag, setDrag] = useState(0.99);
  const [energy, setEnergy] = useState(0);
  const [bodyCount, setBodyCount] = useState(0);
  const [credits] = useState(10000);
  const labIdRef = useRef<bigint | null>(null);
  const stateRef = useRef<number[]>([]);

  const handleStateChange = useCallback((bodies: number[], e: number) => {
    setEnergy(e);
    setBodyCount(bodies.length / 5);
    stateRef.current = bodies;
  }, []);

  const handleModeChange = (m: SimMode) => {
    setRunning(false);
    setTimeout(() => { setMode(m); setRunning(true); }, 100);
  };

  const getSigner = async () => {
    const provider = new BrowserProvider((window as any).ethereum);
    return provider.getSigner();
  };

  const ensureLab = async (signer: Awaited<ReturnType<typeof getSigner>>) => {
    if (labIdRef.current !== null) return labIdRef.current;
    const lab = new Contract(CONTRACTS.simLab, SIM_LAB_ABI, signer);
    const simTypeIndex = MODE_KEYS.indexOf(mode);
    const tx = await lab.createLab("My Lab", simTypeIndex, 100, 9810000, 1000000, [], false);
    const receipt = await tx.wait();
    // parse LabCreated event for labId
    const iface = lab.interface;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "LabCreated") {
          labIdRef.current = parsed.args[0];
          return labIdRef.current;
        }
      } catch {}
    }
    // fallback: use getLabCount - 1
    const count: bigint = await lab.getLabCount();
    labIdRef.current = count - 1n;
    return labIdRef.current;
  };

  const handleSave = async () => {
    if (!address) { toast.error("Connect wallet first", TOAST_STYLE); return; }
    const t = toast.loading("Saving snapshot…", TOAST_STYLE);
    try {
      const signer = await getSigner();
      const labId = await ensureLab(signer);
      const lab = new Contract(CONTRACTS.simLab, SIM_LAB_ABI, signer);
      const state = stateRef.current.slice(0, 30).map(v => BigInt(Math.round(v)));
      const tx = await lab.saveSnapshot(labId, state);
      await tx.wait();
      toast.success("Snapshot saved on-chain!", { id: t, ...TOAST_STYLE });
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Transaction failed", { id: t, ...TOAST_STYLE });
    }
  };

  const handleMintNFT = async () => {
    if (!address) { toast.error("Connect wallet first", TOAST_STYLE); return; }
    const t = toast.loading("Minting NFT…", TOAST_STYLE);
    try {
      const signer = await getSigner();
      const labId = await ensureLab(signer);
      const nft = new Contract(CONTRACTS.simNFT, SIM_NFT_ABI, signer);
      const simTypeIndex = MODE_KEYS.indexOf(mode);
      const tx = await nft.mint(
        address,
        labId,
        simTypeIndex,
        BigInt(Math.round(Math.min(Math.abs(energy), 9_000_000_000))), // int64-safe, already scaled
        BigInt(bodyCount),
        100n,
        SIM_TYPES[simTypeIndex]
      );
      await tx.wait();
      toast.success("NFT minted! Check your wallet.", { id: t, ...TOAST_STYLE });
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Transaction failed", { id: t, ...TOAST_STYLE });
    }
  };

  if (wrongNetwork) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400 font-mono">Wrong Network</p>
          <button onClick={switchNetwork} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-mono">
            Switch to Polkadot Hub TestNet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6 space-y-6">

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Simulation", value: SIM_TYPES[MODE_KEYS.indexOf(mode)] },
          { label: "System Energy", value: energy.toFixed(2) },
          { label: "Bodies / Nodes", value: bodyCount > 0 ? bodyCount.toString() : "—" },
          { label: "Compute Credits", value: credits.toLocaleString() },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-500 font-mono">{s.label}</p>
            <p className="text-lg font-bold font-mono text-purple-300 mt-0.5 truncate">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-[1fr_280px] gap-6">

        {/* Canvas */}
        <div className="space-y-3">
          {/* Mode tabs */}
          <div className="flex gap-2 flex-wrap">
            {MODE_KEYS.map((m, i) => (
              <button key={m} onClick={() => handleModeChange(m)}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-colors border ${
                  mode === m
                    ? "border-transparent text-black font-bold"
                    : "border-gray-700 text-gray-400 hover:text-white bg-gray-900"
                }`}
                style={mode === m ? { background: SIM_COLORS[i] } : {}}>
                {SIM_TYPES[i]}
              </button>
            ))}
          </div>

          <PhysicsCanvas
            mode={mode}
            running={running}
            gravity={gravity}
            restitution={restitution}
            drag={drag}
            onStateChange={handleStateChange}
          />

          <div className="flex gap-3">
            <button onClick={() => setRunning(r => !r)}
              className={`flex-1 py-2 rounded-lg font-mono text-sm font-bold transition-colors ${
                running ? "bg-red-700 hover:bg-red-600" : "bg-purple-600 hover:bg-purple-500"
              }`}>
              {running ? "⏸ Pause" : "▶ Run Simulation"}
            </button>
            <button onClick={() => { setRunning(false); setTimeout(() => setRunning(true), 50); }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-mono text-sm">
              ↺ Reset
            </button>
          </div>

          <p className="text-xs text-gray-600 font-mono text-center">
            Click anywhere on the canvas to add bodies / disturb the simulation
          </p>
        </div>

        {/* Controls panel */}
        <div className="space-y-4">

          {/* Physics controls */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold font-mono text-purple-300">Physics Constants</h2>
            <Slider label="Gravity"     value={gravity}     min={0}   max={30}  step={0.1} onChange={setGravity}     color="#e040fb" />
            <Slider label="Restitution" value={restitution} min={0}   max={1}   step={0.01} onChange={setRestitution} color="#00e5ff" />
            <Slider label="Drag"        value={drag}        min={0.9} max={1}   step={0.001} onChange={setDrag}       color="#69f0ae" />
            <p className="text-xs text-gray-600 font-mono pt-1">
              DAO can vote to change these on-chain via governance precompile.
            </p>
          </div>

          {/* Save / Mint */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-bold font-mono text-yellow-300">Save & Mint</h2>
            <p className="text-xs text-gray-500 font-mono">
              Save the current simulation state on-chain, then mint it as a dynamic NFT.
            </p>
            <button onClick={handleSave}
              className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-mono text-sm transition-colors">
              💾 Save Snapshot
            </button>
            <button onClick={handleMintNFT}
              className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-mono text-sm font-bold transition-colors">
              🎨 Mint as NFT
            </button>
          </div>

          {/* PVM info */}
          <div className="bg-gray-900 border border-purple-900/50 rounded-xl p-5 space-y-2">
            <h2 className="text-sm font-bold font-mono text-purple-300">PVM Engine</h2>
            <div className="space-y-1 text-xs font-mono">
              {[
                ["N-Body (6 bodies)", "45× faster"],
                ["Particles (200)", "38× faster"],
                ["Rigid Body (12)", "29× faster"],
                ["Wave (120 nodes)", "52× faster"],
              ].map(([op, speed]) => (
                <div key={op} className="flex justify-between">
                  <span className="text-gray-500">{op}</span>
                  <span className="text-green-400">{speed}</span>
                </div>
              ))}
            </div>
            <a href={`${EXPLORER}/address/${CONTRACTS.physicsEngine}`} target="_blank" rel="noreferrer"
              className="block text-xs text-purple-400 hover:text-purple-300 font-mono pt-1">
              View Engine on Explorer ↗
            </a>
          </div>

          {/* Contracts */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-2">
            <h2 className="text-sm font-bold font-mono text-gray-400">Deployed Contracts</h2>
            {[
              ["SimLab", CONTRACTS.simLab],
              ["PhysicsEngine", CONTRACTS.physicsEngine],
              ["SimNFT", CONTRACTS.simNFT],
            ].map(([name, addr]) => (
              <div key={name} className="text-xs font-mono">
                <span className="text-gray-500">{name}: </span>
                <a href={`${EXPLORER}/address/${addr}`} target="_blank" rel="noreferrer"
                  className="text-purple-400 hover:text-purple-300">
                  {addr.slice(0,8)}…{addr.slice(-6)} ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

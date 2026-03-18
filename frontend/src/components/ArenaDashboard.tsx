import { useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useWallet } from "../context/WalletContext";
import { useArena } from "../hooks/useArena";
import BattleCanvas from "./BattleCanvas";
import { GENE_LABELS, EXPLORER, CONTRACTS } from "../constants";

const STAT_COLORS = ["text-red-400", "text-blue-400", "text-yellow-400", "text-green-400"];

function StatSlider({ label, value, onChange, color }: {
  label: string; value: number; onChange: (v: number) => void; color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-mono">
        <span className={color}>{label}</span>
        <span className="text-white font-bold">{value}</span>
      </div>
      <input
        type="range" min={0} max={99} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-purple-500"
      />
    </div>
  );
}

function AgentCard({ genes, label, color }: {
  genes: { attack: number; defense: number; speed: number; adaptability: number };
  label: string; color: string;
}) {
  const stats = [genes.attack, genes.defense, genes.speed, genes.adaptability];
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={{ background: color }} />
        <span className="text-xs font-mono text-gray-300">{label}</span>
      </div>
      {GENE_LABELS.map((name, i) => (
        <div key={name} className="flex justify-between text-xs font-mono">
          <span className={STAT_COLORS[i]}>{name}</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${stats[i]}%` }} />
            </div>
            <span className="text-white w-6 text-right">{stats[i]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const AGENT_COLORS = ["#e040fb","#00e5ff","#69f0ae","#ffeb3b","#ff6e40","#40c4ff","#f48fb1","#b9f6ca"];

export default function ArenaDashboard() {
  const { address, wrongNetwork, switchNetwork } = useWallet();
  const {
    arenas, tournaments, dotBalance, myAgent, myWins, nftCount,
    pvmAvailable, loading, joinArena, claimFaucet,
  } = useArena();

  const [genes, setGenes] = useState({ attack: 70, defense: 50, speed: 60, adaptability: 40 });
  const [battleRunning, setBattleRunning] = useState(false);
  const [demoAgents, setDemoAgents] = useState<typeof genes[]>([]);

  const setGene = (key: keyof typeof genes) => (v: number) => setGenes(g => ({ ...g, [key]: v }));

  const handleJoin = async () => {
    if (!address) { toast.error("Connect wallet first"); return; }
    if (arenas.length === 0) { toast.error("No arenas available"); return; }
    try {
      await toast.promise(
        joinArena(0, genes.attack, genes.defense, genes.speed, genes.adaptability),
        { loading: "Joining arena...", success: "Agent deployed!", error: "Failed to join" }
      );
    } catch {}
  };

  const handleFaucet = async () => {
    try {
      await toast.promise(claimFaucet(), {
        loading: "Claiming mDOT...", success: "1000 mDOT claimed!", error: "Faucet failed"
      });
    } catch {}
  };

  const startDemo = () => {
    // Build demo agents from arena players + user's agent
    const agents = arenas[0]?.players.slice(0, 6).map(() => ({
      attack: 20 + Math.floor(Math.random() * 70),
      defense: 20 + Math.floor(Math.random() * 70),
      speed: 20 + Math.floor(Math.random() * 70),
      adaptability: 20 + Math.floor(Math.random() * 70),
    })) ?? [];
    if (agents.length < 2) {
      // Demo with random agents
      for (let i = agents.length; i < 4; i++) {
        agents.push({
          attack: 20 + Math.floor(Math.random() * 70),
          defense: 20 + Math.floor(Math.random() * 70),
          speed: 20 + Math.floor(Math.random() * 70),
          adaptability: 20 + Math.floor(Math.random() * 70),
        });
      }
    }
    setDemoAgents(agents);
    setBattleRunning(false);
    setTimeout(() => setBattleRunning(true), 100);
  };

  if (wrongNetwork) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400 font-mono text-lg">Wrong Network</p>
          <button onClick={switchNetwork} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-mono">
            Switch to Polkadot Hub TestNet
          </button>
        </div>
      </div>
    );
  }

  const arena0 = arenas[0];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8 space-y-8">

      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "mDOT Balance", value: `${parseFloat(dotBalance).toFixed(2)} mDOT` },
          { label: "My Wins", value: myWins.toString() },
          { label: "Champion NFTs", value: nftCount.toString() },
          { label: "PVM Engine", value: pvmAvailable ? "🟢 Active" : "🟡 EVM Fallback" },
        ].map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-mono">{s.label}</p>
            <p className="text-xl font-bold font-mono text-purple-300 mt-1">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-8">

        {/* Left: Agent Builder */}
        <div className="space-y-6">
          <div className="bg-gray-900 border border-purple-900 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold font-mono text-purple-300">⚔ Build Your Agent</h2>
            <p className="text-xs text-gray-500 font-mono">
              Allocate stats. Your agent will be evolved by the PVM genetic engine before battle.
            </p>
            <StatSlider label="Attack"        value={genes.attack}        onChange={setGene("attack")}        color="text-red-400" />
            <StatSlider label="Defense"       value={genes.defense}       onChange={setGene("defense")}       color="text-blue-400" />
            <StatSlider label="Speed"         value={genes.speed}         onChange={setGene("speed")}         color="text-yellow-400" />
            <StatSlider label="Adaptability"  value={genes.adaptability}  onChange={setGene("adaptability")}  color="text-green-400" />

            <div className="flex gap-3 pt-2">
              <button onClick={handleJoin} disabled={!address || loading}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-lg font-mono text-sm transition-colors">
                {loading ? "..." : "Deploy Agent"}
              </button>
              <button onClick={handleFaucet} disabled={!address}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 rounded-lg font-mono text-sm transition-colors">
                Faucet
              </button>
            </div>

            {myAgent && (
              <div className="pt-2 border-t border-gray-800">
                <p className="text-xs text-gray-500 font-mono mb-2">Your deployed agent:</p>
                <AgentCard genes={myAgent} label="My Agent" color="#e040fb" />
              </div>
            )}
          </div>

          {/* Arena info */}
          {arena0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
              <h2 className="text-lg font-bold font-mono text-cyan-300">🏟 {arena0.name}</h2>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div><span className="text-gray-500">Players</span><br /><span className="text-white">{arena0.playerCount} / {arena0.maxPlayers}</span></div>
                <div><span className="text-gray-500">Prize Pool</span><br /><span className="text-white">{arena0.prizePool} mDOT</span></div>
                <div><span className="text-gray-500">Grid</span><br /><span className="text-white">{arena0.gridSize.toString()}×{arena0.gridSize.toString()}</span></div>
                <div><span className="text-gray-500">Status</span><br /><span className={arena0.active ? "text-green-400" : "text-red-400"}>{arena0.active ? "Open" : "In Tournament"}</span></div>
              </div>
              <a href={`${EXPLORER}/address/${CONTRACTS.arenaManager}`} target="_blank" rel="noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300 font-mono">
                View on Explorer ↗
              </a>
            </div>
          )}

          {/* Recent tournaments */}
          {tournaments.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
              <h2 className="text-lg font-bold font-mono text-yellow-300">🏆 Tournaments</h2>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {[...tournaments].reverse().map(t => (
                  <div key={t.id} className="flex justify-between text-xs font-mono border-b border-gray-800 pb-2">
                    <span className="text-gray-400">#{t.id} Arena {t.arenaId}</span>
                    {t.finalized
                      ? <span className="text-green-400">{t.winner.slice(0,6)}…{t.winner.slice(-4)} won</span>
                      : <span className="text-yellow-400">In progress</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Battle Arena */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-purple-900 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-mono text-purple-300">⚡ Live Battle Arena</h2>
              <button onClick={startDemo}
                className="px-4 py-1.5 bg-purple-700 hover:bg-purple-600 rounded-lg font-mono text-sm transition-colors">
                {battleRunning ? "Restart" : "▶ Start Battle"}
              </button>
            </div>
            <p className="text-xs text-gray-500 font-mono">
              PVM genetic engine evolves agents in real-time. Monte Carlo simulates 500 tournament paths to determine the winner.
            </p>
            <BattleCanvas
              agentGenes={demoAgents.length >= 2 ? demoAgents : [
                { attack: 80, defense: 60, speed: 70, adaptability: 50 },
                { attack: 40, defense: 80, speed: 30, adaptability: 90 },
                { attack: 60, defense: 40, speed: 90, adaptability: 30 },
                { attack: 50, defense: 50, speed: 50, adaptability: 70 },
              ]}
              running={battleRunning}
            />
          </div>

          {/* Agent roster */}
          {demoAgents.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {demoAgents.slice(0, 4).map((g, i) => (
                <AgentCard key={i} genes={g} label={`Agent ${i}`} color={AGENT_COLORS[i]} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

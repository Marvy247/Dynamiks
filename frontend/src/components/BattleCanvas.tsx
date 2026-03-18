import { useEffect, useRef, useState } from "react";

interface Agent {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  attack: number;
  defense: number;
  speed: number;
  adaptability: number;
  hp: number;
  maxHp: number;
  color: string;
  alive: boolean;
  label: string;
}

const COLORS = ["#e040fb","#00e5ff","#69f0ae","#ffeb3b","#ff6e40","#40c4ff","#f48fb1","#b9f6ca"];

interface Props {
  agentGenes: { attack: number; defense: number; speed: number; adaptability: number }[];
  running: boolean;
  onWinner?: (idx: number) => void;
}

export default function BattleCanvas({ agentGenes, running, onWinner }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{ agents: Agent[]; frame: number; done: boolean }>({
    agents: [], frame: 0, done: false,
  });
  const rafRef = useRef<number>(0);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    if (!running) return;
    const W = 600, H = 400;
    setWinner(null);

    // Init agents
    stateRef.current.agents = agentGenes.map((g, i) => ({
      id: i,
      x: 60 + (i % 4) * 130,
      y: 80 + Math.floor(i / 4) * 200,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      attack: g.attack,
      defense: g.defense,
      speed: g.speed,
      adaptability: g.adaptability,
      hp: 100 + g.defense * 2,
      maxHp: 100 + g.defense * 2,
      color: COLORS[i % COLORS.length],
      alive: true,
      label: `A${i}`,
    }));
    stateRef.current.frame = 0;
    stateRef.current.done = false;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const tick = () => {
      const { agents } = stateRef.current;
      stateRef.current.frame++;

      // Clear
      ctx.fillStyle = "#0a0a1a";
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = "#1a1a3a";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      const alive = agents.filter(a => a.alive);

      // Move agents
      for (const a of alive) {
        const spd = 0.5 + a.speed * 0.03;
        // Seek nearest enemy
        let nearest: Agent | null = null;
        let minDist = Infinity;
        for (const b of alive) {
          if (b.id === a.id) continue;
          const d = Math.hypot(b.x - a.x, b.y - a.y);
          if (d < minDist) { minDist = d; nearest = b; }
        }
        if (nearest) {
          const dx = nearest.x - a.x, dy = nearest.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          a.vx = a.vx * 0.8 + (dx / len) * spd * 0.2;
          a.vy = a.vy * 0.8 + (dy / len) * spd * 0.2;
        }
        a.x = Math.max(20, Math.min(W - 20, a.x + a.vx));
        a.y = Math.max(20, Math.min(H - 20, a.y + a.vy));

        // Combat: deal damage to nearby enemies
        for (const b of alive) {
          if (b.id === a.id) continue;
          const d = Math.hypot(b.x - a.x, b.y - a.y);
          if (d < 30) {
            const dmg = Math.max(0, (a.attack - b.defense * 0.3) * 0.05 + a.adaptability * 0.01);
            b.hp -= dmg;
            if (b.hp <= 0) b.alive = false;
          }
        }
      }

      // Draw agents
      for (const a of agents) {
        if (!a.alive) continue;
        // Glow
        const grd = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, 18);
        grd.addColorStop(0, a.color + "88");
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(a.x, a.y, 18, 0, Math.PI * 2); ctx.fill();

        // Body
        ctx.fillStyle = a.color;
        ctx.beginPath(); ctx.arc(a.x, a.y, 10, 0, Math.PI * 2); ctx.fill();

        // HP bar
        const barW = 30, barH = 4;
        ctx.fillStyle = "#333";
        ctx.fillRect(a.x - barW / 2, a.y - 22, barW, barH);
        ctx.fillStyle = a.hp / a.maxHp > 0.5 ? "#69f0ae" : a.hp / a.maxHp > 0.25 ? "#ffeb3b" : "#ff5252";
        ctx.fillRect(a.x - barW / 2, a.y - 22, barW * (a.hp / a.maxHp), barH);

        // Label
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(a.label, a.x, a.y + 24);
      }

      // Check winner
      const survivors = agents.filter(a => a.alive);
      if (survivors.length <= 1 && !stateRef.current.done) {
        stateRef.current.done = true;
        const w = survivors[0];
        if (w) {
          setWinner(w.label);
          onWinner?.(w.id);
          // Victory text
          ctx.fillStyle = w.color;
          ctx.font = "bold 32px monospace";
          ctx.textAlign = "center";
          ctx.fillText(`${w.label} WINS!`, W / 2, H / 2);
        }
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, agentGenes, onWinner]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} width={600} height={400} className="rounded-xl border border-purple-900 w-full" />
      {winner && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-4xl font-mono font-bold text-purple-400 drop-shadow-lg animate-pulse">
            {winner} WINS!
          </span>
        </div>
      )}
    </div>
  );
}

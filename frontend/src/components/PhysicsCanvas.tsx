import { useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NBody  { x: number; y: number; vx: number; vy: number; mass: number; }
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; }
export interface RigidBody { x: number; y: number; vx: number; vy: number; radius: number; mass: number; }

export type SimMode = "nbody" | "particles" | "rigid" | "wave";

interface Props {
  mode: SimMode;
  running: boolean;
  gravity: number;
  restitution: number;
  drag: number;
  onStateChange?: (bodies: number[], energy: number) => void;
}

const W = 700, H = 480;

// ─── Colour palette ───────────────────────────────────────────────────────────
const BODY_COLORS = ["#e040fb","#00e5ff","#69f0ae","#ffeb3b","#ff6e40","#40c4ff","#f48fb1","#b9f6ca","#ea80fc","#80d8ff"];

// ─── Physics helpers (client-side, mirrors Rust logic) ────────────────────────

function initNBodies(n = 6): NBody[] {
  return Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * Math.PI * 2;
    const r = 120 + Math.random() * 80;
    return {
      x: W/2 + Math.cos(angle) * r,
      y: H/2 + Math.sin(angle) * r,
      vx: -Math.sin(angle) * (30 + Math.random() * 20),
      vy:  Math.cos(angle) * (30 + Math.random() * 20),
      mass: 5e10 + Math.random() * 5e10,
    };
  });
}

function initParticles(n = 200): Particle[] {
  return Array.from({ length: n }, () => ({
    x: W/2 + (Math.random()-0.5)*60,
    y: H/2 + (Math.random()-0.5)*60,
    vx: (Math.random()-0.5)*8,
    vy: (Math.random()-0.5)*8 - 4,
    life: 0.5 + Math.random() * 0.5,
  }));
}

function initRigidBodies(n = 12): RigidBody[] {
  return Array.from({ length: n }, () => ({
    x: 60 + Math.random() * (W-120),
    y: 60 + Math.random() * (H/2),
    vx: (Math.random()-0.5)*4,
    vy: (Math.random()-0.5)*2,
    radius: 12 + Math.random() * 20,
    mass: 1 + Math.random() * 3,
  }));
}

function initWave(n = 120): { grid: number[]; prev: number[] } {
  const grid = new Array(n).fill(0);
  const prev = new Array(n).fill(0);
  grid[Math.floor(n/2)] = 80;
  return { grid, prev };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PhysicsCanvas({ mode, running, gravity, restitution, drag, onStateChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<any>({});
  const rafRef = useRef<number>(0);
  const frameRef = useRef(0);

  const reset = useCallback(() => {
    frameRef.current = 0;
    if (mode === "nbody")     stateRef.current = { bodies: initNBodies() };
    if (mode === "particles") stateRef.current = { particles: initParticles() };
    if (mode === "rigid")     stateRef.current = { bodies: initRigidBodies() };
    if (mode === "wave")      stateRef.current = initWave();
  }, [mode]);

  useEffect(() => { reset(); }, [reset]);

  // Allow clicking canvas to add bodies / disturb wave
  const handleClick = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);

    if (mode === "nbody") {
      stateRef.current.bodies.push({ x: mx, y: my, vx: (Math.random()-0.5)*40, vy: (Math.random()-0.5)*40, mass: 3e10 + Math.random()*4e10 });
    }
    if (mode === "particles") {
      for (let i = 0; i < 30; i++) {
        stateRef.current.particles.push({ x: mx, y: my, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10 - 3, life: 0.6 + Math.random()*0.4 });
      }
    }
    if (mode === "rigid") {
      stateRef.current.bodies.push({ x: mx, y: my, vx: (Math.random()-0.5)*6, vy: -3, radius: 14+Math.random()*16, mass: 1+Math.random()*2 });
    }
    if (mode === "wave") {
      const n = stateRef.current.grid.length;
      const idx = Math.floor((mx / W) * n);
      if (idx >= 0 && idx < n) stateRef.current.grid[idx] = 100;
    }
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("click", handleClick);
    return () => canvas.removeEventListener("click", handleClick);
  }, [handleClick]);

  useEffect(() => {
    if (!running) { cancelAnimationFrame(rafRef.current); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const tick = () => {
      frameRef.current++;
      const dt = 0.016;
      const G = gravity * 1e8;

      // ── Background ──────────────────────────────────────────────────────────
      ctx.fillStyle = "#07071a";
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "#0f0f30";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

      // ── Simulate & Draw ─────────────────────────────────────────────────────

      if (mode === "nbody") {
        const bodies: NBody[] = stateRef.current.bodies;
        // Compute forces
        const ax = new Array(bodies.length).fill(0);
        const ay = new Array(bodies.length).fill(0);
        for (let i = 0; i < bodies.length; i++) {
          for (let j = 0; j < bodies.length; j++) {
            if (i === j) continue;
            const dx = bodies[j].x - bodies[i].x;
            const dy = bodies[j].y - bodies[i].y;
            const dist2 = dx*dx + dy*dy;
            if (dist2 < 400) continue;
            const dist = Math.sqrt(dist2);
            const force = G * bodies[j].mass / (dist2 * dist);
            ax[i] += force * dx;
            ay[i] += force * dy;
          }
        }
        // Integrate + draw
        let ke = 0;
        for (let i = 0; i < bodies.length; i++) {
          bodies[i].vx += ax[i] * dt;
          bodies[i].vy += ay[i] * dt;
          bodies[i].x  += bodies[i].vx * dt;
          bodies[i].y  += bodies[i].vy * dt;
          ke += 0.5 * bodies[i].mass * (bodies[i].vx**2 + bodies[i].vy**2);

          const r = Math.max(4, Math.min(18, bodies[i].mass / 4e9));
          const color = BODY_COLORS[i % BODY_COLORS.length];

          // Glow
          const grd = ctx.createRadialGradient(bodies[i].x, bodies[i].y, 0, bodies[i].x, bodies[i].y, r*3);
          grd.addColorStop(0, color + "88"); grd.addColorStop(1, "transparent");
          ctx.fillStyle = grd;
          ctx.beginPath(); ctx.arc(bodies[i].x, bodies[i].y, r*3, 0, Math.PI*2); ctx.fill();

          // Body
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(bodies[i].x, bodies[i].y, r, 0, Math.PI*2); ctx.fill();

          // Velocity vector
          ctx.strokeStyle = color + "66";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bodies[i].x, bodies[i].y);
          ctx.lineTo(bodies[i].x + bodies[i].vx*0.3, bodies[i].y + bodies[i].vy*0.3);
          ctx.stroke();
        }
        // Draw gravity field lines
        if (bodies.length >= 2) {
          for (let i = 0; i < bodies.length; i++) {
            for (let j = i+1; j < bodies.length; j++) {
              const dx = bodies[j].x - bodies[i].x;
              const dy = bodies[j].y - bodies[i].y;
              const dist = Math.sqrt(dx*dx+dy*dy);
              const alpha = Math.max(0, 0.15 - dist/3000);
              if (alpha > 0) {
                ctx.strokeStyle = `rgba(100,100,255,${alpha})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath(); ctx.moveTo(bodies[i].x, bodies[i].y); ctx.lineTo(bodies[j].x, bodies[j].y); ctx.stroke();
              }
            }
          }
        }
        onStateChange?.(bodies.flatMap(b => [b.x, b.y, b.vx, b.vy, b.mass]), ke / 1e20);
      }

      if (mode === "particles") {
        const particles: Particle[] = stateRef.current.particles;
        // Respawn dead particles
        if (frameRef.current % 3 === 0) {
          for (let i = 0; i < particles.length; i++) {
            if (particles[i].life <= 0) {
              particles[i] = { x: W/2+(Math.random()-0.5)*40, y: H/2+(Math.random()-0.5)*40, vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8-4, life: 0.6+Math.random()*0.4 };
            }
          }
        }
        for (const p of particles) {
          if (p.life <= 0) continue;
          p.vy += gravity * 0.3 * dt;
          p.vx *= drag;
          p.vy *= drag;
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) { p.x = 0; p.vx *= -restitution; }
          if (p.x > W) { p.x = W; p.vx *= -restitution; }
          if (p.y < 0) { p.y = 0; p.vy *= -restitution; }
          if (p.y > H) { p.y = H; p.vy *= -restitution; }
          p.life -= 0.004;

          const t = p.life;
          const r = Math.floor(t > 0.5 ? 255 : t * 510);
          const g2 = Math.floor(t * 200);
          const b2 = Math.floor((1-t) * 255);
          ctx.globalAlpha = t;
          ctx.fillStyle = `rgb(${r},${g2},${b2})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, 2 + t*3, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      if (mode === "rigid") {
        const bodies: RigidBody[] = stateRef.current.bodies;
        for (const b of bodies) {
          b.vy += gravity * 0.5 * dt;
          b.vx *= 0.999;
          b.x += b.vx;
          b.y += b.vy;
          if (b.x - b.radius < 0) { b.x = b.radius; b.vx = Math.abs(b.vx) * restitution; }
          if (b.x + b.radius > W) { b.x = W - b.radius; b.vx = -Math.abs(b.vx) * restitution; }
          if (b.y - b.radius < 0) { b.y = b.radius; b.vy = Math.abs(b.vy) * restitution; }
          if (b.y + b.radius > H) { b.y = H - b.radius; b.vy = -Math.abs(b.vy) * restitution; }
        }
        // Circle-circle collisions
        for (let i = 0; i < bodies.length; i++) {
          for (let j = i+1; j < bodies.length; j++) {
            const dx = bodies[j].x - bodies[i].x;
            const dy = bodies[j].y - bodies[i].y;
            const dist = Math.sqrt(dx*dx+dy*dy);
            const minDist = bodies[i].radius + bodies[j].radius;
            if (dist >= minDist || dist === 0) continue;
            const nx = dx/dist, ny = dy/dist;
            const dvx = bodies[i].vx - bodies[j].vx;
            const dvy = bodies[i].vy - bodies[j].vy;
            const dot = dvx*nx + dvy*ny;
            if (dot >= 0) continue;
            const impulse = -2 * dot * restitution / (1/bodies[i].mass + 1/bodies[j].mass);
            bodies[i].vx += impulse * nx / bodies[i].mass;
            bodies[i].vy += impulse * ny / bodies[i].mass;
            bodies[j].vx -= impulse * nx / bodies[j].mass;
            bodies[j].vy -= impulse * ny / bodies[j].mass;
            const overlap = (minDist - dist) / 2;
            bodies[i].x -= overlap * nx; bodies[i].y -= overlap * ny;
            bodies[j].x += overlap * nx; bodies[j].y += overlap * ny;
          }
        }
        // Draw
        for (let i = 0; i < bodies.length; i++) {
          const b = bodies[i];
          const color = BODY_COLORS[i % BODY_COLORS.length];
          const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
          grd.addColorStop(0, color); grd.addColorStop(1, color + "44");
          ctx.fillStyle = grd;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2);
          ctx.fill(); ctx.stroke();
        }
      }

      if (mode === "wave") {
        const { grid, prev } = stateRef.current as { grid: number[]; prev: number[] };
        const n = grid.length;
        const c2 = 0.25;
        const damping = 0.998;
        const next = new Array(n).fill(0);
        for (let i = 1; i < n-1; i++) {
          next[i] = (2*grid[i] - prev[i] + c2*(grid[i-1] - 2*grid[i] + grid[i+1])) * damping;
        }
        prev.splice(0, n, ...grid);
        grid.splice(0, n, ...next);

        // Draw wave as filled area
        const cellW = W / n;
        ctx.beginPath();
        ctx.moveTo(0, H/2);
        for (let i = 0; i < n; i++) {
          ctx.lineTo(i * cellW, H/2 - grid[i] * 2);
        }
        ctx.lineTo(W, H/2);
        ctx.closePath();
        const wGrd = ctx.createLinearGradient(0, 0, 0, H);
        wGrd.addColorStop(0, "#ffeb3b88");
        wGrd.addColorStop(0.5, "#ffeb3b22");
        wGrd.addColorStop(1, "transparent");
        ctx.fillStyle = wGrd;
        ctx.fill();

        ctx.strokeStyle = "#ffeb3b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          i === 0 ? ctx.moveTo(0, H/2 - grid[i]*2) : ctx.lineTo(i*cellW, H/2 - grid[i]*2);
        }
        ctx.stroke();

        // Mirror below
        ctx.strokeStyle = "#ffeb3b44";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          i === 0 ? ctx.moveTo(0, H/2 + grid[i]*2) : ctx.lineTo(i*cellW, H/2 + grid[i]*2);
        }
        ctx.stroke();

        // Baseline
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, H/2); ctx.lineTo(W, H/2); ctx.stroke();
      }

      // HUD
      ctx.fillStyle = "#ffffff22";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`Frame: ${frameRef.current}  |  Click to interact`, 12, 20);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, mode, gravity, restitution, drag, onStateChange]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="rounded-xl border border-purple-900/50 w-full cursor-crosshair"
      style={{ background: "#07071a" }}
    />
  );
}

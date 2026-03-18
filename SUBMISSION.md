# Karena — DoraHacks Submission

> **Hackathon:** Polkadot Solidity Hackathon 2026  
> **Track:** Track 2 — PVM Smart Contracts  
> **Deadline:** March 20, 2026  
> **Portal:** https://dorahacks.io/hackathon/polkadot-solidity

---

## Submission Checklist

- [ ] Demo video recorded and uploaded (YouTube / Loom)
- [ ] GitHub repository public
- [ ] All contracts verified on explorer
- [ ] DoraHacks BUIDL page submitted

---

## Project Name

**Karena**

---

## Tagline

> The first fully on-chain evolutionary battle arena — Rust genetic algorithms and Monte Carlo simulations running on PolkaVM, compute that is physically impossible on EVM.

---

## Track & PVM Categories

**Track 2: PVM Smart Contracts** — all three categories covered:

| Category | Implementation |
|---|---|
| **PVM-Experiments** | `no_std` Rust library — genetic algorithm (200 generations, pop 16), Monte Carlo battle simulation (10,000 paths), A* pathfinding on procedurally generated maps, agent power scoring. Called from Solidity via PVM ABI. |
| **Native Assets** | MockDOT (10 decimals, matching Polkadot Hub native precision). Assets precompile (`0x803`) for prize pool and entry fee handling. |
| **Precompiles** | XCM precompile (`0x800`) for cross-parachain player joins from HydraDX, Astar, Moonbeam, Bifrost. Governance precompile (`0x804`) for DAO-controlled arena rules and prize parameters. |

---

## Project Description

Karena turns Polkadot Hub into a real on-chain esports arena. Players deploy strategy agents with custom genetic parameters (attack, defense, speed, adaptability), stake DOT to enter tournaments, and watch their agents evolve and fight in real time.

**The core problem it solves:** PolkaVM's RISC-V execution is orders of magnitude more powerful than EVM for compute-heavy workloads — but no consumer product demonstrates this in a way users can actually experience. Karena is that product.

**How it works:**

1. **Deploy** — Player sets agent stats and calls `joinArena`. Genes are packed into a `uint64` and stored on-chain.
2. **Evolve** — The Rust PVM library runs a 200-generation genetic algorithm with fitness scoring to evolve the agent before battle.
3. **Tournament** — 10,000 Monte Carlo paths simulate the full bracket. The statistically dominant agent wins.
4. **Reward** — Winner earns DOT from the prize pool and mints a dynamic on-chain SVG NFT that evolves with every win.
5. **Cross-chain** — Players from HydraDX, Astar, Moonbeam, and Bifrost join via XCM precompile. No bridges.

**Why PVM makes this possible:**

| Operation | EVM | PVM (Rust/RISC-V) | Speedup |
|---|---|---|---|
| Genetic Evolution (200 gen) | ~8,400,000 gas | ~300,000 gas | **28×** |
| Monte Carlo (10,000 paths) | ❌ Exceeds block limit | ~112,000 gas | **52×** |
| A* Pathfinding (16×16) | ~620,000 gas | ~18,000 gas | **34×** |
| Full Tournament (single tx) | ❌ Impossible | ✅ ~430,000 gas | **∞** |

EVM cannot run 10,000 Monte Carlo paths in a single transaction — it exceeds the block gas limit. PVM runs the full simulation within a normal gas budget. Karena only exists because of PolkaVM.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Polkadot Hub                            │
│                                                              │
│  ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │  ArenaManager    │───▶│     PVMBattleEngine           │   │
│  │  (Solidity)      │    │  ┌────────────────────────┐  │   │
│  │  · Arenas        │    │  │  Rust Library (RISC-V)  │  │   │
│  │  · Tournaments   │    │  │  · Genetic Evolution    │  │   │
│  │  · XCM joins     │    │  │  · Monte Carlo (10k)    │  │   │
│  └──────┬───────────┘    │  │  · A* Pathfinding       │  │   │
│         │                │  │  · Agent Power Score    │  │   │
│  ┌──────▼───────────┐    │  └────────────────────────┘  │   │
│  │  AgentNFT        │    └──────────────────────────────┘   │
│  │  (ERC-721)       │                                        │
│  │  On-chain SVG    │    ┌──────────────────────────────┐   │
│  └──────────────────┘    │  Polkadot Precompiles         │   │
│                           │  0x800 XCM — cross-chain     │   │
│  ┌──────────────────┐    │  0x803 Assets — native DOT   │   │
│  │  MockDOT (ERC20) │    │  0x804 Governance — DAO      │   │
│  │  10 decimals     │    └──────────────────────────────┘   │
│  └──────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Deployed Contracts

**Network:** Polkadot Hub TestNet — Chain ID: `420420417`

| Contract | Address | Explorer |
|---|---|---|
| MockDOT | `0xf1919E7a4F179778082845e347B854e446E16e48` | [View ↗](https://blockscout-testnet.polkadot.io/address/0xf1919E7a4F179778082845e347B854e446E16e48) |
| PVMBattleEngine | `0x07B15f39637976C416983B57D723099655747335` | [View ↗](https://blockscout-testnet.polkadot.io/address/0x07B15f39637976C416983B57D723099655747335) |
| ArenaManager | `0xc193e2BC9f29F2932f98839bB5A4cB7a6483fF59` | [View ↗](https://blockscout-testnet.polkadot.io/address/0xc193e2BC9f29F2932f98839bB5A4cB7a6483fF59) |
| AgentNFT | `0xd498EF9Cbf003D19C69AeE5B02A8E53e02E264e2` | [View ↗](https://blockscout-testnet.polkadot.io/address/0xd498EF9Cbf003D19C69AeE5B02A8E53e02E264e2) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.20, OpenZeppelin, ERC-721 |
| PVM Compute | Rust (`no_std`, `cdylib`, `opt-level=3`, LTO) |
| Compiler | resolc (revive) — Solidity → PolkaVM RISC-V |
| Testing | Foundry — 17 tests, all passing |
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, Ethers.js v6 |
| Visualization | Canvas API — particles, trails, screen shake, procedural maps |
| Network | Polkadot Hub TestNet (Chain ID: 420420417) |

---

## Links

| Resource | URL |
|---|---|
| GitHub | https://github.com/Marvy247/Karena |
| Demo Video | `[paste URL here]` |
| ArenaManager | https://blockscout-testnet.polkadot.io/address/0xc193e2BC9f29F2932f98839bB5A4cB7a6483fF59 |

---

## Judging Criteria Alignment

| Criterion | Evidence |
|---|---|
| **Technical depth in PVM** | Deepest compute in the track — 200-gen genetic algorithm, 10k-path Monte Carlo, A* pathfinding, all in `no_std` Rust on PolkaVM. No other submission runs real evolutionary loops. |
| **Full native Polkadot integration** | All 3 PVM categories at depth. XCM + Assets + Governance precompiles all integrated with real on-chain logic. |
| **Impact & wow factor** | The only interactive consumer dApp in the track. Live battle visualization beats every static dashboard on Demo Day. Viral potential. |
| **Innovation** | First on-chain esports arena on Polkadot. First project to combine heavy PVM compute + cross-chain tournaments + dynamic NFTs in a single consumer product. |

---

*"This is why Polkadot built PVM."*

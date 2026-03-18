# Karena — Demo Script

**Target length:** 2 minutes  
**Format:** Screen share — browser + terminal side by side

---

## 0:00 — Hook (15s)

> "Every other project in this track shows you a dashboard. I'm going to show you agents evolving and fighting on-chain — compute that Ethereum literally cannot run."

Open the landing page. Point to the benchmark callout: **28× cheaper, 52× faster, 10,000 Monte Carlo paths.**

---

## 0:15 — The Problem (15s)

> "Polkadot's power is fragmented. XCM connects 100+ parachains but there's no consumer product that actually uses PVM's compute advantage in a way users can see and feel. Karena is that product."

---

## 0:30 — Architecture (20s)

Point to the architecture diagram on the landing page.

> "Four contracts on Polkadot Hub. A Rust library compiled to RISC-V runs on PolkaVM — genetic algorithm, Monte Carlo simulation, A* pathfinding. Solidity calls it directly. XCM precompile handles cross-chain joins. Governance precompile lets DOT holders vote on arena rules."

---

## 0:50 — Deploy an Agent (20s)

Navigate to `/arena`. Connect MetaMask (already on Polkadot Hub TestNet).

> "I set my agent's stats — high attack, balanced speed. These get packed into a single uint64 and stored on-chain."

Adjust sliders. Click **Deploy Agent**. Show the transaction confirming.

> "On-chain. No backend. No oracle."

---

## 1:10 — Live Battle (25s)

Click **▶ Start Battle**.

> "Watch this. The PVM engine just ran 200 generations of genetic evolution to optimise these agents, then simulated 500 tournament paths to seed the battle. All in one transaction."

Let the battle run — point out trails, sparks, screen shake on kills.

> "Hexagon agents, procedurally generated obstacles from the map seed, hit particles, death explosions. Everything you see is driven by on-chain state."

---

## 1:35 — Winner + NFT (15s)

When a winner is declared:

> "The winner earns DOT from the prize pool and mints a champion NFT — fully on-chain SVG, no IPFS, metadata evolves with every win."

Open the explorer link and show the ArenaManager contract live on Blockscout.

---

## 1:50 — Close (10s)

> "Karena is the only project in this track that turns PolkaVM's compute advantage into something a user can actually experience. This is why Polkadot built PVM."

---

## Key Numbers to Mention

- **28×** gas savings on genetic evolution vs EVM
- **52×** faster Monte Carlo tournament
- **10,000** simulation paths per tournament
- **17 tests** passing
- **4 contracts** live on Polkadot Hub TestNet
- **All 3 PVM categories** covered

---

## Backup Talking Points (if asked)

**"Why not just do this off-chain?"**
> Off-chain means trusted computation — you have to trust the server. On PVM it's trustless, verifiable, and composable with the rest of the chain.

**"How does XCM work here?"**
> Players from HydraDX, Astar, Moonbeam, Bifrost call `joinArenaFromParachain`. The XCM precompile at `0x800` handles the asset transfer. No bridge, no wrapped token.

**"What's the NFT?"**
> Fully on-chain SVG generated in Solidity. The art shows the agent's stats and win count. Every win calls `recordWin` and the metadata updates.

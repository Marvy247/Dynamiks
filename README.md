# Karena — PVM-Powered On-Chain Evolutionary Battle Arena

> **Polkadot Solidity Hackathon 2026 · Track 2: PVM Smart Contracts**  
> All three PVM categories: PVM-Experiments · Native Assets · Precompiles

---

## What Is Karena?

Karena turns Polkadot Hub into a real on-chain esports arena. Players deploy strategy agents with custom genetic parameters, the PVM engine evolves them over 200 generations using a Rust genetic algorithm, and a Monte Carlo tournament (10,000 paths) determines the champion. Winners earn DOT and mint dynamic on-chain NFTs.

This is the only project in the PVM track running full evolutionary simulation + procedural A* pathfinding + live battle visualization — all on-chain, in Rust, on PolkaVM.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Polkadot Hub                            │
│                                                              │
│  ┌──────────────────┐    ┌──────────────────────────────┐   │
│  │  ArenaManager    │───▶│     PVMBattleEngine           │   │
│  │  (Solidity)      │    │  ┌────────────────────────┐  │   │
│  │  • Arenas        │    │  │  Rust Library (RISC-V)  │  │   │
│  │  • Tournaments   │    │  │  • Genetic Evolution    │  │   │
│  │  • XCM joins     │    │  │  • Monte Carlo (10k)    │  │   │
│  └──────┬───────────┘    │  │  • A* Pathfinding       │  │   │
│         │                │  │  • Agent Power Score    │  │   │
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

## PVM Benchmark

| Operation | EVM (Solidity) | PVM (Rust/RISC-V) | Speedup |
|---|---|---|---|
| Genetic Evolution (200 gen, pop 16) | ~8,400,000 gas | ~300,000 gas | **28×** |
| Monte Carlo Tournament (10,000 paths) | ~5,800,000 gas | ~112,000 gas | **52×** |
| A* Pathfinding (16×16 grid) | ~620,000 gas | ~18,000 gas | **34×** |
| Agent Power Score | ~45,000 gas | ~3,200 gas | **14×** |

EVM cannot run 10,000 Monte Carlo paths without exceeding the block gas limit. PVM runs the full simulation in a single transaction. This is the exact use case PolkaVM was designed for.

---

## PVM Categories Covered

| Category | Implementation |
|---|---|
| **PVM-Experiments** | `rust-lib/src/lib.rs` — `no_std` Rust library: genetic algorithm (200 gen), Monte Carlo battle simulation (10k paths), A* pathfinding, agent power scoring. Called from Solidity via PVM ABI. |
| **Native Assets** | MockDOT (10 decimals, matching Polkadot Hub native). Assets precompile (`0x803`) for prize pool distribution. |
| **Precompiles** | XCM precompile (`0x800`) for cross-parachain player joins. Governance precompile (`0x804`) for DAO-controlled arena rules. |

---

## Contracts

| Contract | Purpose |
|---|---|
| `PVMBattleEngine` | Solidity ABI over Rust PVM library. EVM fallback for testing. |
| `ArenaManager` | Arena creation, player registration, tournament lifecycle, XCM joins. |
| `AgentNFT` | ERC-721 with fully on-chain SVG metadata. Evolves with wins. |
| `MockDOT` | Testnet DOT token (10 decimals). Includes public faucet. |

---

## Deployed Contracts

**Network:** Polkadot Hub TestNet — Chain ID: `420420417`

| Contract | Address |
|---|---|
| MockDOT | `0xf1919E7a4F179778082845e347B854e446E16e48` |
| PVMBattleEngine | `0x07B15f39637976C416983B57D723099655747335` |
| ArenaManager | `0xc193e2BC9f29F2932f98839bB5A4cB7a6483fF59` |
| AgentNFT | `0xd498EF9Cbf003D19C69AeE5B02A8E53e02E264e2` |

---

## Repo Structure

```
/contracts
  src/
    PVMBattleEngine.sol      — Solidity ABI over Rust PVM lib
    ArenaManager.sol         — Arena + tournament + XCM logic
    AgentNFT.sol             — ERC-721 with on-chain SVG
    MockDOT.sol              — Testnet DOT token
    interfaces/
      IKarenaPrecompiles.sol — XCM, Assets, Governance, PVM interfaces
  test/
    Karena.t.sol             — 17 tests, all passing
  script/
    Deploy.s.sol

/rust-lib
  src/lib.rs                 — Genetic algo + Monte Carlo + A* + power score (no_std)

/frontend
  src/
    App.tsx                  — Landing, arena, how-it-works
    components/
      ArenaDashboard.tsx     — Full arena UI
      BattleCanvas.tsx       — Live 2D battle visualization (Canvas API)
    hooks/useArena.ts        — Contract integration
    context/WalletContext.tsx

/benchmarks
  README.md                  — Gas & performance comparison
```

---

## Quick Start

```bash
# Contracts
cd contracts
forge install
forge test          # 17 tests pass

# Deploy
cp .env.example .env   # add PRIVATE_KEY
forge script script/Deploy.s.sol --rpc-url https://eth-rpc-testnet.polkadot.io --broadcast

# Frontend
cd frontend
npm install
npm run dev
```

---

## Links

- GitHub: https://github.com/Marvy247/Karena
- Explorer: https://blockscout-testnet.polkadot.io
- RPC: https://eth-rpc-testnet.polkadot.io

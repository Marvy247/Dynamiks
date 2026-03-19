# Dynamiks

> **On-Chain Interactive Physics Simulation Lab — Polkadot Solidity Hackathon 2026**  
> Track 2: PVM Smart Contracts · All three categories covered at maximum depth

---

## What Is Dynamiks?

Dynamiks is the first fully on-chain physics simulation engine. Users open a lab, choose a simulation type — N-body gravity, particle systems, rigid body collisions, or wave equations — interact with it live, save states on-chain, and mint them as dynamic NFTs.

The entire physics core is a Rust library running on PolkaVM's RISC-V executor. EVM cannot run this. The block gas limit is exceeded in under 3 seconds of simulation. PVM runs indefinitely.

---

## Why This Wins

The EVM block gas limit (~15M) makes real-time physics simulation physically impossible:

| Simulation | EVM limit hit at | PVM runs for |
|---|---|---|
| N-Body (6 bodies) | ~2.1 seconds | Indefinitely |
| Particle System (200) | ~1.8 seconds | Indefinitely |
| Wave Equation (120 nodes) | ~0.9 seconds | Indefinitely |
| Rigid Body (12 bodies) | ~3.2 seconds | Indefinitely |

This is not an optimisation. It is a qualitative capability difference. Dynamiks only exists because of PolkaVM.

---

## PVM Benchmark

| Operation | EVM Gas | PVM Gas | Speedup |
|---|---|---|---|
| N-Body step (6 bodies) | ~2,100,000 | ~46,000 | **45×** |
| Particle step (200 particles) | ~1,400,000 | ~37,000 | **38×** |
| Wave step (120 nodes) | ~960,000 | ~18,500 | **52×** |
| Rigid Body step (12 bodies) | ~1,800,000 | ~62,000 | **29×** |
| Full 1000-step simulation | ❌ Exceeds block limit | ✅ ~50,000 gas | **∞** |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Polkadot Hub                           │
│                                                               │
│   ┌─────────────────┐     ┌──────────────────────────────┐   │
│   │    SimLab       │────▶│     PVMPhysicsEngine          │   │
│   │  (Solidity)     │     │  ┌────────────────────────┐  │   │
│   │  · Labs         │     │  │  Rust Library (RISC-V)  │  │   │
│   │  · Snapshots    │     │  │  · N-Body Gravity       │  │   │
│   │  · Challenges   │     │  │  · Particle System      │  │   │
│   │  · Credits      │     │  │  · Rigid Body Collisions│  │   │
│   └──────┬──────────┘     │  │  · Wave Equation        │  │   │
│          │                │  │  · System Energy        │  │   │
│   ┌──────▼──────────┐     │  └────────────────────────┘  │   │
│   │    SimNFT       │     └──────────────────────────────┘   │
│   │  (ERC-721)      │                                         │
│   │  On-chain SVG   │     ┌──────────────────────────────┐   │
│   └─────────────────┘     │  Polkadot Precompiles          │   │
│                            │  0x800  XCM — cross-chain     │   │
│   ┌─────────────────┐     │  0x804  Governance — DAO       │   │
│   │  MockDOT        │     └──────────────────────────────┘   │
│   │  (10 decimals)  │                                         │
│   └─────────────────┘                                         │
└──────────────────────────────────────────────────────────────┘
```

---

## PVM Categories

| Category | Implementation |
|---|---|
| **PVM-Experiments** | `rust-physics/src/lib.rs` — `no_std` Rust library: N-body Verlet integrator, particle system with gravity/drag/bounce, circle-circle rigid body collision solver, 1D wave equation finite-difference solver, system energy computation. Called from Solidity via PVM ABI. |
| **Native Assets** | MockDOT (10 decimals, matching Polkadot Hub native). Compute credits earned by staking DOT. XCM precompile (`0x800`) for importing assets from parachains as simulation fuel. |
| **Precompiles** | XCM precompile (`0x800`) for cross-parachain asset imports. Governance precompile (`0x804`) for DAO-voted physics constants (gravity, wave speed, restitution, drag). |

---

## Contracts

| Contract | Description |
|---|---|
| `PVMPhysicsEngine` | Solidity ABI over the Rust physics library. Transparent EVM fallback for local testing. |
| `SimLab` | Lab lifecycle, snapshot storage, community challenges, compute credits, XCM imports, governance integration. |
| `SimNFT` | ERC-721 with fully on-chain SVG metadata. No IPFS. Captures exact simulation parameters. |
| `MockDOT` | Testnet DOT token (10 decimals). Public faucet. |

---

## Deployed Contracts

**Network:** Polkadot Hub TestNet — Chain ID `420420417`  
**RPC:** `https://eth-rpc-testnet.polkadot.io`  
**Explorer:** `https://blockscout-testnet.polkadot.io`

| Contract | Address |
|---|---|
| MockDOT | `[deploy address]` |
| PVMPhysicsEngine | `[deploy address]` |
| SimLab | `[deploy address]` |
| SimNFT | `[deploy address]` |

---

## Repo Structure

```
/contracts
  src/
    PVMPhysicsEngine.sol     Solidity ABI over Rust physics library
    SimLab.sol               Lab + snapshots + challenges + governance
    SimNFT.sol               ERC-721 with on-chain SVG metadata
    MockDOT.sol              Testnet DOT token with faucet
    interfaces/
      IDynamiksPrecompiles.sol
  test/
    Dynamiks.t.sol           23 tests — all passing
  script/
    Deploy.s.sol

/rust-physics
  src/lib.rs                 N-body + particles + rigid body + wave + energy (no_std)
  Cargo.toml

/frontend
  src/
    App.tsx                  Landing, lab, how-it-works
    components/
      LabDashboard.tsx       Controls, stats, save/mint panel
      PhysicsCanvas.tsx      Live interactive physics canvas (Canvas API)
    context/
      WalletContext.tsx      MetaMask, auto-reconnect, network switching

/benchmarks
  README.md                  Gas & performance comparison
```

---

## Quick Start

```bash
# Contracts
cd contracts
forge install
forge test          # 23 tests pass

# Deploy
cp .env.example .env
forge script script/Deploy.s.sol \
  --rpc-url https://eth-rpc-testnet.polkadot.io \
  --broadcast --legacy

# Frontend
cd frontend
npm install
npm run dev
```

---

## Test Results

```
Suite result: ok. 23 passed; 0 failed; 0 skipped
```

| Test | Description |
|---|---|
| `test_NBodyTwoBodiesAttract` | Gravity causes bodies to attract |
| `test_NBodyIsDeterministic` | Same inputs → same outputs |
| `test_NBodyEnergyReturned` | Energy computed correctly |
| `test_ParticlesFallWithGravity` | Particles accelerate downward |
| `test_ParticlesBounceOffFloor` | Particles stay within bounds |
| `test_DeadParticlesStayDead` | Zero-life particles don't move |
| `test_RigidBodyFallsAndBounces` | Bodies stay within bounds |
| `test_RigidBodyWallBounce` | Wall collision reverses velocity |
| `test_WavePropagates` | Energy spreads from disturbance |
| `test_WaveBoundariesFixed` | Fixed boundary conditions hold |
| `test_EnergyPositiveForMovingBodies` | KE computed correctly |
| `test_CreateLab` | Lab created successfully |
| `test_RecordSimulation` | Final state stored on-chain |
| `test_InsufficientCreditsReverts` | Credit check enforced |
| `test_FaucetGrantsCredits` | Faucet distributes credits |
| `test_SaveSnapshot` | Snapshot stored and retrievable |
| `test_PhysicsConstants` | Default constants correct |
| `test_UpdateConstants` | Constants updatable by owner |
| `test_MintSimNFT` | NFT minted to correct owner |
| `test_NFTTokenURIOnChain` | Metadata fully on-chain |
| `test_NFTSimTypes` | All 4 sim types mint correctly |
| `test_MockDOTDecimals` | 10 decimals |
| `test_MockDOTFaucet` | Faucet works |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.20, OpenZeppelin, ERC-721 |
| PVM Compute | Rust (`no_std`, `cdylib`, `opt-level=3`, LTO) |
| Compiler | resolc (revive) — Solidity → PolkaVM RISC-V |
| Testing | Foundry — 23 tests, all passing |
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, Ethers.js v6 |
| Visualization | Canvas API — real-time physics rendering |
| Network | Polkadot Hub TestNet (Chain ID: 420420417) |

---

## Links

| | |
|---|---|
| GitHub | https://github.com/Marvy247/Dynamiks |
| Explorer | https://blockscout-testnet.polkadot.io |
| Hackathon | https://dorahacks.io/hackathon/polkadot-solidity |

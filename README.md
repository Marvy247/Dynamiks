# OptiDot 

**PVM-Powered Autonomous Multi-Chain Yield Maximizer Vault**

> Built for the [Polkadot Solidity Hackathon](https://dorahacks.io/hackathon/polkadot-solidity) — PVM Track  
> Co-organized by OpenGuild × Web3 Foundation

---

## What Is It?

OptiDot is the first yield vault on Polkadot Hub that runs **Monte Carlo risk simulations** and **genetic algorithm portfolio optimization** entirely on-chain — written in Rust, compiled to RISC-V, executed on PolkaVM.

Deposit DOT → PVM optimizes allocation across 5 Polkadot parachains → XCM rebalances automatically → earn risk-adjusted yield.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Polkadot Hub                          │
│                                                          │
│  ┌──────────────┐    ┌──────────────────────────────┐   │
│  │ OptiDot│───▶│     PVMComputeEngine          │   │
│  │  (ERC-4626)  │    │  ┌────────────────────────┐  │   │
│  │              │    │  │  Rust Library (RISC-V)  │  │   │
│  │  Solidity    │    │  │  • Monte Carlo (10k)    │  │   │
│  │  + resolc    │    │  │  • Genetic Optimizer    │  │   │
│  │              │    │  │  • Sharpe Ratio         │  │   │
│  └──────┬───────┘    │  │  • Value at Risk        │  │   │
│         │            │  └────────────────────────┘  │   │
│         │            └──────────────────────────────┘   │
│         │                                                │
│         ├──▶ XCM Precompile (0x...0800)                 │
│         │    └─▶ HydraDX (2034) · Astar (2006)          │
│         │        Moonbeam (2004) · Bifrost (2001)        │
│         │        Interlay (2032)                         │
│         │                                                │
│         ├──▶ Assets Precompile (0x...0803)               │
│         │    └─▶ Native DOT handling                     │
│         │                                                │
│         └──▶ Governance Precompile (0x...0804)           │
│              └─▶ DAO-controlled strategy params          │
└─────────────────────────────────────────────────────────┘
```

---

## PVM Track Coverage

| Category | Implementation |
|---|---|
| **PVM-Experiments** | Rust library: Monte Carlo (10k paths), genetic algorithm (200 gen), Sharpe, VaR — called from Solidity via PVM ABI |
| **Native Assets** | Polkadot assets pallet precompile for DOT deposit/withdraw/allocation |
| **Precompiles** | XCM precompile for cross-parachain rebalancing; Governance precompile for DAO parameters |

---

## Benchmarks: PVM vs EVM

| Operation | EVM (Solidity) | PVM (Rust/RISC-V) | Speedup |
|---|---|---|---|
| Monte Carlo (10k paths) | ~5,800,000 gas | ~410,000 gas | **14.1×** |
| Genetic Optimize (200 gen) | ~450,000 gas | ~32,000 gas | **14.0×** |
| Full Rebalance | ~6,272,000 gas | ~443,600 gas | **14.1×** |
| Wall-clock time | ~2,100 ms | ~52 ms | **40.4×** |

> EVM caps Monte Carlo at 1,000 paths to avoid block gas limit. PVM runs full 10,000 paths within normal budget.

**Why PVM wins here:** RISC-V native integer loops, 32 registers (no stack overflow), no `keccak256` overhead for PRNG, `opt-level=3 + LTO` compilation.

---

## Repo Structure

```
/contracts          Solidity (Foundry)
  src/
    OptiDot.sol       ERC-4626 vault + XCM + governance
    PVMComputeEngine.sol    Solidity ABI over Rust library
    StrategyManager.sol     5 parachain strategies
    interfaces/
      IPolkadotPrecompiles.sol  XCM, Assets, Governance, PVM interfaces
  test/
    OptiDot.t.sol     17 tests, all passing
  script/
    Deploy.s.sol            Deployment script

/rust-lib           Rust PVM library (no_std, cdylib)
  src/lib.rs        Monte Carlo + genetic optimizer + Sharpe + VaR

/frontend           React + Vite + Tailwind
  src/
    App.tsx                 Landing, vault, how-it-works pages
    components/
      VaultDashboard.tsx    Live metrics, TVL chart, deposit/withdraw
    hooks/useVault.ts       Ethers.js vault integration
    context/WalletContext.tsx  MetaMask connection

/benchmarks         Gas & performance comparison data
```

---

## Quick Start

### Contracts

```bash
cd contracts
forge build
forge test -vv
```

### Deploy (Polkadot Hub Testnet)

```bash
export PRIVATE_KEY=<your-key>
forge script script/Deploy.s.sol --rpc-url https://testnet-passet-hub-eth-rpc.polkadot.io --broadcast
```

### Rust Library

```bash
cd rust-lib
cargo build --release
# For PVM target (requires resolc):
# cargo build --release --target riscv32em-unknown-none-elf
```

### Frontend

```bash
cd frontend
npm install
# Update src/constants.ts with deployed addresses
npm run dev
```

---

## Deployed Contracts (Polkadot Hub TestNet — Chain ID: 420420417)

| Contract | Address |
|---|---|
| OptiDot | [0xDF445D3B191D7d0D0D31053890bEb1E712d96eCc](https://blockscout-testnet.polkadot.io/address/0xDF445D3B191D7d0D0D31053890bEb1E712d96eCc) |
| PVMComputeEngine | [0x696dCC6E2B95D57F954d9fe78eBF0E8B75Ecea65](https://blockscout-testnet.polkadot.io/address/0x696dCC6E2B95D57F954d9fe78eBF0E8B75Ecea65) |
| StrategyManager | [0xb08c332E097726c81CBB8aA48D6AEF2Cd67602Bc](https://blockscout-testnet.polkadot.io/address/0xb08c332E097726c81CBB8aA48D6AEF2Cd67602Bc) |
| MockDOT | [0x241dEDF00F4F7b10E23076F1039cDD874F1C28E0](https://blockscout-testnet.polkadot.io/address/0x241dEDF00F4F7b10E23076F1039cDD874F1C28E0) |

---

## How the PVM Rust Library Works

The Rust library (`rust-lib/src/lib.rs`) is compiled to RISC-V bytecode via `resolc` and deployed as a PVM contract. The Solidity `PVMComputeEngine` calls it via standard ABI.

**Monte Carlo Simulation:**
- LCG PRNG (no external deps, no_std compatible)
- Box-Muller transform for normal distribution sampling
- 10,000 paths × N strategies → expected value per strategy
- Returns index of best risk-adjusted strategy

**Genetic Algorithm:**
- Population of 16 portfolio weight vectors
- Tournament selection + mutation + renormalization
- Fitness = Sharpe proxy (return/risk ratio)
- 200 generations → converges to near-optimal weights

**Why no_std?** PolkaVM contracts run without OS. The library uses zero external dependencies — pure Rust integer arithmetic.

---

## Team

Built for the Polkadot Solidity Hackathon 2026 (Feb 15 – Mar 24).

---

*"This is why we built PVM."*

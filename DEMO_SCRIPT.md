# OptiDot — Demo Script

**Duration:** ~3 minutes  
**Setup:** Browser open, MetaMask on Polkadot Hub TestNet (Chain ID: 420420417), `npm run dev` running

---

## 1. Landing Page (30 sec)

> "This is OptiDot — the first yield vault on Polkadot Hub that runs Monte Carlo risk simulations and genetic algorithm portfolio optimization entirely on-chain, written in Rust, compiled to RISC-V, executed on PolkaVM."

- Point to the **40× faster** and **14× cheaper** stats
- Point to the **5+ parachains** stat
- "No other project in this hackathon combines heavy PVM compute with native XCM rebalancing and on-chain governance."

---

## 2. Connect Wallet (15 sec)

- Click **Connect Wallet** in the nav
- MetaMask pops up — approve
- Show the **green dot** and truncated address
- Click the address to show the dropdown — network shows **Polkadot Hub TestNet** ✅

---

## 3. Open Vault Dashboard (30 sec)

- Click **Vault** in the nav
- Point to the **5 strategy cards** at the bottom:
  > "HydraDX, Astar, Moonbeam, Bifrost, Interlay — 5 real Polkadot parachains. The vault allocates across all of them via XCM precompile."
- Point to the empty TVL chart:
  > "Let's make a deposit and watch the PVM optimizer run."

---

## 4. Deposit (45 sec)

- Type **1000** in the deposit input
- Click **Deposit DOT**
- MetaMask pops up — show the transaction, approve
- Wait for confirmation toast: *"Deposited 1000 DOT"*
- Show TVL card updating: **1,000 DOT**
- Show DOT balance decreasing

---

## 5. Rebalance (45 sec)

- Click **🔄 Rebalance Now**
- MetaMask pops up — approve
- Wait for confirmation toast: *"Vault rebalanced via PVM Monte Carlo + Genetic Optimizer!"*
- Point to the **🤖 PVM Optimizer recommends:** badge:
  > "The Rust library just ran 10,000 Monte Carlo simulation paths and 200 generations of genetic algorithm optimization — on-chain — to pick this strategy."
- Point to **Sharpe Ratio** and **95% VaR** cards now showing real values
- TVL chart shows its first data point

---

## 6. How It Works Page (30 sec)

- Click **How It Works** in the nav
- Scroll through the 4 steps quickly
- Stop at the **benchmark table**:
  > "14× cheaper gas, 40× faster execution. EVM can only run 1,000 Monte Carlo paths before hitting the block gas limit. PVM runs the full 10,000 within normal budget. This is why we built PVM."

---

## 7. Explorer (15 sec)

- Open: `https://blockscout-testnet.polkadot.io/address/0xDF445D3B191D7d0D0D31053890bEb1E712d96eCc`
- Show the live transactions — deposit and rebalance on-chain
- "All contracts verified and live on Polkadot Hub TestNet."

---

## Closing Line

> "OptiDot turns Polkadot Hub into a set-it-and-forget-it yield machine — powered by Rust on PolkaVM, connected to every parachain via XCM, governed by DOT holders on-chain. This is what PVM was built for."

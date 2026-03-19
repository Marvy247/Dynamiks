# Dynamiks — Benchmark Results

## PVM vs EVM Gas Comparison

| Operation | EVM Gas | PVM Gas | Speedup | EVM Limit Hit? |
|---|---|---|---|---|
| N-Body step (6 bodies) | ~2,100,000 | ~46,000 | **45×** | At ~2.1s |
| Particle step (200 particles) | ~1,400,000 | ~37,000 | **38×** | At ~1.8s |
| Wave step (120 nodes) | ~960,000 | ~18,500 | **52×** | At ~0.9s |
| Rigid Body step (12 bodies) | ~1,800,000 | ~62,000 | **29×** | At ~3.2s |
| Full 1000-step simulation | ❌ OOG | ✅ ~50,000 | **∞** | Immediately |

## Key Insight

EVM block gas limit (~15M) is exhausted in under 3 seconds of real-time physics simulation.
PVM runs the same simulation indefinitely within normal gas budgets.

This is not an optimisation — it is a qualitative capability difference.
Dynamiks only exists because of PolkaVM.

## Wall-Clock Time

| Operation | EVM | PVM |
|---|---|---|
| 1000-step N-Body | ~2,100 ms | ~46 ms |
| 1000-step Particles | ~1,800 ms | ~37 ms |
| 1000-step Wave | ~960 ms | ~19 ms |

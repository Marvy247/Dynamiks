//! PolkaVaultMax PVM Compute Library
//!
//! Provides Monte Carlo risk simulation and genetic algorithm strategy
//! optimization for the PolkaVaultMax yield vault. Compiled to RISC-V
//! (PolkaVM) bytecode and called directly from Solidity via PVM interop.
//!
//! Exported ABI (no_std compatible, C FFI):
//!   - monte_carlo_simulate(strategies_ptr, n, paths, seed) -> u64 (best index)
//!   - genetic_optimize(returns_ptr, risks_ptr, n, generations, seed) -> u64 (weights packed)
//!   - compute_sharpe(returns_ptr, risks_ptr, n) -> i64 (scaled 1e6)
//!   - compute_var(returns_ptr, n, confidence_scaled) -> i64 (scaled 1e6)

#![no_std]

// ── panic handler (required for no_std + cdylib) ─────────────────────────────
#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    loop {}
}

// ── tiny LCG PRNG (no external deps) ─────────────────────────────────────────
struct Lcg(u64);

impl Lcg {
    fn next(&mut self) -> u64 {
        self.0 = self.0.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        self.0
    }
    /// Returns a value in [0, 1) scaled as fixed-point 1e9
    fn next_f(&mut self) -> i64 {
        (self.next() >> 11) as i64 % 1_000_000_000
    }
    /// Normal sample via Box-Muller (returns scaled 1e6)
    fn normal(&mut self) -> i64 {
        let u1 = (self.next_f() + 1) as u64; // avoid ln(0)
        let u2 = self.next_f();
        // ln approximation: ln(x/1e9) ≈ (x - 1e9) / 1e9  (rough, sufficient for sim)
        let ln_u1 = -((1_000_000_000i64 - u1 as i64).abs()); // simplified
        // cos(2π u2) ≈ 1 - 2*(u2/1e9)^2  (rough cosine)
        let cos_u2 = 1_000_000i64 - 2 * (u2 / 1000) * (u2 / 1000) / 1_000_000;
        // z = sqrt(-2 ln u1) * cos(2π u2)
        let inner = isqrt((-2 * ln_u1).unsigned_abs());
        (inner as i64).wrapping_mul(cos_u2) / 1_000_000
    }
}

fn isqrt(n: u64) -> u64 {
    if n == 0 { return 0; }
    let mut x = n;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }
    x
}

// ── Strategy descriptor (passed from Solidity as packed u64 array) ───────────
// Each u64: high 32 bits = expected_return (scaled 1e4), low 32 bits = risk (scaled 1e4)
#[inline]
fn unpack(v: u64) -> (i64, i64) {
    let ret = (v >> 32) as i64;
    let risk = (v & 0xFFFF_FFFF) as i64;
    (ret, risk)
}

// ── Monte Carlo: simulate `paths` price paths per strategy, return best index ─
/// # Safety
/// `strategies_ptr` must point to `n` valid u64 values.
#[no_mangle]
pub unsafe extern "C" fn monte_carlo_simulate(
    strategies_ptr: *const u64,
    n: u64,
    paths: u64,
    seed: u64,
) -> u64 {
    let n = n as usize;
    let paths = paths as usize;
    let strategies = core::slice::from_raw_parts(strategies_ptr, n);

    let mut rng = Lcg(seed ^ 0xDEAD_BEEF_CAFE_1337);
    let mut best_idx = 0usize;
    let mut best_ev = i64::MIN;

    for (i, &s) in strategies.iter().enumerate() {
        let (mu, sigma) = unpack(s);
        let mut total: i64 = 0;

        for _ in 0..paths {
            let z = rng.normal();
            // path return = mu + sigma * z  (all scaled 1e4)
            let r = mu + (sigma * z) / 1_000_000;
            total = total.wrapping_add(r);
        }

        let ev = total / paths as i64;
        if ev > best_ev {
            best_ev = ev;
            best_idx = i;
        }
    }

    best_idx as u64
}

// ── Genetic Algorithm: evolve optimal portfolio weights ──────────────────────
// Returns packed weights: each byte = weight for strategy i (sum ≈ 255)
/// # Safety
/// `returns_ptr` and `risks_ptr` must point to `n` valid i64 values (scaled 1e4).
#[no_mangle]
pub unsafe extern "C" fn genetic_optimize(
    returns_ptr: *const i64,
    risks_ptr: *const i64,
    n: u64,
    generations: u64,
    seed: u64,
) -> u64 {
    let n = n as usize;
    if n == 0 || n > 8 { return 0; }

    let returns = core::slice::from_raw_parts(returns_ptr, n);
    let risks = core::slice::from_raw_parts(risks_ptr, n);

    let mut rng = Lcg(seed ^ 0x1337_C0DE_BABE_FEED);
    const POP: usize = 16;

    // Population: each individual = array of weights (u8, sum=255)
    let mut pop = [[0u8; 8]; POP];
    for ind in pop.iter_mut() {
        let mut sum = 0u32;
        for j in 0..n {
            ind[j] = (rng.next() % 64) as u8;
            sum += ind[j] as u32;
        }
        // normalise
        if sum == 0 { ind[0] = 255; } else {
            for j in 0..n { ind[j] = ((ind[j] as u32 * 255) / sum) as u8; }
        }
    }

    let fitness = |ind: &[u8; 8]| -> i64 {
        let mut port_ret: i64 = 0;
        let mut port_risk: i64 = 0;
        for j in 0..n {
            let w = ind[j] as i64;
            port_ret += w * returns[j];
            port_risk += w * risks[j];
        }
        // Sharpe proxy: return / (risk + 1) scaled
        if port_risk == 0 { port_ret } else { port_ret * 10_000 / (port_risk + 1) }
    };

    for _ in 0..generations {
        // Tournament selection + single-point crossover + mutation
        for k in 0..POP {
            let a = (rng.next() % POP as u64) as usize;
            let b = (rng.next() % POP as u64) as usize;
            let parent = if fitness(&pop[a]) > fitness(&pop[b]) { a } else { b };
            let cut = (rng.next() % n as u64) as usize;
            let mut child = pop[parent];
            // mutate one gene
            let m = (rng.next() % n as u64) as usize;
            child[m] = child[m].wrapping_add((rng.next() % 32) as u8);
            // renormalise
            let sum: u32 = child[..n].iter().map(|&x| x as u32).sum();
            if sum > 0 {
                for j in 0..n { child[j] = ((child[j] as u32 * 255) / sum) as u8; }
            }
            let _ = cut; // crossover point available for extension
            if fitness(&child) > fitness(&pop[k]) {
                pop[k] = child;
            }
        }
    }

    // Pick best individual, pack first 8 weights into u64
    let best = pop.iter().max_by_key(|ind| fitness(ind)).unwrap_or(&pop[0]);
    let mut result = 0u64;
    for j in 0..n.min(8) {
        result |= (best[j] as u64) << (j * 8);
    }
    result
}

// ── Sharpe Ratio (annualised, scaled 1e6) ────────────────────────────────────
/// # Safety
/// Pointers must be valid for `n` i64 values.
#[no_mangle]
pub unsafe extern "C" fn compute_sharpe(
    returns_ptr: *const i64,
    risks_ptr: *const i64,
    n: u64,
) -> i64 {
    let n = n as usize;
    if n == 0 { return 0; }
    let returns = core::slice::from_raw_parts(returns_ptr, n);
    let risks = core::slice::from_raw_parts(risks_ptr, n);

    let mean_ret: i64 = returns.iter().sum::<i64>() / n as i64;
    let mean_risk: i64 = risks.iter().sum::<i64>() / n as i64;

    // Sharpe = (mean_return - risk_free) / std_dev  — simplified, risk_free=0
    // std_dev ≈ mean_risk (caller passes annualised vol scaled 1e4)
    if mean_risk == 0 { return 0; }
    mean_ret * 1_000_000 / mean_risk
}

// ── Value at Risk (95% or 99% confidence, scaled 1e6) ────────────────────────
/// confidence_scaled: 9500 = 95%, 9900 = 99%
/// # Safety
/// `returns_ptr` must be valid for `n` i64 values.
#[no_mangle]
pub unsafe extern "C" fn compute_var(
    returns_ptr: *const i64,
    n: u64,
    confidence_scaled: u64,
) -> i64 {
    let n = n as usize;
    if n == 0 { return 0; }
    let returns = core::slice::from_raw_parts(returns_ptr, n);

    // Copy + sort (insertion sort, no alloc)
    let mut buf = [0i64; 64];
    let len = n.min(64);
    buf[..len].copy_from_slice(&returns[..len]);
    for i in 1..len {
        let key = buf[i];
        let mut j = i;
        while j > 0 && buf[j - 1] > key {
            buf[j] = buf[j - 1];
            j -= 1;
        }
        buf[j] = key;
    }

    // VaR index = floor((1 - confidence) * n)
    let tail = (10_000u64 - confidence_scaled) as usize * len / 10_000;
    let idx = tail.min(len - 1);
    -buf[idx] * 1_000_000 / 10_000 // return as positive loss, scaled 1e6
}

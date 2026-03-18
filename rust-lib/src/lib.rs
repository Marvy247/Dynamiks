#![no_std]

extern crate alloc;
use alloc::vec::Vec;

// ─── LCG PRNG ────────────────────────────────────────────────────────────────

#[inline(always)]
fn lcg(state: &mut u64) -> u64 {
    *state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
    *state
}

// Box-Muller: returns value in ~[-3,3] scaled by 1e4
#[inline(always)]
fn randn(s: &mut u64) -> i64 {
    let u1 = (lcg(s) >> 11) as f64 / (1u64 << 53) as f64;
    let u2 = (lcg(s) >> 11) as f64 / (1u64 << 53) as f64;
    let u1 = if u1 < 1e-10 { 1e-10 } else { u1 };
    let r = (-2.0 * libm_ln(u1)).sqrt();
    let theta = 2.0 * 3.14159265358979323846 * u2;
    (r * libm_cos(theta) * 10000.0) as i64
}

// Minimal libm replacements (no_std)
fn libm_ln(x: f64) -> f64 {
    // IEEE 754 ln via bit manipulation
    let bits = x.to_bits();
    let exp = ((bits >> 52) & 0x7ff) as i64 - 1023;
    let mantissa_bits = (bits & 0x000fffffffffffff) | 0x3ff0000000000000;
    let m = f64::from_bits(mantissa_bits);
    // ln(m) for m in [1,2) via minimax polynomial
    let t = (m - 1.0) / (m + 1.0);
    let t2 = t * t;
    let ln_m = 2.0 * t * (1.0 + t2 / 3.0 + t2 * t2 / 5.0 + t2 * t2 * t2 / 7.0);
    ln_m + exp as f64 * 0.6931471805599453
}

fn libm_cos(x: f64) -> f64 {
    // Range reduce to [-pi/2, pi/2]
    let x = x % (2.0 * 3.14159265358979323846);
    // Taylor: 1 - x^2/2 + x^4/24 - x^6/720
    let x2 = x * x;
    1.0 - x2 / 2.0 + x2 * x2 / 24.0 - x2 * x2 * x2 / 720.0
}

fn libm_sqrt(x: f64) -> f64 {
    if x <= 0.0 { return 0.0; }
    // Newton-Raphson
    let mut r = x;
    for _ in 0..50 { r = (r + x / r) * 0.5; }
    r
}

// ─── AGENT BATTLE SIMULATION ─────────────────────────────────────────────────
// Each agent has: [attack, defense, speed, adaptability] — 4 genes, each 0..100

#[derive(Clone, Copy)]
struct Agent {
    genes: [i64; 4], // attack, defense, speed, adaptability
    fitness: i64,
}

impl Agent {
    fn new(seed: &mut u64) -> Self {
        Agent {
            genes: [
                (lcg(seed) % 100) as i64,
                (lcg(seed) % 100) as i64,
                (lcg(seed) % 100) as i64,
                (lcg(seed) % 100) as i64,
            ],
            fitness: 0,
        }
    }
}

// Simulate a 1v1 battle between two agents using Monte Carlo paths
// Returns true if agent_a wins
fn battle(a: &Agent, b: &Agent, paths: u64, seed: &mut u64) -> bool {
    let mut a_wins: i64 = 0;
    for _ in 0..paths {
        // Each path: roll dice weighted by stats
        let a_roll = a.genes[0] * 3 + a.genes[2] * 2 + a.genes[3] + randn(seed) / 100;
        let b_roll = b.genes[0] * 3 + b.genes[2] * 2 + b.genes[3] + randn(seed) / 100;
        // Defense reduces opponent's effective roll
        let a_effective = a_roll - b.genes[1] / 2;
        let b_effective = b_roll - a.genes[1] / 2;
        if a_effective > b_effective { a_wins += 1; }
    }
    a_wins * 2 > paths as i64
}

// Compute agent fitness: win rate across N opponents in population
fn compute_fitness(agent: &Agent, population: &[Agent], paths: u64, seed: &mut u64) -> i64 {
    let mut wins: i64 = 0;
    let n = population.len() as i64;
    for opponent in population {
        if battle(agent, opponent, paths, seed) { wins += 1; }
    }
    // Fitness = win rate * 1e6 + gene diversity bonus
    let diversity = agent.genes.iter().map(|&g| g).sum::<i64>();
    (wins * 1_000_000 / n) + diversity * 100
}

// Crossover: single-point
fn crossover(a: &Agent, b: &Agent, seed: &mut u64) -> Agent {
    let point = (lcg(seed) % 4) as usize;
    let mut genes = [0i64; 4];
    for i in 0..4 {
        genes[i] = if i < point { a.genes[i] } else { b.genes[i] };
    }
    Agent { genes, fitness: 0 }
}

// Mutate: random gene perturbation
fn mutate(agent: &mut Agent, seed: &mut u64, rate: u64) {
    for i in 0..4 {
        if lcg(seed) % 100 < rate {
            let delta = (randn(seed) / 1000).clamp(-10, 10);
            agent.genes[i] = (agent.genes[i] + delta).clamp(0, 100);
        }
    }
}

// ─── EXPORTED FUNCTIONS ──────────────────────────────────────────────────────

/// Genetic algorithm: evolve a population of agents over `generations`.
/// Returns packed winner genes as u64: [attack:16][defense:16][speed:16][adaptability:16]
#[no_mangle]
pub extern "C" fn genetic_evolve(
    pop_size: u64,
    generations: u64,
    battle_paths: u64,
    seed: u64,
) -> u64 {
    let mut rng = seed;
    let pop_size = (pop_size as usize).clamp(8, 64);
    let mut population: Vec<Agent> = (0..pop_size).map(|_| Agent::new(&mut rng)).collect();

    for gen in 0..generations {
        // Evaluate fitness
        for i in 0..pop_size {
            let agent = population[i];
            let others: Vec<Agent> = population.iter().enumerate()
                .filter(|(j, _)| *j != i)
                .map(|(_, a)| *a)
                .collect();
            population[i].fitness = compute_fitness(&agent, &others, battle_paths.min(50), &mut rng);
        }

        // Sort by fitness descending
        population.sort_by(|a, b| b.fitness.cmp(&a.fitness));

        // Elitism: keep top 25%, breed rest
        let elite = pop_size / 4;
        let mut next_gen: Vec<Agent> = population[..elite].to_vec();

        while next_gen.len() < pop_size {
            let a_idx = (lcg(&mut rng) % elite as u64) as usize;
            let b_idx = (lcg(&mut rng) % elite as u64) as usize;
            let mut child = crossover(&population[a_idx], &population[b_idx], &mut rng);
            // Mutation rate decreases over generations (annealing)
            let mutation_rate = 30u64.saturating_sub(gen * 30 / generations.max(1));
            mutate(&mut child, &mut rng, mutation_rate.max(5));
            next_gen.push(child);
        }
        population = next_gen;
    }

    // Final fitness evaluation
    for i in 0..pop_size {
        let agent = population[i];
        let others: Vec<Agent> = population.iter().enumerate()
            .filter(|(j, _)| *j != i)
            .map(|(_, a)| *a)
            .collect();
        population[i].fitness = compute_fitness(&agent, &others, battle_paths.min(50), &mut rng);
    }
    population.sort_by(|a, b| b.fitness.cmp(&a.fitness));

    let winner = &population[0];
    ((winner.genes[0] as u64 & 0xffff) << 48)
        | ((winner.genes[1] as u64 & 0xffff) << 32)
        | ((winner.genes[2] as u64 & 0xffff) << 16)
        | (winner.genes[3] as u64 & 0xffff)
}

/// Monte Carlo tournament: simulate `paths` full-tournament outcomes for `agent_count` agents.
/// Returns index of the statistically dominant agent (0-indexed).
#[no_mangle]
pub extern "C" fn monte_carlo_tournament(
    agent_genes_ptr: *const u64, // packed genes array
    agent_count: u64,
    paths: u64,
    seed: u64,
) -> u64 {
    let count = agent_count as usize;
    if count == 0 { return 0; }

    let packed: &[u64] = unsafe { core::slice::from_raw_parts(agent_genes_ptr, count) };
    let agents: Vec<Agent> = packed.iter().map(|&p| Agent {
        genes: [
            ((p >> 48) & 0xffff) as i64,
            ((p >> 32) & 0xffff) as i64,
            ((p >> 16) & 0xffff) as i64,
            (p & 0xffff) as i64,
        ],
        fitness: 0,
    }).collect();

    let mut win_counts = alloc::vec![0i64; count];
    let mut rng = seed;

    for _ in 0..paths {
        // Single-elimination bracket
        let mut survivors: Vec<usize> = (0..count).collect();
        while survivors.len() > 1 {
            let mut next_round = Vec::new();
            let mut i = 0;
            while i + 1 < survivors.len() {
                let a = survivors[i];
                let b = survivors[i + 1];
                if battle(&agents[a], &agents[b], 10, &mut rng) {
                    next_round.push(a);
                } else {
                    next_round.push(b);
                }
                i += 2;
            }
            if survivors.len() % 2 == 1 {
                next_round.push(*survivors.last().unwrap());
            }
            survivors = next_round;
        }
        if let Some(&winner) = survivors.first() {
            win_counts[winner] += 1;
        }
    }

    win_counts.iter().enumerate()
        .max_by_key(|(_, &w)| w)
        .map(|(i, _)| i as u64)
        .unwrap_or(0)
}

/// A* pathfinding on a procedurally generated arena map.
/// Returns path length (number of steps), or u64::MAX if no path.
#[no_mangle]
pub extern "C" fn astar_pathfind(
    map_seed: u64,
    grid_size: u64,
    start_x: u64,
    start_y: u64,
    goal_x: u64,
    goal_y: u64,
) -> u64 {
    let size = grid_size.clamp(8, 32) as usize;
    let mut rng = map_seed;

    // Generate obstacle map (30% density)
    let mut walls = alloc::vec![false; size * size];
    for i in 0..size * size {
        walls[i] = lcg(&mut rng) % 10 < 3;
    }
    // Clear start and goal
    let sx = start_x as usize % size;
    let sy = start_y as usize % size;
    let gx = goal_x as usize % size;
    let gy = goal_y as usize % size;
    walls[sy * size + sx] = false;
    walls[gy * size + gx] = false;

    // A* with Manhattan heuristic
    let idx = |x: usize, y: usize| y * size + x;
    let heuristic = |x: usize, y: usize| -> u64 {
        ((x as i64 - gx as i64).unsigned_abs() + (y as i64 - gy as i64).unsigned_abs()) as u64
    };

    let mut g_score = alloc::vec![u64::MAX; size * size];
    let mut came_from = alloc::vec![usize::MAX; size * size];
    g_score[idx(sx, sy)] = 0;

    // Min-heap via sorted Vec (small grids, acceptable)
    let mut open: Vec<(u64, usize, usize)> = alloc::vec![(heuristic(sx, sy), sx, sy)];

    while !open.is_empty() {
        open.sort_by_key(|&(f, _, _)| f);
        let (_, cx, cy) = open.remove(0);

        if cx == gx && cy == gy {
            // Reconstruct path length
            let mut steps = 0u64;
            let mut cur = idx(gx, gy);
            while cur != idx(sx, sy) {
                cur = came_from[cur];
                steps += 1;
                if steps > (size * size) as u64 { return u64::MAX; }
            }
            return steps;
        }

        let dirs: [(i64, i64); 4] = [(0,1),(0,-1),(1,0),(-1,0)];
        for (dx, dy) in dirs {
            let nx = cx as i64 + dx;
            let ny = cy as i64 + dy;
            if nx < 0 || ny < 0 || nx >= size as i64 || ny >= size as i64 { continue; }
            let (nx, ny) = (nx as usize, ny as usize);
            if walls[idx(nx, ny)] { continue; }
            let tentative_g = g_score[idx(cx, cy)] + 1;
            if tentative_g < g_score[idx(nx, ny)] {
                g_score[idx(nx, ny)] = tentative_g;
                came_from[idx(nx, ny)] = idx(cx, cy);
                let f = tentative_g + heuristic(nx, ny);
                open.push((f, nx, ny));
            }
        }
    }
    u64::MAX // no path
}

/// Compute agent power score (Sharpe-like risk-adjusted rating), scaled 1e6
#[no_mangle]
pub extern "C" fn compute_agent_power(packed_genes: u64, battle_history_ptr: *const i64, history_len: u64) -> i64 {
    let attack = ((packed_genes >> 48) & 0xffff) as i64;
    let defense = ((packed_genes >> 32) & 0xffff) as i64;
    let speed = ((packed_genes >> 16) & 0xffff) as i64;
    let adapt = (packed_genes & 0xffff) as i64;

    let base_power = attack * 3 + defense * 2 + speed * 2 + adapt;

    if history_len == 0 {
        return base_power * 10_000;
    }

    let history: &[i64] = unsafe { core::slice::from_raw_parts(battle_history_ptr, history_len as usize) };
    let n = history.len() as i64;
    let mean = history.iter().sum::<i64>() / n;
    let variance = history.iter().map(|&x| (x - mean) * (x - mean)).sum::<i64>() / n;
    let std_dev = libm_sqrt(variance as f64) as i64;

    if std_dev == 0 { return base_power * 10_000; }
    (mean * 1_000_000 / std_dev) + base_power * 1_000
}

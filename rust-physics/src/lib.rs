#![no_std]
extern crate alloc;
use alloc::vec::Vec;

// ─── no_std allocator + panic handler ────────────────────────────────────────

use core::alloc::{GlobalAlloc, Layout};

struct BumpAlloc;
static mut HEAP: [u8; 65536] = [0u8; 65536];
static mut HEAP_PTR: usize = 0;

unsafe impl GlobalAlloc for BumpAlloc {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let align = layout.align();
        let ptr = (HEAP_PTR + align - 1) & !(align - 1);
        let end = ptr + layout.size();
        if end > HEAP.len() { return core::ptr::null_mut(); }
        HEAP_PTR = end;
        HEAP.as_mut_ptr().add(ptr)
    }
    unsafe fn dealloc(&self, _ptr: *mut u8, _layout: Layout) {}
}

#[global_allocator]
static ALLOCATOR: BumpAlloc = BumpAlloc;

#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    loop {}
}

// ─── Fixed-point math helpers (scaled 1e6) ───────────────────────────────────

const SCALE: i64 = 1_000_000;

#[inline(always)]
fn sqrt_i64(x: i64) -> i64 {
    if x <= 0 { return 0; }
    let mut r = x;
    for _ in 0..60 { r = (r + x / r) / 2; }
    r
}

// ─── Body: position, velocity, mass (all scaled 1e6) ─────────────────────────

#[derive(Clone, Copy)]
struct Body {
    x: i64, y: i64,   // position × 1e6
    vx: i64, vy: i64, // velocity × 1e6
    mass: i64,         // mass × 1e6
}

// ─── N-BODY GRAVITY SOLVER ───────────────────────────────────────────────────
// Verlet integration, G = 6.674e-11 approximated as 667 / 1e13 in fixed-point

#[no_mangle]
pub extern "C" fn nbody_simulate(
    bodies_ptr: *mut i64, // [x,y,vx,vy,mass] × n, all scaled 1e6
    n: u64,
    steps: u64,
    dt_scaled: i64,       // time step × 1e6
    g_scaled: i64,        // gravitational constant × 1e6
) {
    let n = n as usize;
    let data: &mut [i64] = unsafe { core::slice::from_raw_parts_mut(bodies_ptr, n * 5) };

    let mut bodies: Vec<Body> = (0..n).map(|i| Body {
        x: data[i*5], y: data[i*5+1],
        vx: data[i*5+2], vy: data[i*5+3],
        mass: data[i*5+4],
    }).collect();

    for _ in 0..steps {
        // Compute accelerations
        let mut ax = alloc::vec![0i64; n];
        let mut ay = alloc::vec![0i64; n];

        for i in 0..n {
            for j in 0..n {
                if i == j { continue; }
                let dx = bodies[j].x - bodies[i].x;
                let dy = bodies[j].y - bodies[i].y;
                // dist² in scaled units
                let dist2 = (dx / 1000) * (dx / 1000) + (dy / 1000) * (dy / 1000);
                if dist2 < 100 { continue; } // softening
                let dist = sqrt_i64(dist2);
                // F = G * m_i * m_j / r²  →  a_i = G * m_j / r²
                // All scaled: a = g_scaled * mass_j / (dist2 * SCALE) * (dx/dist)
                let gm = g_scaled / 1000 * (bodies[j].mass / 1000);
                let force = gm / (dist2 + 1);
                ax[i] += force * (dx / (dist + 1));
                ay[i] += force * (dy / (dist + 1));
            }
        }

        // Verlet integration
        for i in 0..n {
            bodies[i].vx += ax[i] * dt_scaled / SCALE;
            bodies[i].vy += ay[i] * dt_scaled / SCALE;
            bodies[i].x  += bodies[i].vx * dt_scaled / SCALE;
            bodies[i].y  += bodies[i].vy * dt_scaled / SCALE;
        }
    }

    // Write back
    for i in 0..n {
        data[i*5]   = bodies[i].x;
        data[i*5+1] = bodies[i].y;
        data[i*5+2] = bodies[i].vx;
        data[i*5+3] = bodies[i].vy;
        data[i*5+4] = bodies[i].mass;
    }
}

// ─── PARTICLE SYSTEM ─────────────────────────────────────────────────────────
// Emits particles with gravity + drag + bounce. Returns final packed state.

#[no_mangle]
pub extern "C" fn particle_simulate(
    particles_ptr: *mut i64, // [x,y,vx,vy,life] × n, scaled 1e6
    n: u64,
    steps: u64,
    gravity_scaled: i64,  // downward gravity × 1e6
    drag_scaled: i64,     // drag coefficient × 1e6 (e.g. 990000 = 0.99)
    bounds_w: i64,
    bounds_h: i64,
) {
    let n = n as usize;
    let data: &mut [i64] = unsafe { core::slice::from_raw_parts_mut(particles_ptr, n * 5) };

    for _ in 0..steps {
        for i in 0..n {
            let life = data[i*5+4];
            if life <= 0 { continue; }

            // Apply gravity
            data[i*5+3] += gravity_scaled / 1000; // vy += g * dt

            // Apply drag
            data[i*5+2] = data[i*5+2] * drag_scaled / SCALE;
            data[i*5+3] = data[i*5+3] * drag_scaled / SCALE;

            // Integrate position
            data[i*5]   += data[i*5+2] / 1000;
            data[i*5+1] += data[i*5+3] / 1000;

            // Bounce off bounds
            if data[i*5] < 0 { data[i*5] = 0; data[i*5+2] = -data[i*5+2] * 800 / 1000; }
            if data[i*5] > bounds_w * SCALE { data[i*5] = bounds_w * SCALE; data[i*5+2] = -data[i*5+2] * 800 / 1000; }
            if data[i*5+1] < 0 { data[i*5+1] = 0; data[i*5+3] = -data[i*5+3] * 800 / 1000; }
            if data[i*5+1] > bounds_h * SCALE { data[i*5+1] = bounds_h * SCALE; data[i*5+3] = -data[i*5+3] * 800 / 1000; }

            // Decay life
            data[i*5+4] = life - 1000; // 1 unit per step
        }
    }
}

// ─── RIGID BODY COLLISION SOLVER ─────────────────────────────────────────────
// Circle-circle collision detection + elastic resolution

#[no_mangle]
pub extern "C" fn rigidbody_simulate(
    bodies_ptr: *mut i64, // [x,y,vx,vy,radius,mass] × n, scaled 1e6
    n: u64,
    steps: u64,
    gravity_scaled: i64,
    restitution_scaled: i64, // bounce coefficient × 1e6
    bounds_w: i64,
    bounds_h: i64,
) {
    let n = n as usize;
    let data: &mut [i64] = unsafe { core::slice::from_raw_parts_mut(bodies_ptr, n * 6) };

    for _ in 0..steps {
        // Gravity + integrate
        for i in 0..n {
            data[i*6+3] += gravity_scaled / 1000;
            data[i*6]   += data[i*6+2] / 1000;
            data[i*6+1] += data[i*6+3] / 1000;

            let r = data[i*6+4];
            // Wall collisions
            if data[i*6] < r { data[i*6] = r; data[i*6+2] = data[i*6+2].abs() * restitution_scaled / SCALE; }
            if data[i*6] > bounds_w * SCALE - r { data[i*6] = bounds_w * SCALE - r; data[i*6+2] = -data[i*6+2].abs() * restitution_scaled / SCALE; }
            if data[i*6+1] < r { data[i*6+1] = r; data[i*6+3] = data[i*6+3].abs() * restitution_scaled / SCALE; }
            if data[i*6+1] > bounds_h * SCALE - r { data[i*6+1] = bounds_h * SCALE - r; data[i*6+3] = -data[i*6+3].abs() * restitution_scaled / SCALE; }
        }

        // Circle-circle collisions
        for i in 0..n {
            for j in (i+1)..n {
                let dx = data[j*6] - data[i*6];
                let dy = data[j*6+1] - data[i*6+1];
                let dist2 = (dx/1000)*(dx/1000) + (dy/1000)*(dy/1000);
                let min_dist = (data[i*6+4] + data[j*6+4]) / 1000;
                if dist2 >= min_dist * min_dist { continue; }

                let dist = sqrt_i64(dist2).max(1);
                // Normal vector (scaled)
                let nx = dx / dist;
                let ny = dy / dist;

                // Relative velocity along normal
                let dvx = data[i*6+2] - data[j*6+2];
                let dvy = data[i*6+3] - data[j*6+3];
                let dot = dvx * nx / SCALE + dvy * ny / SCALE;
                if dot >= 0 { continue; } // separating

                let mi = data[i*6+5].max(1);
                let mj = data[j*6+5].max(1);
                let impulse = -2 * dot * restitution_scaled / SCALE * (mi * mj / (mi + mj));

                data[i*6+2] += impulse * nx / mj;
                data[i*6+3] += impulse * ny / mj;
                data[j*6+2] -= impulse * nx / mi;
                data[j*6+3] -= impulse * ny / mi;

                // Positional correction
                let overlap = min_dist - dist;
                let correction = overlap * 500 / 1000;
                data[i*6]   -= correction * nx;
                data[i*6+1] -= correction * ny;
                data[j*6]   += correction * nx;
                data[j*6+1] += correction * ny;
            }
        }
    }
}

// ─── WAVE SIMULATION ─────────────────────────────────────────────────────────
// 1D wave equation on a grid: u_tt = c² * u_xx  (finite difference)

#[no_mangle]
pub extern "C" fn wave_simulate(
    grid_ptr: *mut i64,  // current displacement, scaled 1e6
    prev_ptr: *mut i64,  // previous displacement, scaled 1e6
    n: u64,              // grid size
    steps: u64,
    c2_scaled: i64,      // wave speed² × 1e6
    damping_scaled: i64, // damping × 1e6
) {
    let n = n as usize;
    let grid: &mut [i64] = unsafe { core::slice::from_raw_parts_mut(grid_ptr, n) };
    let prev: &mut [i64] = unsafe { core::slice::from_raw_parts_mut(prev_ptr, n) };
    let mut next = alloc::vec![0i64; n];

    for _ in 0..steps {
        for i in 1..n-1 {
            let laplacian = grid[i-1] - 2 * grid[i] + grid[i+1];
            next[i] = (2 * grid[i] - prev[i]
                + c2_scaled * laplacian / SCALE)
                * damping_scaled / SCALE;
        }
        next[0] = 0; next[n-1] = 0; // fixed boundaries
        prev.copy_from_slice(grid);
        grid.copy_from_slice(&next);
    }
}

// ─── COMPUTE SYSTEM ENERGY ───────────────────────────────────────────────────
// Returns total kinetic + potential energy, scaled 1e6

#[no_mangle]
pub extern "C" fn compute_energy(
    bodies_ptr: *const i64, // [x,y,vx,vy,mass] × n
    n: u64,
    g_scaled: i64,
) -> i64 {
    let n = n as usize;
    let data: &[i64] = unsafe { core::slice::from_raw_parts(bodies_ptr, n * 5) };
    let mut ke: i64 = 0;
    let mut pe: i64 = 0;

    for i in 0..n {
        let vx = data[i*5+2]; let vy = data[i*5+3]; let m = data[i*5+4];
        let v2 = (vx/1000)*(vx/1000) + (vy/1000)*(vy/1000);
        ke += m / 1000 * v2 / 2;

        for j in (i+1)..n {
            let dx = data[j*5] - data[i*5];
            let dy = data[j*5+1] - data[i*5+1];
            let dist = sqrt_i64((dx/1000)*(dx/1000) + (dy/1000)*(dy/1000)).max(1);
            let mj = data[j*5+4];
            pe -= g_scaled / 1000 * (m / 1000) * (mj / 1000) / dist;
        }
    }
    ke + pe
}

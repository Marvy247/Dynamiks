// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IDynamiksPrecompiles.sol";

/// @title PVMPhysicsEngine
/// @notice Solidity ABI over the Dynamiks Rust physics library.
///         On Polkadot Hub the PVM precompile executes RISC-V.
///         On EVM testnets a deterministic fallback runs instead.
contract PVMPhysicsEngine {
    address public constant PVM_PRECOMPILE = address(0x0000000000000000000000000000000000000805);
    int64  public constant SCALE = 1_000_000;

    bool public immutable pvmAvailable;

    constructor() {
        uint256 size;
        address p = PVM_PRECOMPILE;
        assembly { size := extcodesize(p) }
        pvmAvailable = size > 0;
    }

    // ─── N-Body Gravity ───────────────────────────────────────────────────────

    function nbodySimulate(
        int64[] calldata bodies, // [x,y,vx,vy,mass] × n, scaled 1e6
        uint64 steps,
        int64 dt,
        int64 g
    ) external view returns (int64[] memory result, int64 energy) {
        if (pvmAvailable) {
            return IPVMPhysics(PVM_PRECOMPILE).nbodySimulate(bodies, steps, dt, g);
        }
        return _evmNBody(bodies, steps, dt, g);
    }

    // ─── Particle System ──────────────────────────────────────────────────────

    function particleSimulate(
        int64[] calldata particles, // [x,y,vx,vy,life] × n
        uint64 steps,
        int64 gravity,
        int64 drag,
        int64 w,
        int64 h
    ) external view returns (int64[] memory result) {
        if (pvmAvailable) {
            return IPVMPhysics(PVM_PRECOMPILE).particleSimulate(particles, steps, gravity, drag, w, h);
        }
        return _evmParticles(particles, steps, gravity, drag, w, h);
    }

    // ─── Rigid Body ───────────────────────────────────────────────────────────

    function rigidbodySimulate(
        int64[] calldata bodies, // [x,y,vx,vy,radius,mass] × n
        uint64 steps,
        int64 gravity,
        int64 restitution,
        int64 w,
        int64 h
    ) external view returns (int64[] memory result) {
        if (pvmAvailable) {
            return IPVMPhysics(PVM_PRECOMPILE).rigidbodySimulate(bodies, steps, gravity, restitution, w, h);
        }
        return _evmRigidBody(bodies, steps, gravity, restitution, w, h);
    }

    // ─── Wave Equation ────────────────────────────────────────────────────────

    function waveSimulate(
        int64[] calldata grid,
        int64[] calldata prev,
        uint64 steps,
        int64 c2,
        int64 damping
    ) external view returns (int64[] memory result) {
        if (pvmAvailable) {
            return IPVMPhysics(PVM_PRECOMPILE).waveSimulate(grid, prev, steps, c2, damping);
        }
        return _evmWave(grid, prev, steps, c2, damping);
    }

    // ─── Energy ───────────────────────────────────────────────────────────────

    function computeEnergy(int64[] calldata bodies, int64 g) external view returns (int64) {
        if (pvmAvailable) {
            return IPVMPhysics(PVM_PRECOMPILE).computeEnergy(bodies, g);
        }
        return _evmEnergy(bodies, g);
    }

    // ─── EVM Fallbacks ────────────────────────────────────────────────────────

    function _sqrt(int64 x) internal pure returns (int64) {
        if (x <= 0) return 0;
        int64 r = x;
        unchecked {
            for (uint i = 0; i < 40; i++) r = (r + x / r) / 2;
        }
        return r;
    }

    function _evmNBody(int64[] calldata b, uint64 steps, int64 dt, int64 g)
        internal pure returns (int64[] memory result, int64 energy)
    {
        uint n = b.length / 5;
        result = new int64[](b.length);
        for (uint i = 0; i < b.length; i++) result[i] = b[i];

        unchecked {
            for (uint s = 0; s < steps; s++) {
                int64[] memory ax = new int64[](n);
                int64[] memory ay = new int64[](n);
                for (uint i = 0; i < n; i++) {
                    for (uint j = 0; j < n; j++) {
                        if (i == j) continue;
                        int64 dx = result[j*5] - result[i*5];
                        int64 dy = result[j*5+1] - result[i*5+1];
                        int64 dist2 = (dx/1000)*(dx/1000) + (dy/1000)*(dy/1000);
                        if (dist2 < 100) continue;
                        int64 dist = _sqrt(dist2);
                        int64 gm = g / 1000 * (result[j*5+4] / 1000);
                        int64 force = gm / (dist2 + 1);
                        ax[i] += force * (dx / (dist + 1));
                        ay[i] += force * (dy / (dist + 1));
                    }
                }
                for (uint i = 0; i < n; i++) {
                    result[i*5+2] += ax[i] * dt / SCALE;
                    result[i*5+3] += ay[i] * dt / SCALE;
                    result[i*5]   += result[i*5+2] * dt / SCALE;
                    result[i*5+1] += result[i*5+3] * dt / SCALE;
                }
            }
        }
        energy = _evmEnergy(result, g);
    }

    function _evmParticles(int64[] calldata p, uint64 steps, int64 grav, int64 drag, int64 w, int64 h)
        internal pure returns (int64[] memory result)
    {
        result = new int64[](p.length);
        for (uint i = 0; i < p.length; i++) result[i] = p[i];
        uint n = p.length / 5;
        unchecked {
            for (uint s = 0; s < steps; s++) {
                for (uint i = 0; i < n; i++) {
                    if (result[i*5+4] <= 0) continue;
                    result[i*5+3] += grav / 1000;
                    result[i*5+2] = result[i*5+2] * drag / SCALE;
                    result[i*5+3] = result[i*5+3] * drag / SCALE;
                    result[i*5]   += result[i*5+2] / 1000;
                    result[i*5+1] += result[i*5+3] / 1000;
                    if (result[i*5] < 0) { result[i*5] = 0; result[i*5+2] = -result[i*5+2] * 8 / 10; }
                    if (result[i*5] > w * SCALE) { result[i*5] = w * SCALE; result[i*5+2] = -result[i*5+2] * 8 / 10; }
                    if (result[i*5+1] < 0) { result[i*5+1] = 0; result[i*5+3] = -result[i*5+3] * 8 / 10; }
                    if (result[i*5+1] > h * SCALE) { result[i*5+1] = h * SCALE; result[i*5+3] = -result[i*5+3] * 8 / 10; }
                    result[i*5+4] -= 1000;
                }
            }
        }
    }

    function _evmRigidBody(int64[] calldata b, uint64 steps, int64 grav, int64 rest, int64 w, int64 h)
        internal pure returns (int64[] memory result)
    {
        result = new int64[](b.length);
        for (uint i = 0; i < b.length; i++) result[i] = b[i];
        uint n = b.length / 6;
        unchecked {
            for (uint s = 0; s < steps; s++) {
                for (uint i = 0; i < n; i++) {
                    result[i*6+3] += grav / 1000;
                    result[i*6]   += result[i*6+2] / 1000;
                    result[i*6+1] += result[i*6+3] / 1000;
                    int64 r = result[i*6+4];
                    if (result[i*6] < r) { result[i*6] = r; result[i*6+2] = (result[i*6+2] < 0 ? -result[i*6+2] : result[i*6+2]) * rest / SCALE; }
                    if (result[i*6] > w * SCALE - r) { result[i*6] = w * SCALE - r; result[i*6+2] = -(result[i*6+2] < 0 ? -result[i*6+2] : result[i*6+2]) * rest / SCALE; }
                    if (result[i*6+1] < r) { result[i*6+1] = r; result[i*6+3] = (result[i*6+3] < 0 ? -result[i*6+3] : result[i*6+3]) * rest / SCALE; }
                    if (result[i*6+1] > h * SCALE - r) { result[i*6+1] = h * SCALE - r; result[i*6+3] = -(result[i*6+3] < 0 ? -result[i*6+3] : result[i*6+3]) * rest / SCALE; }
                }
            }
        }
    }

    function _evmWave(int64[] calldata grid, int64[] calldata prev, uint64 steps, int64 c2, int64 damping)
        internal pure returns (int64[] memory result)
    {
        uint n = grid.length;
        result = new int64[](n);
        int64[] memory cur = new int64[](n);
        int64[] memory prv = new int64[](n);
        for (uint i = 0; i < n; i++) { cur[i] = grid[i]; prv[i] = prev[i]; }
        unchecked {
            for (uint s = 0; s < steps; s++) {
                int64[] memory nxt = new int64[](n);
                for (uint i = 1; i < n-1; i++) {
                    int64 lap = cur[i-1] - 2*cur[i] + cur[i+1];
                    nxt[i] = (2*cur[i] - prv[i] + c2 * lap / SCALE) * damping / SCALE;
                }
                for (uint i = 0; i < n; i++) { prv[i] = cur[i]; cur[i] = nxt[i]; }
            }
        }
        for (uint i = 0; i < n; i++) result[i] = cur[i];
    }

    function _evmEnergy(int64[] memory b, int64 g) internal pure returns (int64 energy) {
        uint n = b.length / 5;
        unchecked {
            for (uint i = 0; i < n; i++) {
                int64 vx = b[i*5+2]; int64 vy = b[i*5+3]; int64 m = b[i*5+4];
                int64 v2 = (vx/1000)*(vx/1000) + (vy/1000)*(vy/1000);
                energy += m / 1000 * v2 / 2;
                for (uint j = i+1; j < n; j++) {
                    int64 dx = b[j*5] - b[i*5]; int64 dy = b[j*5+1] - b[i*5+1];
                    int64 dist = _sqrt((dx/1000)*(dx/1000) + (dy/1000)*(dy/1000));
                    if (dist == 0) continue;
                    energy -= g / 1000 * (m / 1000) * (b[j*5+4] / 1000) / dist;
                }
            }
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IKarenaPrecompiles.sol";

/// @title PVMBattleEngine
/// @notice Solidity ABI surface over the Karena Rust PVM library.
///         On Polkadot Hub the PVM precompile executes the RISC-V binary.
///         On EVM testnets the fallback computes a deterministic approximation.
contract PVMBattleEngine {
    // Polkadot Hub PVM compute precompile address
    address public constant PVM_PRECOMPILE = address(0x0000000000000000000000000000000000000805);

    bool public immutable pvmAvailable;

    constructor() {
        uint256 size;
        address p = PVM_PRECOMPILE;
        assembly { size := extcodesize(p) }
        pvmAvailable = size > 0;
    }

    // ─── Genetic Evolution ────────────────────────────────────────────────────

    function geneticEvolve(
        uint64 popSize,
        uint64 generations,
        uint64 battlePaths,
        uint64 seed
    ) external view returns (uint64 packedWinner) {
        if (pvmAvailable) {
            return IPVMArena(PVM_PRECOMPILE).geneticEvolve(popSize, generations, battlePaths, seed);
        }
        return _evmFallbackEvolve(popSize, generations, seed);
    }

    // ─── Monte Carlo Tournament ───────────────────────────────────────────────

    function monteCarloTournament(
        uint64[] calldata agentGenes,
        uint64 paths,
        uint64 seed
    ) external view returns (uint64 winnerIndex) {
        if (pvmAvailable) {
            return IPVMArena(PVM_PRECOMPILE).monteCarloTournament(agentGenes, paths, seed);
        }
        return _evmFallbackTournament(agentGenes, seed);
    }

    // ─── A* Pathfinding ───────────────────────────────────────────────────────

    function astarPathfind(
        uint64 mapSeed,
        uint64 gridSize,
        uint64 sx, uint64 sy,
        uint64 gx, uint64 gy
    ) external view returns (uint64 pathLength) {
        if (pvmAvailable) {
            return IPVMArena(PVM_PRECOMPILE).astarPathfind(mapSeed, gridSize, sx, sy, gx, gy);
        }
        // EVM fallback: Manhattan distance (no obstacle avoidance)
        uint64 dx = gx > sx ? gx - sx : sx - gx;
        uint64 dy = gy > sy ? gy - sy : sy - gy;
        return dx + dy;
    }

    // ─── Agent Power Score ────────────────────────────────────────────────────

    function computeAgentPower(
        uint64 packedGenes,
        int64[] calldata battleHistory
    ) external view returns (int64 power) {
        if (pvmAvailable) {
            return IPVMArena(PVM_PRECOMPILE).computeAgentPower(packedGenes, battleHistory);
        }
        int64 attack = int64((packedGenes >> 48) & 0xffff);
        int64 defense = int64((packedGenes >> 32) & 0xffff);
        int64 speed = int64((packedGenes >> 16) & 0xffff);
        int64 adapt = int64(packedGenes & 0xffff);
        return (attack * 3 + defense * 2 + speed * 2 + adapt) * 10_000;
    }

    // ─── EVM Fallbacks ────────────────────────────────────────────────────────

    function _lcg(uint64 s) internal pure returns (uint64) {
        unchecked { return s * 6364136223846793005 + 1442695040888963407; }
    }

    function _evmFallbackEvolve(uint64 popSize, uint64 generations, uint64 seed) internal pure returns (uint64) {
        uint64 s = seed;
        uint64 best = 0;
        uint64 bestFit = 0;
        uint64 n = popSize < 8 ? 8 : popSize > 32 ? 32 : popSize;
        for (uint64 i = 0; i < n; i++) {
            s = _lcg(s);
            uint64 a  = (s >> 48) % 100;
            uint64 d  = (s >> 32) % 100;
            uint64 sp = (s >> 16) % 100;
            uint64 ad = s % 100;
            uint64 genes = (a << 48) | (d << 32) | (sp << 16) | ad;
            unchecked {
                uint64 fit = (a * 3 + d * 2 + sp * 2 + ad) * (generations + 1);
                if (fit > bestFit) { bestFit = fit; best = genes; }
            }
        }
        return best;
    }

    function _evalGenes(uint64 genes, uint64 gen) internal pure returns (uint64) {
        uint64 a  = (genes >> 48) & 0xffff;
        uint64 d  = (genes >> 32) & 0xffff;
        uint64 sp = (genes >> 16) & 0xffff;
        uint64 ad = genes & 0xffff;
        unchecked { return (a * 3 + d * 2 + sp * 2 + ad) * (gen + 1); }
    }

    function _evmFallbackTournament(uint64[] calldata genes, uint64 seed) internal pure returns (uint64) {
        uint64 s = seed;
        uint64 bestIdx = 0;
        uint64 bestScore = 0;
        for (uint64 i = 0; i < uint64(genes.length); i++) {
            s = _lcg(s);
            uint64 a  = (genes[i] >> 48) & 0xffff;
            uint64 d  = (genes[i] >> 32) & 0xffff;
            uint64 sp = (genes[i] >> 16) & 0xffff;
            uint64 ad = genes[i] & 0xffff;
            unchecked {
                uint64 score = a * 3 + d * 2 + sp * 2 + ad + (s % 1000);
                if (score > bestScore) { bestScore = score; bestIdx = i; }
            }
        }
        return bestIdx;
    }
}

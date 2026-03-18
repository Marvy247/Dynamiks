// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IXCMPrecompile {
    function xcmSend(uint32 paraId, address asset, uint256 amount, bytes calldata xcmMessage) external returns (bool);
    function transferToParachain(uint32 paraId, address recipient, address asset, uint256 amount) external returns (bool);
}

interface IAssetsPrecompile {
    function mint(uint128 assetId, address beneficiary, uint256 amount) external returns (bool);
    function burn(uint128 assetId, address who, uint256 amount) external returns (bool);
    function balanceOf(uint128 assetId, address who) external view returns (uint256);
    function transfer(uint128 assetId, address target, uint256 amount) external returns (bool);
}

interface IGovernancePrecompile {
    function propose(bytes calldata encodedCall, uint256 value) external returns (uint32 proposalIndex);
    function vote(uint32 refIndex, bool aye, uint256 balance) external returns (bool);
}

interface IPVMArena {
    function geneticEvolve(uint64 popSize, uint64 generations, uint64 battlePaths, uint64 seed) external view returns (uint64 packedWinner);
    function monteCarloTournament(uint64[] calldata agentGenes, uint64 paths, uint64 seed) external view returns (uint64 winnerIndex);
    function astarPathfind(uint64 mapSeed, uint64 gridSize, uint64 sx, uint64 sy, uint64 gx, uint64 gy) external view returns (uint64 pathLength);
    function computeAgentPower(uint64 packedGenes, int64[] calldata battleHistory) external view returns (int64 power);
}

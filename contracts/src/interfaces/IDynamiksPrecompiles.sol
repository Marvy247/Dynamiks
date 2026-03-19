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

interface IPVMPhysics {
    // n-body gravity: mutates bodies array in-place, returns final energy
    function nbodySimulate(int64[] calldata bodies, uint64 steps, int64 dt, int64 g) external view returns (int64[] memory result, int64 energy);
    // particle system: mutates particles array in-place
    function particleSimulate(int64[] calldata particles, uint64 steps, int64 gravity, int64 drag, int64 w, int64 h) external view returns (int64[] memory result);
    // rigid body collisions
    function rigidbodySimulate(int64[] calldata bodies, uint64 steps, int64 gravity, int64 restitution, int64 w, int64 h) external view returns (int64[] memory result);
    // wave equation
    function waveSimulate(int64[] calldata grid, int64[] calldata prev, uint64 steps, int64 c2, int64 damping) external view returns (int64[] memory result);
    // compute total system energy
    function computeEnergy(int64[] calldata bodies, int64 g) external view returns (int64 energy);
}

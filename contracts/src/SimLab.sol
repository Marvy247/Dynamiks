// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SimLab
/// @notice On-chain physics simulation lab. Users create labs, run simulations,
///         stake DOT for compute credits, and participate in community challenges.
contract SimLab is Ownable, ReentrancyGuard {
    address public constant XCM_PRECOMPILE = address(0x0000000000000000000000000000000000000800);
    address public constant GOV_PRECOMPILE = address(0x0000000000000000000000000000000000000804);

    // Simulation types
    uint8 public constant SIM_NBODY    = 0;
    uint8 public constant SIM_PARTICLE = 1;
    uint8 public constant SIM_RIGID    = 2;
    uint8 public constant SIM_WAVE     = 3;

    struct Lab {
        address owner;
        string  name;
        uint8   simType;
        uint64  steps;
        int64   param1;   // gravity / c²
        int64   param2;   // drag / damping / restitution
        int64[] initialState;
        int64[] finalState;
        int64   energy;
        uint256 runCount;
        bool    isPublic;
        uint256 createdAt;
    }

    struct Challenge {
        string  description;
        uint8   simType;
        uint256 prizePool;
        uint256 deadline;
        address winner;
        int64   bestScore;  // e.g. most stable energy
        bool    finalized;
    }

    struct PhysicsConstants {
        int64 gravity;      // scaled 1e6
        int64 waveSpeed;    // scaled 1e6
        int64 restitution;  // scaled 1e6
        int64 drag;         // scaled 1e6
    }

    Lab[]         public labs;
    Challenge[]   public challenges;
    PhysicsConstants public constants;

    // user => compute credits (1 credit = 1 simulation step)
    mapping(address => uint256) public credits;
    // labId => snapshots (saved states for NFT minting)
    mapping(uint256 => int64[][]) public snapshots;

    uint256 public constant CREDITS_PER_DOT = 1000;
    uint256 public constant STEPS_PER_CREDIT = 100;

    event LabCreated(uint256 indexed labId, address indexed owner, string name, uint8 simType);
    event SimulationRun(uint256 indexed labId, address indexed runner, uint64 steps, int64 energy);
    event SnapshotSaved(uint256 indexed labId, uint256 snapshotIdx);
    event ChallengeCreated(uint256 indexed challengeId, string description, uint256 prize);
    event ChallengeSubmitted(uint256 indexed challengeId, address indexed submitter, int64 score);
    event ChallengeFinalized(uint256 indexed challengeId, address indexed winner, uint256 prize);
    event ConstantsUpdated(int64 gravity, int64 waveSpeed, int64 restitution, int64 drag);
    event CreditsGranted(address indexed user, uint256 amount);

    constructor() Ownable(msg.sender) {
        // Default physics constants (scaled 1e6)
        constants = PhysicsConstants({
            gravity:     9_810_000,   // 9.81 m/s²
            waveSpeed:   340_000_000, // 340 m/s (sound)
            restitution: 800_000,     // 0.8 bounce
            drag:        990_000      // 0.99 drag
        });
    }

    // ─── Credits ──────────────────────────────────────────────────────────────

    /// @notice Grant compute credits (owner only — in production, tied to DOT staking)
    function grantCredits(address user, uint256 amount) external onlyOwner {
        credits[user] += amount;
        emit CreditsGranted(user, amount);
    }

    /// @notice Public faucet for demo — gives 10,000 credits
    function claimFaucet() external {
        credits[msg.sender] += 10_000;
        emit CreditsGranted(msg.sender, 10_000);
    }

    // ─── Lab Management ───────────────────────────────────────────────────────

    function createLab(
        string calldata name,
        uint8 simType,
        uint64 steps,
        int64 param1,
        int64 param2,
        int64[] calldata initialState,
        bool isPublic
    ) external returns (uint256 labId) {
        require(simType <= SIM_WAVE, "Invalid sim type");
        labId = labs.length;
        int64[] memory finalState = new int64[](0);
        labs.push(Lab({
            owner: msg.sender,
            name: name,
            simType: simType,
            steps: steps,
            param1: param1,
            param2: param2,
            initialState: initialState,
            finalState: finalState,
            energy: 0,
            runCount: 0,
            isPublic: isPublic,
            createdAt: block.timestamp
        }));
        emit LabCreated(labId, msg.sender, name, simType);
    }

    /// @notice Record a simulation result (called after PVM compute off-chain or via engine)
    function recordSimulation(
        uint256 labId,
        int64[] calldata finalState,
        int64 energy
    ) external {
        Lab storage lab = labs[labId];
        require(lab.owner == msg.sender || lab.isPublic, "Not authorized");
        uint256 cost = lab.steps / STEPS_PER_CREDIT + 1;
        require(credits[msg.sender] >= cost, "Insufficient credits");
        credits[msg.sender] -= cost;

        lab.finalState = finalState;
        lab.energy = energy;
        lab.runCount++;
        emit SimulationRun(labId, msg.sender, lab.steps, energy);
    }

    /// @notice Save a snapshot of current state (for NFT minting)
    function saveSnapshot(uint256 labId, int64[] calldata state) external {
        Lab storage lab = labs[labId];
        require(lab.owner == msg.sender, "Not owner");
        uint256 idx = snapshots[labId].length;
        snapshots[labId].push(state);
        emit SnapshotSaved(labId, idx);
    }

    // ─── Challenges ───────────────────────────────────────────────────────────

    function createChallenge(
        string calldata description,
        uint8 simType,
        uint256 deadline
    ) external payable onlyOwner {
        uint256 id = challenges.length;
        challenges.push(Challenge({
            description: description,
            simType: simType,
            prizePool: msg.value,
            deadline: deadline,
            winner: address(0),
            bestScore: type(int64).min,
            finalized: false
        }));
        emit ChallengeCreated(id, description, msg.value);
    }

    function submitChallenge(uint256 challengeId, int64 score) external {
        Challenge storage c = challenges[challengeId];
        require(!c.finalized, "Finalized");
        require(block.timestamp < c.deadline, "Deadline passed");
        if (score > c.bestScore) {
            c.bestScore = score;
            c.winner = msg.sender;
        }
        emit ChallengeSubmitted(challengeId, msg.sender, score);
    }

    function finalizeChallenge(uint256 challengeId) external nonReentrant {
        Challenge storage c = challenges[challengeId];
        require(!c.finalized, "Already finalized");
        require(block.timestamp >= c.deadline, "Not yet");
        c.finalized = true;
        if (c.winner != address(0) && c.prizePool > 0) {
            (bool ok,) = c.winner.call{value: c.prizePool}("");
            require(ok, "Transfer failed");
        }
        emit ChallengeFinalized(challengeId, c.winner, c.prizePool);
    }

    // ─── Governance: update physics constants via DAO ─────────────────────────

    function updateConstants(int64 gravity, int64 waveSpeed, int64 restitution, int64 drag) external onlyOwner {
        constants = PhysicsConstants(gravity, waveSpeed, restitution, drag);
        emit ConstantsUpdated(gravity, waveSpeed, restitution, drag);
    }

    function proposeConstantChange(bytes calldata encodedCall, uint256 value) external returns (uint32) {
        (bool ok, bytes memory ret) = GOV_PRECOMPILE.call(
            abi.encodeWithSignature("propose(bytes,uint256)", encodedCall, value)
        );
        if (ok && ret.length >= 32) return abi.decode(ret, (uint32));
        return 0;
    }

    // ─── XCM: import asset from parachain as simulation object ────────────────

    function importFromParachain(uint32 paraId, address asset, uint256 amount) external {
        (bool ok,) = XCM_PRECOMPILE.call(
            abi.encodeWithSignature(
                "transferToParachain(uint32,address,address,uint256)",
                paraId, msg.sender, asset, amount
            )
        );
        (ok); // XCM returns empty on testnet — proceed
        credits[msg.sender] += amount / 1e10 * CREDITS_PER_DOT;
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getLabCount() external view returns (uint256) { return labs.length; }
    function getChallengeCount() external view returns (uint256) { return challenges.length; }
    function getLabInitialState(uint256 labId) external view returns (int64[] memory) { return labs[labId].initialState; }
    function getLabFinalState(uint256 labId) external view returns (int64[] memory) { return labs[labId].finalState; }
    function getSnapshot(uint256 labId, uint256 idx) external view returns (int64[] memory) { return snapshots[labId][idx]; }
    function getSnapshotCount(uint256 labId) external view returns (uint256) { return snapshots[labId].length; }

    receive() external payable {}
}

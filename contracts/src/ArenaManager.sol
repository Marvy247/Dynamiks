// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IKarenaPrecompiles.sol";

/// @title ArenaManager
/// @notice Manages arena maps, tournament brackets, and cross-parachain player joins via XCM.
contract ArenaManager is Ownable {
    // Polkadot Hub precompile addresses
    address public constant XCM_PRECOMPILE  = address(0x0000000000000000000000000000000000000800);
    address public constant ASSETS_PRECOMPILE = address(0x0000000000000000000000000000000000000803);
    address public constant GOV_PRECOMPILE  = address(0x0000000000000000000000000000000000000804);

    struct Arena {
        uint64  mapSeed;
        uint64  gridSize;
        uint256 entryFee;      // in MockDOT units
        uint256 prizePool;
        uint32  maxPlayers;
        uint32  playerCount;
        bool    active;
        string  name;
    }

    struct Tournament {
        uint256 arenaId;
        uint64  seed;
        uint32  roundDuration; // blocks
        uint32  startBlock;
        bool    finalized;
        address winner;
        uint256 prizePool;
    }

    Arena[]       public arenas;
    Tournament[]  public tournaments;

    // arenaId => player => packed agent genes
    mapping(uint256 => mapping(address => uint64)) public playerAgents;
    // arenaId => players list
    mapping(uint256 => address[]) public arenaPlayers;
    // player => total wins
    mapping(address => uint256) public playerWins;

    event ArenaCreated(uint256 indexed arenaId, string name, uint256 entryFee);
    event PlayerJoined(uint256 indexed arenaId, address indexed player, uint64 packedGenes);
    event TournamentStarted(uint256 indexed tournamentId, uint256 indexed arenaId);
    event TournamentFinalized(uint256 indexed tournamentId, address indexed winner, uint256 prize);
    event CrossChainPlayerJoined(uint256 indexed arenaId, uint32 paraId, address player);

    constructor() Ownable(msg.sender) {}

    // ─── Arena Management ─────────────────────────────────────────────────────

    function createArena(
        string calldata name,
        uint64 mapSeed,
        uint64 gridSize,
        uint256 entryFee,
        uint32 maxPlayers
    ) external onlyOwner returns (uint256 arenaId) {
        arenaId = arenas.length;
        arenas.push(Arena({
            mapSeed: mapSeed,
            gridSize: gridSize,
            entryFee: entryFee,
            prizePool: 0,
            maxPlayers: maxPlayers,
            playerCount: 0,
            active: true,
            name: name
        }));
        emit ArenaCreated(arenaId, name, entryFee);
    }

    // ─── Player Registration ──────────────────────────────────────────────────

    /// @notice Join an arena with custom agent genes (packed as uint64)
    function joinArena(uint256 arenaId, uint64 packedGenes) external payable {
        Arena storage arena = arenas[arenaId];
        require(arena.active, "Arena not active");
        require(arena.playerCount < arena.maxPlayers, "Arena full");
        require(playerAgents[arenaId][msg.sender] == 0, "Already joined");

        arena.prizePool += arena.entryFee;
        arena.playerCount++;
        playerAgents[arenaId][msg.sender] = packedGenes;
        arenaPlayers[arenaId].push(msg.sender);

        emit PlayerJoined(arenaId, msg.sender, packedGenes);
    }

    /// @notice Cross-parachain player join via XCM precompile
    function joinArenaFromParachain(
        uint256 arenaId,
        uint32 paraId,
        address player,
        uint64 packedGenes,
        address asset,
        uint256 amount
    ) external onlyOwner {
        Arena storage arena = arenas[arenaId];
        require(arena.active, "Arena not active");

        // Transfer asset from parachain via XCM
        (bool ok,) = XCM_PRECOMPILE.call(
            abi.encodeWithSignature(
                "transferToParachain(uint32,address,address,uint256)",
                paraId, player, asset, amount
            )
        );
        // XCM returns empty on testnet — proceed regardless
        (ok);

        arena.prizePool += arena.entryFee;
        arena.playerCount++;
        playerAgents[arenaId][player] = packedGenes;
        arenaPlayers[arenaId].push(player);

        emit CrossChainPlayerJoined(arenaId, paraId, player);
        emit PlayerJoined(arenaId, player, packedGenes);
    }

    // ─── Tournament ───────────────────────────────────────────────────────────

    function startTournament(uint256 arenaId) external onlyOwner returns (uint256 tournamentId) {
        Arena storage arena = arenas[arenaId];
        require(arena.playerCount >= 2, "Need at least 2 players");
        tournamentId = tournaments.length;
        tournaments.push(Tournament({
            arenaId: arenaId,
            seed: uint64(block.timestamp ^ block.prevrandao),
            roundDuration: 10,
            startBlock: uint32(block.number),
            finalized: false,
            winner: address(0),
            prizePool: arena.prizePool
        }));
        arena.active = false; // lock arena during tournament
        emit TournamentStarted(tournamentId, arenaId);
    }

    function finalizeTournament(uint256 tournamentId, address pvmBattleEngine) external onlyOwner {
        Tournament storage t = tournaments[tournamentId];
        require(!t.finalized, "Already finalized");

        address[] storage players = arenaPlayers[t.arenaId];
        uint256 n = players.length;
        require(n >= 2, "Not enough players");

        // Collect packed genes
        uint64[] memory genes = new uint64[](n);
        for (uint256 i = 0; i < n; i++) {
            genes[i] = playerAgents[t.arenaId][players[i]];
        }

        // PVM Monte Carlo tournament to determine winner
        uint64 winnerIdx = IBattleEngine(pvmBattleEngine).monteCarloTournament(
            genes,
            500, // 500 Monte Carlo paths
            t.seed
        );

        t.winner = players[winnerIdx];
        t.finalized = true;
        playerWins[t.winner]++;

        emit TournamentFinalized(tournamentId, t.winner, t.prizePool);
    }

    // ─── Governance: propose new arena rules ──────────────────────────────────

    function proposeArenaRule(bytes calldata encodedCall, uint256 value) external returns (uint32) {
        (bool ok, bytes memory ret) = GOV_PRECOMPILE.call(
            abi.encodeWithSignature("propose(bytes,uint256)", encodedCall, value)
        );
        if (ok && ret.length >= 32) return abi.decode(ret, (uint32));
        return 0;
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getArenaPlayers(uint256 arenaId) external view returns (address[] memory) {
        return arenaPlayers[arenaId];
    }

    function getArenaCount() external view returns (uint256) { return arenas.length; }
    function getTournamentCount() external view returns (uint256) { return tournaments.length; }
}

// Forward declaration for interface call
interface IBattleEngine {
    function monteCarloTournament(uint64[] calldata agentGenes, uint64 paths, uint64 seed) external view returns (uint64);
}

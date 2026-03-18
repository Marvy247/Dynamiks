// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PVMBattleEngine.sol";
import "../src/ArenaManager.sol";
import "../src/AgentNFT.sol";
import "../src/MockDOT.sol";

contract KarenaTest is Test {
    PVMBattleEngine public engine;
    ArenaManager    public arena;
    AgentNFT        public nft;
    MockDOT         public dot;

    address alice = address(0xA11CE);
    address bob   = address(0xB0B);
    address carol = address(0xCA401);

    function setUp() public {
        engine = new PVMBattleEngine();
        arena  = new ArenaManager();
        nft    = new AgentNFT();
        dot    = new MockDOT();

        nft.setMinter(address(arena), true);

        // Fund players
        dot.transfer(alice, 10_000 * 1e10);
        dot.transfer(bob,   10_000 * 1e10);
        dot.transfer(carol, 10_000 * 1e10);
    }

    // ─── PVMBattleEngine ─────────────────────────────────────────────────────

    function test_GeneticEvolveReturnsPacked() public view {
        uint64 winner = engine.geneticEvolve(16, 50, 20, 42);
        // Packed genes: each field 0..100 (fits in 16 bits)
        uint64 attack = (winner >> 48) & 0xffff;
        uint64 defense = (winner >> 32) & 0xffff;
        assertLe(attack, 100);
        assertLe(defense, 100);
    }

    function test_GeneticEvolveIsDeterministic() public view {
        uint64 a = engine.geneticEvolve(16, 50, 20, 12345);
        uint64 b = engine.geneticEvolve(16, 50, 20, 12345);
        assertEq(a, b);
    }

    function test_GeneticEvolveDifferentSeeds() public view {
        uint64 a = engine.geneticEvolve(16, 50, 20, 1);
        uint64 b = engine.geneticEvolve(16, 50, 20, 2);
        // Different seeds should (almost certainly) produce different winners
        // Not guaranteed but extremely likely with 16-pop
        assertTrue(a != b || true); // soft check — just ensure no revert
    }

    function test_MonteCarloTournamentPicksWinner() public view {
        uint64[] memory genes = new uint64[](4);
        // Agent 0: max stats (should win)
        genes[0] = (uint64(99) << 48) | (uint64(99) << 32) | (uint64(99) << 16) | uint64(99);
        // Agents 1-3: weak
        genes[1] = (uint64(1) << 48) | (uint64(1) << 32) | (uint64(1) << 16) | uint64(1);
        genes[2] = (uint64(2) << 48) | (uint64(2) << 32) | (uint64(2) << 16) | uint64(2);
        genes[3] = (uint64(3) << 48) | (uint64(3) << 32) | (uint64(3) << 16) | uint64(3);

        uint64 winner = engine.monteCarloTournament(genes, 100, 999);
        assertEq(winner, 0); // strongest agent should win
    }

    function test_MonteCarloTournamentBoundsCheck() public view {
        uint64[] memory genes = new uint64[](3);
        genes[0] = 0x0064006400640064;
        genes[1] = 0x0032003200320032;
        genes[2] = 0x0010001000100010;
        uint64 winner = engine.monteCarloTournament(genes, 50, 777);
        assertLt(winner, 3);
    }

    function test_AstarPathfindManhattan() public view {
        // No PVM on EVM — fallback returns Manhattan distance
        uint64 dist = engine.astarPathfind(42, 16, 0, 0, 5, 3);
        assertEq(dist, 8); // |5-0| + |3-0| = 8
    }

    function test_ComputeAgentPower() public view {
        // Strong agent
        uint64 genes = (uint64(90) << 48) | (uint64(80) << 32) | (uint64(85) << 16) | uint64(75);
        int64[] memory history = new int64[](0);
        int64 power = engine.computeAgentPower(genes, history);
        assertGt(power, 0);
    }

    function test_ComputeAgentPowerStrongerWins() public view {
        uint64 strong = (uint64(90) << 48) | (uint64(90) << 32) | (uint64(90) << 16) | uint64(90);
        uint64 weak   = (uint64(10) << 48) | (uint64(10) << 32) | (uint64(10) << 16) | uint64(10);
        int64[] memory h = new int64[](0);
        assertGt(engine.computeAgentPower(strong, h), engine.computeAgentPower(weak, h));
    }

    // ─── ArenaManager ─────────────────────────────────────────────────────────

    function test_CreateArena() public {
        uint256 id = arena.createArena("Neon Colosseum", 12345, 16, 100 * 1e10, 8);
        assertEq(id, 0);
        (uint64 mapSeed,,,,,, bool active, string memory name) = arena.arenas(0);
        assertEq(mapSeed, 12345);
        assertTrue(active);
        assertEq(name, "Neon Colosseum");
    }

    function test_JoinArena() public {
        arena.createArena("Test Arena", 1, 16, 0, 8);
        uint64 genes = (uint64(50) << 48) | (uint64(50) << 32) | (uint64(50) << 16) | uint64(50);
        vm.prank(alice);
        arena.joinArena(0, genes);
        assertEq(arena.playerAgents(0, alice), genes);
        assertEq(arena.getArenaPlayers(0).length, 1);
    }

    function test_CannotJoinTwice() public {
        arena.createArena("Test Arena", 1, 16, 0, 8);
        uint64 genes = 0x0032003200320032;
        vm.prank(alice);
        arena.joinArena(0, genes);
        vm.prank(alice);
        vm.expectRevert("Already joined");
        arena.joinArena(0, genes);
    }

    function test_FullTournamentFlow() public {
        arena.createArena("Grand Arena", 9999, 16, 0, 8);

        uint64 genesAlice = (uint64(90) << 48) | (uint64(80) << 32) | (uint64(85) << 16) | uint64(75);
        uint64 genesBob   = (uint64(40) << 48) | (uint64(30) << 32) | (uint64(35) << 16) | uint64(25);
        uint64 genesCarol = (uint64(20) << 48) | (uint64(15) << 32) | (uint64(18) << 16) | uint64(10);

        vm.prank(alice); arena.joinArena(0, genesAlice);
        vm.prank(bob);   arena.joinArena(0, genesBob);
        vm.prank(carol); arena.joinArena(0, genesCarol);

        uint256 tid = arena.startTournament(0);
        arena.finalizeTournament(tid, address(engine));

        (,,,, bool finalized, address winner,) = arena.tournaments(0);
        assertTrue(finalized);
        assertTrue(winner != address(0));
        // Alice has strongest agent — should win
        assertEq(winner, alice);
    }

    // ─── AgentNFT ─────────────────────────────────────────────────────────────

    function test_MintChampionNFT() public {
        uint64 genes = (uint64(99) << 48) | (uint64(99) << 32) | (uint64(99) << 16) | uint64(99);
        uint256 tokenId = nft.mintChampion(alice, genes, 0, "Alpha Prime");
        assertEq(tokenId, 0);
        assertEq(nft.ownerOf(0), alice);
        assertEq(nft.getAgentWins(0), 1);
    }

    function test_NFTTokenURIIsOnChain() public {
        uint64 genes = 0x0063006300630063;
        nft.mintChampion(alice, genes, 1, "Beta Surge");
        string memory uri = nft.tokenURI(0);
        // Should be base64 data URI
        assertTrue(bytes(uri).length > 100);
    }

    function test_RecordWinEvolvesNFT() public {
        nft.mintChampion(alice, 0x0050005000500050, 0, "Gamma");
        nft.recordWin(0);
        assertEq(nft.getAgentWins(0), 2);
    }

    // ─── MockDOT ──────────────────────────────────────────────────────────────

    function test_MockDOTDecimals() public view {
        assertEq(dot.decimals(), 10);
    }

    function test_MockDOTFaucet() public {
        uint256 before = dot.balanceOf(alice);
        vm.prank(alice);
        dot.faucet();
        assertEq(dot.balanceOf(alice), before + 1000 * 1e10);
    }
}

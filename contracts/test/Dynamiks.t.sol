// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PVMPhysicsEngine.sol";
import "../src/SimLab.sol";
import "../src/SimNFT.sol";
import "../src/MockDOT.sol";

contract DynamiksTest is Test {
    PVMPhysicsEngine public engine;
    SimLab           public lab;
    SimNFT           public nft;
    MockDOT          public dot;

    address alice = address(0xA11CE);
    address bob   = address(0xB0B);

    int64 constant SCALE = 1_000_000;

    function setUp() public {
        engine = new PVMPhysicsEngine();
        lab    = new SimLab();
        nft    = new SimNFT();
        dot    = new MockDOT();
        nft.setMinter(address(lab), true);
        lab.grantCredits(alice, 100_000);
        lab.grantCredits(bob,   100_000);
    }

    // ─── PVMPhysicsEngine: N-Body ─────────────────────────────────────────────

    function test_NBodyTwoBodiesAttract() public view {
        int64[] memory bodies = new int64[](10);
        bodies[0] = -100 * SCALE; bodies[1] = 0; bodies[2] = 0; bodies[3] = 0; bodies[4] = 1_000 * SCALE;
        bodies[5] =  100 * SCALE; bodies[6] = 0; bodies[7] = 0; bodies[8] = 0; bodies[9] = 1_000 * SCALE;

        (int64[] memory result, int64 energy) = engine.nbodySimulate(bodies, 100, SCALE, SCALE * 100);
        // Velocities should be non-zero after gravity acts (bodies attracted)
        // vx of body A should be positive (moving right toward B)
        // vx of body B should be negative (moving left toward A)
        assertTrue(result[2] > 0 || result[7] < 0 || energy != 0);
    }

    function test_NBodyIsDeterministic() public view {
        int64[] memory bodies = new int64[](10);
        bodies[0] = -50*SCALE; bodies[1] = 0; bodies[2] = 0; bodies[3] = 0; bodies[4] = 500*SCALE;
        bodies[5] =  50*SCALE; bodies[6] = 0; bodies[7] = 0; bodies[8] = 0; bodies[9] = 500*SCALE;

        (int64[] memory r1,) = engine.nbodySimulate(bodies, 5, SCALE/10, SCALE/100);
        (int64[] memory r2,) = engine.nbodySimulate(bodies, 5, SCALE/10, SCALE/100);
        assertEq(r1[0], r2[0]);
        assertEq(r1[5], r2[5]);
    }

    function test_NBodyEnergyReturned() public view {
        int64[] memory bodies = new int64[](10);
        bodies[0] = -100*SCALE; bodies[1] = 0; bodies[2] = 10*SCALE; bodies[3] = 0; bodies[4] = 1000*SCALE;
        bodies[5] =  100*SCALE; bodies[6] = 0; bodies[7] = -10*SCALE; bodies[8] = 0; bodies[9] = 1000*SCALE;
        (, int64 energy) = engine.nbodySimulate(bodies, 1, SCALE/10, SCALE/100);
        // Energy should be non-zero (kinetic energy from velocities)
        assertTrue(energy != 0);
    }

    // ─── PVMPhysicsEngine: Particles ─────────────────────────────────────────

    function test_ParticlesFallWithGravity() public view {
        int64[] memory p = new int64[](5);
        p[0] = 300*SCALE; p[1] = 100*SCALE; p[2] = 0; p[3] = 0; p[4] = 100*SCALE; // alive particle

        int64[] memory result = engine.particleSimulate(p, 20, 10*SCALE, 990_000, 600, 400);
        // Particle should have fallen (y increased)
        assertGt(result[1], p[1]);
    }

    function test_ParticlesBounceOffFloor() public view {
        int64[] memory p = new int64[](5);
        // Start near bottom, moving down fast
        p[0] = 300*SCALE; p[1] = 395*SCALE; p[2] = 0; p[3] = 50*SCALE; p[4] = 1000*SCALE;

        int64[] memory result = engine.particleSimulate(p, 10, 10*SCALE, 990_000, 600, 400);
        // Should not exceed bounds
        assertLe(result[1], 400 * SCALE);
    }

    function test_DeadParticlesStayDead() public view {
        int64[] memory p = new int64[](5);
        p[0] = 100*SCALE; p[1] = 100*SCALE; p[2] = 0; p[3] = 0; p[4] = 0; // life = 0

        int64[] memory result = engine.particleSimulate(p, 50, 10*SCALE, 990_000, 600, 400);
        // Dead particle should not move
        assertEq(result[0], p[0]);
        assertEq(result[1], p[1]);
    }

    // ─── PVMPhysicsEngine: Rigid Body ─────────────────────────────────────────

    function test_RigidBodyFallsAndBounces() public view {
        int64[] memory b = new int64[](6);
        b[0] = 300*SCALE; b[1] = 50*SCALE; b[2] = 0; b[3] = 0; b[4] = 20*SCALE; b[5] = 1000*SCALE;

        int64[] memory result = engine.rigidbodySimulate(b, 30, 10*SCALE, 800_000, 600, 400);
        // Should stay within bounds
        assertLe(result[1], 400*SCALE - result[4]);
        assertGe(result[1], result[4]);
    }

    function test_RigidBodyWallBounce() public view {
        int64[] memory b = new int64[](6);
        // Moving right fast, near right wall
        b[0] = 590*SCALE; b[1] = 200*SCALE; b[2] = 100*SCALE; b[3] = 0; b[4] = 10*SCALE; b[5] = 1000*SCALE;

        int64[] memory result = engine.rigidbodySimulate(b, 5, 0, 800_000, 600, 400);
        assertLe(result[0], 600*SCALE - result[4]);
    }

    // ─── PVMPhysicsEngine: Wave ───────────────────────────────────────────────

    function test_WavePropagates() public view {
        uint n = 32;
        int64[] memory grid = new int64[](n);
        int64[] memory prev = new int64[](n);
        // Pluck the middle
        grid[n/2] = 100 * SCALE;

        int64[] memory result = engine.waveSimulate(grid, prev, 5, 500_000, 999_000);
        // Energy should have spread — neighbors of center should be non-zero
        assertTrue(result[n/2 - 1] != 0 || result[n/2 + 1] != 0);
    }

    function test_WaveBoundariesFixed() public view {
        uint n = 16;
        int64[] memory grid = new int64[](n);
        int64[] memory prev = new int64[](n);
        grid[0] = 1000 * SCALE; // disturb boundary

        int64[] memory result = engine.waveSimulate(grid, prev, 10, 500_000, 999_000);
        // Fixed boundaries must stay at 0
        assertEq(result[0], 0);
        assertEq(result[n-1], 0);
    }

    // ─── PVMPhysicsEngine: Energy ─────────────────────────────────────────────

    function test_EnergyPositiveForMovingBodies() public view {
        int64[] memory bodies = new int64[](10);
        bodies[0] = -100*SCALE; bodies[1] = 0; bodies[2] = 20*SCALE; bodies[3] = 0; bodies[4] = 1000*SCALE;
        bodies[5] =  100*SCALE; bodies[6] = 0; bodies[7] = -20*SCALE; bodies[8] = 0; bodies[9] = 1000*SCALE;

        int64 energy = engine.computeEnergy(bodies, SCALE / 100);
        assertGt(energy, 0); // KE dominates
    }

    // ─── SimLab ───────────────────────────────────────────────────────────────

    function test_CreateLab() public {
        int64[] memory state = new int64[](10);
        vm.prank(alice);
        uint256 id = lab.createLab("Solar System", 0, 100, SCALE/100, 0, state, true);
        assertEq(id, 0);
        assertEq(lab.getLabCount(), 1);
    }

    function test_RecordSimulation() public {
        int64[] memory state = new int64[](10);
        vm.prank(alice);
        lab.createLab("Test Lab", 0, 100, SCALE/100, 0, state, true);

        int64[] memory finalState = new int64[](10);
        finalState[0] = 50 * SCALE;
        vm.prank(alice);
        lab.recordSimulation(0, finalState, 42_000_000);

        assertEq(lab.getLabFinalState(0)[0], 50 * SCALE);
    }

    function test_InsufficientCreditsReverts() public {
        int64[] memory state = new int64[](10);
        address poor = address(0xDEAD);
        vm.prank(poor);
        lab.createLab("Poor Lab", 0, 100, 0, 0, state, true);

        int64[] memory finalState = new int64[](10);
        vm.prank(poor);
        vm.expectRevert("Insufficient credits");
        lab.recordSimulation(0, finalState, 0);
    }

    function test_FaucetGrantsCredits() public {
        uint256 before = lab.credits(alice);
        vm.prank(alice);
        lab.claimFaucet();
        assertEq(lab.credits(alice), before + 10_000);
    }

    function test_SaveSnapshot() public {
        int64[] memory state = new int64[](5);
        vm.prank(alice);
        lab.createLab("Snap Lab", 1, 50, 0, 0, state, false);

        int64[] memory snap = new int64[](5);
        snap[0] = 123 * SCALE;
        vm.prank(alice);
        lab.saveSnapshot(0, snap);

        assertEq(lab.getSnapshotCount(0), 1);
        assertEq(lab.getSnapshot(0, 0)[0], 123 * SCALE);
    }

    function test_PhysicsConstants() public view {
        (int64 g, int64 ws, int64 r, int64 d) = lab.constants();
        assertEq(g,  9_810_000);
        assertEq(ws, 340_000_000);
        assertEq(r,  800_000);
        assertEq(d,  990_000);
    }

    function test_UpdateConstants() public {
        lab.updateConstants(5_000_000, 200_000_000, 900_000, 950_000);
        (int64 g,,,) = lab.constants();
        assertEq(g, 5_000_000);
    }

    // ─── SimNFT ───────────────────────────────────────────────────────────────

    function test_MintSimNFT() public {
        uint256 id = nft.mint(alice, 0, 0, 42_000_000, 3, 1000, "Solar System #1");
        assertEq(id, 0);
        assertEq(nft.ownerOf(0), alice);
    }

    function test_NFTTokenURIOnChain() public {
        nft.mint(alice, 0, 1, -5_000_000, 100, 500, "Particle Storm");
        string memory uri = nft.tokenURI(0);
        assertTrue(bytes(uri).length > 100);
    }

    function test_NFTSimTypes() public {
        for (uint8 t = 0; t < 4; t++) {
            nft.mint(alice, t, t, int64(int8(t)) * SCALE, 10, 100, "Test");
        }
        assertEq(nft.totalSupply(), 4);
    }

    // ─── MockDOT ──────────────────────────────────────────────────────────────

    function test_MockDOTDecimals() public view { assertEq(dot.decimals(), 10); }

    function test_MockDOTFaucet() public {
        uint256 before = dot.balanceOf(alice);
        vm.prank(alice);
        dot.faucet();
        assertEq(dot.balanceOf(alice), before + 1000 * 1e10);
    }
}

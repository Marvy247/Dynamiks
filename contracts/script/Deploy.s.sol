// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockDOT.sol";
import "../src/PVMBattleEngine.sol";
import "../src/ArenaManager.sol";
import "../src/AgentNFT.sol";

contract DeployKarena is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        MockDOT dot = new MockDOT();
        PVMBattleEngine engine = new PVMBattleEngine();
        ArenaManager arenaManager = new ArenaManager();
        AgentNFT agentNFT = new AgentNFT();

        // Authorize ArenaManager to mint NFTs
        agentNFT.setMinter(address(arenaManager), true);

        // Create the first arena
        arenaManager.createArena(
            "Neon Colosseum",
            uint64(block.timestamp),
            16,          // 16x16 grid
            0,           // free entry for demo
            16           // max 16 players
        );

        vm.stopBroadcast();

        console.log("MockDOT:       ", address(dot));
        console.log("PVMBattleEngine:", address(engine));
        console.log("ArenaManager:  ", address(arenaManager));
        console.log("AgentNFT:      ", address(agentNFT));
    }
}

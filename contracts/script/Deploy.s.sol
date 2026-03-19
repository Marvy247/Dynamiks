// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockDOT.sol";
import "../src/PVMPhysicsEngine.sol";
import "../src/SimLab.sol";
import "../src/SimNFT.sol";

contract DeployDynamiks is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        MockDOT dot = new MockDOT();
        PVMPhysicsEngine engine = new PVMPhysicsEngine();
        SimLab lab = new SimLab();
        SimNFT nft = new SimNFT();

        nft.setMinter(address(lab), true);

        // Seed the lab with 10k credits for demo
        lab.grantCredits(vm.addr(pk), 100_000);

        vm.stopBroadcast();

        console.log("MockDOT:          ", address(dot));
        console.log("PVMPhysicsEngine: ", address(engine));
        console.log("SimLab:           ", address(lab));
        console.log("SimNFT:           ", address(nft));
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Mock DOT token for testnet (10 decimals, matching Polkadot Hub native)
contract MockDOT is ERC20, Ownable {
    constructor() ERC20("Mock DOT", "mDOT") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }
    function decimals() public pure override returns (uint8) { return 10; }
    function mint(address to, uint256 amount) external onlyOwner { _mint(to, amount); }
    function faucet() external { _mint(msg.sender, 1000 * 10 ** decimals()); }
}

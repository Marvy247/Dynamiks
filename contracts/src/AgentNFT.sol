// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title AgentNFT
/// @notice Dynamic ERC-721 NFT for champion agents. Metadata evolves with wins.
contract AgentNFT is ERC721, Ownable {
    uint256 private _nextTokenId;

    struct AgentData {
        uint64  packedGenes;   // [attack:16][defense:16][speed:16][adaptability:16]
        uint256 wins;
        uint256 tournamentId;
        uint256 mintedAt;
        string  name;
    }

    mapping(uint256 => AgentData) public agentData;
    // authorized minters (ArenaManager)
    mapping(address => bool) public minters;

    event AgentMinted(uint256 indexed tokenId, address indexed owner, uint64 packedGenes);
    event AgentEvolved(uint256 indexed tokenId, uint256 newWins);

    constructor() ERC721("Karena Champion Agent", "KRNFT") Ownable(msg.sender) {}

    function setMinter(address minter, bool allowed) external onlyOwner {
        minters[minter] = allowed;
    }

    function mintChampion(
        address to,
        uint64 packedGenes,
        uint256 tournamentId,
        string calldata agentName
    ) external returns (uint256 tokenId) {
        require(minters[msg.sender] || msg.sender == owner(), "Not authorized");
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        agentData[tokenId] = AgentData({
            packedGenes: packedGenes,
            wins: 1,
            tournamentId: tournamentId,
            mintedAt: block.timestamp,
            name: agentName
        });
        emit AgentMinted(tokenId, to, packedGenes);
    }

    function recordWin(uint256 tokenId) external {
        require(minters[msg.sender] || msg.sender == owner(), "Not authorized");
        agentData[tokenId].wins++;
        emit AgentEvolved(tokenId, agentData[tokenId].wins);
    }

    /// @notice On-chain SVG metadata — fully dynamic, no IPFS needed
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        AgentData memory d = agentData[tokenId];
        uint64 attack = uint64((d.packedGenes >> 48) & 0xffff);
        uint64 defense = uint64((d.packedGenes >> 32) & 0xffff);
        uint64 speed = uint64((d.packedGenes >> 16) & 0xffff);
        uint64 adapt = uint64(d.packedGenes & 0xffff);

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">',
            '<rect width="400" height="400" fill="#0a0a1a"/>',
            '<text x="200" y="50" fill="#e040fb" font-size="24" text-anchor="middle" font-family="monospace">KARENA CHAMPION</text>',
            '<text x="200" y="90" fill="#ffffff" font-size="16" text-anchor="middle" font-family="monospace">', d.name, '</text>',
            '<text x="40" y="150" fill="#00e5ff" font-size="14" font-family="monospace">ATK: ', _uint2str(attack), '</text>',
            '<text x="40" y="180" fill="#69f0ae" font-size="14" font-family="monospace">DEF: ', _uint2str(defense), '</text>',
            '<text x="40" y="210" fill="#ffeb3b" font-size="14" font-family="monospace">SPD: ', _uint2str(speed), '</text>',
            '<text x="40" y="240" fill="#ff6e40" font-size="14" font-family="monospace">ADP: ', _uint2str(adapt), '</text>',
            '<text x="200" y="320" fill="#e040fb" font-size="20" text-anchor="middle" font-family="monospace">WINS: ', _uint2str(d.wins), '</text>',
            '<text x="200" y="370" fill="#555" font-size="10" text-anchor="middle" font-family="monospace">Tournament #', _uint2str(d.tournamentId), '</text>',
            '</svg>'
        ));

        string memory json = string(abi.encodePacked(
            '{"name":"', d.name, ' #', _uint2str(tokenId), '",',
            '"description":"Karena Champion Agent - evolved on PolkaVM",',
            '"image":"data:image/svg+xml;base64,', _base64(bytes(svg)), '",',
            '"attributes":[',
            '{"trait_type":"Attack","value":', _uint2str(attack), '},',
            '{"trait_type":"Defense","value":', _uint2str(defense), '},',
            '{"trait_type":"Speed","value":', _uint2str(speed), '},',
            '{"trait_type":"Adaptability","value":', _uint2str(adapt), '},',
            '{"trait_type":"Wins","value":', _uint2str(d.wins), '}',
            ']}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", _base64(bytes(json))));
    }

    function totalSupply() external view returns (uint256) { return _nextTokenId; }

    function getAgentWins(uint256 tokenId) external view returns (uint256) {
        return agentData[tokenId].wins;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function _uint2str(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 tmp = v; uint256 digits;
        while (tmp != 0) { digits++; tmp /= 10; }
        bytes memory buf = new bytes(digits);
        while (v != 0) { digits--; buf[digits] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(buf);
    }

    bytes internal constant _TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function _base64(bytes memory data) internal pure returns (string memory) {
        uint256 len = data.length;
        if (len == 0) return "";
        uint256 encodedLen = 4 * ((len + 2) / 3);
        bytes memory result = new bytes(encodedLen + 32);
        bytes memory table = _TABLE;
        assembly {
            let tablePtr := add(table, 1)
            let resultPtr := add(result, 32)
            for { let i := 0 } lt(i, len) {} {
                i := add(i, 3)
                let input := and(mload(add(data, i)), 0xffffff)
                let out := mload(add(tablePtr, and(shr(18, input), 0x3F)))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(12, input), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(shr(6, input), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tablePtr, and(input, 0x3F))), 0xFF))
                out := shl(224, out)
                mstore(resultPtr, out)
                resultPtr := add(resultPtr, 4)
            }
            switch mod(len, 3)
            case 1 { mstore(sub(resultPtr, 2), shl(240, 0x3d3d)) }
            case 2 { mstore(sub(resultPtr, 1), shl(248, 0x3d)) }
            mstore(result, encodedLen)
        }
        return string(result);
    }
}

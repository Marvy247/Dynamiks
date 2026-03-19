// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title SimNFT
/// @notice Dynamic ERC-721 for saved simulation snapshots.
///         Metadata is fully on-chain — no IPFS.
contract SimNFT is ERC721, Ownable {
    uint256 private _nextId;

    struct SimSnapshot {
        uint256 labId;
        uint8   simType;
        int64   energy;
        uint256 bodyCount;
        uint256 steps;
        uint256 mintedAt;
        string  name;
    }

    mapping(uint256 => SimSnapshot) public snapshots;
    mapping(address => bool) public minters;

    string[4] private SIM_NAMES = ["N-Body Gravity", "Particle System", "Rigid Body", "Wave Equation"];
    string[4] private SIM_COLORS = ["#e040fb", "#00e5ff", "#69f0ae", "#ffeb3b"];

    event SimMinted(uint256 indexed tokenId, address indexed owner, uint8 simType, int64 energy);

    constructor() ERC721("Dynamiks Simulation", "DSIM") Ownable(msg.sender) {}

    function setMinter(address m, bool allowed) external onlyOwner { minters[m] = allowed; }

    function mint(
        address to,
        uint256 labId,
        uint8 simType,
        int64 energy,
        uint256 bodyCount,
        uint256 steps,
        string calldata name
    ) external returns (uint256 tokenId) {
        require(minters[msg.sender] || msg.sender == owner(), "Not authorized");
        tokenId = _nextId++;
        _safeMint(to, tokenId);
        snapshots[tokenId] = SimSnapshot(labId, simType, energy, bodyCount, steps, block.timestamp, name);
        emit SimMinted(tokenId, to, simType, energy);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Nonexistent");
        SimSnapshot memory s = snapshots[tokenId];
        string memory color = SIM_COLORS[s.simType % 4];
        string memory simName = SIM_NAMES[s.simType % 4];

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">',
            '<defs><radialGradient id="bg" cx="50%" cy="50%" r="70%">',
            '<stop offset="0%" stop-color="#1a0a2e"/><stop offset="100%" stop-color="#07071a"/></radialGradient></defs>',
            '<rect width="400" height="400" fill="url(#bg)"/>',
            _drawGrid(),
            '<text x="200" y="48" fill="', color, '" font-size="13" text-anchor="middle" font-family="monospace" font-weight="bold">DYNAMIKS SIMULATION</text>',
            '<text x="200" y="78" fill="#ffffff" font-size="18" text-anchor="middle" font-family="monospace" font-weight="bold">', s.name, '</text>',
            '<text x="200" y="108" fill="', color, '" font-size="11" text-anchor="middle" font-family="monospace">', simName, '</text>',
            _drawStats(s, color),
            '<text x="200" y="370" fill="#333" font-size="9" text-anchor="middle" font-family="monospace">Lab #', _u2s(s.labId), ' | Block ', _u2s(s.mintedAt), '</text>',
            '</svg>'
        ));

        string memory json = string(abi.encodePacked(
            '{"name":"', s.name, ' #', _u2s(tokenId), '",',
            '"description":"On-chain physics simulation snapshot - Dynamiks on Polkadot Hub",',
            '"image":"data:image/svg+xml;base64,', _b64(bytes(svg)), '",',
            '"attributes":[',
            '{"trait_type":"Simulation","value":"', simName, '"},',
            '{"trait_type":"Bodies","value":', _u2s(s.bodyCount), '},',
            '{"trait_type":"Steps","value":', _u2s(s.steps), '},',
            '{"trait_type":"Energy","value":', _i2s(s.energy), '}',
            ']}'
        ));
        return string(abi.encodePacked("data:application/json;base64,", _b64(bytes(json))));
    }

    function totalSupply() external view returns (uint256) { return _nextId; }

    // ─── SVG helpers ──────────────────────────────────────────────────────────

    function _drawGrid() internal pure returns (string memory g) {
        g = '<g opacity="0.08" stroke="#8888ff" stroke-width="0.5">';
        for (uint i = 0; i <= 10; i++) {
            uint x = i * 40;
            g = string(abi.encodePacked(g,
                '<line x1="', _u2s(x), '" y1="0" x2="', _u2s(x), '" y2="400"/>',
                '<line x1="0" y1="', _u2s(x), '" x2="400" y2="', _u2s(x), '"/>'
            ));
        }
        g = string(abi.encodePacked(g, '</g>'));
    }

    function _drawStats(SimSnapshot memory s, string memory color) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '<rect x="60" y="140" width="280" height="160" rx="12" fill="#0d0d2a" stroke="', color, '" stroke-width="1" opacity="0.8"/>',
            '<text x="200" y="172" fill="', color, '" font-size="11" text-anchor="middle" font-family="monospace">SIMULATION PARAMETERS</text>',
            '<text x="80" y="200" fill="#aaa" font-size="11" font-family="monospace">Bodies / Nodes</text>',
            '<text x="340" y="200" fill="#fff" font-size="11" text-anchor="end" font-family="monospace">', _u2s(s.bodyCount), '</text>',
            '<text x="80" y="222" fill="#aaa" font-size="11" font-family="monospace">Steps Computed</text>',
            '<text x="340" y="222" fill="#fff" font-size="11" text-anchor="end" font-family="monospace">', _u2s(s.steps), '</text>',
            '<text x="80" y="244" fill="#aaa" font-size="11" font-family="monospace">System Energy</text>',
            '<text x="340" y="244" fill="', color, '" font-size="11" text-anchor="end" font-family="monospace">', _i2s(s.energy), '</text>',
            '<text x="80" y="266" fill="#aaa" font-size="11" font-family="monospace">Lab ID</text>',
            '<text x="340" y="266" fill="#fff" font-size="11" text-anchor="end" font-family="monospace">#', _u2s(s.labId), '</text>',
            '<text x="80" y="288" fill="#aaa" font-size="11" font-family="monospace">Powered by</text>',
            '<text x="340" y="288" fill="', color, '" font-size="11" text-anchor="end" font-family="monospace">PolkaVM RISC-V</text>'
        ));
    }

    // ─── Encoding helpers ─────────────────────────────────────────────────────

    function _u2s(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 t = v; uint256 d;
        while (t != 0) { d++; t /= 10; }
        bytes memory b = new bytes(d);
        while (v != 0) { d--; b[d] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(b);
    }

    function _i2s(int64 v) internal pure returns (string memory) {
        if (v < 0) return string(abi.encodePacked("-", _u2s(uint256(uint64(-v)))));
        return _u2s(uint256(uint64(v)));
    }

    bytes internal constant _T = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function _b64(bytes memory data) internal pure returns (string memory) {
        uint256 len = data.length;
        if (len == 0) return "";
        uint256 encLen = 4 * ((len + 2) / 3);
        bytes memory result = new bytes(encLen + 32);
        bytes memory table = _T;
        assembly {
            let tp := add(table, 1)
            let rp := add(result, 32)
            for { let i := 0 } lt(i, len) {} {
                i := add(i, 3)
                let inp := and(mload(add(data, i)), 0xffffff)
                let out := mload(add(tp, and(shr(18, inp), 0x3F)))
                out := shl(8, out)
                out := add(out, and(mload(add(tp, and(shr(12, inp), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tp, and(shr(6, inp), 0x3F))), 0xFF))
                out := shl(8, out)
                out := add(out, and(mload(add(tp, and(inp, 0x3F))), 0xFF))
                mstore(rp, shl(224, out))
                rp := add(rp, 4)
            }
            switch mod(len, 3)
            case 1 { mstore(sub(rp, 2), shl(240, 0x3d3d)) }
            case 2 { mstore(sub(rp, 1), shl(248, 0x3d)) }
            mstore(result, encLen)
        }
        return string(result);
    }
}

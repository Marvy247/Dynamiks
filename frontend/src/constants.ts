// Contract addresses — update after deployment
export const CONTRACTS = {
  mockDOT:        "0xf1919E7a4F179778082845e347B854e446E16e48",
  pvmBattleEngine:"0x07B15f39637976C416983B57D723099655747335",
  arenaManager:   "0xc193e2BC9f29F2932f98839bB5A4cB7a6483fF59",
  agentNFT:       "0xd498EF9Cbf003D19C69AeE5B02A8E53e02E264e2",
} as const;

export const CHAIN_ID = 420420417;
export const RPC_URL  = "https://eth-rpc-testnet.polkadot.io";
export const EXPLORER = "https://blockscout-testnet.polkadot.io";
export const DOT_DECIMALS = 10;

export const ARENA_MANAGER_ABI = [
  "function createArena(string,uint64,uint64,uint256,uint32) returns (uint256)",
  "function joinArena(uint256,uint64) payable",
  "function startTournament(uint256) returns (uint256)",
  "function finalizeTournament(uint256,address)",
  "function getArenaPlayers(uint256) view returns (address[])",
  "function getArenaCount() view returns (uint256)",
  "function getTournamentCount() view returns (uint256)",
  "function arenas(uint256) view returns (uint64,uint64,uint256,uint256,uint32,uint32,bool,string)",
  "function tournaments(uint256) view returns (uint256,uint64,uint32,uint32,bool,address,uint256)",
  "function playerAgents(uint256,address) view returns (uint64)",
  "function playerWins(address) view returns (uint256)",
  "event ArenaCreated(uint256 indexed,string,uint256)",
  "event PlayerJoined(uint256 indexed,address indexed,uint64)",
  "event TournamentStarted(uint256 indexed,uint256 indexed)",
  "event TournamentFinalized(uint256 indexed,address indexed,uint256)",
] as const;

export const PVM_ENGINE_ABI = [
  "function geneticEvolve(uint64,uint64,uint64,uint64) view returns (uint64)",
  "function monteCarloTournament(uint64[],uint64,uint64) view returns (uint64)",
  "function astarPathfind(uint64,uint64,uint64,uint64,uint64,uint64) view returns (uint64)",
  "function computeAgentPower(uint64,int64[]) view returns (int64)",
  "function pvmAvailable() view returns (bool)",
] as const;

export const AGENT_NFT_ABI = [
  "function mintChampion(address,uint64,uint256,string) returns (uint256)",
  "function tokenURI(uint256) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function getAgentWins(uint256) view returns (uint256)",
  "function ownerOf(uint256) view returns (address)",
  "function balanceOf(address) view returns (uint256)",
] as const;

export const MOCK_DOT_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function allowance(address,address) view returns (uint256)",
  "function faucet()",
  "function decimals() view returns (uint8)",
] as const;

export const GENE_LABELS = ["Attack", "Defense", "Speed", "Adaptability"] as const;

export const PARACHAINS = [
  { id: 2034, name: "HydraDX" },
  { id: 2006, name: "Astar" },
  { id: 2004, name: "Moonbeam" },
  { id: 2001, name: "Bifrost" },
] as const;

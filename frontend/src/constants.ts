export const CONTRACTS = {
  mockDOT:        "0x921122bC886E537549072c6F3A591e6BD7957914",
  physicsEngine:  "0x78D7a2102725A7715153fD71E47C3284222422f6",
  simLab:         "0x006a2d1030BCd6CaBD41cE90f244A51D5a0C1a3E",
  simNFT:         "0x5D3315CF2fb6D4E0222A65231352dd4402A40306",
} as const;

export const CHAIN_ID   = 420420417;
export const RPC_URL    = "https://eth-rpc-testnet.polkadot.io";
export const EXPLORER   = "https://blockscout-testnet.polkadot.io";
export const DOT_DECIMALS = 10;

export const SIM_TYPES = ["N-Body Gravity", "Particle System", "Rigid Body", "Wave Equation"] as const;
export const SIM_COLORS = ["#e040fb", "#00e5ff", "#69f0ae", "#ffeb3b"] as const;

export const SIM_LAB_ABI = [
  "function createLab(string,uint8,uint64,int64,int64,int64[],bool) returns (uint256)",
  "function recordSimulation(uint256,int64[],int64)",
  "function saveSnapshot(uint256,int64[])",
  "function claimFaucet()",
  "function grantCredits(address,uint256)",
  "function getLabCount() view returns (uint256)",
  "function getLabInitialState(uint256) view returns (int64[])",
  "function getLabFinalState(uint256) view returns (int64[])",
  "function getSnapshotCount(uint256) view returns (uint256)",
  "function credits(address) view returns (uint256)",
  "function constants() view returns (int64,int64,int64,int64)",
  "event LabCreated(uint256 indexed,address indexed,string,uint8)",
  "event SimulationRun(uint256 indexed,address indexed,uint64,int64)",
] as const;

export const PHYSICS_ENGINE_ABI = [
  "function nbodySimulate(int64[],uint64,int64,int64) view returns (int64[],int64)",
  "function particleSimulate(int64[],uint64,int64,int64,int64,int64) view returns (int64[])",
  "function rigidbodySimulate(int64[],uint64,int64,int64,int64,int64) view returns (int64[])",
  "function waveSimulate(int64[],int64[],uint64,int64,int64) view returns (int64[])",
  "function computeEnergy(int64[],int64) view returns (int64)",
  "function pvmAvailable() view returns (bool)",
] as const;

export const SIM_NFT_ABI = [
  "function mint(address,uint256,uint8,int64,uint256,uint256,string) returns (uint256)",
  "function tokenURI(uint256) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
] as const;

export const MOCK_DOT_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function faucet()",
  "function decimals() view returns (uint8)",
] as const;

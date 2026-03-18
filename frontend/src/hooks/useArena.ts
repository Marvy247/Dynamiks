import { useState, useEffect, useCallback } from "react";
import { Contract, formatUnits } from "ethers";
import { useWallet } from "../context/WalletContext";
import {
  CONTRACTS, ARENA_MANAGER_ABI, PVM_ENGINE_ABI, AGENT_NFT_ABI, MOCK_DOT_ABI, DOT_DECIMALS
} from "../constants";

export interface ArenaInfo {
  id: number;
  name: string;
  mapSeed: bigint;
  gridSize: bigint;
  entryFee: string;
  prizePool: string;
  maxPlayers: number;
  playerCount: number;
  active: boolean;
  players: string[];
}

export interface TournamentInfo {
  id: number;
  arenaId: number;
  finalized: boolean;
  winner: string;
  prizePool: string;
}

export interface AgentGenes {
  attack: number;
  defense: number;
  speed: number;
  adaptability: number;
  packed: bigint;
}

export function useArena() {
  const { provider, address } = useWallet();
  const [arenas, setArenas] = useState<ArenaInfo[]>([]);
  const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);
  const [dotBalance, setDotBalance] = useState("0");
  const [myAgent, setMyAgent] = useState<AgentGenes | null>(null);
  const [myWins, setMyWins] = useState(0);
  const [nftCount, setNftCount] = useState(0);
  const [pvmAvailable, setPvmAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  const unpackGenes = (packed: bigint): AgentGenes => ({
    attack:       Number((packed >> 48n) & 0xffffn),
    defense:      Number((packed >> 32n) & 0xffffn),
    speed:        Number((packed >> 16n) & 0xffffn),
    adaptability: Number(packed & 0xffffn),
    packed,
  });

  const packGenes = (attack: number, defense: number, speed: number, adaptability: number): bigint =>
    (BigInt(attack) << 48n) | (BigInt(defense) << 32n) | (BigInt(speed) << 16n) | BigInt(adaptability);

  const refresh = useCallback(async () => {
    if (!provider) return;
    setLoading(true);
    try {
      const am = new Contract(CONTRACTS.arenaManager, ARENA_MANAGER_ABI, provider);
      const eng = new Contract(CONTRACTS.pvmBattleEngine, PVM_ENGINE_ABI, provider);
      const nft = new Contract(CONTRACTS.agentNFT, AGENT_NFT_ABI, provider);
      const dot = new Contract(CONTRACTS.mockDOT, MOCK_DOT_ABI, provider);

      const [arenaCount, tournamentCount, pvm] = await Promise.all([
        am.getArenaCount(),
        am.getTournamentCount(),
        eng.pvmAvailable(),
      ]);
      setPvmAvailable(pvm);

      // Load arenas
      const arenaList: ArenaInfo[] = [];
      for (let i = 0; i < Number(arenaCount); i++) {
        const [mapSeed, gridSize, entryFee, prizePool, maxPlayers, playerCount, active, name] = await am.arenas(i);
        const players = await am.getArenaPlayers(i);
        arenaList.push({
          id: i, name, mapSeed, gridSize,
          entryFee: formatUnits(entryFee, DOT_DECIMALS),
          prizePool: formatUnits(prizePool, DOT_DECIMALS),
          maxPlayers: Number(maxPlayers),
          playerCount: Number(playerCount),
          active, players,
        });
      }
      setArenas(arenaList);

      // Load tournaments
      const tList: TournamentInfo[] = [];
      for (let i = 0; i < Number(tournamentCount); i++) {
        const [arenaId,,,,finalized, winner, prizePool] = await am.tournaments(i);
        tList.push({
          id: i, arenaId: Number(arenaId), finalized, winner,
          prizePool: formatUnits(prizePool, DOT_DECIMALS),
        });
      }
      setTournaments(tList);

      // User-specific data
      if (address) {
        const [bal, wins, nfts] = await Promise.all([
          dot.balanceOf(address),
          am.playerWins(address),
          nft.balanceOf(address),
        ]);
        setDotBalance(formatUnits(bal, DOT_DECIMALS));
        setMyWins(Number(wins));
        setNftCount(Number(nfts));

        // Check if user has an agent in arena 0
        if (arenaList.length > 0) {
          const packed = await am.playerAgents(0, address);
          if (packed > 0n) setMyAgent(unpackGenes(packed));
        }
      }
    } catch (e) {
      console.error("refresh error", e);
    } finally {
      setLoading(false);
    }
  }, [provider, address]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  const joinArena = async (arenaId: number, attack: number, defense: number, speed: number, adaptability: number) => {
    if (!provider) return;
    const signer = await provider.getSigner();
    const am = new Contract(CONTRACTS.arenaManager, ARENA_MANAGER_ABI, signer);
    const packed = packGenes(attack, defense, speed, adaptability);
    const tx = await am.joinArena(arenaId, packed);
    await tx.wait();
    await refresh();
  };

  const claimFaucet = async () => {
    if (!provider) return;
    const signer = await provider.getSigner();
    const dot = new Contract(CONTRACTS.mockDOT, MOCK_DOT_ABI, signer);
    const tx = await dot.faucet();
    await tx.wait();
    await refresh();
  };

  return {
    arenas, tournaments, dotBalance, myAgent, myWins, nftCount,
    pvmAvailable, loading, refresh, joinArena, claimFaucet, unpackGenes,
  };
}

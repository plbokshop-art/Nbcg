import React, { useEffect, useState } from 'react';
import { GameModeId, MatchmakingQueueStatus, TacticalMapId, TACTICAL_MAPS } from '../../shared/types.js';
import { soundEngine } from '../../utils/audio.js';

interface Props {
  playerId: string;
  selectedMode: GameModeId;
  selectedMap?: TacticalMapId;
  onMatchFound: (matchId: string) => void;
  onCancelQueue: () => void;
}

export const MatchmakingModal: React.FC<Props> = ({
  playerId,
  selectedMode,
  selectedMap = 'SECTOR_07',
  onMatchFound,
  onCancelQueue,
}) => {
  const mapMeta = TACTICAL_MAPS[selectedMap] || TACTICAL_MAPS.SECTOR_07;
  const [status, setStatus] = useState<MatchmakingQueueStatus>({
    inQueue: true,
    mode: selectedMode,
    region: 'EU-Central',
    mapId: selectedMap,
    searchTimeSeconds: 0,
    playersFound: 1,
    maxPlayers: selectedMode === 'TRAINING' ? 1 : 10,
    matchedMatchId: null,
  });

  useEffect(() => {
    // Poll queue status every 1000ms
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/matchmaking/status?playerId=${playerId}`);
        const data = await res.json();
        if (data.success && data.status) {
          setStatus(data.status);
          if (data.status.matchedMatchId) {
            clearInterval(interval);
            soundEngine.playMatchFound();
            onMatchFound(data.status.matchedMatchId);
          }
        }
      } catch (e) {
        console.error('Error polling matchmaking status', e);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [playerId, onMatchFound]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancel = async () => {
    soundEngine.playClick();
    try {
      await fetch('/api/matchmaking/queue', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
    } catch (e) {
      console.error(e);
    }
    onCancelQueue();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-950 border border-cyan-500/40 shadow-2xl shadow-cyan-500/10 p-6 md:p-8 flex flex-col items-center text-center gap-6">
        {/* Holographic Radar Pulse Animation */}
        <div className="relative flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-cyan-500/30 animate-ping opacity-60" />
          <div className="absolute inset-2 rounded-full border border-cyan-500/50 animate-pulse" />
          <div className="h-16 w-16 rounded-full bg-cyan-950/80 border border-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/40">
            <span className="text-xl">🎯</span>
          </div>
        </div>

        {/* Searching Title & Info */}
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-black tracking-widest text-white uppercase animate-pulse">
            SEARCHING FOR MATCH...
          </h2>
          <span className="text-xs font-mono text-cyan-400">
            CONNECTING TO VANGUARD QUANTUM NETWORK
          </span>
        </div>

        {/* Status Parameters */}
        <div className="w-full rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col gap-2.5 text-xs font-mono">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">OPERATION:</span>
            <span className="text-white font-bold tracking-wide">{status.mode}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">TARGET SECTOR:</span>
            <span className="text-cyan-400 font-bold tracking-wide">
              {mapMeta.name} ({mapMeta.sizeMeters})
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">REGION:</span>
            <span className="text-cyan-300 font-bold">{status.region} (18ms)</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">ELAPSED TIME:</span>
            <span className="text-amber-400 font-bold font-mono text-sm">
              {formatTimer(status.searchTimeSeconds)}
            </span>
          </div>

          <div className="flex justify-between items-center border-t border-slate-800/80 pt-2.5">
            <span className="text-slate-400">AGENTS LOCKED:</span>
            <span className="text-emerald-400 font-bold font-mono text-sm">
              {status.playersFound} / {status.maxPlayers}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden mt-1">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${(status.playersFound / status.maxPlayers) * 100}%` }}
            />
          </div>
        </div>

        {/* Cancel Button */}
        <button
          onClick={handleCancel}
          className="w-full py-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/50 text-rose-300 font-mono font-bold text-xs uppercase tracking-wider transition"
        >
          CANCEL SEARCH
        </button>
      </div>
    </div>
  );
};

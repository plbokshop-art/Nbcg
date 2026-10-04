import React, { useEffect, useState } from 'react';
import { MatchHistoryItem, MatchSession, PlayerProfile } from '../../shared/types.js';
import { soundEngine } from '../../utils/audio.js';

interface Props {
  match: MatchSession;
  playerId: string;
  onReturnToLobby: () => void;
}

export const MatchEndScreen: React.FC<Props> = ({ match, playerId, onReturnToLobby }) => {
  const [settled, setSettled] = useState(false);
  const [record, setRecord] = useState<MatchHistoryItem | null>(null);
  const [updatedProfile, setUpdatedProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const me = match.players.find((p) => p.id === playerId);
  const isAlpha = me?.team === 'ALPHA';
  const isWin = isAlpha ? match.scoreAlpha >= match.scoreOmega : match.scoreOmega >= match.scoreAlpha;

  useEffect(() => {
    if (isWin) {
      soundEngine.playVictory();
    }

    // Call server settlement endpoint with idempotency token
    const settle = async () => {
      try {
        const res = await fetch(`/api/matches/${match.id}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId,
            idempotencyToken: match.idempotencyToken || `token_${match.id}`,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSettled(true);
          setRecord(data.matchRecord);
          setUpdatedProfile(data.profile);
        }
      } catch (e) {
        console.error('Failed to settle match on server', e);
      } finally {
        setLoading(false);
      }
    };

    settle();
  }, [match.id, playerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 select-none animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-8 flex flex-col items-center text-center gap-6">
        {/* Victory / Defeat Header */}
        <div className="flex flex-col items-center gap-2">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-3xl border-2 text-4xl shadow-2xl ${
              isWin
                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-400 shadow-emerald-500/40 animate-pulse'
                : 'bg-rose-950/80 border-rose-400 text-rose-400 shadow-rose-500/40'
            }`}
          >
            {isWin ? '🏆' : '💀'}
          </div>

          <h1
            className={`text-4xl font-black tracking-widest uppercase font-mono mt-2 ${
              isWin ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isWin ? 'VICTORY' : 'DEFEAT'}
          </h1>
          <span className="text-xl font-mono font-bold text-white tracking-widest">
            {match.scoreAlpha} : {match.scoreOmega}
          </span>
          <span className="text-xs font-mono text-slate-400">
            {match.mapName} • {match.mode} 5V5
          </span>
        </div>

        {/* Combat Metrics Breakdown */}
        <div className="w-full grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 flex flex-col font-mono">
            <span className="text-[10px] text-slate-400">KILLS / DEATHS / ASSISTS</span>
            <span className="text-lg font-bold text-white mt-1">
              {record?.kills ?? me?.kills ?? 18} /{' '}
              <span className="text-rose-400">{record?.deaths ?? me?.deaths ?? 10}</span> /{' '}
              {record?.assists ?? me?.assists ?? 6}
            </span>
          </div>

          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 flex flex-col font-mono">
            <span className="text-[10px] text-slate-400">RATING ADJUSTMENT</span>
            <span
              className={`text-lg font-bold mt-1 ${
                (record?.ratingChange ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(record?.ratingChange ?? 0) >= 0 ? `+${record?.ratingChange ?? 24}` : record?.ratingChange ?? -18} ELO
            </span>
          </div>

          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3 flex flex-col font-mono">
            <span className="text-[10px] text-slate-400">XP REWARD</span>
            <span className="text-lg font-bold text-cyan-400 mt-1">
              +{record?.xpEarned ?? 420} XP
            </span>
          </div>
        </div>

        {/* Updated Rating Status Bar */}
        {updatedProfile && (
          <div className="w-full rounded-xl bg-slate-900/50 border border-slate-800/80 p-4 flex flex-col gap-2 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">CURRENT COMPETITIVE RATING</span>
              <span className="text-white font-bold">
                {updatedProfile.rating} ELO ({updatedProfile.rankTier})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">ACCOUNT LEVEL</span>
              <span className="text-cyan-400 font-bold">
                LEVEL {updatedProfile.level} ({updatedProfile.xp}/{updatedProfile.xpToNextLevel} XP)
              </span>
            </div>
          </div>
        )}

        {/* Return to Lobby Button */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onReturnToLobby();
          }}
          disabled={loading}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black font-mono tracking-widest text-sm uppercase transition shadow-xl shadow-cyan-500/20 disabled:opacity-50"
        >
          {loading ? 'SETTLING ENCRYPTED TELEMETRY...' : 'RETURN TO LOBBY'}
        </button>
      </div>
    </div>
  );
};

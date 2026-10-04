import React from 'react';
import { PlayerProfile } from '../../shared/types.js';
import { soundEngine } from '../../utils/audio.js';

interface Props {
  profile: PlayerProfile;
  onClose: () => void;
}

export const ProfileModal: React.FC<Props> = ({ profile, onClose }) => {
  const { stats } = profile;
  const kd = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : stats.kills.toFixed(2);
  const winRate = stats.totalMatches > 0 ? ((stats.wins / stats.totalMatches) * 100).toFixed(1) : '0.0';
  const headshotPct = stats.kills > 0 ? ((stats.headshots / stats.kills) * 100).toFixed(1) : '0.0';
  const hoursPlayed = (stats.playTimeMinutes / 60).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-6 md:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-900 border-2 border-cyan-400/60 shadow-lg shadow-cyan-500/20 text-2xl font-black text-white">
              {profile.username.substring(0, 2).toUpperCase()}
              <div className="absolute -bottom-1 -right-1 rounded-md bg-black px-1.5 py-0.5 text-[10px] font-mono font-bold text-cyan-300 border border-cyan-500/40">
                LVL {profile.level}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-wider text-white uppercase">{profile.username}</h2>
                <span className="rounded-full bg-cyan-950/80 px-2.5 py-0.5 text-xs font-mono font-bold text-cyan-400 border border-cyan-500/40">
                  {profile.rankTier}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-1">
                COMPETITIVE RATING: <span className="text-cyan-300 font-bold">{profile.rating} ELO</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Level Progression */}
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4">
          <div className="flex justify-between text-xs font-mono mb-2">
            <span className="text-slate-400">LEVEL {profile.level} PROGRESS</span>
            <span className="text-cyan-400 font-bold">
              {profile.xp} / {profile.xpToNextLevel} XP
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 shadow-md shadow-cyan-500/50"
              style={{ width: `${Math.min(100, (profile.xp / profile.xpToNextLevel) * 100)}%` }}
            />
          </div>
        </div>

        {/* Combat Performance Stats Grid */}
        <div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3">
            COMBAT DOSSIER // AUTHORITATIVE METRICS
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col">
              <span className="text-[11px] font-mono text-slate-400">TOTAL MATCHES</span>
              <span className="text-2xl font-black text-white mt-1">{stats.totalMatches}</span>
              <span className="text-[10px] font-mono text-slate-500 mt-auto pt-1">
                {stats.wins}W - {stats.losses}L
              </span>
            </div>

            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col">
              <span className="text-[11px] font-mono text-slate-400">WIN RATE</span>
              <span className="text-2xl font-black text-cyan-400 mt-1">{winRate}%</span>
              <span className="text-[10px] font-mono text-slate-500 mt-auto pt-1">Competitive 5v5</span>
            </div>

            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col">
              <span className="text-[11px] font-mono text-slate-400">K/D RATIO</span>
              <span className="text-2xl font-black text-amber-400 mt-1">{kd}</span>
              <span className="text-[10px] font-mono text-slate-500 mt-auto pt-1">
                {stats.kills} Kills / {stats.deaths} Deaths
              </span>
            </div>

            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col">
              <span className="text-[11px] font-mono text-slate-400">HEADSHOT ACCURACY</span>
              <span className="text-2xl font-black text-rose-400 mt-1">{headshotPct}%</span>
              <span className="text-[10px] font-mono text-slate-500 mt-auto pt-1">{stats.headshots} Precision Hits</span>
            </div>

            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col">
              <span className="text-[11px] font-mono text-slate-400">ASSISTS</span>
              <span className="text-2xl font-black text-white mt-1">{stats.assists}</span>
              <span className="text-[10px] font-mono text-slate-500 mt-auto pt-1">Tactical Support</span>
            </div>

            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col">
              <span className="text-[11px] font-mono text-slate-400">MVP MEDALS</span>
              <span className="text-2xl font-black text-yellow-400 mt-1">★ {stats.mvpCount}</span>
              <span className="text-[10px] font-mono text-slate-500 mt-auto pt-1">Top Match Performer</span>
            </div>

            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col">
              <span className="text-[11px] font-mono text-slate-400">PLAY TIME</span>
              <span className="text-2xl font-black text-white mt-1">{hoursPlayed}h</span>
              <span className="text-[10px] font-mono text-slate-500 mt-auto pt-1">{stats.playTimeMinutes} Minutes</span>
            </div>

            <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col">
              <span className="text-[11px] font-mono text-slate-400">VANGUARD WALLET</span>
              <span className="text-2xl font-black text-emerald-400 mt-1">{profile.coins}</span>
              <span className="text-[10px] font-mono text-slate-500 mt-auto pt-1">Earned via matches</span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-mono font-bold tracking-wider uppercase transition shadow-lg shadow-cyan-600/20"
          >
            CONFIRM & CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

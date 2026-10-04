import React, { useEffect, useState } from 'react';
import { MatchSession, TACTICAL_MAPS } from '../../shared/types.js';

interface Props {
  match: MatchSession | null;
  playerId: string;
  onLoadingComplete: () => void;
}

export const GameLoadingScreen: React.FC<Props> = ({ match, playerId, onLoadingComplete }) => {
  const [progress, setProgress] = useState(15);
  const [loadStage, setLoadStage] = useState('INITIALIZING SHADER PIPELINE...');

  const playerTeam = match?.players.find((p) => p.id === playerId)?.team || 'ALPHA';
  const mapMeta = (match?.mapId && TACTICAL_MAPS[match.mapId]) || TACTICAL_MAPS.SECTOR_07;

  useEffect(() => {
    const steps = [
      { p: 35, text: `COMPILING WEAPON ASSETS & ${mapMeta.theme} SHADERS...` },
      { p: 65, text: `PRE-CACHING ${mapMeta.name.toUpperCase()} GEOMETRY...` },
      { p: 85, text: 'HANDSHAKING WITH SERVER-AUTHORITATIVE SIMULATOR...' },
      { p: 100, text: 'DEPLOYING AGENT TO MAP...' },
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < steps.length) {
        setProgress(steps[current].p);
        setLoadStage(steps[current].text);
        current++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          onLoadingComplete();
        }, 400);
      }
    }, 450);

    return () => clearInterval(interval);
  }, [onLoadingComplete, mapMeta]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black text-white p-8 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 bg-cyan-400 rotate-45" />
          <span className="font-mono text-sm tracking-widest text-cyan-400 font-bold">
            PROJECT VANGUARD // OPERATION {mapMeta.codename}
          </span>
        </div>
        <div className="font-mono text-xs text-slate-400">
          TICK: <span className="text-white font-bold">60 HZ SERVER AUTHORITATIVE</span>
        </div>
      </div>

      {/* Center Tactical Brief */}
      <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-8 backdrop-blur-md shadow-2xl flex flex-col md:flex-row items-center gap-8">
          {/* Map Preview Graphic */}
          <div className="relative h-48 w-80 rounded-xl overflow-hidden border border-cyan-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-black flex items-center justify-center shadow-lg shadow-cyan-500/20 p-4">
            <div className="absolute inset-0 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
            <div className="text-center z-10 flex flex-col items-center">
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold uppercase mb-1">
                TACTICAL ARENA • {mapMeta.sizeMeters}
              </span>
              <span className="text-xl font-black text-white tracking-wide">
                {mapMeta.name}
              </span>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  SITE A: {mapMeta.sites.siteA}
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950 border border-amber-500/40 text-amber-300">
                  SITE B: {mapMeta.sites.siteB}
                </span>
              </div>
            </div>
          </div>

          {/* Match Parameters */}
          <div className="flex-1 flex flex-col gap-3 font-mono text-xs">
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">OPERATION MODE:</span>
              <span className="text-cyan-300 font-bold">{match?.mode || 'COMPETITIVE'} 5v5</span>
            </div>

            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">MAP SECTOR:</span>
              <span className="text-white font-bold">{mapMeta.name}</span>
            </div>

            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">YOUR SQUAD:</span>
              <span className={`font-black tracking-wider ${playerTeam === 'ALPHA' ? 'text-cyan-400' : 'text-amber-400'}`}>
                {playerTeam === 'ALPHA' ? 'TEAM ALPHA (ATTACKERS)' : 'TEAM OMEGA (DEFENDERS)'}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">VICTORY THRESHOLD:</span>
              <span className="text-white font-bold">First to {match?.mode === 'COMPETITIVE' ? 9 : 5} Rounds</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">SECURITY PROTOCOL:</span>
              <span className="text-emerald-400 font-bold">Server-Side Raycast & Hit Validation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Loading Progress Bar */}
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-2 font-mono">
        <div className="flex justify-between text-xs">
          <span className="text-cyan-400 animate-pulse">{loadStage}</span>
          <span className="text-white font-bold">{progress}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 transition-all duration-300 shadow-md shadow-cyan-500/50"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

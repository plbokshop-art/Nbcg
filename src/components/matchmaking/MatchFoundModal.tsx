import React, { useEffect, useState } from 'react';
import { MatchSession, TacticalMapId, TACTICAL_MAPS } from '../../shared/types.js';
import { soundEngine } from '../../utils/audio.js';

interface Props {
  matchId: string;
  selectedMap?: TacticalMapId;
  match?: MatchSession | null;
  onProceedToLoading: () => void;
}

export const MatchFoundModal: React.FC<Props> = ({
  matchId,
  selectedMap = 'SECTOR_07',
  match,
  onProceedToLoading,
}) => {
  const [readyCount, setReadyCount] = useState<number>(8);
  const mapId = match?.mapId || selectedMap;
  const mapMeta = TACTICAL_MAPS[mapId] || TACTICAL_MAPS.SECTOR_07;

  useEffect(() => {
    soundEngine.playMatchFound();

    const t1 = setTimeout(() => setReadyCount(9), 800);
    const t2 = setTimeout(() => setReadyCount(10), 1600);
    const t3 = setTimeout(() => {
      onProceedToLoading();
    }, 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onProceedToLoading]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-gradient-to-b from-cyan-950/60 via-slate-950 to-black border-2 border-cyan-400 shadow-2xl shadow-cyan-500/30 p-8 flex flex-col items-center text-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/20 border border-cyan-400 text-3xl shadow-lg shadow-cyan-400/40 animate-bounce">
          ⚡
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
            TARGET ACQUIRED // {mapMeta.codename}
          </span>
          <h1 className="text-3xl font-black tracking-wider text-white uppercase">
            MATCH FOUND!
          </h1>
          <span className="text-sm font-mono text-slate-400">
            {match?.mode === 'TRAINING' ? 'SOLO COMBAT DRILL' : '5 VS 5 COMPETITIVE ENGAGEMENT'}
          </span>
        </div>

        <div className="w-full rounded-xl bg-slate-900/90 border border-slate-800 p-4 flex flex-col gap-3 font-mono text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">MATCH ID:</span>
            <span className="text-slate-300 font-bold">{matchId.substring(0, 16)}...</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">SECTOR / MAP:</span>
            <span className="text-cyan-300 font-bold">{mapMeta.name}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">LOCATION:</span>
            <span className="text-slate-300 font-mono text-[11px]">{mapMeta.location}</span>
          </div>

          <div className="flex justify-between items-center border-t border-slate-800 pt-3">
            <span className="text-slate-400">PLAYERS ACCEPTED:</span>
            <span className="text-emerald-400 font-bold text-sm">
              {readyCount} / 10
            </span>
          </div>

          {/* Slots indicator */}
          <div className="grid grid-cols-10 gap-1.5 pt-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className={`h-2.5 rounded-sm transition-all duration-300 ${
                  i < readyCount ? 'bg-cyan-400 shadow-sm shadow-cyan-400' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 animate-pulse">
          <div className="h-2 w-2 rounded-full bg-cyan-400" />
          <span>SYNCHRONIZING SERVER TICK ENGINE (60 HZ)...</span>
        </div>
      </div>
    </div>
  );
};

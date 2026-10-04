import React, { useEffect, useState } from 'react';
import { MatchHistoryItem } from '../../shared/types.js';
import { soundEngine } from '../../utils/audio.js';

interface Props {
  playerId: string;
  onClose: () => void;
}

export const MatchHistoryView: React.FC<Props> = ({ playerId, onClose }) => {
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const limit = 5;

  const fetchHistory = async (offsetPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profile/history?playerId=${playerId}&limit=${limit}&offset=${offsetPage * limit}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.items);
        setTotal(data.total);
      }
    } catch (e) {
      console.error('Failed to fetch match history', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(page);
  }, [page, playerId]);

  const maxPages = Math.ceil(total / limit);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-6 md:p-8 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <h2 className="text-xl font-black tracking-wider text-white uppercase">MATCH HISTORY DOSSIER</h2>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-1">
              RECORDED MATCHES: <span className="text-cyan-400 font-bold">{total}</span> • SERVER AUTHORITATIVE
            </p>
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

        {/* Content List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <span className="text-xs font-mono text-slate-400">RETRIEVING ENCRYPTED TELEMETRY...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="py-16 text-center text-slate-500 font-mono text-sm">
            NO RECORDED MATCHES FOUND IN CURRENT LOGS.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map((match) => {
              const isWin = match.result === 'VICTORY';
              const dateFormatted = new Date(match.date).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={match.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl p-4 border transition-all ${
                    isWin
                      ? 'bg-emerald-950/20 border-emerald-800/40 hover:border-emerald-500/60'
                      : 'bg-rose-950/20 border-rose-800/40 hover:border-rose-500/60'
                  }`}
                >
                  {/* Left Result Tag & Map */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-24 flex-col items-center justify-center rounded-lg font-black text-xs font-mono uppercase ${
                        isWin ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}
                    >
                      <span>{match.result}</span>
                      <span className="text-sm font-bold text-white tracking-wider">{match.score}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white tracking-wide">{match.mapName}</span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                          {match.mode}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">{dateFormatted}</span>
                    </div>
                  </div>

                  {/* Combat Performance Stats */}
                  <div className="flex items-center gap-6 text-xs font-mono">
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[10px]">K / D / A</span>
                      <span className="text-white font-bold text-sm">
                        {match.kills} / <span className="text-rose-400">{match.deaths}</span> / {match.assists}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[10px]">DURATION</span>
                      <span className="text-slate-200">
                        {Math.floor(match.durationSeconds / 60)}m {match.durationSeconds % 60}s
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-slate-400 text-[10px]">XP GAINED</span>
                      <span className="text-cyan-400 font-bold">+{match.xpEarned} XP</span>
                    </div>

                    {/* Rating Delta */}
                    <div className="flex flex-col items-end min-w-[70px]">
                      <span className="text-slate-400 text-[10px]">RATING</span>
                      <span
                        className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
                          match.ratingChange >= 0
                            ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-500/40'
                            : 'text-rose-300 bg-rose-950/60 border border-rose-500/40'
                        }`}
                      >
                        {match.ratingChange >= 0 ? `+${match.ratingChange}` : match.ratingChange} ELO
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2">
          <span className="text-xs font-mono text-slate-400">
            PAGE {page + 1} OF {Math.max(1, maxPages)}
          </span>

          <div className="flex items-center gap-2">
            <button
              disabled={page === 0 || loading}
              onClick={() => {
                soundEngine.playClick();
                setPage((p) => Math.max(0, p - 1));
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
            >
              PREVIOUS
            </button>
            <button
              disabled={page + 1 >= maxPages || loading}
              onClick={() => {
                soundEngine.playClick();
                setPage((p) => p + 1);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
            >
              NEXT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

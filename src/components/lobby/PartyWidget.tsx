import React, { useState } from 'react';
import { PartyState } from '../../shared/types.js';
import { soundEngine } from '../../utils/audio.js';

interface Props {
  party: PartyState | null;
  playerId: string;
  onRefreshParty: () => void;
}

export const PartyWidget: React.FC<Props> = ({ party, playerId, onRefreshParty }) => {
  const [inviting, setInviting] = useState(false);
  const [inviteName, setInviteName] = useState('');

  if (!party) return null;

  const currentMember = party.members.find((m) => m.id === playerId);
  const isLeader = party.leaderId === playerId;

  const handleToggleReady = async () => {
    soundEngine.playClick();
    try {
      await fetch('/api/party/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
      onRefreshParty();
    } catch (e) {
      console.error(e);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim()) return;
    soundEngine.playClick();
    try {
      await fetch('/api/party/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, friendName: inviteName }),
      });
      setInviteName('');
      setInviting(false);
      onRefreshParty();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeave = async () => {
    soundEngine.playClick();
    try {
      await fetch('/api/party/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
      onRefreshParty();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-950/80 border border-slate-800/80 p-4 backdrop-blur-md flex flex-col gap-3 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
            TACTICAL SQUAD // {party.members.length}/{party.maxSize}
          </span>
        </div>
        {party.members.length > 1 && (
          <button
            onClick={handleLeave}
            className="text-[10px] font-mono text-rose-400 hover:text-rose-300 transition uppercase"
          >
            Leave Squad
          </button>
        )}
      </div>

      {/* Members List */}
      <div className="flex flex-col gap-2">
        {party.members.map((member) => {
          const isSelf = member.id === playerId;
          return (
            <div
              key={member.id}
              className={`flex items-center justify-between rounded-xl px-3 py-2 border transition ${
                isSelf ? 'bg-cyan-950/20 border-cyan-500/30' : 'bg-slate-900/40 border-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-[10px] font-mono font-bold text-white border border-slate-700">
                  {member.level}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{member.username}</span>
                    {member.isLeader && (
                      <span className="text-[10px] text-amber-400" title="Squad Leader">
                        👑
                      </span>
                    )}
                    {isSelf && (
                      <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 px-1 rounded">YOU</span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{member.rating} ELO</span>
                </div>
              </div>

              {/* Ready Indicator */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    member.isReady
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-950/60 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {member.isReady ? 'READY' : 'NOT READY'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {party.members.length < party.maxSize && !inviting && (
          <button
            onClick={() => {
              soundEngine.playClick();
              setInviting(true);
            }}
            className="flex-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white transition"
          >
            + INVITE AGENT
          </button>
        )}

        <button
          onClick={handleToggleReady}
          className={`flex-1 py-1.5 rounded-lg font-mono text-xs font-bold transition ${
            currentMember?.isReady
              ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
          }`}
        >
          {currentMember?.isReady ? 'CANCEL READY' : 'SET READY'}
        </button>
      </div>

      {/* Invite Modal Input */}
      {inviting && (
        <form onSubmit={handleInvite} className="flex gap-2 animate-in fade-in duration-150">
          <input
            type="text"
            placeholder="Agent Call-Sign..."
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-cyan-500"
            autoFocus
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-mono font-bold transition"
          >
            SEND
          </button>
          <button
            type="button"
            onClick={() => setInviting(false)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs font-mono transition"
          >
            ✕
          </button>
        </form>
      )}
    </div>
  );
};

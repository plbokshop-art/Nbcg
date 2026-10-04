import React, { useState } from 'react';
import { GameModeId, PartyState, PlayerLoadout, PlayerProfile, TacticalMapId, TACTICAL_MAPS } from '../../shared/types.js';
import { soundEngine } from '../../utils/audio.js';
import { MatchHistoryView } from './MatchHistoryView.js';
import { PartyWidget } from './PartyWidget.js';
import { PlayerPreview3D } from './PlayerPreview3D.js';
import { ProfileModal } from './ProfileModal.js';
import { SettingsModal } from './SettingsModal.js';

interface Props {
  profile: PlayerProfile;
  party: PartyState | null;
  onStartMatchmaking: (mode: GameModeId, mapId?: TacticalMapId) => void;
  onUpdateLoadout: (loadout: PlayerLoadout) => void;
  onRefreshParty: () => void;
}

export const MainLobby: React.FC<Props> = ({
  profile,
  party,
  onStartMatchmaking,
  onUpdateLoadout,
  onRefreshParty,
}) => {
  const [selectedMode, setSelectedMode] = useState<GameModeId>(party?.selectedMode || 'COMPETITIVE');
  const [selectedMap, setSelectedMap] = useState<TacticalMapId>(party?.selectedMap || 'SECTOR_07');
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const handleModeSelect = async (mode: GameModeId) => {
    soundEngine.playClick();
    setSelectedMode(mode);
    try {
      await fetch('/api/party/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: profile.id, mode }),
      });
      onRefreshParty();
    } catch (e) {
      console.error(e);
    }
  };

  const handleWeaponSelect = (weapon: 'vanguard_rifle' | 'vanguard_smg' | 'vanguard_shotgun') => {
    soundEngine.playClick();
    const updated = { ...profile.loadout, primaryWeapon: weapon };
    onUpdateLoadout(updated);
  };

  const handleSkinSelect = (skin: 'default_tactical' | 'neon_matrix' | 'void_shadow' | 'gold_vanguard') => {
    soundEngine.playClick();
    const updated = { ...profile.loadout, rifleSkin: skin };
    onUpdateLoadout(updated);
  };

  const handleSuitSelect = (suit: 'black_ops' | 'arctic_camo' | 'desert_strike' | 'cyber_crimson') => {
    soundEngine.playClick();
    const updated = { ...profile.loadout, suitColor: suit };
    onUpdateLoadout(updated);
  };

  const toggleSoundMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white p-4 md:p-6 select-none">
      {/* Background Ambience Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

      {/* TOP HUD BAR */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
        {/* Brand Logo & Version */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 shadow-lg shadow-cyan-500/30">
            <span className="font-mono text-xl font-black text-black">V</span>
            <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-cyan-300 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-widest uppercase text-white font-mono">
                PROJECT VANGUARD
              </h1>
              <span className="rounded bg-cyan-950/80 px-2 py-0.5 text-[10px] font-mono font-bold text-cyan-400 border border-cyan-500/30">
                v0.20.0-alpha
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400">
              60 HZ SERVER SIMULATION • COMPETITIVE BROWSER FPS
            </p>
          </div>
        </div>

        {/* Currency & Wallet HUD */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-1.5 font-mono text-xs shadow-md">
            <span className="text-amber-400 text-sm">🪙</span>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400">COINS</span>
              <span className="font-bold text-amber-300">{profile.coins}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-1.5 font-mono text-xs shadow-md">
            <span className="text-cyan-400 text-sm">💠</span>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400">CREDITS</span>
              <span className="font-bold text-cyan-300">{profile.vanguardCredits}</span>
            </div>
          </div>

          {/* Sound Mute Toggle */}
          <button
            onClick={toggleSoundMute}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          {/* Settings Button */}
          <button
            onClick={() => {
              soundEngine.playClick();
              setShowSettings(true);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Tactical Settings"
          >
            ⚙️
          </button>

          {/* Player Mini-Card */}
          <button
            onClick={() => {
              soundEngine.playClick();
              setShowProfile(true);
            }}
            className="flex items-center gap-3 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 p-1.5 pr-3 transition group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-600 to-blue-800 font-mono font-black text-xs text-white">
              {profile.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                {profile.username}
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                {profile.rankTier} • {profile.rating} ELO
              </span>
            </div>
          </button>
        </div>
      </header>

      {/* CENTER WORKSPACE: 3 COLUMNS */}
      <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 my-4 min-h-0">
        {/* LEFT COLUMN: MODE SELECTOR & PARTY (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Mode Selector */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800/80 p-4 backdrop-blur-md flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                SELECT OPERATION
              </span>
              <span className="text-[10px] font-mono text-cyan-400">EU-CENTRAL</span>
            </div>

            <div className="flex flex-col gap-2">
              {/* Competitive */}
              <button
                onClick={() => handleModeSelect('COMPETITIVE')}
                className={`flex flex-col text-left rounded-xl p-3 border transition ${
                  selectedMode === 'COMPETITIVE'
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white tracking-wide">COMPETITIVE</span>
                  <span className="rounded bg-cyan-950 px-2 py-0.5 text-[9px] font-mono font-bold text-cyan-400 border border-cyan-500/30">
                    RANKED 5v5
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 mt-1">
                  Tactical rounds, weapon economy, Elo rating at stake.
                </p>
              </button>

              {/* Casual */}
              <button
                onClick={() => handleModeSelect('CASUAL')}
                className={`flex flex-col text-left rounded-xl p-3 border transition ${
                  selectedMode === 'CASUAL'
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white tracking-wide">CASUAL</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[9px] font-mono text-slate-300">
                    5v5 RELAXED
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 mt-1">
                  Standard rounds, standard economy, no rating penalty.
                </p>
              </button>

              {/* Deathmatch */}
              <button
                onClick={() => handleModeSelect('DEATHMATCH')}
                className={`flex flex-col text-left rounded-xl p-3 border transition ${
                  selectedMode === 'DEATHMATCH'
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white tracking-wide">DEATHMATCH</span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-[9px] font-mono text-slate-300">
                    FREE FOR ALL
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 mt-1">
                  Instant respawn, frag race, weapon testbed.
                </p>
              </button>

              {/* Training */}
              <button
                onClick={() => handleModeSelect('TRAINING')}
                className={`flex flex-col text-left rounded-xl p-3 border transition ${
                  selectedMode === 'TRAINING'
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white tracking-wide">TRAINING RANGE</span>
                  <span className="rounded bg-emerald-950 px-2 py-0.5 text-[9px] font-mono text-emerald-400 border border-emerald-500/30">
                    SOLO DRILL
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 mt-1">
                  Immediate firing range with practice targets and recoil drill.
                </p>
              </button>
            </div>
          </div>

          {/* Tactical Map Sector Selector */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800/80 p-4 backdrop-blur-md flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                TACTICAL SECTOR // MAP
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                {TACTICAL_MAPS[selectedMap]?.theme}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {Object.values(TACTICAL_MAPS).map((mapItem) => {
                const isSelected = selectedMap === mapItem.id;
                return (
                  <button
                    key={mapItem.id}
                    onClick={() => {
                      soundEngine.playClick();
                      setSelectedMap(mapItem.id);
                    }}
                    className={`flex flex-col text-left rounded-xl p-2.5 border transition ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-900/40 border-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white tracking-wide">
                        {mapItem.name}
                      </span>
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-mono font-bold"
                        style={{
                          backgroundColor: `${mapItem.accentColor}20`,
                          color: mapItem.accentColor,
                          border: `1px solid ${mapItem.accentColor}40`,
                        }}
                      >
                        {mapItem.sizeMeters}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-mono text-cyan-300 font-semibold">
                        A: {mapItem.sites.siteA}
                      </span>
                      <span className="text-slate-600 text-[8px]">•</span>
                      <span className="text-[9px] font-mono text-amber-300 font-semibold">
                        B: {mapItem.sites.siteB}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Party System Widget */}
          <PartyWidget party={party} playerId={profile.id} onRefreshParty={onRefreshParty} />
        </div>

        {/* CENTER STAGE: 3D PLAYER PREVIEW (6 cols) */}
        <div className="lg:col-span-6 flex flex-col h-full min-h-[380px]">
          <PlayerPreview3D loadout={profile.loadout} />
        </div>

        {/* RIGHT COLUMN: LOADOUT & DOSSIER QUICK ACCESS (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto pl-1">
          {/* Loadout Customizer */}
          <div className="rounded-2xl bg-slate-950/80 border border-slate-800/80 p-4 backdrop-blur-md flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                ACTIVE LOADOUT
              </span>
              <span className="text-[10px] font-mono text-cyan-400">ARMORY</span>
            </div>

            {/* Weapon Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-slate-400">PRIMARY WEAPON</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'vanguard_rifle', name: 'RIFLE' },
                  { id: 'vanguard_smg', name: 'SMG' },
                  { id: 'vanguard_shotgun', name: 'SHOTGUN' },
                ].map((w) => (
                  <button
                    key={w.id}
                    onClick={() => handleWeaponSelect(w.id as any)}
                    className={`py-1.5 rounded-lg text-[10px] font-mono font-bold transition ${
                      profile.loadout.primaryWeapon === w.id
                        ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Skin Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-slate-400">WEAPON FINISH</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'default_tactical', name: 'TACTICAL' },
                  { id: 'void_shadow', name: 'VOID SHADOW' },
                  { id: 'neon_matrix', name: 'NEON MATRIX' },
                  { id: 'gold_vanguard', name: 'GOLD' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSkinSelect(s.id as any)}
                    className={`py-1.5 rounded-lg text-[10px] font-mono font-bold transition ${
                      profile.loadout.rifleSkin === s.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Suit Camo */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-slate-400">OPERATOR CAMO</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'black_ops', name: 'BLACK OPS' },
                  { id: 'arctic_camo', name: 'ARCTIC' },
                  { id: 'desert_strike', name: 'DESERT' },
                  { id: 'cyber_crimson', name: 'CRIMSON' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSuitSelect(c.id as any)}
                    className={`py-1.5 rounded-lg text-[10px] font-mono font-bold transition ${
                      profile.loadout.suitColor === c.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Match History & Dossier Cards */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                soundEngine.playClick();
                setShowProfile(true);
              }}
              className="flex items-center justify-between rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-3 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">📊</span>
                <span className="text-xs font-mono font-bold text-slate-200">CAREER DOSSIER</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">VIEW &rarr;</span>
            </button>

            <button
              onClick={() => {
                soundEngine.playClick();
                setShowHistory(true);
              }}
              className="flex items-center justify-between rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-3 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">📜</span>
                <span className="text-xs font-mono font-bold text-slate-200">MATCH HISTORY</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400">VIEW &rarr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM PLAY BAR */}
      <footer className="relative z-20 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80 pt-4">
        <div className="flex items-center gap-6 text-xs font-mono text-slate-400">
          <div>
            MAP: <span className="text-white font-bold">{TACTICAL_MAPS[selectedMap]?.name}</span>
          </div>
          <div>
            SIZE: <span className="text-cyan-400 font-bold">{TACTICAL_MAPS[selectedMap]?.sizeMeters}</span>
          </div>
          <div>
            TICK RATE: <span className="text-emerald-400 font-bold">60 HZ SERVER SIM</span>
          </div>
          <div>
            LATENCY: <span className="text-emerald-400 font-bold">18 MS (EU-CENTRAL)</span>
          </div>
        </div>

        {/* Big Tactical PLAY Button */}
        <button
          onClick={() => {
            soundEngine.playClick();
            onStartMatchmaking(selectedMode, selectedMap);
          }}
          className="relative group px-12 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-black font-mono tracking-widest text-lg uppercase transition-all duration-200 shadow-2xl shadow-cyan-500/30 hover:scale-[1.02] active:scale-95 flex items-center gap-3"
        >
          <span>DEPLOY // FIND MATCH</span>
          <span className="text-xl">➔</span>
        </button>
      </footer>

      {/* Modals */}
      {showProfile && <ProfileModal profile={profile} onClose={() => setShowProfile(false)} />}
      {showHistory && <MatchHistoryView playerId={profile.id} onClose={() => setShowHistory(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};

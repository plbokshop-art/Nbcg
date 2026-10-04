import React, { useEffect, useState } from 'react';
import { GameLoadingScreen } from './components/game/GameLoadingScreen.js';
import { GameView } from './components/game/GameView.js';
import { MatchEndScreen } from './components/game/MatchEndScreen.js';
import { MainLobby } from './components/lobby/MainLobby.js';
import { MatchFoundModal } from './components/matchmaking/MatchFoundModal.js';
import { MatchmakingModal } from './components/matchmaking/MatchmakingModal.js';
import { AppState, GameModeId, MatchSession, PartyState, PlayerLoadout, PlayerProfile, TacticalMapId } from './shared/types.js';

export default function App() {
  const [appState, setAppState] = useState<AppState>('BOOT');
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [party, setParty] = useState<PartyState | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<MatchSession | null>(null);
  const [selectedQueueMode, setSelectedQueueMode] = useState<GameModeId>('COMPETITIVE');
  const [selectedQueueMap, setSelectedQueueMap] = useState<TacticalMapId>('SECTOR_07');

  // Boot & Session Initialization
  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Healthcheck
        await fetch('/api/health');

        // 2. Load Session Profile
        const sessionRes = await fetch('/api/session?playerId=vanguard_agent_01');
        const sessionData = await sessionRes.json();
        if (sessionData.success) {
          setProfile(sessionData.profile);
        }

        // 3. Load Squad / Party
        const partyRes = await fetch('/api/party?playerId=vanguard_agent_01');
        const partyData = await partyRes.json();
        if (partyData.success) {
          setParty(partyData.party);
        }

        setAppState('LOBBY');
      } catch (err) {
        console.error('Boot sequence failed', err);
        setAppState('LOBBY');
      }
    };

    initApp();
  }, []);

  const refreshProfile = async () => {
    if (!profile) return;
    try {
      const res = await fetch(`/api/session?playerId=${profile.id}`);
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const refreshParty = async () => {
    if (!profile) return;
    try {
      const res = await fetch(`/api/party?playerId=${profile.id}`);
      const data = await res.json();
      if (data.success) {
        setParty(data.party);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateLoadout = async (loadout: PlayerLoadout) => {
    if (!profile) return;
    setProfile((prev) => (prev ? { ...prev, loadout } : null));
    try {
      await fetch('/api/profile/loadout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: profile.id, loadout }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartMatchmaking = async (mode: GameModeId, mapId: TacticalMapId = 'SECTOR_07') => {
    if (!profile) return;
    setSelectedQueueMode(mode);
    setSelectedQueueMap(mapId);
    setAppState('MATCHMAKING');

    try {
      await fetch('/api/matchmaking/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: profile.id,
          mode,
          mapId,
          region: 'EU-Central',
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelMatchmaking = () => {
    setAppState('LOBBY');
  };

  const handleMatchFound = async (matchId: string) => {
    setActiveMatchId(matchId);
    setAppState('MATCH_FOUND');
    try {
      const res = await fetch(`/api/matches/${matchId}`);
      const data = await res.json();
      if (data.success) {
        setActiveMatch(data.match);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleProceedToLoading = () => {
    setAppState('LOADING_GAME');
  };

  const handleLoadingComplete = () => {
    setAppState('IN_GAME');
  };

  const handleMatchComplete = (finalMatch: MatchSession) => {
    setActiveMatch(finalMatch);
    setAppState('MATCH_END');
  };

  const handleReturnToLobby = async () => {
    setAppState('RETURNING_TO_LOBBY');
    try {
      if (profile) {
        await fetch('/api/matchmaking/leave-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: profile.id, matchId: activeMatchId }),
        });
      }
    } catch (e) {
      console.error('Error leaving match on return to lobby', e);
    }
    await refreshProfile();
    await refreshParty();
    setActiveMatchId(null);
    setActiveMatch(null);
    setAppState('LOBBY');
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-black font-sans select-none">
      {/* BOOT SCREEN */}
      {appState === 'BOOT' && (
        <div className="h-full w-full flex flex-col items-center justify-center bg-black text-white gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500 shadow-2xl shadow-cyan-500/50">
            <span className="font-mono text-3xl font-black text-black">V</span>
          </div>
          <h2 className="text-xl font-black tracking-widest uppercase font-mono animate-pulse">
            INITIALIZING PROJECT VANGUARD...
          </h2>
          <span className="text-xs font-mono text-cyan-400">CONNECTING TO QUANTUM SERVER TICK BUS</span>
        </div>
      )}

      {/* MAIN LOBBY */}
      {(appState === 'LOBBY' || appState === 'RETURNING_TO_LOBBY' || appState === 'MATCHMAKING') && profile && (
        <MainLobby
          profile={profile}
          party={party}
          onStartMatchmaking={handleStartMatchmaking}
          onUpdateLoadout={handleUpdateLoadout}
          onRefreshParty={refreshParty}
        />
      )}

      {/* MATCHMAKING QUEUE OVERLAY */}
      {appState === 'MATCHMAKING' && profile && (
        <MatchmakingModal
          playerId={profile.id}
          selectedMode={selectedQueueMode}
          selectedMap={selectedQueueMap}
          onMatchFound={handleMatchFound}
          onCancelQueue={handleCancelMatchmaking}
        />
      )}

      {/* MATCH FOUND OVERLAY */}
      {appState === 'MATCH_FOUND' && activeMatchId && (
        <MatchFoundModal
          matchId={activeMatchId}
          selectedMap={selectedQueueMap}
          match={activeMatch}
          onProceedToLoading={handleProceedToLoading}
        />
      )}

      {/* GAME LOADING SCREEN */}
      {appState === 'LOADING_GAME' && (
        <GameLoadingScreen
          match={activeMatch}
          playerId={profile?.id || 'vanguard_agent_01'}
          onLoadingComplete={handleLoadingComplete}
        />
      )}

      {/* IN GAME 3D VIEW */}
      {appState === 'IN_GAME' && activeMatchId && (
        <GameView
          matchId={activeMatchId}
          playerId={profile?.id || 'vanguard_agent_01'}
          initialMatch={activeMatch}
          selectedMap={selectedQueueMap}
          onMatchComplete={handleMatchComplete}
          onReturnToLobby={handleReturnToLobby}
        />
      )}

      {/* MATCH END SCREEN */}
      {appState === 'MATCH_END' && activeMatch && profile && (
        <MatchEndScreen
          match={activeMatch}
          playerId={profile.id}
          onReturnToLobby={handleReturnToLobby}
        />
      )}
    </div>
  );
}

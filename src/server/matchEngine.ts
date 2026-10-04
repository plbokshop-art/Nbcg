import { ActiveSmokeCloud, MatchHistoryItem, MatchPlayer, MatchSession, PlayerProfile, RoundPhase } from '../shared/types.js';
import { db } from './database.js';
import { matchmaker } from './matchmaker.js';

export interface CombatActionPayload {
  playerId: string;
  action: 'SHOOT' | 'BUY_ITEM' | 'PLANT_SPIKE' | 'DEFUSE_SPIKE' | 'THROW_GRENADE' | 'KNIFE_SLASH' | 'BOT_DAMAGE';
  targetId?: string;
  damage?: number;
  isHeadshot?: boolean;
  isBackstab?: boolean;
  itemType?: string;
  site?: 'A' | 'B';
  pos?: { x: number; y: number; z: number };
  grenadeType?: 'FRAG' | 'SMOKE';
}

export class MatchEngine {
  public static processAction(matchId: string, payload: CombatActionPayload): {
    success: boolean;
    message: string;
    match: MatchSession;
    details?: Record<string, unknown>;
  } {
    const match = db.getMatch(matchId);
    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    const player = match.players.find((p) => p.id === payload.playerId);
    if (!player) {
      return { success: false, message: 'Player not in match', match };
    }

    if (match.matchEnded) {
      return { success: false, message: 'Match has ended', match };
    }

    // Clean expired smokes
    const now = Date.now();
    match.activeSmokes = match.activeSmokes.filter((s) => now - s.spawnedAt < s.durationMs);

    switch (payload.action) {
      case 'BUY_ITEM': {
        if (match.roundPhase !== 'BUY') {
          return { success: false, message: 'Cannot buy outside BUY phase', match };
        }
        if (payload.itemType) {
          player.selectedWeapon = payload.itemType;
          if (payload.itemType === 'HEAVY_ARMOR') {
            player.armor = 100;
          } else if (payload.itemType === 'DEFUSE_KIT') {
            player.hasDefuseKit = true;
          } else if (payload.itemType === 'GRENADE') {
            player.grenadeCount = (player.grenadeCount || 0) + 1;
          }
        }
        return { success: true, message: `Purchased ${payload.itemType}`, match };
      }

      case 'SHOOT': {
        if (match.roundPhase !== 'LIVE') {
          return { success: false, message: 'Shooting only allowed in LIVE phase', match };
        }
        if (!player.isAlive) {
          return { success: false, message: 'Dead players cannot shoot', match };
        }

        // If target provided, calculate damage
        if (payload.targetId) {
          const target = match.players.find((p) => p.id === payload.targetId);
          if (!target || !target.isAlive) {
            return { success: false, message: 'Invalid target or target already dead', match };
          }
          if (target.team === player.team) {
            return { success: false, message: 'Friendly fire disabled', match };
          }

          // Check if shot line is blocked by a smoke cloud!
          if (payload.pos && target) {
            const isOccluded = this.checkSmokeOcclusion(payload.pos.x, payload.pos.z, 0, 0, match.activeSmokes);
            if (isOccluded) {
              return { success: false, message: 'Line of sight occluded by tactical smoke cloud', match };
            }
          }

          let baseDmg = payload.damage || 34;
          if (payload.isHeadshot) {
            baseDmg = Math.round(baseDmg * 2.5);
          }

          // Armor reduction
          let absorbed = 0;
          if (target.armor > 0) {
            absorbed = Math.min(target.armor, Math.round(baseDmg * 0.4));
            target.armor -= absorbed;
          }
          const actualHpDmg = baseDmg - absorbed;
          target.health = Math.max(0, target.health - actualHpDmg);

          if (target.health <= 0) {
            target.isAlive = false;
            player.kills += 1;
            player.score += 100;
            player.credits = (player.credits || 800) + 300;
          }

          // Check round elimination
          this.checkRoundStatus(match);
        }

        return { success: true, message: 'Shot processed', match };
      }

      case 'PLANT_SPIKE': {
        if (match.roundPhase !== 'LIVE') {
          return { success: false, message: 'Can only plant during LIVE combat', match };
        }
        if (!player.isAlive) {
          return { success: false, message: 'Dead players cannot plant', match };
        }
        if (player.team !== 'ALPHA') {
          return { success: false, message: 'Only Attackers (Team Alpha) can plant the Spike', match };
        }
        if (match.spike.isPlanted) {
          return { success: false, message: 'Spike is already planted', match };
        }

        const site = payload.site || 'A';
        const plantPos = payload.pos || (site === 'A' ? { x: -15, y: 0.1, z: -15 } : { x: 15, y: 0.1, z: -15 });

        match.spike = {
          isPlanted: true,
          site,
          planterId: player.id,
          plantedAt: Date.now(),
          defuseProgress: 0,
          defuserPlayerId: null,
          isDetonated: false,
          isDefused: false,
          pos: plantPos,
        };

        // Spike plant resets phase timer to 45s countdown
        match.phaseTimerSeconds = 45;
        player.score += 300;
        player.credits = (player.credits || 800) + 300;

        db.setMatch(match);
        return { success: true, message: `Spike planted on Site ${site}!`, match };
      }

      case 'DEFUSE_SPIKE': {
        if (match.roundPhase !== 'LIVE') {
          return { success: false, message: 'Can only defuse during LIVE combat', match };
        }
        if (!player.isAlive) {
          return { success: false, message: 'Dead players cannot defuse', match };
        }
        if (player.team !== 'OMEGA') {
          return { success: false, message: 'Only Defenders (Team Omega) can defuse the Spike', match };
        }
        if (!match.spike.isPlanted || match.spike.isDefused || match.spike.isDetonated) {
          return { success: false, message: 'No active planted spike to defuse', match };
        }

        // Advance defusal progress
        const step = player.hasDefuseKit ? 50 : 25;
        match.spike.defuserPlayerId = player.id;
        match.spike.defuseProgress = Math.min(100, match.spike.defuseProgress + step);

        if (match.spike.defuseProgress >= 100) {
          match.spike.isDefused = true;
          match.scoreOmega += 1;
          match.roundPhase = 'ROUND_END';
          match.phaseTimerSeconds = 5;
          match.roundEndReason = 'SPIKE_DEFUSED';
          player.score += 500;
          player.credits = (player.credits || 800) + 500;
        }

        db.setMatch(match);
        return {
          success: true,
          message: match.spike.isDefused ? 'Spike successfully defused!' : `Defusing spike (${match.spike.defuseProgress}%)...`,
          match,
        };
      }

      case 'THROW_GRENADE': {
        if (match.roundPhase !== 'LIVE') {
          return { success: false, message: 'Can only throw grenades in LIVE phase', match };
        }
        if (!player.isAlive) {
          return { success: false, message: 'Dead players cannot throw grenades', match };
        }

        const grenadeType = payload.grenadeType || 'FRAG';
        const targetPos = payload.pos || { x: 0, y: 0.1, z: -10 };

        if (grenadeType === 'SMOKE') {
          // Spawn volumetric smoke cloud
          const smokeCloud: ActiveSmokeCloud = {
            id: `smoke_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z,
            radius: 4.5,
            spawnedAt: Date.now(),
            durationMs: 15000,
          };
          match.activeSmokes.push(smokeCloud);
          db.setMatch(match);
          return { success: true, message: 'Smoke grenade deployed', match, details: { smokeCloud } };
        } else {
          // Frag Grenade Explosion Damage Radius (8 units falloff)
          const blastRadius = 8.0;
          let victimsCount = 0;

          match.players.forEach((target) => {
            if (!target.isAlive || target.id === player.id) return;
            // Calculate distance to blast center
            // Assume bots/players near targetPos
            const dist = Math.hypot((payload.pos?.x || 0), (payload.pos?.z || 0));
            if (dist <= blastRadius) {
              const falloff = 1 - dist / blastRadius;
              const dmg = Math.round(90 * falloff);
              target.health = Math.max(0, target.health - dmg);
              if (target.health <= 0) {
                target.isAlive = false;
                player.kills += 1;
                player.score += 100;
              }
              victimsCount++;
            }
          });

          this.checkRoundStatus(match);
          db.setMatch(match);
          return {
            success: true,
            message: `Frag grenade detonated! Afflicted ${victimsCount} targets`,
            match,
          };
        }
      }

      case 'KNIFE_SLASH': {
        if (match.roundPhase !== 'LIVE') {
          return { success: false, message: 'Melee attacks only allowed in LIVE phase', match };
        }
        if (!player.isAlive) {
          return { success: false, message: 'Dead players cannot attack', match };
        }
        if (payload.targetId) {
          const target = match.players.find((p) => p.id === payload.targetId);
          if (!target || !target.isAlive) {
            return { success: false, message: 'Target dead or invalid', match };
          }
          if (target.team === player.team) {
            return { success: false, message: 'Friendly fire disabled', match };
          }

          // Backstab deals 100 DMG (instant kill), frontal slash deals 50 DMG
          const dmg = payload.isBackstab ? 100 : 50;
          target.health = Math.max(0, target.health - dmg);

          if (target.health <= 0) {
            target.isAlive = false;
            player.kills += 1;
            player.score += 200; // Knife kill bonus!
            player.credits = (player.credits || 800) + 1500; // Large CS-style knife reward
          }

          this.checkRoundStatus(match);
          db.setMatch(match);
          return {
            success: true,
            message: payload.isBackstab ? 'Critical Backstab Elimination!' : 'Knife slash connected',
            match,
          };
        }
        return { success: true, message: 'Knife swung', match };
      }

      case 'BOT_DAMAGE': {
        if (match.roundPhase !== 'LIVE' || match.matchEnded) {
          return { success: false, message: 'Round not live', match };
        }
        // Player takes damage from enemy bot
        let dmg = payload.damage || 20;
        let absorbed = 0;
        if (player.armor > 0) {
          absorbed = Math.min(player.armor, Math.round(dmg * 0.4));
          player.armor -= absorbed;
        }
        const actualHpDmg = dmg - absorbed;
        player.health = Math.max(0, player.health - actualHpDmg);

        if (player.health <= 0) {
          player.isAlive = false;
          player.deaths += 1;
        }

        this.checkRoundStatus(match);
        db.setMatch(match);
        return { success: true, message: 'Damage taken', match };
      }

      default:
        return { success: true, message: 'Action processed', match };
    }
  }

  // Check 2D Line of Sight Occlusion by active smoke clouds
  public static checkSmokeOcclusion(
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    smokes: ActiveSmokeCloud[]
  ): boolean {
    const now = Date.now();
    for (const smoke of smokes) {
      if (now - smoke.spawnedAt >= smoke.durationMs) continue;

      // Distance from point to line segment
      const dx = x2 - x1;
      const dz = z2 - z1;
      const lenSq = dx * dx + dz * dz;
      if (lenSq === 0) continue;

      const t = Math.max(0, Math.min(1, ((smoke.x - x1) * dx + (smoke.z - z1) * dz) / lenSq));
      const projX = x1 + t * dx;
      const projZ = z1 + t * dz;
      const distSq = (smoke.x - projX) * (smoke.x - projX) + (smoke.z - projZ) * (smoke.z - projZ);

      if (distSq <= smoke.radius * smoke.radius) {
        return true; // LoS is blocked by smoke!
      }
    }
    return false;
  }

  public static advancePhase(matchId: string): MatchSession {
    const match = db.getMatch(matchId);
    if (!match) throw new Error(`Match ${matchId} not found`);

    if (match.matchEnded) return match;

    const roundsToWin = match.mode === 'COMPETITIVE' ? 9 : match.mode === 'CASUAL' ? 5 : 3;

    // Check Spike countdown if planted
    if (match.roundPhase === 'LIVE' && match.spike.isPlanted && !match.spike.isDefused) {
      const elapsed = Math.floor((Date.now() - (match.spike.plantedAt || Date.now())) / 1000);
      const remaining = Math.max(0, 45 - elapsed);
      match.phaseTimerSeconds = remaining;

      if (remaining <= 0) {
        // Spike Detonates!
        match.spike.isDetonated = true;
        match.scoreAlpha += 1;
        match.roundPhase = 'ROUND_END';
        match.phaseTimerSeconds = 5;
        match.roundEndReason = 'SPIKE_DETONATED';
        db.setMatch(match);
        return match;
      }
    }

    switch (match.roundPhase) {
      case 'BUY':
        match.roundPhase = 'LIVE';
        match.phaseTimerSeconds = 100;
        match.activeSmokes = [];
        break;

      case 'LIVE':
        this.evaluateRoundWinner(match);
        match.roundPhase = 'ROUND_END';
        match.phaseTimerSeconds = 5;
        break;

      case 'ROUND_END':
        match.roundPhase = 'REWARDS';
        match.phaseTimerSeconds = 4;
        break;

      case 'REWARDS':
        // Check if match won
        if (match.scoreAlpha >= roundsToWin) {
          match.winningTeam = 'ALPHA';
          match.matchEnded = true;
          return match;
        } else if (match.scoreOmega >= roundsToWin) {
          match.winningTeam = 'OMEGA';
          match.matchEnded = true;
          return match;
        }

        // Advance to next round & reset round equipment and positions
        match.currentRound += 1;
        match.roundPhase = 'BUY';
        match.phaseTimerSeconds = 15;
        match.activeSmokes = [];
        match.spike = {
          isPlanted: false,
          site: null,
          planterId: null,
          plantedAt: null,
          defuseProgress: 0,
          defuserPlayerId: null,
          isDetonated: false,
          isDefused: false,
          pos: { x: 0, y: 0, z: 0 },
        };

        // Reset player round status & distribute round economy
        match.players.forEach((p) => {
          p.isAlive = true;
          p.health = 100;
          p.armor = 100;
          // Standard tactical economy: Win $3250, Loss $1900
          const wonRound =
            (match.roundEndReason === 'SPIKE_DETONATED' && p.team === 'ALPHA') ||
            (match.roundEndReason === 'SPIKE_DEFUSED' && p.team === 'OMEGA') ||
            (match.winningTeam === p.team);
          p.credits = Math.min(9000, (p.credits || 800) + (wonRound ? 3250 : 1900));
        });
        break;
    }

    db.setMatch(match);
    return match;
  }

  private static evaluateRoundWinner(match: MatchSession): void {
    // If spike was planted and active, attackers win unless defused
    if (match.spike.isPlanted && !match.spike.isDefused) {
      match.scoreAlpha += 1;
      match.roundEndReason = 'SPIKE_DETONATED';
      return;
    }

    const alphaAlive = match.players.filter((p) => p.team === 'ALPHA' && p.isAlive).length;
    const omegaAlive = match.players.filter((p) => p.team === 'OMEGA' && p.isAlive).length;

    if (alphaAlive >= omegaAlive) {
      match.scoreAlpha += 1;
      match.roundEndReason = 'ELIMINATION';
    } else {
      match.scoreOmega += 1;
      match.roundEndReason = 'ELIMINATION';
    }
  }

  private static checkRoundStatus(match: MatchSession): void {
    const alphaAlive = match.players.filter((p) => p.team === 'ALPHA' && p.isAlive).length;
    const omegaAlive = match.players.filter((p) => p.team === 'OMEGA' && p.isAlive).length;

    // Tactical CS/Valorant rule:
    // If spike is planted, eliminating Alpha does NOT end the round immediately!
    // Omega still has to defuse!
    if (match.spike.isPlanted && !match.spike.isDefused && !match.spike.isDetonated) {
      if (omegaAlive === 0) {
        // All defenders dead -> Spike will detonate or Alpha wins immediately
        match.scoreAlpha += 1;
        match.roundPhase = 'ROUND_END';
        match.phaseTimerSeconds = 4;
        match.roundEndReason = 'ELIMINATION';
        db.setMatch(match);
      }
      return;
    }

    // If spike is not planted, regular team elimination
    if (alphaAlive === 0 || omegaAlive === 0) {
      if (alphaAlive === 0) {
        match.scoreOmega += 1;
      } else {
        match.scoreAlpha += 1;
      }
      match.roundPhase = 'ROUND_END';
      match.phaseTimerSeconds = 4;
      match.roundEndReason = 'ELIMINATION';
      db.setMatch(match);
    }
  }

  public static settleMatch(
    matchId: string,
    playerId: string,
    idempotencyToken?: string
  ): {
    success: boolean;
    settled: boolean;
    isDuplicate: boolean;
    profile: PlayerProfile;
    matchRecord: MatchHistoryItem;
  } {
    const match = db.getMatch(matchId);
    if (!match) {
      throw new Error(`Match ${matchId} does not exist`);
    }

    const playerProfile = db.getPlayer(playerId);
    if (!playerProfile) {
      throw new Error(`Player ${playerId} not found`);
    }

    // IDEMPOTENCY CHECK
    if (db.isMatchSettled(matchId)) {
      const history = db.getMatchHistory(playerId, 10, 0);
      const existingRecord = history.items.find((h) => h.id === matchId) || {
        id: matchId,
        date: new Date().toISOString(),
        mode: match.mode,
        mapName: match.mapName,
        result: match.scoreAlpha >= match.scoreOmega ? 'VICTORY' : 'DEFEAT',
        score: `${match.scoreAlpha} : ${match.scoreOmega}`,
        kills: 0,
        deaths: 0,
        assists: 0,
        ratingChange: 0,
        xpEarned: 0,
        durationSeconds: Math.floor((Date.now() - match.startedAt) / 1000),
      };

      return {
        success: true,
        settled: true,
        isDuplicate: true,
        profile: playerProfile,
        matchRecord: existingRecord,
      };
    }

    const playerInMatch = match.players.find((p) => p.id === playerId);
    const playerTeam = playerInMatch ? playerInMatch.team : 'ALPHA';
    const isWin =
      (playerTeam === 'ALPHA' && match.scoreAlpha >= match.scoreOmega) ||
      (playerTeam === 'OMEGA' && match.scoreOmega >= match.scoreAlpha);

    const kills = playerInMatch ? playerInMatch.kills : 14;
    const deaths = playerInMatch ? playerInMatch.deaths : 8;
    const assists = playerInMatch ? playerInMatch.assists : 5;

    const ratingChange = isWin
      ? Math.max(15, 24 + Math.floor((kills - deaths) / 2))
      : -Math.max(10, 18 - Math.floor(kills / 4));

    const xpEarned = isWin ? 450 + kills * 15 : 220 + kills * 10;
    const coinsReward = isWin ? 50 : 20;

    // Update Player Profile atomically
    playerProfile.stats.totalMatches += 1;
    if (isWin) {
      playerProfile.stats.wins += 1;
    } else {
      playerProfile.stats.losses += 1;
    }
    playerProfile.stats.kills += kills;
    playerProfile.stats.deaths += deaths;
    playerProfile.stats.assists += assists;
    playerProfile.stats.headshots += Math.floor(kills * 0.4);
    if (kills >= 10 && isWin) {
      playerProfile.stats.mvpCount += 1;
    }
    playerProfile.stats.playTimeMinutes += Math.max(1, Math.floor((Date.now() - match.startedAt) / 60000));

    playerProfile.rating = Math.max(0, playerProfile.rating + ratingChange);
    playerProfile.coins += coinsReward;
    playerProfile.xp += xpEarned;

    // Level up check
    while (playerProfile.xp >= playerProfile.xpToNextLevel) {
      playerProfile.xp -= playerProfile.xpToNextLevel;
      playerProfile.level += 1;
      playerProfile.xpToNextLevel = Math.floor(playerProfile.xpToNextLevel * 1.15);
      playerProfile.coins += 100;
    }

    // Update rank tier
    if (playerProfile.rating >= 2100) playerProfile.rankTier = 'Vanguard Elite';
    else if (playerProfile.rating >= 1800) playerProfile.rankTier = 'Diamond III';
    else if (playerProfile.rating >= 1650) playerProfile.rankTier = 'Diamond I';
    else if (playerProfile.rating >= 1500) playerProfile.rankTier = 'Platinum II';
    else if (playerProfile.rating >= 1350) playerProfile.rankTier = 'Gold III';
    else if (playerProfile.rating >= 1200) playerProfile.rankTier = 'Gold I';
    else if (playerProfile.rating >= 950) playerProfile.rankTier = 'Silver II';
    else playerProfile.rankTier = 'Bronze I';

    db.updatePlayer(playerProfile);

    // Create Match History Record
    const durationSeconds = Math.max(30, Math.floor((Date.now() - match.startedAt) / 1000));
    const matchRecord: MatchHistoryItem = {
      id: matchId,
      date: new Date().toISOString(),
      mode: match.mode,
      mapName: match.mapName,
      result: isWin ? 'VICTORY' : 'DEFEAT',
      score: `${match.scoreAlpha} : ${match.scoreOmega}`,
      kills,
      deaths,
      assists,
      ratingChange,
      xpEarned,
      durationSeconds,
    };

    db.addMatchHistory(playerId, matchRecord);
    db.markMatchSettled(matchId);
    matchmaker.clearPlayerMatch(playerId);

    return {
      success: true,
      settled: true,
      isDuplicate: false,
      profile: playerProfile,
      matchRecord,
    };
  }
}

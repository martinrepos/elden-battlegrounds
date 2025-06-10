import { Server, Socket } from "socket.io";
import { CHARACTERS } from "./data/characters";
import rawStatusEffects from "./data/statusEffects.json";
import type { StatusEffectMap } from "./types/statusEffects";

// load status effects and reset votes
const statusEffects: StatusEffectMap = rawStatusEffects;
const resetVotes: Record<string, Set<string>> = {};

// define interfaces for status effects and players
interface StatusEffectInstance {
  remainingTurns: number;
  effectKey: string;
}

interface Player {
  name: string;
  roomId: string;
  character?: string;
  usage?: Record<string, number>;
  hp?: number;
  maxHp?: number;
  statusEffects?: Record<string, StatusEffectInstance[]>;
  evasion?: boolean;
  revived?: boolean;
  wasJustRevived?: boolean;
  speedUp?: boolean;
}

// store all players and rooms
const players: Record<string, Player> = {};
const rooms: Record<string, { turnIndex: number; playerIds: string[] }> = {};

// list of debuff status effects
const DEBUFFS = [
  "Stun",
  "Silence",
  "Paralyze",
  "Scarlet Rot",
  "Doom",
  "Burn",
  "Fear",
];

// calculate modified damage based on status effects
function getModifiedDamage(
  base: number,
  attacker: Player,
  defender: Player
): number {
  let dmg = base;
  if (attacker.statusEffects?.["Attack Up"]) {
    dmg *= statusEffects["Attack Up"].modifier ?? 1.25;
  }
  if (defender.statusEffects?.["Defense Down"]) {
    dmg *= statusEffects["Defense Down"].modifier ?? 0.75;
  }
  if (defender.statusEffects?.["Damage Reduction"]) {
    dmg *= statusEffects["Damage Reduction"].modifier ?? 0.7;
  }
  return Math.floor(dmg);
}

// start the next turn in a room
function startNextTurn(roomId: string, io: Server) {
  const room = rooms[roomId];
  const actingId = room.playerIds[room.turnIndex];
  const opponentId = room.playerIds.find((id) => id !== actingId)!;
  const actingPlayer = players[actingId];
  const opponent = players[opponentId];

  // check for status effects
  const stun = actingPlayer.statusEffects?.["Stun"]?.some(
    (e) => e.remainingTurns > 0
  );
  const silence = actingPlayer.statusEffects?.["Silence"]?.some(
    (e) => e.remainingTurns > 0
  );
  const paralyze = actingPlayer.statusEffects?.["Paralyze"]?.some(
    (e) => e.remainingTurns > 0
  );

  // get sockets for both players
  const actingSocket = io.sockets.sockets.get(actingId);
  const opponentSocket = io.sockets.sockets.get(opponentId);

  // emit turn update to both players
  const emitTurnUpdate = (turnName: string | null) => {
    actingSocket?.emit("turn-update", {
      currentTurn: turnName,
      usage: actingPlayer.usage,
      statusEffects: {
        self: Object.keys(actingPlayer.statusEffects ?? {}),
        opponent: Object.keys(opponent.statusEffects ?? {}),
      },
      hp: {
        [actingPlayer.name]: actingPlayer.hp ?? 100,
        [opponent.name]: opponent.hp ?? 100,
      },
    });

    opponentSocket?.emit("turn-update", {
      currentTurn: turnName,
      usage: opponent.usage ?? {},
      statusEffects: {
        self: Object.keys(opponent.statusEffects ?? {}),
        opponent: Object.keys(actingPlayer.statusEffects ?? {}),
      },
      hp: {
        [actingPlayer.name]: actingPlayer.hp ?? 100,
        [opponent.name]: opponent.hp ?? 100,
      },
    });
  };

  // handle stun: skip turn if stunned
  if (stun) {
    io.to(roomId).emit(
      "battle-log",
      `${actingPlayer.name} is stunned and skips their turn.`
    );
    emitTurnUpdate(null);
    setTimeout(() => {
      applyEndOfTurnEffects(actingPlayer, roomId, io);
      room.turnIndex = (room.turnIndex + 1) % 2;
      startNextTurn(roomId, io);
    }, 1200);
    return;
  }

  // handle silence: skip turn if no usable abilities
  if (silence) {
    const character = CHARACTERS.find((c) => c.name === actingPlayer.character);
    if (character) {
      const hasNonSpecial = character.abilities.some((a) => {
        const count = actingPlayer.usage?.[a.name] ?? 0;
        return !a.isSpecial && count > 0;
      });
      if (!hasNonSpecial) {
        io.to(roomId).emit(
          "battle-log",
          `${actingPlayer.name} is silenced and has no usable abilities. Turn skipped.`
        );
        emitTurnUpdate(null);
        setTimeout(() => {
          applyEndOfTurnEffects(actingPlayer, roomId, io);
          room.turnIndex = (room.turnIndex + 1) % 2;
          startNextTurn(roomId, io);
        }, 1200);
        return;
      }
    }
  }

  // normal turn: acting player can act
  emitTurnUpdate(actingPlayer.name);
}

// apply end-of-turn effects like damage over time or doom
function applyEndOfTurnEffects(player: Player, roomId: string, io: Server) {
  player.wasJustRevived = false;

  for (const [effectKey, instances] of Object.entries(
    player.statusEffects || {}
  )) {
    const effect = statusEffects[effectKey];
    if (!effect) continue;

    for (let i = instances.length - 1; i >= 0; i--) {
      const instance = instances[i];

      // handle doom effect
      if (effectKey === "Doom") {
        if (instance.remainingTurns <= 1) {
          if (player.revived) {
            const reviveEffect = statusEffects["Revive"];
            const reviveHp = reviveEffect?.value ?? 20;
            player.hp = reviveHp;
            player.revived = false;
            player.wasJustRevived = true;
            instances.splice(i, 1);
            io.to(roomId).emit(
              "battle-log",
              `${player.name} succumbed to Doom but revived with ${reviveHp} HP!`
            );
          } else {
            player.hp = 0;
            instances.splice(i, 1);
            io.to(roomId).emit(
              "battle-log",
              `${player.name} succumbed to Doom!`
            );
          }
        } else {
          instance.remainingTurns--;
        }
      } else if (effect.effect === "damage_over_time") {
        // handle damage over time effects
        const dot = effect.value ?? 10;
        player.hp = Math.max(0, (player.hp ?? 100) - dot);
        io.to(roomId).emit(
          "battle-log",
          `${player.name} takes ${dot} damage from ${effectKey}.`
        );
        instance.remainingTurns--;
        if (instance.remainingTurns <= 0) instances.splice(i, 1);
      } else {
        // handle other effects
        instance.remainingTurns--;
        if (instance.remainingTurns <= 0) instances.splice(i, 1);
      }
    }

    // remove effect if no instances left
    if (instances.length === 0) {
      delete player.statusEffects![effectKey];
    }
  }

  // check for defeat after end-of-turn effects
  const room = rooms[roomId];
  if (
    player.hp !== undefined &&
    player.hp <= 0 &&
    !player.revived &&
    !player.wasJustRevived &&
    room
  ) {
    const opponentId = room.playerIds.find((id) => players[id] !== player)!;
    const opponent = players[opponentId];

    io.to(roomId).emit("turn-update", {
      currentTurn: null,
      usage: {},
      hp: {
        [player.name]: 0,
        [opponent.name]: opponent.hp ?? 100,
      },
      statusEffects: {
        self: Object.keys(player.statusEffects ?? {}),
        opponent: Object.keys(opponent.statusEffects ?? {}),
      },
    });

    io.to(roomId).emit("battle-log", `${opponent.name} wins the battle!`);
  }
}

// main function to register all socket event handlers
export default function registerBattleHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    // handle player joining a room
    socket.on("join", ({ name, roomId }) => {
      players[socket.id] = {
        name,
        roomId,
        hp: 100,
        maxHp: 100,
        statusEffects: {},
        evasion: false,
        revived: false,
        wasJustRevived: false,
        speedUp: false,
      };
      socket.join(roomId);

      if (!rooms[roomId]) {
        rooms[roomId] = { turnIndex: 0, playerIds: [] };
      }

      if (!rooms[roomId].playerIds.includes(socket.id)) {
        rooms[roomId].playerIds.push(socket.id);
      }

      // notify all players in the room
      const playerList = rooms[roomId].playerIds
        .map((id) => players[id]?.name)
        .filter(Boolean);
      io.to(roomId).emit("players-in-room", playerList);
      io.to(roomId).emit("log", ` ${name} has joined the room.`);
    });

    // handle chat messages
    socket.on("chat", ({ roomId, message }) => {
      const player = players[socket.id];
      if (!player) return;
      // emit as a "log" event so the client displays it in the log
      io.to(roomId).emit("log", `${player.name}: ${message}`);
    });

    // handle character selection
    socket.on("select-character", ({ roomId, character, usage }) => {
      const player = players[socket.id];
      if (player) {
        player.character = character;
        player.usage = usage;
        player.hp = 100;
        player.maxHp = 100;
        player.statusEffects = {};
        player.evasion = false;
        player.revived = false;
        player.wasJustRevived = false;
        player.speedUp = false;
      }

      const room = rooms[roomId];
      if (!room) return;

      // check if both players have selected characters
      const allSelected =
        room.playerIds.length === 2 &&
        room.playerIds.every((id) => {
          const p = players[id];
          return p?.character && p?.name;
        });

      if (allSelected) {
        // randomly choose who starts
        const starterIndex = Math.floor(Math.random() * 2);
        room.turnIndex = starterIndex;

        const playerInfos = room.playerIds.map((id) => ({
          name: players[id].name,
          character: players[id].character!,
        }));

        io.to(roomId).emit("battle-start", {
          currentTurn: players[room.playerIds[starterIndex]].name,
          players: playerInfos,
        });

        startNextTurn(roomId, io);
      }
    });

    // handle reset requests (needs 2 votes)
    socket.on("request-reset", ({ roomId }) => {
      if (!resetVotes[roomId]) {
        resetVotes[roomId] = new Set();
      }

      resetVotes[roomId].add(socket.id);
      const room = rooms[roomId];
      if (!room) return;

      // if both players requested reset, reset the game
      if (resetVotes[roomId].size >= 2) {
        for (const playerId of room.playerIds) {
          const player = players[playerId];
          if (player) {
            player.character = undefined;
            player.usage = undefined;
            player.hp = undefined;
            player.maxHp = undefined;
            player.statusEffects = {};
            player.evasion = false;
            player.revived = false;
            player.wasJustRevived = false;
            player.speedUp = false;
          }
        }

        room.turnIndex = 0;
        resetVotes[roomId].clear();
        io.to(roomId).emit("reset-approved");
      }
    });

    // handle battle actions (attacks, abilities, etc.)
    socket.on("battle-action", ({ roomId, name, action }) => {
      const room = rooms[roomId];
      if (!room) return;

      const actingId = room.playerIds[room.turnIndex];
      const actingPlayer = players[actingId];
      if (!actingPlayer || actingPlayer.name !== name) return;

      const opponentId = room.playerIds.find((id) => id !== actingId)!;
      const opponent = players[opponentId];

      // skip if stunned
      if (
        actingPlayer.statusEffects?.["Stun"]?.some((e) => e.remainingTurns > 0)
      ) {
        io.to(roomId).emit(
          "battle-log",
          `${actingPlayer.name} is stunned and cannot act.`
        );
        return;
      }

      // skip if no usage left
      if (!actingPlayer.usage || actingPlayer.usage[action] <= 0) return;

      // find the ability
      const character = CHARACTERS.find(
        (c) => c.name === actingPlayer.character
      );
      const ability = character?.abilities.find((a) => a.name === action);
      if (!ability) return;

      // handle paralyze: chance to fail
      const isParalyzed = actingPlayer.statusEffects?.["Paralyze"]?.some(
        (e) => e.remainingTurns > 0
      );
      if (isParalyzed) {
        const paralyzeChance = statusEffects["Paralyze"].chance ?? 33.33;
        const roll = Math.random() * 100;
        if (roll < paralyzeChance) {
          io.to(roomId).emit(
            "battle-log",
            `${actingPlayer.name} is paralyzed and failed to act!`
          );
          io.to(roomId).emit("shake", actingPlayer.name);

          io.to(roomId).emit("turn-update", {
            currentTurn: null,
            usage: actingPlayer.usage,
            hp: {
              [actingPlayer.name]: actingPlayer.hp ?? 100,
              [opponent.name]: opponent.hp ?? 100,
            },
            statusEffects: {
              self: Object.keys(actingPlayer.statusEffects ?? {}),
              opponent: Object.keys(opponent.statusEffects ?? {}),
            },
          });

          applyEndOfTurnEffects(actingPlayer, roomId, io);
          room.turnIndex = (room.turnIndex + 1) % 2;
          startNextTurn(roomId, io);
          return;
        }
      }

      // handle silence: can't use special abilities
      const isSilenced = actingPlayer.statusEffects?.["Silence"]?.some(
        (e) => e.remainingTurns > 0
      );
      if (isSilenced && ability.isSpecial) {
        io.to(roomId).emit(
          "battle-log",
          `${name} is silenced and cannot use ${action}.`
        );
        io.to(roomId).emit("shake", actingPlayer.name);
        return;
      }

      // decrement ability usage
      actingPlayer.usage[action]--;

      // function to perform an attack (handles evasion, fear, etc.)
      const performAttack = () => {
        if (opponent.evasion) {
          io.to(roomId).emit(
            "battle-log",
            `${opponent.name} evaded the attack!`
          );
          opponent.evasion = false;
          return;
        }

        const isFeared = actingPlayer.statusEffects?.["Fear"]?.some(
          (e) => e.remainingTurns > 0
        );
        const accuracyMod = isFeared
          ? statusEffects["Fear"].modifier ?? 0.75
          : 1.0;

        const roll = Math.random();
        if (roll > accuracyMod) {
          io.to(roomId).emit(
            "battle-log",
            `${actingPlayer.name}'s attack missed due to Fear!`
          );
          io.to(roomId).emit("shake", actingPlayer.name);
          return;
        }

        let damage = getModifiedDamage(
          ability.damage ?? 0,
          actingPlayer,
          opponent
        );
        opponent.hp = Math.max(0, (opponent.hp ?? 100) - damage);
        io.to(roomId).emit(
          "battle-log",
          `${name} used ${action} (${damage} dmg)`
        );
      };

      // apply ability effects (status, heal, revive, etc.)
      if (ability.statusEffect && statusEffects[ability.statusEffect]) {
        const effect = statusEffects[ability.statusEffect];
        const target = DEBUFFS.includes(ability.statusEffect)
          ? opponent
          : actingPlayer;

        if (!target.statusEffects![ability.statusEffect]) {
          target.statusEffects![ability.statusEffect] = [];
        }
        target.statusEffects![ability.statusEffect].push({
          remainingTurns: effect.duration ?? 1,
          effectKey: ability.statusEffect,
        });

        if (!["Heal", "Revive", "Evasion Up"].includes(ability.statusEffect)) {
          io.to(roomId).emit(
            "battle-log",
            `${target.name} is affected by ${ability.statusEffect}.`
          );
        }

        if (ability.statusEffect === "Evasion Up") target.evasion = true;
        if (ability.statusEffect === "Speed Up") actingPlayer.speedUp = true;
        if (ability.statusEffect === "Heal") {
          const healAmount = effect.value ?? 25;
          target.hp = Math.min(
            target.maxHp ?? 100,
            (target.hp ?? 100) + healAmount
          );
          io.to(roomId).emit(
            "battle-log",
            `${target.name} healed for ${healAmount} HP.`
          );
        }
        if (ability.statusEffect === "HP Reduction") {
          const reduce = effect.value ?? 10;
          target.maxHp = Math.max(10, (target.maxHp ?? 100) - reduce);
          if (target.hp! > target.maxHp) target.hp = target.maxHp;
          io.to(roomId).emit(
            "battle-log",
            `${target.name}'s max HP reduced by ${reduce}.`
          );
        }
        if (ability.statusEffect === "Revive") {
          target.revived = true;
          target.wasJustRevived = false;
        }
      }

      // handle damage if ability does damage
      if (ability.damage > 0) {
        performAttack();
        if (actingPlayer.speedUp) {
          actingPlayer.speedUp = false;
          io.to(roomId).emit(
            "battle-log",
            `${name} attacks again due to Speed Up!`
          );
          performAttack();
        }
      }

      // emit turn update after action
      io.to(roomId).emit("turn-update", {
        currentTurn: null,
        usage: actingPlayer.usage,
        hp: {
          [actingPlayer.name]: actingPlayer.hp ?? 100,
          [opponent.name]: opponent.hp ?? 100,
        },
        statusEffects: {
          self: Object.keys(actingPlayer.statusEffects ?? {}),
          opponent: Object.keys(opponent.statusEffects ?? {}),
        },
      });

      // check for opponent defeat and handle revive
      if ((opponent.hp ?? 0) <= 0) {
        if (opponent.revived) {
          opponent.hp = 20;
          opponent.revived = false;
          opponent.wasJustRevived = true;
          io.to(roomId).emit(
            "battle-log",
            `${opponent.name} revived with 20 HP!`
          );
        } else {
          io.to(roomId).emit("turn-update", {
            currentTurn: null,
            usage: {},
            hp: {
              [actingPlayer.name]: actingPlayer.hp ?? 100,
              [opponent.name]: 0,
            },
            statusEffects: {
              self: Object.keys(actingPlayer.statusEffects ?? {}),
              opponent: Object.keys(opponent.statusEffects ?? {}),
            },
          });
          io.to(roomId).emit(
            "battle-log",
            `${actingPlayer.name} wins the battle!`
          );
          return;
        }
      }

      // apply end-of-turn effects and start next turn
      applyEndOfTurnEffects(actingPlayer, roomId, io);
      room.turnIndex = (room.turnIndex + 1) % 2;
      startNextTurn(roomId, io);
    });
  });
}

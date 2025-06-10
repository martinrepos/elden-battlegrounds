import { useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import CharacterSelect from "./CharacterSelection";
import styles from "./BattleView.module.css";
import { CHARACTERS } from "../data/characters";
import type { Character } from "../data/characters";
// imports hooks, character selection component, characters and data/types.

interface BattleViewProps {
  // component expects name and roomid
  name: string;
  roomId: string;
}

interface PlayerInfo {
  // info about players
  name: string;
  character: string;
}

export default function BattleView({ name, roomId }: BattleViewProps) {
  const socket = useSocket(); // get the socket instance for real-time events

  // state for selected character, opponent, and their info
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    null
  );
  const [opponentCharacter, setOpponentCharacter] = useState<Character | null>(
    null
  );
  const [opponentName, setOpponentName] = useState<string | null>(null);

  // state for turn logic and ability usage
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [ownUsage, setOwnUsage] = useState<Record<string, number>>({});
  const [, setOpponentUsage] = useState<Record<string, number>>({}); // (redundant but can be implemented later)
  const [hp, setHp] = useState<Record<string, number>>({}); // HP for both players

  // game state and UI effects
  const [gameOver, setGameOver] = useState(false);
  const [turnCount, setTurnCount] = useState(1);
  const [lastTurnPlayer, setLastTurnPlayer] = useState<string | null>(null);
  const [shakePlayer, setShakePlayer] = useState(false);
  const [shakeOpponent, setShakeOpponent] = useState(false);
  const [isSilenced, setIsSilenced] = useState(false);
  const [showOpponentStunned, setShowOpponentStunned] = useState(false);
  const [latestStatus, setLatestStatus] = useState<{
    self: string[];
    opponent: string[];
  }>({ self: [], opponent: [] });
  const [stunnedState, setStunnedState] = useState<{ self: boolean }>({
    self: false,
  });

  // setup socket event listeners and cleanup
  useEffect(() => {
    // setup players and their characters
    const handleBattleStart = ({
      currentTurn,
      players,
    }: {
      currentTurn: string;
      players: PlayerInfo[];
    }) => {
      setCurrentTurn(currentTurn);
      setTurnCount(1);
      setLastTurnPlayer(null);

      const opponent = players.find((p) => p.name !== name);
      const self = players.find((p) => p.name === name);

      // set opponent character and hp
      if (opponent) {
        setOpponentName(opponent.name);
        const oppChar = CHARACTERS.find((c) => c.name === opponent.character);
        if (oppChar) {
          setOpponentCharacter(oppChar);
          setHp((prev) => ({ ...prev, [opponent.name]: 100 }));
        }
      }

      // set player character, abilityusage and hp
      if (self) {
        const selfChar = CHARACTERS.find((c) => c.name === self.character);
        if (selfChar) {
          setSelectedCharacter(selfChar);
          const usageMap: Record<string, number> = {};
          selfChar.abilities.forEach((a) => (usageMap[a.name] = a.usage ?? 1));
          setOwnUsage(usageMap);
          setHp((prev) => ({ ...prev, [name]: 100 }));
        }
      }

      setStunnedState({ self: false });
    };

    // shake animation
    const handleShake = (playerName: string) => {
      if (playerName === name) {
        setShakePlayer(true);
        setTimeout(() => setShakePlayer(false), 400);
      } else if (playerName === opponentName) {
        setShakeOpponent(true);
        setTimeout(() => setShakeOpponent(false), 400);
      }
    };

    socket.on("shake", handleShake);

    const handleTurnUpdate = ({
      // turn updates; hp, status, turn count, etc
      currentTurn,
      usage,
      hp: updatedHp,
      statusEffects,
    }: {
      currentTurn: string | null;
      usage: Record<string, number>;
      hp: Record<string, number>;
      statusEffects: { self: string[]; opponent: string[] };
    }) => {
      // update status effects
      setLatestStatus(statusEffects);
      setIsSilenced(statusEffects.self.includes("Silence"));
      setStunnedState({ self: statusEffects.self.includes("Stun") });
      setShowOpponentStunned(statusEffects.opponent.includes("Stun"));

      setCurrentTurn(currentTurn);

      if (
        lastTurnPlayer &&
        lastTurnPlayer !== currentTurn &&
        currentTurn !== null
      ) {
        setTurnCount((prev) => prev + 1);
      }
      setLastTurnPlayer(currentTurn);

      // update HP and trigger animations
      setHp((prevHp) => {
        if (opponentName && updatedHp[opponentName] !== undefined) {
          if ((prevHp[opponentName] ?? 100) > updatedHp[opponentName])
            setShakeOpponent(true);
        }

        if (updatedHp[name] !== undefined) {
          if ((prevHp[name] ?? 100) > updatedHp[name]) setShakePlayer(true);
        }

        setTimeout(() => {
          setShakePlayer(false);
          setShakeOpponent(false);
        }, 400);

        if (
          (updatedHp[name] === 0 &&
            latestStatus.self.includes("Revive") === false) ||
          (opponentName &&
            updatedHp[opponentName] === 0 &&
            latestStatus.opponent.includes("Revive") === false) // fix this later, losing after getting revived doesnt trigger game over state
        ) {
          setGameOver(true);
        }

        return { ...prevHp, ...updatedHp };
      });

      // update usage only for self
      if (currentTurn === name) {
        setOwnUsage(usage);
      } else {
        setOpponentUsage(usage);
      }
    };

    // reset all states when resetapproved
    const handleResetApproved = () => {
      setSelectedCharacter(null);
      setOpponentCharacter(null);
      setOpponentName(null);
      setOwnUsage({});
      setOpponentUsage({});
      setHp({});
      setCurrentTurn(null);
      setTurnCount(1);
      setLastTurnPlayer(null);
      setGameOver(false);
      setIsSilenced(false);
      setLatestStatus({ self: [], opponent: [] });
      setStunnedState({ self: false });
      setShowOpponentStunned(false);
    };

    // register all event handlers
    socket.on("battle-start", handleBattleStart);
    socket.on("turn-update", handleTurnUpdate);
    socket.on("reset-approved", handleResetApproved);
    socket.on("shake", handleShake);
    // cleanup handlers
    return () => {
      socket.off("battle-start", handleBattleStart);
      socket.off("turn-update", handleTurnUpdate);
      socket.off("reset-approved", handleResetApproved);
      socket.off("shake", handleShake);
    };
  }, [socket, name, opponentName, lastTurnPlayer]);
  // select character and tell server
  const handleCharacterSelect = (char: Character) => {
    setSelectedCharacter(char);
    const usageMap: Record<string, number> = {};
    char.abilities.forEach((a) => (usageMap[a.name] = a.usage ?? 1));
    setOwnUsage(usageMap);
    setHp((prev) => ({ ...prev, [name]: 100 }));

    socket.emit("select-character", {
      roomId,
      character: char.name,
      usage: usageMap,
    });
  };

  const sendBattleAction = (ability: string) => {
    if (currentTurn !== name || ownUsage[ability] <= 0 || gameOver) return;
    const updatedUsage = { ...ownUsage };
    updatedUsage[ability] -= 1;
    setOwnUsage(updatedUsage);

    socket.emit("battle-action", {
      roomId,
      name,
      action: ability,
    });
  };

  const renderHpBar = (playerName: string) => {
    const currentHp = hp[playerName] ?? 100;
    const width = Math.max(0, Math.min(100, currentHp));
    const fillClass =
      width === 0 ? `${styles.hpFill} ${styles.zero}` : styles.hpFill;

    return (
      <>
        <div className={styles.hpLabel}>{`${currentHp} ❤️`}</div>
        <div className={styles.hpBar}>
          <div className={fillClass} style={{ width: `${width}%` }} />
        </div>
      </>
    );
  };

  if (!selectedCharacter) {
    return (
      <div className={styles.outerGameFrame}>
        <div className={styles.contentWrapper}>
          <div className={styles.gameArea}>
            <CharacterSelect onSelect={handleCharacterSelect} />
          </div>
        </div>
      </div>
    );
  }

  const isMyTurn = currentTurn === name;
  const turnStatusMessage = gameOver
    ? "Game Over"
    : stunnedState.self && currentTurn !== name
    ? "You are stunned!"
    : showOpponentStunned && currentTurn !== opponentName
    ? `${opponentName} is stunned! Your turn!`
    : isMyTurn
    ? "Your turn"
    : "Waiting...";

  return (
    <div className={styles.outerGameFrame}>
      <div className={styles.contentWrapper}>
        <div className={styles.gameArea}>
          <div className={styles.battlefield}>
            <div className={`${styles.characterWrapper} ${styles.opponent}`}>
              {opponentCharacter && opponentName && (
                <>
                  {renderHpBar(opponentName)}
                  <div
                    className={`${styles.spriteWrapper} ${
                      shakeOpponent ? styles.shake : ""
                    }`}
                  >
                    <img
                      src={opponentCharacter.sprite}
                      alt="Opponent"
                      className={`${styles.sprite}
                        ${
                          opponentCharacter.name !== "Melania"
                            ? styles.opponentSprite
                            : ""
                        }
                        ${hp[opponentName] === 0 ? styles.fainted : ""}
                        ${showOpponentStunned ? styles.stunned : ""}
                        ${
                          latestStatus.opponent.includes("Doom")
                            ? styles.doomed
                            : ""
                        }
                        ${
                          latestStatus.opponent.includes("Scarlet Rot")
                            ? styles.rotted
                            : ""
                        }
                        ${
                          latestStatus.opponent.includes("Burn")
                            ? styles.burn
                            : ""
                        }
                        ${
                          latestStatus.opponent.includes("Fear")
                            ? styles.feared
                            : ""
                        }
                        ${
                          latestStatus.opponent.includes("Paralyze")
                            ? styles.paralyzed
                            : ""
                        }`}
                    />
                  </div>
                </>
              )}
            </div>

            <div className={`${styles.characterWrapper} ${styles.player}`}>
              {renderHpBar(name)}
              <div
                className={`${styles.spriteWrapper} ${
                  shakePlayer ? styles.shake : ""
                }`}
              >
                <img
                  src={selectedCharacter.sprite}
                  alt="You"
                  className={`${styles.sprite}
                    ${stunnedState.self ? styles.stunned : ""}
                    ${latestStatus.self.includes("Doom") ? styles.doomed : ""}
                    ${
                      latestStatus.self.includes("Scarlet Rot")
                        ? styles.rotted
                        : ""
                    }
                    ${latestStatus.self.includes("Burn") ? styles.burn : ""}
                    ${
                      latestStatus.self.includes("Paralyze")
                        ? styles.paralyzed
                        : ""
                    }
                    ${latestStatus.self.includes("Fear") ? styles.feared : ""}
                    ${
                      selectedCharacter.name === "Melania" ? styles.flipped : "" // melania sprite default is mirrored
                    }
                    ${hp[name] === 0 ? styles.fainted : ""}`}
                />
              </div>
            </div>
          </div>
          <div className={styles.roundinfo}>
            <h3>Round #{turnCount}</h3>
            <h3>{turnStatusMessage}</h3>
          </div>
        </div>

        <div className={styles.abilitiesBackground}>
          {selectedCharacter.abilities.map((ability, i) => {
            const disabled =
              ownUsage[ability.name] <= 0 ||
              (ability.isSpecial && isSilenced) ||
              gameOver;

            return (
              <div
                key={i}
                onClick={() => !disabled && sendBattleAction(ability.name)}
                className={styles.abilitiesButtons}
                style={{
                  opacity: disabled ? 0.4 : 1,
                  pointerEvents: disabled ? "none" : "auto",
                }}
              >
                <div>
                  <strong>{ability.name}</strong>{" "}
                  {ability.isSpecial && (
                    <span style={{ color: "goldenrod" }}>(Special)</span>
                  )}
                </div>
                <div>{ability.description}</div>
                <div className={styles.PP}>
                  {ownUsage[ability.name]} / {ability.usage ?? 1}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

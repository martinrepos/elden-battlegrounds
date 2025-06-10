// CharacterSelect.tsx
import styles from "./CharacterSelect.module.css";
import { CHARACTERS } from "../data/characters";
import type { Character } from "../data/characters";

interface Props {
  onSelect: (character: Character) => void;
}

export default function CharacterSelect({ onSelect }: Props) {
  return (
    <div className={styles.selectWrapper}>
      <h2 className={styles.h2}>SELECT YOUR CHARACTER</h2>
      <div className={styles.grid}>
        {CHARACTERS.map((char) => (
          <div
            key={char.name}
            className={styles.card}
            onClick={() => onSelect(char)}
          >
            <h3>{char.name}</h3>
            <img
              src={char.sprite}
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

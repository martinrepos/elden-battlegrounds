export interface Ability {
  name: string;
  damage: number;
  statusEffect?: string;
  usage: number;
  synergy?: string;
  conditionalBonus?: {
    condition: string;
    bonusDamage: number;
    description: string;
  };
  hitChance?: number;
  description?: string;
  isSpecial?: boolean;
}

export interface Character {
  id: string;
  name: string;
  sprite: string;
  hp: number;
  armor?: number;
  abilities: Ability[];
}

export const CHARACTERS: Character[] = [
  {
    id: "godfrey",
    name: "Godfrey",
    sprite: "/sprites/Godfrey.png",
    hp: 100,
    armor: 20,
    abilities: [
      {
        name: "Axe Slam",
        damage: 25,
        usage: 3,
        hitChance: 90,
        description: "Solid physical attack for early pressure.",
      },
      {
        name: "Beast Roar",
        damage: 0,
        statusEffect: "Stun",
        usage: 1,
        hitChance: 70,
        description: "Stuns the enemy, skipping their next turn.",
        isSpecial: true,
      },
      {
        name: "Lion's Charge",
        damage: 20,
        statusEffect: "Paralyze",
        usage: 2,
        hitChance: 80,
        description: "Chance to paralyze and deal moderate damage.",
        isSpecial: true,
      },
      {
        name: "Earthshatter",
        damage: 35,
        usage: 2,
        hitChance: 75,
        description: "Heavy damage with a chance to miss.",
        isSpecial: true,
      },
      {
        name: "War Cry",
        damage: 10,
        statusEffect: "Attack Up",
        usage: 3,
        hitChance: 100,
        description: "Boosts attack power for 2 turns.",
        isSpecial: true,
      },
      {
        name: "Berserker's Fury",
        damage: 40,
        statusEffect: "Defense Down",
        usage: 2,
        hitChance: 80,
        description: "Big damage that weakens enemy defense.",
        isSpecial: true,
      },
      {
        name: "Lion's Wrath",
        damage: 50,
        usage: 1,
        hitChance: 65,
        description: "High-risk, high-reward finisher.",
        isSpecial: true,
      },
      {
        name: "Endure",
        damage: 0,
        statusEffect: "Damage Reduction",
        usage: 2,
        hitChance: 100,
        description: "Reduces incoming damage for 2 turns.",
        isSpecial: true,
      },
    ],
  },
  {
    id: "maliketh",
    name: "Maliketh",
    sprite: "/sprites/Maliketh.png",
    hp: 100,
    armor: 10,
    abilities: [
      {
        name: "Destined Death",
        damage: 35,
        statusEffect: "HP Reduction",
        usage: 2,
        hitChance: 85,
        description: "Reduces enemy max HP by 10%.",
        isSpecial: true,
      },
      {
        name: "Black Blade Slash",
        damage: 25,
        usage: 3,
        hitChance: 95,
        description: "Reliable slash with high accuracy.",
      },
      {
        name: "Beast Claw",
        damage: 18,
        usage: 4,
        hitChance: 90,
        description: "Fast claw strikes with consistent output.",
      },
      {
        name: "Death Howl",
        damage: 0,
        statusEffect: "Fear",
        usage: 2,
        hitChance: 85,
        description: "Lowers enemy accuracy for 2 turns.",
        isSpecial: true,
      },
      {
        name: "Shadowstep",
        damage: 0,
        statusEffect: "Evasion Up",
        usage: 3,
        hitChance: 100,
        description: "Dodges the next incoming hit.",
        isSpecial: true,
      },
      {
        name: "Rune Seal",
        damage: 0,
        statusEffect: "Silence",
        usage: 2,
        hitChance: 80,
        description: "Prevents ability use next turn.",
        isSpecial: true,
      },
      {
        name: "Black Flame",
        damage: 30,
        statusEffect: "Burn",
        usage: 2,
        hitChance: 85,
        description: "Burns target for 2 turns.",
        isSpecial: true,
      },
      {
        name: "Seal of Death",
        damage: 0,
        statusEffect: "Doom",
        usage: 1,
        hitChance: 75,
        description: "Inflicts fatal damage in 3 turns if not removed.",
        isSpecial: true,
      },
    ],
  },
  {
    id: "melania",
    name: "Melania",
    sprite: "/sprites/Melania.png",
    hp: 100,
    armor: 5,
    abilities: [
      {
        name: "Waterfowl Dance",
        damage: 45,
        usage: 1,
        statusEffect: "Heal",
        hitChance: 80,
        description: "High damage and self-heal (20 HP).",
        isSpecial: true,
      },
      {
        name: "Scarlet Bloom",
        damage: 10,
        statusEffect: "Scarlet Rot",
        usage: 3,
        hitChance: 95,
        description: "Applies damage-over-time.",
        isSpecial: true,
      },
      {
        name: "Blooming Slash",
        damage: 22,
        usage: 3,
        hitChance: 90,
        description: "Clean single-target strike.",
      },
      {
        name: "Rotting Thrust",
        damage: 18,
        statusEffect: "Scarlet Rot",
        usage: 3,
        hitChance: 85,
        description: "Stacks rot effect on enemies.",
        isSpecial: true,
      },
      {
        name: "Goddess of Rot",
        damage: 0,
        statusEffect: "Heal",
        usage: 2,
        hitChance: 100,
        description: "Heals 40 HP. Usable only above 30 HP.",
        isSpecial: true,
      },
      {
        name: "Prosthetic Surge",
        damage: 0,
        statusEffect: "Speed Up",
        usage: 2,
        hitChance: 100,
        description: "Your next attack hits twice.",
        isSpecial: true,
      },
      {
        name: "Rot Explosion",
        damage: 30,
        statusEffect: "Scarlet Rot",
        usage: 2,
        hitChance: 80,
        description: "High-damage rot finisher.",
        isSpecial: true,
      },
      {
        name: "Unyielding Spirit",
        damage: 0,
        statusEffect: "Revive",
        usage: 1,
        hitChance: 100,
        description: "Prevents death once, revives to 20 HP.",
        isSpecial: true,
      },
    ],
  },
];

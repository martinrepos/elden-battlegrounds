export interface StatusEffect {
  description: string;
  duration: number;
  type: string; // e.g. "debuff", "buff", "utility"
  effect: string; // e.g. "stun", "heal", "burn", etc.
  modifier?: number;
  chance?: number;
  value?: number;
}

export type StatusEffectMap = {
  [effectName: string]: StatusEffect;
};

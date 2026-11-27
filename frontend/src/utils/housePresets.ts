export type HousePresetType = 'COUPLE_FAMILY' | 'SHARED_APT' | 'REPUBLIC' | 'CUSTOM';

export type CanonicalHousePresetType = Exclude<HousePresetType, 'CUSTOM'>;

export interface HouseRulesConfig {
  hasSharedFund: boolean;
  requireExpenseApproval: boolean;
  allMembersAdmin: boolean;
}

export interface HousePresetMetadata {
  type: CanonicalHousePresetType;
  label: string;
  subtitle: string;
  rules: HouseRulesConfig;
}

export const HOUSE_PRESETS: ReadonlyArray<HousePresetMetadata> = [
  {
    type: 'COUPLE_FAMILY',
    label: 'Casal / Família',
    subtitle: 'Acompanha gastos do mês e todos administram juntos',
    rules: {
      hasSharedFund: false,
      requireExpenseApproval: false,
      allMembersAdmin: true,
    },
  },
  {
    type: 'SHARED_APT',
    label: 'Amigos / Apê',
    subtitle: 'Acompanha gastos sem caixinha e com gestão por administradores',
    rules: {
      hasSharedFund: false,
      requireExpenseApproval: false,
      allMembersAdmin: false,
    },
  },
  {
    type: 'REPUBLIC',
    label: 'República',
    subtitle: 'Caixinha coletiva, aprovação de despesas e reembolsos',
    rules: {
      hasSharedFund: true,
      requireExpenseApproval: true,
      allMembersAdmin: false,
    },
  },
];

export function applyHousePreset(preset: CanonicalHousePresetType): HouseRulesConfig {
  const match = HOUSE_PRESETS.find((item) => item.type === preset);
  if (!match) {
    return { ...HOUSE_PRESETS[0].rules };
  }
  return { ...match.rules };
}

export function resolvePresetFromRules(rules: HouseRulesConfig): HousePresetType {
  for (const preset of HOUSE_PRESETS) {
    if (
      preset.rules.hasSharedFund === rules.hasSharedFund &&
      preset.rules.requireExpenseApproval === rules.requireExpenseApproval &&
      preset.rules.allMembersAdmin === rules.allMembersAdmin
    ) {
      return preset.type;
    }
  }
  return 'CUSTOM';
}

export function getPresetLabel(presetType?: string | null): string {
  const match = HOUSE_PRESETS.find((item) => item.type === presetType);
  if (match) return match.label;
  if (presetType === 'CUSTOM') return 'Personalizado';
  return HOUSE_PRESETS[0].label;
}

import {
  HOUSE_PRESETS,
  applyHousePreset,
  resolvePresetFromRules,
} from '../housePresets';

describe('housePresets utilities', () => {
  it('defines canonical labels and defaults for COUPLE_FAMILY, SHARED_APT, and REPUBLIC', () => {
    expect(HOUSE_PRESETS.map((p) => [p.type, p.label])).toEqual([
      ['COUPLE_FAMILY', 'Casal / Família'],
      ['SHARED_APT', 'Amigos / Apê'],
      ['REPUBLIC', 'República'],
    ]);

    expect(applyHousePreset('COUPLE_FAMILY')).toEqual({
      hasSharedFund: false,
      requireExpenseApproval: false,
      allMembersAdmin: true,
    });
    expect(applyHousePreset('SHARED_APT')).toEqual({
      hasSharedFund: false,
      requireExpenseApproval: false,
      allMembersAdmin: false,
    });
    expect(applyHousePreset('REPUBLIC')).toEqual({
      hasSharedFund: true,
      requireExpenseApproval: true,
      allMembersAdmin: false,
    });
  });

  it('resolves exact preset matches and falls back to CUSTOM when switches diverge', () => {
    expect(
      resolvePresetFromRules({
        hasSharedFund: false,
        requireExpenseApproval: false,
        allMembersAdmin: true,
      })
    ).toBe('COUPLE_FAMILY');

    expect(
      resolvePresetFromRules({
        hasSharedFund: false,
        requireExpenseApproval: false,
        allMembersAdmin: false,
      })
    ).toBe('SHARED_APT');

    expect(
      resolvePresetFromRules({
        hasSharedFund: true,
        requireExpenseApproval: true,
        allMembersAdmin: false,
      })
    ).toBe('REPUBLIC');

    expect(
      resolvePresetFromRules({
        hasSharedFund: true,
        requireExpenseApproval: false,
        allMembersAdmin: false,
      })
    ).toBe('CUSTOM');

    expect(
      resolvePresetFromRules({
        hasSharedFund: false,
        requireExpenseApproval: true,
        allMembersAdmin: true,
      })
    ).toBe('CUSTOM');
  });
});

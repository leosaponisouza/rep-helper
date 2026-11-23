import {
  formatShortDate,
  formatToBackendDateTime,
  mergeDateAndTime,
  formatTime,
} from '../dateUtils';

describe('dateUtils', () => {
  it('formats backend datetime with explicit timezone offset so OffsetDateTime preserves local instant', () => {
    const sample = new Date(2026, 10, 23, 18, 0, 0);
    const serialized = formatToBackendDateTime(sample);
    expect(serialized).toMatch(/^2026-11-23T18:00:00([+-]\d{2}:\d{2}|Z)$/);
    expect(formatTime(serialized)).toBe('18:00');
  });

  it('formats Date or ISO string to dd/MM/yyyy and returns empty string for null/undefined/invalid', () => {
    expect(formatShortDate('2026-11-14T15:30:00')).toBe('14/11/2026');
    expect(formatShortDate(undefined)).toBe('');
    expect(formatShortDate(null)).toBe('');
    expect(formatShortDate('invalid-date')).toBe('');
  });

  it('merges date part or time part preserving the counterpart', () => {
    const base = new Date(2026, 10, 14, 10, 15, 0);
    const newDatePart = new Date(2026, 11, 25, 0, 0, 0);
    const mergedDate = mergeDateAndTime(base, newDatePart, 'date');
    expect(mergedDate.getFullYear()).toBe(2026);
    expect(mergedDate.getMonth()).toBe(11);
    expect(mergedDate.getDate()).toBe(25);
    expect(mergedDate.getHours()).toBe(10);
    expect(mergedDate.getMinutes()).toBe(15);

    const newTimePart = new Date(2026, 0, 1, 18, 45, 0);
    const mergedTime = mergeDateAndTime(base, newTimePart, 'time');
    expect(mergedTime.getDate()).toBe(14);
    expect(mergedTime.getHours()).toBe(18);
    expect(mergedTime.getMinutes()).toBe(45);
  });
});

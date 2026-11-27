import { describe, it, expect } from 'vitest';
import { analyse, loopOf } from '../../skills/chanmeng-svg-product-card/kit/qa-loop.mjs';

const level = (results, check) => results.find((r) => r.check === check)?.level;
const steady = (n, d = 1) => Array.from({ length: n }, () => d);

describe('qa-loop: analyse', () => {
  const base = { step: 0.1, start: 0, loops: true };

  it('fails a seam far above the steps around it', () => {
    const diffs = [...steady(30), 20];
    const r = analyse({ ...base, diffs, changed: steady(31, 0.01), detail: steady(32, 10) });
    expect(level(r, 'loop seam')).toBe('FAIL');
  });

  it('passes a seam reached by a fade, whose steps are all alike', () => {
    const diffs = [...steady(26, 0.1), 3, 3.2, 3.1, 3.35];
    const r = analyse({ ...base, diffs, changed: steady(30, 0.01), detail: steady(31, 10) });
    expect(level(r, 'loop seam')).toBe('PASS');
  });

  it('warns about a nearly blank first frame, measured at 0 s when the loop starts later', () => {
    const r = analyse({ ...base, start: 7, diffs: steady(10), changed: steady(10, 0.01), detail: steady(11, 10), firstDetail: 1 });
    expect(level(r, 'first frame')).toBe('WARN');
  });

  it('warns about a single frame that changes far more than its neighbours', () => {
    const diffs = [...steady(10, 0.5), 30, ...steady(10, 0.5), 0.5];
    const r = analyse({ ...base, diffs, changed: steady(22, 0.01), detail: steady(23, 10) });
    expect(r.find((x) => x.check === 'hard cut')).toMatchObject({ level: 'WARN', detail: expect.stringContaining('1.0s→1.1s') });
  });

  it('warns about seconds in which almost nothing changes', () => {
    const changed = [...steady(5, 0.01), ...steady(25, 0), ...steady(5, 0.01)];
    const r = analyse({ ...base, diffs: steady(35, 0.3), changed, detail: steady(36, 10) });
    expect(r.find((x) => x.check === 'dead stretch')).toMatchObject({ level: 'WARN', detail: expect.stringContaining('0.5s–3.0s') });
  });

  it('says so when nothing moves at all, and checks nothing else', () => {
    const r = analyse({ ...base, diffs: steady(10, 0), changed: steady(10, 0), detail: steady(11, 10) });
    expect(r).toEqual([expect.objectContaining({ check: 'nothing moves', level: 'WARN' })]);
  });

  it('has no seam check for a one-shot', () => {
    const r = analyse({ ...base, loops: false, diffs: steady(10), changed: steady(10, 0.01), detail: steady(11, 10) });
    expect(level(r, 'loop seam')).toBeUndefined();
  });
});

describe('qa-loop: loopOf', () => {
  it('takes the longest repeating animation as the loop, and lets one-shots finish first', () => {
    const r = loopOf([
      { duration: 14, delay: 0, iterations: Infinity },
      { duration: 0.62, delay: 0, iterations: Infinity },
      { duration: 0.8, delay: 1.2, iterations: 1 },
    ]);
    expect(r).toEqual({ period: 14, leadIn: 2, uneven: [0.62] });
  });

  it('treats loops that divide the period as even', () => {
    expect(loopOf([{ duration: 6, delay: 0, iterations: Infinity }, { duration: 1.5, delay: -0.3, iterations: Infinity }]).uneven).toEqual([]);
  });

  it('honours an explicit duration, and reports no loop when nothing repeats', () => {
    expect(loopOf([{ duration: 3, delay: 0, iterations: Infinity }], { dur: 9 }).period).toBe(9);
    expect(loopOf([{ duration: 2, delay: 0.5, iterations: 1 }])).toMatchObject({ period: 0, leadIn: 2.5 });
  });
});

import { describe, it, expect } from 'vitest';
import { entry, setVerdict, format } from '../../scripts/history.mjs';

const ok = { slug: 'orbit-badge', type: 'badge', signature: 'the dot draws its own ring, then the ring locks', primitives: 'createOrbit, createPulse', loop: '6' };

describe('history', () => {
  it('records a piece with its signature move and no verdict yet', () => {
    expect(entry(ok, '2026-11-27')).toMatchObject({ date: '2026-11-27', primitives: ['createOrbit', 'createPulse'], loop: 6, verdict: '' });
  });

  it('refuses an entry that could not teach anything later', () => {
    expect(() => entry({ ...ok, slug: 'Orbit Badge' })).toThrow(/kebab-case/);
    expect(() => entry({ ...ok, type: 'thing' })).toThrow(/--type/);
    expect(() => entry({ ...ok, signature: 'spins' })).toThrow(/sentence/);
  });

  it('writes the verdict onto the latest entry for the slug, and needs a reason', () => {
    const entries = [entry(ok, '2026-11-01'), entry(ok, '2026-11-02')];
    const next = setVerdict(entries, 'orbit-badge', 'reject', 'reads as a generic loader');
    expect(next[0].verdict).toBe('');
    expect(next[1]).toMatchObject({ verdict: 'reject', why: 'reads as a generic loader' });
    expect(() => setVerdict(entries, 'orbit-badge', 'reject', ' ')).toThrow(/reason/);
    expect(() => setVerdict(entries, 'nope', 'keep', 'fine')).toThrow(/no entry/);
    expect(() => setVerdict(entries, 'orbit-badge', 'meh', 'fine')).toThrow(/keep, tweak, reject/);
  });

  it('prints a verdict next to the move it judged', () => {
    const [e] = setVerdict([entry(ok, '2026-11-01')], 'orbit-badge', 'keep', 'the lock lands');
    expect(format(e)).toMatch(/the dot draws its own ring[\s\S]*KEEP: the lock lands/);
  });
});

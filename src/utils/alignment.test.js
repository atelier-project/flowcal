import { describe, test, expect } from 'vitest';
import { computeAlignment } from './alignment';

const box = (x, y, w = 256, h = 160) => ({ x, y, w, h });

describe('computeAlignment', () => {
    test('snaps left edges together when within threshold', () => {
        const anchor = box(53, 400);          // 3px off the static node's left (50)
        const others = [box(50, 50)];
        const r = computeAlignment(anchor, others);
        expect(r.hasX).toBe(true);
        expect(r.dx).toBe(-3);                // nudged left to x=50
        expect(r.guides.some(g => g.x1 === g.x2 && g.x1 === 50)).toBe(true);
    });

    test('snaps horizontal centres (top aligned)', () => {
        // anchor centre-y = 402+80 = 482; other centre-y = 400+80 = 480 → gap 2
        const anchor = box(600, 402);
        const others = [box(50, 400)];
        const r = computeAlignment(anchor, others);
        expect(r.hasY).toBe(true);
        expect(r.dy).toBe(-2);
    });

    test('no snap when everything is far from alignment', () => {
        const anchor = box(333, 777);
        const others = [box(50, 50)];
        const r = computeAlignment(anchor, others);
        expect(r.hasX).toBe(false);
        expect(r.hasY).toBe(false);
        expect(r.dx).toBe(0);
        expect(r.dy).toBe(0);
        expect(r.guides).toHaveLength(0);
    });

    test('aligns right-edge of anchor to left-edge of another node', () => {
        // anchor right = 100+256 = 356; other left = 354 → gap 2, snap right to 354
        const anchor = box(100, 300, 256, 160);
        const others = [box(354, 300)];
        const r = computeAlignment(anchor, others);
        expect(r.hasX).toBe(true);
        expect(r.dx).toBe(-2);
    });

    test('picks the closest alignment among several candidates', () => {
        const anchor = box(57, 400);          // 7px from x=50 (out of range), 1px from x=58
        const others = [box(50, 50), box(58, 600)];
        const r = computeAlignment(anchor, others);
        expect(r.dx).toBe(1);                 // snaps to the nearer left edge (58)
    });
});

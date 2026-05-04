/**
 * Tests for pure utility functions in vizLoader.ts.
 * These functions have no browser/WebGL dependencies and can run in Node.
 */
import { describe, it, expect } from 'vitest';
import { parseKV, parseHexColor, classifyRep } from '../lib/vizLoader';
import type { DataRep } from '../lib/types';

// ---------------------------------------------------------------------------
// parseKV
// ---------------------------------------------------------------------------
describe('parseKV', () => {
	it('parses semicolon-separated key:value pairs', () => {
		expect(parseKV('ratio:0.5;start:0;angle:120')).toEqual({
			ratio: '0.5',
			start: '0',
			angle: '120',
		});
	});

	it('returns empty object for empty string', () => {
		expect(parseKV('')).toEqual({});
	});

	it('handles values that contain colons (e.g. paths)', () => {
		const result = parseKV('path:samples/eco/image.png;key:val');
		expect(result.path).toBe('samples/eco/image.png');
		expect(result.key).toBe('val');
	});

	it('ignores segments without a colon', () => {
		expect(parseKV('nocolon;key:val')).toEqual({ key: 'val' });
	});

	it('trims whitespace from keys and values', () => {
		expect(parseKV(' ratio : 0.5 ')).toEqual({ ratio: '0.5' });
	});
});

// ---------------------------------------------------------------------------
// parseHexColor
// ---------------------------------------------------------------------------
describe('parseHexColor', () => {
	it('parses 6-digit hex color', () => {
		const c = parseHexColor('#ff0000');
		expect(c.r).toBeCloseTo(1);
		expect(c.g).toBeCloseTo(0);
		expect(c.b).toBeCloseTo(0);
		expect(c.opacity).toBe(1);
	});

	it('parses 8-digit hex color with alpha', () => {
		const c = parseHexColor('#ffffff80');
		expect(c.r).toBeCloseTo(1);
		expect(c.g).toBeCloseTo(1);
		expect(c.b).toBeCloseTo(1);
		// 0x80 / 255 ≈ 0.502
		expect(c.opacity).toBeCloseTo(0x80 / 255);
	});

	it('parses hex digits without # prefix', () => {
		const c = parseHexColor('00ff00');
		expect(c.g).toBeCloseTo(1);
		expect(c.r).toBeCloseTo(0);
	});

	it('returns white with full opacity for empty string', () => {
		expect(parseHexColor('')).toEqual({ r: 1, g: 1, b: 1, opacity: 1 });
	});

	it('handles uppercase hex', () => {
		const c = parseHexColor('#0000FF');
		expect(c.b).toBeCloseTo(1);
		expect(c.r).toBeCloseTo(0);
	});
});

// ---------------------------------------------------------------------------
// classifyRep
// ---------------------------------------------------------------------------
describe('classifyRep', () => {
	const make = (type: string): DataRep => ({
		type,
		x: 0,
		y: 0,
		z: 0,
		w: 1,
		h: 1,
		d: 1,
	});

	it('classifies known shape types as shape', () => {
		for (const t of ['sphere', 'box', 'cylinder', 'area', 'line', 'arc']) {
			expect(classifyRep(make(t))).toBe('shape');
		}
	});

	it('classifies pyramid_down as shape', () => {
		expect(classifyRep(make('pyramid_down'))).toBe('shape');
	});

	it('classifies encoding type as encoding', () => {
		expect(classifyRep(make('encoding'))).toBe('encoding');
	});

	it('classifies text type as text', () => {
		expect(classifyRep(make('text'))).toBe('text');
	});

	it('classifies unknown types as panel', () => {
		expect(classifyRep(make('XY'))).toBe('panel');
		expect(classifyRep(make('somethingelse'))).toBe('panel');
	});

	it('is case-insensitive', () => {
		expect(classifyRep(make('SPHERE'))).toBe('shape');
		expect(classifyRep(make('Encoding'))).toBe('encoding');
	});
});

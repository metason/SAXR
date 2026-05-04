/**
 * Minimal Three.js stub for unit tests.
 * Only implements the Color class used by parseHexColor in vizLoader.ts.
 */
export class Color {
	r: number;
	g: number;
	b: number;
	constructor(value: string) {
		// Very simple hex parser: handles #RGB and #RRGGBB
		const hex = value.startsWith('#') ? value.slice(1) : value;
		if (hex.length === 3) {
			this.r = parseInt(hex[0] + hex[0], 16) / 255;
			this.g = parseInt(hex[1] + hex[1], 16) / 255;
			this.b = parseInt(hex[2] + hex[2], 16) / 255;
		} else if (hex.length >= 6) {
			this.r = parseInt(hex.slice(0, 2), 16) / 255;
			this.g = parseInt(hex.slice(2, 4), 16) / 255;
			this.b = parseInt(hex.slice(4, 6), 16) / 255;
		} else {
			throw new Error(`Cannot parse color: ${value}`);
		}
	}
}

export const DoubleSide = 2;
export const FrontSide = 0;
export const BackSide = 1;

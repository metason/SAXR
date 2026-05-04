/**
 * @module panelOrientation
 * Pure function to determine panel orientation from its type string.
 * Extracted from PanelPlane.tsx for testability.
 */

/** Computed orientation for a panel quad. */
export interface PanelOrientation {
	/** Y-axis rotation in radians. */
	rotationY: number;
	/** Whether the panel lies flat on the XZ ground plane. */
	horizontal: boolean;
}

/**
 * Compute the orientation of a panel from its type string.
 * @param typeLower - Lowercased panel type (e.g. `'xy'`, `'-zy'`, `'xz'`, `'lc=legend'`).
 * @param h - Height value from the DataRep.
 * @param d - Depth value from the DataRep.
 * @returns Rotation and horizontal flag for positioning the panel quad.
 */
export function getPanelOrientation(
	typeLower: string,
	h: number,
	d: number,
): PanelOrientation {
	let rotY = 0;
	let horizontal = false;

	if (typeLower.startsWith('-xy')) rotY = Math.PI;
	else if (typeLower.startsWith('-zy')) rotY = Math.PI / 2;
	else if (typeLower.startsWith('zy')) rotY = -Math.PI / 2;
	else if (typeLower.startsWith('xz')) horizontal = true;
	else if (typeLower.startsWith('l') && typeLower.includes('='))
		horizontal = true;
	else if (!typeLower.startsWith('xy'))
		console.warn(
			`[panelOrientation] Unrecognized panel type "${typeLower}" — defaulting to upright`,
		);

	// Generic flat-panel detection: h==0 with non-zero d means
	// the panel lies on the XZ ground plane (e.g. flag images in eco).
	if (!horizontal && h === 0 && d > 0) horizontal = true;

	return { rotationY: rotY, horizontal };
}

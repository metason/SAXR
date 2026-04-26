/**
 * @module assetUrl
 * Resolve asset URLs from datareps.json `$SERVER/run/vis/` style paths.
 * Centralized for use by PanelPlane and ShapeSurface.
 */

/**
 * Resolve the asset URL for a panel or surface mesh.
 * Replaces the `$SERVER/run/vis/` prefix with the actual base path.
 * @param asset - Raw asset string from `DataRep.asset`.
 * @param basePath - Base URL for the current sample (e.g. `/samples/eco`).
 * @returns Resolved URL, or empty string if the asset is not an image.
 */
export function resolveAssetUrl(asset: string, basePath: string): string {
	if (!asset) return '';
	// Skip non-image assets (e.g. specs.json)
	if (!asset.match(/\.(png|jpg|jpeg|webp|svg)$/i)) return '';
	// Replace $SERVER/run/vis/ prefix — keep just the filename
	if (asset.startsWith('$SERVER/')) {
		const filename = asset.split('/').pop() || '';
		return basePath + '/' + filename;
	}
	// Already absolute URL
	if (
		asset.startsWith('http://') ||
		asset.startsWith('https://') ||
		asset.startsWith('/')
	) {
		return asset;
	}
	return basePath + '/' + asset;
}

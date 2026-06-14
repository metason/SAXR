'use client';
/**
 * @module VizContext
 * React context for read-only visualization config passed deep into the component tree.
 * Eliminates prop drilling of `assetBasePath` through DataVizCanvas → children.
 */

import React, { createContext, useContext } from 'react';

/** Read-only visualization configuration available via context. */
interface VizContextValue {
	/** Base URL for resolving panel image and PLY mesh assets. */
	assetBasePath: string;
	/**
	 * Cache-bust token appended to asset URLs as `?v=<n>`. Bumps on every sample
	 * (re)load so a pipeline re-run forces fresh texture/mesh fetches even though
	 * the file names (xy.png, surface.ply, …) stay the same.
	 */
	assetVersion: number;
}

const VizContext = createContext<VizContextValue>({
	assetBasePath: '',
	assetVersion: 0,
});

/**
 * Provider that supplies `assetBasePath` and `assetVersion` to all nested
 * visualization components.
 * @param props.assetBasePath - Base URL for the current sample (e.g. `/samples/eco`).
 * @param props.assetVersion - Cache-bust token; bumps on each (re)load.
 * @param props.children - Child components that consume the context.
 */
export function VizProvider({
	assetBasePath,
	assetVersion,
	children,
}: VizContextValue & { children: React.ReactNode }) {
	return (
		<VizContext.Provider value={{ assetBasePath, assetVersion }}>
			{children}
		</VizContext.Provider>
	);
}

/**
 * Hook to access the current {@link VizContextValue} (primarily `assetBasePath`).
 * Must be used inside a {@link VizProvider}.
 */
export function useVizContext() {
	return useContext(VizContext);
}

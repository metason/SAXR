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
}

const VizContext = createContext<VizContextValue>({ assetBasePath: '' });

/**
 * Provider that supplies `assetBasePath` to all nested visualization components.
 * @param props.assetBasePath - Base URL for the current sample (e.g. `/samples/eco`).
 * @param props.children - Child components that consume the context.
 */
export function VizProvider({
	assetBasePath,
	children,
}: VizContextValue & { children: React.ReactNode }) {
	return (
		<VizContext.Provider value={{ assetBasePath }}>
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

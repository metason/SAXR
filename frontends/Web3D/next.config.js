/** @type {import('next').NextConfig} */
const nextConfig = {
	// Allow importing from parent directories (for shared types if needed)
	transpilePackages: [],
	// Vercel defaults work out of the box for Next.js — no extra config needed.
	// Static assets in public/samples/ are served automatically.
};

module.exports = nextConfig;

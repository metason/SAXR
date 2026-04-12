/** @type {import('next').NextConfig} */
const nextConfig = {
	transpilePackages: [],

	// Serve sample files directly from the pipeline output directory
	// (SAXR/samples/) via an API route — no copying needed.
	async rewrites() {
		return [
			{
				source: '/samples/:path*',
				destination: '/api/pipeline-file/:path*',
			},
		];
	},
};

module.exports = nextConfig;

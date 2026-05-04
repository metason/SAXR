/** @type {import('next').NextConfig} */
const nextConfig = {
	transpilePackages: [],

	// Redirect /samples (bare) to the gallery home page.
	async redirects() {
		return [{ source: '/samples', destination: '/', permanent: false }];
	},

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

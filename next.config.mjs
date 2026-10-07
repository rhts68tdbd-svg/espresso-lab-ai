// Photos are compressed in the browser; the server image optimizer is unnecessary.
const nextConfig = { reactStrictMode: true, images: { unoptimized: true } };
export default nextConfig;

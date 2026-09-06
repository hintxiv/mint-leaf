/** @type {import('next').NextConfig} */
const nextConfig = {
    compiler: { styledComponents: true },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'xivapi.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'cdn.discordapp.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '**',
            },
            {
                protocol: 'http',
                hostname: 'mint-leaf.thebalanceffxiv.com',
                port: '',
                pathname: '/**',
            }
        ],
    },
    crossOrigin: 'anonymous',
}

export default nextConfig

const { config } = require('dotenv');
const { resolve } = require('path');

// Load root .env so one file configures both web + api
config({ path: resolve(__dirname, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@repo/shared'],
};

module.exports = nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Suppress hydration warnings in development
  reactStrictMode: true,
  
  webpack: (config) => {
    // Exclude pdf-parse test files from the build
    config.externals = [
      ...(config.externals || []),
      {
        'pdf-parse/test': 'commonjs pdf-parse/test'
      }
    ];
    
    // Ignore test files during module resolution
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
      },
    };
    
    config.module = {
      ...config.module,
      rules: [
        ...(config.module?.rules || []),
        {
          test: /node_modules\/pdf-parse\/test/,
          use: 'ignore-loader'
        }
      ]
    };
    
    return config;
  },
  // Exclude test directories from being processed
  outputFileTracingExcludes: {
    '*': [
      'node_modules/pdf-parse/test/**/*',
      '**/test/**/*'
    ]
  }
};

export default nextConfig;

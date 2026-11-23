import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  build: {
    target: "es2020",
    minify: "esbuild",
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('@capacitor') || id.includes('@capgo') || id.includes('@aparajita')) return 'vendor-capacitor';
            if (id.includes('qrcode')) return 'vendor-qr';
            return 'vendor';
          }
        },
      },
    },
  },
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  esbuild: { drop: ["console", "debugger"], legalComments: "none" },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  }
});
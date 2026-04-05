import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/EduLance1/',
    plugins: [tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'index.html'),
          login: path.resolve(__dirname, 'login.html'),
          register: path.resolve(__dirname, 'register.html'),
          freelancer_profile: path.resolve(__dirname, 'freelancer_profile.html'),
          client_profile: path.resolve(__dirname, 'client_profile.html'),
          admin_dashboard: path.resolve(__dirname, 'admin_dashboard.html'),
          projects: path.resolve(__dirname, 'projects.html'),
          matched_projects: path.resolve(__dirname, 'matched_projects.html'),
          public_profile: path.resolve(__dirname, 'public_profile.html'),
        },
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});

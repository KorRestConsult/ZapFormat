import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/ZapFormat/dist/',
  plugins: [react()],
});

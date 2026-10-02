import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages는 /<repo>/ 하위 경로로 서빙된다. 라우터가 없으므로 상대 경로로 충분하다.
  base: './',
  plugins: [react()],
});

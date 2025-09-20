import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const GH_PAGES_BASE_PATH = '/portuguese-phrase-reorder-game/'

export default defineConfig({
  plugins: [react()],
  base: GH_PAGES_BASE_PATH,
})

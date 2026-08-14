import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true // нужно, чтобы Telegram мог достучаться до dev-сервера через ngrok/туннель
  }
})

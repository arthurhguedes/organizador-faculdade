import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// pdfjs-dist chama `Promise.withResolvers()` dentro do worker de PDF, ausente
// no Safari/WebKit do iOS abaixo da 17.4 (mar/2024) — sem isso a leitura de
// PDF (histórico/matrícula/plano de ensino/matriz curricular) quebra nesses
// aparelhos. O worker roda num escopo global separado da thread principal
// (que já tem o mesmo polyfill via src/lib/pdfCompatPolyfill.ts), então
// precisa ser injetado de novo aqui, como o primeiro código do bundle do
// worker — ver frontend/src/lib/pdfCompatPolyfill.ts.
const promiseWithResolversPolyfillBanner = `if(typeof Promise.withResolvers!=="function"){Promise.withResolvers=function(){let resolve,reject;const promise=new Promise(function(res,rej){resolve=res;reject=rej});return{promise:promise,resolve:resolve,reject:reject}}}`;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  worker: {
    rollupOptions: {
      output: {
        banner: promiseWithResolversPolyfillBanner,
      },
    },
  },
})

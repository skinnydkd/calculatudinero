// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://calculatudinero.es',
  output: 'static',
  integrations: [preact(), sitemap()],
  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
  },
});

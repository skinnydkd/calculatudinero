// @ts-check
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const lastModCache = new Map();

function gitLastMod(relFile) {
  if (lastModCache.has(relFile)) return lastModCache.get(relFile);
  let result;
  try {
    const iso = execSync(`git log -1 --format=%cI -- "${relFile.replace(/\\/g, '/')}"`, {
      cwd: __dirname,
      encoding: 'utf8',
    }).trim();
    result = iso || new Date().toISOString();
  } catch {
    result = new Date().toISOString();
  }
  lastModCache.set(relFile, result);
  return result;
}

function blogLastMod(slug) {
  const relFile = path.join('src', 'content', 'blog', `${slug}.md`);
  try {
    const fm = readFileSync(path.join(__dirname, relFile), 'utf8').match(/^---\n([\s\S]*?)\n---/);
    if (fm) {
      const lastUpdated = fm[1].match(/^lastUpdated:\s*"?([^"\n]+)"?/m)?.[1]?.trim();
      const date = fm[1].match(/^date:\s*"?([^"\n]+)"?/m)?.[1]?.trim();
      const chosen = lastUpdated || date;
      if (chosen) {
        const d = new Date(chosen);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
    }
  } catch {}
  return gitLastMod(relFile);
}

function findDynamicRoute(relDir) {
  try {
    const dyn = readdirSync(path.join(__dirname, relDir))
      .find((e) => e.startsWith('[') && e.endsWith('.astro'));
    return dyn ? path.join(relDir, dyn) : null;
  } catch {
    return null;
  }
}

function resolvePageFile(pathname) {
  const cleaned = pathname.replace(/^\/|\/$/g, '');
  if (!cleaned) return path.join('src', 'pages', 'index.astro');

  const direct = path.join('src', 'pages', `${cleaned}.astro`);
  if (existsSync(path.join(__dirname, direct))) return direct;

  const indexFile = path.join('src', 'pages', cleaned, 'index.astro');
  if (existsSync(path.join(__dirname, indexFile))) return indexFile;

  const segments = cleaned.split('/');
  const parentDir = path.join('src', 'pages', ...segments.slice(0, -1));
  return findDynamicRoute(parentDir);
}

function lastModForUrl(url) {
  const pathname = new URL(url).pathname;
  const segments = pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean);

  if (segments[0] === 'blog' && segments.length === 2) {
    return blogLastMod(segments[1]);
  }

  const file = resolvePageFile(pathname);
  return file ? gitLastMod(file) : new Date().toISOString();
}

// https://astro.build/config
export default defineConfig({
  site: 'https://calculatudinero.net',
  output: 'static',
  integrations: [
    preact(),
    sitemap({
      serialize(item) {
        return { ...item, lastmod: lastModForUrl(item.url) };
      },
    }),
  ],
  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
  },
});

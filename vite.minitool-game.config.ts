import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { name: string; version: string };

function classicScriptHtml(): Plugin {
  return {
    name: 'xdrate-game-minitool-classic-script-html',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlAsset = bundle['index.html'];
      if (htmlAsset?.type !== 'asset')
        throw new Error('Game MiniTool build did not emit index.html.');
      const html = String(htmlAsset.source)
        .replace(/\s+type="module"/g, '')
        .replace(/\s+crossorigin(?=[\s>])/g, '')
        .replace(/<script(?=[^>]*\bsrc=)/g, '<script defer');
      if (/type=["']module["']/i.test(html))
        throw new Error('Game MiniTool index.html still contains a module script.');
      htmlAsset.source = html;
    },
  };
}

function miniToolGameDevSourcePath(): Plugin {
  const sourceEntry = resolve(import.meta.dirname, 'src/minitool-game/main.tsx').replace(
    /\\/g,
    '/',
  );
  return {
    name: 'xdrate-game-minitool-dev-source-path',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!ctx.server) return html;
        return html.replace('../src/minitool-game/main.tsx', `/@fs/${sourceEntry}`);
      },
    },
  };
}

function removeBlockedRuntimeProbes(): Plugin {
  return {
    name: 'xdrate-game-minitool-remove-blocked-runtime-probes',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        output.code = output.code.replace(/navigator\.connection/g, 'null');
        if (/navigator\.connection/.test(output.code))
          throw new Error('Game MiniTool still reads navigator.connection.');
      }
    },
  };
}

function replaceNetworkOnlyExportHelper(): Plugin {
  return {
    name: 'xdrate-game-minitool-inline-export-resources',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const helper = `function __xdrateMiniToolFetch(url){return Promise.resolve({status:200,url:url,headers:{get:function(){return ''}},blob:function(){var comma=url.indexOf(',');var meta=url.slice(0,comma);var payload=url.slice(comma+1);var binary=meta.indexOf(';base64')>=0?atob(payload):decodeURIComponent(payload);var bytes=new Uint8Array(binary.length);for(var i=0;i<binary.length;i+=1)bytes[i]=binary.charCodeAt(i);var mime=(meta.match(/^data:([^;]+)/)||[])[1]||'application/octet-stream';return Promise.resolve(new Blob([bytes],{type:mime}));},text:function(){var comma=url.indexOf(',');return Promise.resolve(comma<0?'':decodeURIComponent(url.slice(comma+1)));}});}`;
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') continue;
        output.code = `${helper}${output.code}`
          .replace(/\bfetch\s*\(/g, '__xdrateMiniToolFetch(')
          .replace(/https:\/\/tailwindcss\.com/g, 'xdrate-tailwind-doc')
          .replace(/https:\/\/react\.dev\/errors\//g, 'xdrate-react-error-')
          .replace(/http:\/\/www\.w3\.org\/1999\/xhtml/g, 'http' + '://www.w3.org/1999/xhtml');
      }
    },
  };
}

export default defineConfig({
  root: resolve(import.meta.dirname, 'minitool-game'),
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    miniToolGameDevSourcePath(),
    removeBlockedRuntimeProbes(),
    replaceNetworkOnlyExportHelper(),
    classicScriptHtml(),
  ],
  define: {
    __APP_NAME__: JSON.stringify(`${packageJson.name}-game-minitool`),
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    outDir: resolve(import.meta.dirname, 'dist-minitool-game'),
    emptyOutDir: true,
    target: ['es2017', 'chrome61'],
    cssTarget: 'chrome61',
    cssMinify: false,
    sourcemap: false,
    modulePreload: false,
    assetsInlineLimit: 200000,
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'XDRateGameMiniTool',
        entryFileNames: 'assets/app.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});

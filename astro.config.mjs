import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
// hybrid: الصفحات ثابتة (prerender) إلا اللي كاتبين فيها `export const prerender = false` (الطلبات والأدمن)
export default defineConfig({
  site: 'https://example.dz',
  output: 'hybrid',
  adapter: node({ mode: 'standalone' }),
});

import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import lyra from '@lyra/vite-plugin';

export default defineConfig({ plugins: [preact(), lyra()] });

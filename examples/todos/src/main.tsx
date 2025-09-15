import { render } from 'preact';
import Index from './app/routes/index.lyra.tsx';
import { mount } from '@lyra/runtime';

const root = document.getElementById('app')!;
render(<Index />, root);
mount(root);

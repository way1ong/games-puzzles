// Blocks: entry point of the page.
import './styles/tokens.css';
import './styles/app.css';
import { startApp } from './ui/app.ts';

const root = document.getElementById('app');
if (root) startApp(root);

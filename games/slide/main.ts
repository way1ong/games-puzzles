// Slide: entry point of the page.
import './styles/tokens.css';
import '../../shared/styles/ui.css';
import './styles/app.css';
import { startApp } from './ui/app.ts';
import { watchInstall } from '../../shared/ui/install.ts';
import { keepOffline } from '../../shared/ui/offline.ts';

watchInstall();
keepOffline();
const root = document.getElementById('app');
if (root) startApp(root);

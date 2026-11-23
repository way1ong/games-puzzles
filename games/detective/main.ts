// Detective: entry point of the page.
import './styles/tokens.css';
import '../../shared/styles/ui.css';
import './styles/app.css';
import { watchInstall } from '../../shared/ui/install.ts';
import { keepOffline } from '../../shared/ui/offline.ts';
import { startApp } from './ui/app.ts';

watchInstall();
keepOffline();
const root = document.getElementById('app');
if (root) startApp(root);

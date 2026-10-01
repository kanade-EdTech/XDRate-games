import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { GameApp } from '../app/GameApp';
import { I18nProvider } from '../i18n/I18nProvider';
import '../styles/index.css';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('The game MiniTool root element is missing.');
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nProvider>
      <GameApp cardSurface="minitool" />
    </I18nProvider>
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { QueryProvider } from './components/QueryProvider';
import { ToastProvider } from './components/ToastProvider';
import { I18nProvider } from './i18n-context';
import './styles/main.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <QueryProvider>
        <I18nProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </I18nProvider>
      </QueryProvider>
    </BrowserRouter>
  </StrictMode>,
);

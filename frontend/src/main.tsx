import { startTransition, StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { QueryProvider } from './components/QueryProvider';
import { ToastProvider } from './components/ToastProvider';
import { I18nProvider } from './i18n-context';
import { initAnalytics } from './lib/analytics';
import './styles/main.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element not found');
}

initAnalytics();

const app = (
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
  </StrictMode>
);

// Prerendered pages already contain the full markup. Hydrating preserves the
// hero image and headings as LCP candidates instead of destroying and repainting
// them once the bundle arrives.
if (container.dataset.prerenderRoute) {
  // Keep hydration interruptible so the prerendered hero can paint before React
  // finishes attaching handlers to the rest of the page.
  startTransition(() => {
    hydrateRoot(container, app);
  });
} else {
  createRoot(container).render(app);
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { hydrateSession } from './lib/mockApi';
import './styles/global.css';

async function bootstrap() {
  try {
    await hydrateSession();
  } catch {
    // Initial render should still proceed; pages handle missing session.
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
}

void bootstrap();
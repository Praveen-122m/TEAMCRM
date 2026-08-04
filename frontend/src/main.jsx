import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ConfirmProvider } from './context/ConfirmContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <ThemeProvider>
            <ConfirmProvider>
              <App />
            </ConfirmProvider>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'rgb(var(--color-bg-card))',
                  color: 'rgb(var(--color-text))',
                  border: '1px solid rgb(var(--color-border))',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: 'rgb(var(--color-bg-card))',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: 'rgb(var(--color-bg-card))',
                  },
                },
              }}
            />
          </ThemeProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './styles/index.css';
import { AuthProvider } from './context/AuthContext';
import { PatientProvider } from './context/PatientContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <PatientProvider>
        <App />
      </PatientProvider>
    </AuthProvider>
  </StrictMode>,
);

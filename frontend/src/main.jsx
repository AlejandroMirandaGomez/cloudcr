import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ColorModeProvider } from './common/context/ColorModeContext.jsx';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ColorModeProvider>
      <App />
    </ColorModeProvider>
  </StrictMode>,
);

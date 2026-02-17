import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import LandingDemo from './pages/LandingDemo';

const demoRoot = document.getElementById('demo-root');

if (demoRoot) {
  ReactDOM.createRoot(demoRoot).render(
    <React.StrictMode>
      <LandingDemo />
    </React.StrictMode>
  );
}

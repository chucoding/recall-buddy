import React from 'react';
import ReactDOM from 'react-dom/client';
import LandingDemo from './pages/LandingDemo';
import './pages/Landing.css';

const demoRoot = document.getElementById('demo-root');

if (demoRoot) {
  ReactDOM.createRoot(demoRoot).render(
    <React.StrictMode>
      <LandingDemo />
    </React.StrictMode>
  );
}

import React from "react";
import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App.tsx";
import "./index.css";

// Declare APP_BUILD_ID injected by Vite
declare const APP_BUILD_ID: string;

// Anti-cache mechanism to force hard reload on new deployments
const storedBuildId = localStorage.getItem('APP_BUILD_ID');
if (storedBuildId && storedBuildId !== APP_BUILD_ID) {
  console.log(`New version detected! Reloading... (${storedBuildId} -> ${APP_BUILD_ID})`);
  
  // Clear all localStorage EXCEPT Supabase auth tokens (which usually start with 'sb-')
  const keysToKeep = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sb-')) {
      keysToKeep.push({ key, value: localStorage.getItem(key) });
    }
  }
  
  localStorage.clear();
  
  // Restore Supabase keys
  keysToKeep.forEach(({ key, value }) => {
    if (value) localStorage.setItem(key, value);
  });
  
  localStorage.setItem('APP_BUILD_ID', APP_BUILD_ID);
  
  setTimeout(() => {
    window.location.reload();
  }, 100);
} else {
  // First visit or same version
  localStorage.setItem('APP_BUILD_ID', APP_BUILD_ID);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

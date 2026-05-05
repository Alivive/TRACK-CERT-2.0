// Keep Render backend awake by pinging it every 10 minutes
// Run this with: node keep-alive.js

const BACKEND_URL = 'https://track-cert-2-0.onrender.com/health';
const INTERVAL = 10 * 60 * 1000; // 10 minutes

async function ping() {
  try {
    const response = await fetch(BACKEND_URL);
    const data = await response.json();
    console.log(`[${new Date().toLocaleTimeString()}] ✅ Backend is awake:`, data.message);
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] ❌ Ping failed:`, error.message);
  }
}

console.log('🚀 Keep-alive service started');
console.log(`📍 Pinging: ${BACKEND_URL}`);
console.log(`⏰ Interval: Every 10 minutes\n`);

// Ping immediately
ping();

// Then ping every 10 minutes
setInterval(ping, INTERVAL);

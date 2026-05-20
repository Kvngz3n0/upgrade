import axios from 'axios';

const envBase = import.meta.env.VITE_API_BASE_URL?.trim();
const isCapacitorNative = typeof window !== 'undefined' && !!(window as any).Capacitor;
const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
const webBase = '/api';
const androidEmulatorBase = 'http://10.0.2.2:5000';

function resolveApiBaseUrl() {
  if (envBase) {
    return envBase;
  }

  if (isCapacitorNative) {
    // Use Android emulator loopback when running as a native app.
    if (isAndroid) {
      return androidEmulatorBase;
    }

    // For iOS or physical devices, provide a custom API URL with VITE_API_BASE_URL.
    return webBase;
  }

  return webBase;
}

export const API_BASE_URL = resolveApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export function getApiBaseUrl() {
  return API_BASE_URL;
}

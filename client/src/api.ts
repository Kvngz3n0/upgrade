import axios from 'axios';

const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
const isNativeApp = typeof window !== 'undefined' && window.location.protocol === 'capacitor:';

const webBase = '/api';
const androidEmulatorBase = 'http://10.0.2.2:5000';

export const API_BASE_URL = envBase || (isNativeApp ? androidEmulatorBase : webBase);

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

import { contextBridge } from 'electron';

// Scaffold stage: no IPC surface defined yet. The real API (case profile
// submit, agent progress events, API key management, etc.) lands alongside
// src/shared/types.ts once the IPC contract is designed post sign-off.
const api = {
  appName: 'carryover',
};

export type CarryoverApi = typeof api;

contextBridge.exposeInMainWorld('carryover', api);

import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type AgentProgress, type CaseProfile, type HandoutDraft } from '@shared/types';

const api = {
  hasApiKey: (): Promise<boolean> => ipcRenderer.invoke(IPC.hasApiKey),
  setApiKey: (key: string): Promise<void> => ipcRenderer.invoke(IPC.setApiKey, key),
  clearApiKey: (): Promise<boolean> => ipcRenderer.invoke(IPC.clearApiKey),
  draftHandout: (profile: CaseProfile): Promise<HandoutDraft> => ipcRenderer.invoke(IPC.draftHandout, profile),
  getHistory: (): Promise<HandoutDraft[]> => ipcRenderer.invoke(IPC.history),
  clearHistory: (): Promise<void> => ipcRenderer.invoke(IPC.clearHistory),
  signOff: (draft: HandoutDraft): Promise<HandoutDraft> => ipcRenderer.invoke(IPC.signOff, draft),
  onAgentProgress: (callback: (progress: AgentProgress) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: AgentProgress) => callback(progress);
    ipcRenderer.on(IPC.agentProgress, listener);
    return () => ipcRenderer.removeListener(IPC.agentProgress, listener);
  },
};

export type CarryoverApi = typeof api;

contextBridge.exposeInMainWorld('carryover', api);

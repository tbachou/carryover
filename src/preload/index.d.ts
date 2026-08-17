import type { CarryoverApi } from './index';

declare global {
  interface Window {
    carryover: CarryoverApi;
  }
}

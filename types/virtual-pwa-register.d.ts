// types/virtual-pwa-register.d.ts
declare module 'virtual:pwa-register' {
    export interface RegisterSWOptions {
      immediate?: boolean;
      onNeedRefresh?: () => void;
      onOfflineReady?: () => void;
    }
  
    // Overload for options-only usage.
    export function registerSW(opts: RegisterSWOptions): void;
    // Overload for offering a custom SW URL.
    export function registerSW(swUrl: string, opts?: RegisterSWOptions): void;
  }
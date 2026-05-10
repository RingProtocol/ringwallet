const isBrowser = typeof window !== 'undefined';

const ENABLED =
  isBrowser &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === 'bridget-tritheistical-talia.ngrok-free.dev');

export function log(message: string, ...args: any[]): void {
  if (ENABLED) {
    console.log(message, ...args);
  }
}

export function error(message: string, ...args: any[]): void {
  if (ENABLED) {
    console.error(message, ...args);
  }
}

export function warn(message: string, ...args: any[]): void {
  if (ENABLED) {
    console.warn(message, ...args);
  }
}

export function info(message: string, ...args: any[]): void {
  if (ENABLED) {
    console.info(message, ...args);
  }
}

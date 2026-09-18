/// <reference types="vite/client" />

declare module "@tanstack/react-start/server" {
  export function getRequest(): Request;
  export function getCookie(name: string): string | undefined;
  export function setCookie(name: string, value: string, opts?: any): void;
  export function deleteCookie(name: string, opts?: any): void;
  export function createServerCallback(...args: any[]): any;
  export function registerServerCallback(...args: any[]): any;
}

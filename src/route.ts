import type { HashRouteInfo } from './types.ts';

/**
 * Splits a location hash on `&` so compound fragments such as `#vault&bartender`
 * or `#session-id&bartender` preserve both navigation target and bartender mode.
 */
export function parseHash(hash: string): HashRouteInfo {
  const raw = hash.replace(/^#/, '');
  const parts = raw ? raw.split('&').filter(Boolean) : [];
  const hasBartender = parts.includes('bartender');
  const target = parts.find((part) => part !== 'bartender') ?? '';
  return { raw, parts, target, hasBartender };
}

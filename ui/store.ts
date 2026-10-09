// What the demo remembers between reloads, kept in this browser's local storage and nowhere else.
// Every read and write is guarded: in a private window or with storage blocked, the app still works
// and simply forgets on reload.

import { useCallback, useEffect, useState } from 'react';

const PREFIX = 'handback.v2.';

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the state lives until the page is closed.
  }
}

/** useState that survives a reload. */
export function usePersisted<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readStored(key, initial));
  useEffect(() => writeStored(key, value), [key, value]);
  const set = useCallback((v: T | ((prev: T) => T)) => setValue(v), []);
  return [value, set];
}

'use strict';

/**
 * Node pode expor `globalThis.localStorage` inválido quando `--localstorage-file`
 * está em NODE_OPTIONS sem path válido — `getItem` deixa de ser função e o SSR quebra.
 * Substitui por um Storage em memória só nesse caso.
 */
(function patchBrokenLocalStorage() {
  try {
    const ls = globalThis.localStorage;
    if (ls == null) return;
    if (typeof ls.getItem === 'function' && typeof ls.setItem === 'function') return;

    const map = new Map();
    const store = {
      getItem(k) {
        const key = String(k);
        return map.has(key) ? map.get(key) : null;
      },
      setItem(k, v) {
        map.set(String(k), String(v));
      },
      removeItem(k) {
        map.delete(String(k));
      },
      clear() {
        map.clear();
      },
      key(i) {
        const keys = [...map.keys()];
        return i >= 0 && i < keys.length ? keys[i] : null;
      },
    };
    Object.defineProperty(store, 'length', {
      get() {
        return map.size;
      },
      enumerable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, 'localStorage', {
      value: store,
      configurable: true,
      enumerable: true,
      writable: true,
    });
  } catch {
    // ignore
  }
})();

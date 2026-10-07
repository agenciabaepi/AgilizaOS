/**
 * Node pode expor `globalThis.localStorage` inválido (ex.: `--localstorage-file` sem path).
 * Processos workers do Next também precisam do shim (não só o carregamento do next.config).
 * Mesma lógica de scripts/node-localstorage-shim.cjs, mas inline: require dinâmico de
 * arquivo externo não é resolvido no build de produção.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const ls = (globalThis as any).localStorage;
    if (ls == null) return;
    if (typeof ls.getItem === 'function' && typeof ls.setItem === 'function') return;

    const map = new Map<string, string>();
    const store = {
      getItem: (k: string) => (map.has(String(k)) ? map.get(String(k))! : null),
      setItem: (k: string, v: string) => void map.set(String(k), String(v)),
      removeItem: (k: string) => void map.delete(String(k)),
      clear: () => map.clear(),
      key: (i: number) => [...map.keys()][i] ?? null,
      get length() {
        return map.size;
      },
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: store,
      configurable: true,
      enumerable: true,
      writable: true,
    });
  } catch {
    // ignore
  }
}

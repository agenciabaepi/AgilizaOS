/**
 * Node pode expor `globalThis.localStorage` inválido (ex.: `--localstorage-file` sem path).
 * Processos workers do Next também precisam do shim (não só o carregamento do next.config).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require(`${process.cwd()}/scripts/node-localstorage-shim.cjs`);
}

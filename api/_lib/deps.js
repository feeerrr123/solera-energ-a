// Las dependencias "de verdad" de los endpoints. Cada endpoint es una fábrica que las recibe,
// para poder probarlos con un repositorio en memoria (tests/api.test.mjs) sin Supabase.

import { modoDemo, adminListo, noticiasListo, n8nListo, cfg, fotoPrefijo } from './config.js'
import { repoSupabase } from './repo.js'

export const depsReales = {
  modoDemo,
  adminListo,
  secret: () => cfg.adminSecret,
  password: () => cfg.adminPassword,
  noticiasListo,
  tokenNoticias: () => cfg.noticiasToken,
  n8nListo,
  tokenN8n: () => cfg.n8nToken,
  fotoPrefijo,
  repo: repoSupabase,
  ahora: () => Date.now(),
  esperar: (ms) => new Promise((r) => setTimeout(r, ms)),
}

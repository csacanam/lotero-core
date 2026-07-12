# TODO — crecimiento y distribución para agentes

Contexto: Lotero tiene el x402 más canónico del portafolio (pago → spin ejecutado) y el único canal agente-a-agente real (Virtuals ACP), pero era el más débil en descubrimiento estándar. Estado al 12 jul 2026. Hecho ya: ✅ skill instalable (`npx skills add csacanam/lotero-core`), ✅ skill.md web en lotero.xyz/skill.md, ✅ llms.txt.

## Distribución

- [ ] **Demo en X**: agente jugando un spin completo (spin → poll → claim) con output real y `npx skills add csacanam/lotero-core` en el post.
- [ ] **Listar en el Bazaar de CDP** — ya usamos el facilitator de Coinbase (`api.cdp.coinbase.com`), estar en su índice de recursos x402 es el canal natural. Revisar `@x402/extensions` (bazaar) que ya está en node_modules pero sin usar.
- [ ] Índices x402 (x402scan, awesome-x402).
- [ ] Registro ERC-8004 (opcional): el registry `0x8004A169…` existe en Base con la misma dirección; daría perfil en 8004scan. Modelo: el de comprabtc (`metadata.json` + `.well-known` + `register(string)`).
- [ ] Enlazar `/skill.md` y `/llms.txt` desde la página `for-agents.tsx` (hoy solo tiene el LLM_PROMPT copiable).

## Hallazgos del test de claridad con agente fresco (12 jul — skill ya corregido)

- [x] MCP server construido y probado (12 jul): `mcp/` con 5 tools (spin/claim x402, get_round, get_balances, get_contract_health) y **límite de spins por sesión ejecutable** (LOTERO_MAX_SPINS_PER_SESSION, default 10) como guardrail. `player` default = wallet del humano.
- [x] `lotero-mcp@0.1.0` PUBLICADO (12 jul): npm (cold-install npx verificado) + registro MCP oficial (`io.github.csacanam/lotero`). Instalación: `claude mcp add lotero -- npx -y lotero-mcp`.

- [x] Política de VRF sin resolver (12 jul): `/round` ahora incluye `pending.vrfSubscriptionFunded` en rondas no resueltas + política oficial en DOCS/AGENT_API.md (el requestId nunca caduca; re-poll, no re-spin).
- [x] 500 tras pago liquidado (12 jul): respuesta con `paymentNote` + alerta Telegram ops automática con payer extraído del X-PAYMENT + política de reembolso manual documentada.
- [ ] Reembolso automático on-chain de ejecuciones fallidas post-pago (hoy: manual desde el Executor, con alerta ops).

## Producto

- [x] 🐛 RESUELTO (12 jul): los 500 de `/contract/health` y `/balances` eran ráfagas concurrentes contra el RPC público (primario Alchemy agotado → fallback throttleando 429). Fix en `baseProvider.js`: cola de concurrencia global + freno post-429 + fail-fast en reverts + reintentos extendidos. Reproducido localmente, deployado y verificado: health=200 en producción. Complemento: Camilo agrega key de RPC nueva al BASE_RPC.

- [ ] Frontend incompleto (marcado en README) — decidir si terminarlo o abrazar "API-first para agentes" como posicionamiento.

## Mantenimiento

- [ ] Skill duplicado: `skills/lotero/SKILL.md` ↔ `packages/frontend/public/skill.md`. Al editar uno, copiar al otro.

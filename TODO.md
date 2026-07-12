# TODO — crecimiento y distribución para agentes

Contexto: Lotero tiene el x402 más canónico del portafolio (pago → spin ejecutado) y el único canal agente-a-agente real (Virtuals ACP), pero era el más débil en descubrimiento estándar. Estado al 12 jul 2026. Hecho ya: ✅ skill instalable (`npx skills add csacanam/lotero-core`), ✅ skill.md web en lotero.xyz/skill.md, ✅ llms.txt.

## Distribución

- [ ] **Demo en X**: agente jugando un spin completo (spin → poll → claim) con output real y `npx skills add csacanam/lotero-core` en el post.
- [ ] **Listar en el Bazaar de CDP** — ya usamos el facilitator de Coinbase (`api.cdp.coinbase.com`), estar en su índice de recursos x402 es el canal natural. Revisar `@x402/extensions` (bazaar) que ya está en node_modules pero sin usar.
- [ ] Índices x402 (x402scan, awesome-x402).
- [ ] Registro ERC-8004 (opcional): el registry `0x8004A169…` existe en Base con la misma dirección; daría perfil en 8004scan. Modelo: el de comprabtc (`metadata.json` + `.well-known` + `register(string)`).
- [ ] Enlazar `/skill.md` y `/llms.txt` desde la página `for-agents.tsx` (hoy solo tiene el LLM_PROMPT copiable).

## Producto

- [ ] Frontend incompleto (marcado en README) — decidir si terminarlo o abrazar "API-first para agentes" como posicionamiento.

## Mantenimiento

- [ ] Skill duplicado: `skills/lotero/SKILL.md` ↔ `packages/frontend/public/skill.md`. Al editar uno, copiar al otro.

# Deploy Lotero Agent to DigitalOcean App Platform

## Configuration

| Setting | Value |
|--------|--------|
| **Source Directory** | (leave empty = repo root) |
| **Build Command** | (default: `npm install`) |
| **Run Command** | `npm run start:agent` |

The agent runs from the monorepo root so Node can find `node_modules`. Use `start:agent` instead of `npm start` (which runs the frontend).

## Environment Variables

Set in DigitalOcean → App → Components → your-service → Environment Variables.

See [packages/agent/.env.example](../packages/agent/.env.example) for the full list. Required: `SLOT_MACHINE_ADDRESS`, `EXECUTOR_PRIVATE_KEY`, `PAY_TO`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`.

## Alternative: Source Directory = packages/agent

If you prefer to deploy only the agent folder:

| Setting | Value |
|--------|--------|
| **Source Directory** | `packages/agent` |
| **Run Command** | `npm start` |

This uses only the agent's `package.json` and installs deps in that folder. Simpler but requires DO to support Source Directory for your component type.

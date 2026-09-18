# TraceOps UI

React + TypeScript + Vite frontend for TraceOps.

The UI calls the local TraceOps API for:

- deterministic scenarios
- registry-derived tool metadata
- investigation execution results

Run during development:

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Vite proxies `/api` to `http://localhost:8787` in development. Set `VITE_TRACEOPS_API_URL` when the API is hosted elsewhere.

The UI displays the objective, execution budget, stop reason, trace timeline, tool results/errors, collected evidence, registered tools, and final conclusion. It intentionally separates operational trace, observed evidence, and the agent conclusion, and it does not display hidden chain-of-thought or server-side secrets.

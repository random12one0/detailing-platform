# detailing-platform

Car-detailing booking site + admin dashboard, being generalized from a
single-business build into a multi-tenant platform.

## Frontend design rules

- All colors, radii, shadows, and type come from the tokens in
  `frontend/src/index.css`.
- Never write raw utility colors (`text-white`, `bg-slate-900`) in
  components.
- Never override shadcn components inline — add a variant instead.
- Use shadcn blocks for page sections rather than hand-building layouts.
- The `shadcn` MCP server (see `.mcp.json`) is available for browsing and
  adding shadcn/ui components and blocks — use it instead of hand-rolling
  components that shadcn already provides.

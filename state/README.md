# State

This directory holds the runtime state of the migration. **Do not commit `manifest.jsonl` or `failures.jsonl`** — they contain workspace data.

- `manifest.jsonl` — append-only log of every successful migration event. One JSON object per line.
- `failures.jsonl` — append-only log of failures. Use for retry runs.

If you need to start over for a single project, filter or rotate the manifest rather than deleting it. The manifest is your audit trail.

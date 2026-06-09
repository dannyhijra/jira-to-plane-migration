# Jira form screenshots → n8n workflows

Drop screenshots of each Jira (ProForma) form here, one folder per form, then run
`/migrate-form <JIRA_PROJECT_KEY> forms/<folder>`.

The form is **not** API-readable (Jira MCP has no form tools; the Forms REST API needs
OAuth; the internal ProForma gateway rejects API tokens). So screenshots are the source.

## Convention

```
forms/<PROJECT>-<formslug>/
  01-form.png          # the whole form (all fields, required * markers, help text)
  02-<dropdown>.png    # each dropdown EXPANDED so every option is visible
  ...
```

Capture for every field: exact label, type, the red `*` (required), help text, and all
dropdown options. Keep labels/options in the original language — they are not translated.

Generated workflows land in `../n8n/<slug>.workflow.json` (built by `../n8n/build_<slug>_workflow.py`).
Reference example: `../n8n/build_hlrs_sp3_workflow.py` (HLRS / Jira form 63).

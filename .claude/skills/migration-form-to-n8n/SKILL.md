---
name: migration-form-to-n8n
description: Turn a Jira (ProForma) intake form into an importable n8n workflow JSON whose Form Trigger submission creates a Plane work item via API. Use when running /migrate-form, or any time you need to convert a Jira form (provided as screenshots in a folder) into an n8n Form Trigger → Code → HTTP (Plane create) → Form-completion workflow. Covers the Jira-field → n8n-field mapping table, the Plane create-work-item payload conventions, the member-map assignee pattern, the build-via-Python rule, and the mandatory confirm-before-build gate.
---

# Jira form → n8n → Plane work item

Produce an **importable n8n workflow JSON** that serves a form mirroring a Jira (ProForma) intake form and, on submit, creates a Plane work item via the REST API.

The Jira form **cannot be read programmatically**: the Jira MCP exposes no form-definition tools, the official Forms REST API (`api.atlassian.com/jira/forms`) needs OAuth 3LO (rejects API tokens with 401), and the internal ProForma gateway (`/gateway/api/proforma/.../forms/{id}`) returns `insufficientPermission` for API-token basic auth even for a project admin (it wants a real browser-session JWT). **So the form is read from screenshots the user supplies in a folder.**

## Workflow shape (always the same 4 nodes + a sticky note)

```
On form submission (n8n-nodes-base.formTrigger, v2.2)
  → Map → Plane payload (n8n-nodes-base.code, v2, runOnceForEachItem)
  → Create Plane work item (n8n-nodes-base.httpRequest, v4.2, POST)
  → Form ending (n8n-nodes-base.form, v1, operation:completion)
+ READ ME sticky note (n8n-nodes-base.stickyNote) documenting placeholders
```

The completion node is fed by the HTTP node, so its `$json` is Plane's created work item: show `Created <IDENT>-{{ $json.sequence_id }} · <link>`.

## Hard rules

- **CONFIRM BEFORE BUILD.** First output a field inventory table (each Jira field → proposed n8n type) + the Plane payload mapping, then STOP for user confirmation. Never generate JSON before the user confirms. This is the user's stated "requirements-locked-then-build" preference.
- **Preserve form text verbatim** — labels, help text (→ placeholder), and dropdown options stay in the original language (usually Indonesian). Do NOT translate.
- **Required in Jira = `requiredField: true` in n8n.**
- **Build the JSON via a Python script** (`n8n/build_<slug>_workflow.py`) so embedded Code-node JS escapes correctly. End the script with `json.loads(text)` to validate, then write the file. After running, also `jq -e . <out>` as a second parse check.
- **Hardcoded placeholders for all secrets/IDs**: `YOUR_PLANE_BASE`, `PLANE_TARGET_PROJECT_ID`, `YOUR_PLANE_API_KEY`. Workspace slug `hijra` is a known constant — pre-fill it. Put the resolved target project UUID in the sticky note so the user can paste it.
- **Never set `created_by`** — Plane ignores it (see CLAUDE.md).
- The n8n task-runner sandbox **blocks `require('crypto')`** — this workflow needs none; just don't introduce it.

## Field-type mapping (Jira/ProForma → n8n formTrigger `fieldType`)

| Jira form field | n8n `fieldType` | Notes |
|---|---|---|
| Short text | `text` | help text → `placeholder` |
| Short text holding a URL/link | `text` | n8n has no URL type; render as `<a>` in description |
| Paragraph / long text | `textarea` | |
| Number | `number` | |
| Date / Date-time | `date` | Plane wants `YYYY-MM-DD` for target_date/start_date |
| Email | `email` | |
| Single choice / dropdown / radio | `dropdown` | options verbatim |
| Multiple choice / checkboxes | `dropdown` + `multiselect: true` | |
| **User picker** | `dropdown` of friendly member labels | **MANUAL**: no n8n user picker. Build a `MEMBER_MAP` (label→UUID) in the Code node from live Plane project members. Snapshot — refresh as members join. |
| **Attachment / file** | `file` | **MANUAL**: Plane create API takes no inline files. Capture filename only; real upload is a separate step. Flag in a code comment. |
| **Cascading select** | two linked `dropdown`s (or one) | **MANUAL**: n8n has no cascade. Flag in a code comment. |

n8n form dropdown options are a single string used as BOTH label and submitted value. For user pickers this means: show a friendly label (`Name (email)`) and resolve it to a UUID in the Code node via `MEMBER_MAP` — keep option strings byte-identical to map keys.

## Plane create-work-item payload conventions

Endpoint (trailing slash required): `POST {YOUR_PLANE_BASE}/api/v1/workspaces/hijra/projects/{PLANE_TARGET_PROJECT_ID}/issues/` — confirmed against `src/clients/plane.ts`. NOTE: on this self-hosted Plane the path is `/issues/`, NOT `/work-items/` (the latter 404s).
Header: `X-API-Key: {YOUR_PLANE_API_KEY}` + `Content-Type: application/json`.

| Plane field | Source |
|---|---|
| `name` (required) | a composed title — **ask the user for the format** (e.g. `SP3 {PILIHAN} – {NAMA NASABAH}`) |
| `description_html` | one `<p><strong>Field:</strong> …</p>` row per field, links rendered clickable (`<a href>`); builtin-date fields excluded; unresolved assignee captured here |
| `priority` | `urgent\|high\|medium\|low\|none`; if no priority field, `"none"` |
| `assignees` | `[uuid]` from the user-picker `MEMBER_MAP` (hit → set; miss → leave empty AND capture the chosen label in `description_html`, per migration-user-strategy) |
| `labels` | always-on form labels (`business-form` + `business-form-<jiraFormId>`) via spec `auto_label_ids`; plus optional choice-driven labels via `choice_label_field` + `choice_label_map` ({option → label UUID}, e.g. LRP `JENIS PENGIKATAN=NDA` → `NDA` label) |
| `state` | pin the intake state UUID (`state_id`) — never rely on the project default (some default to a completed state) |
| `target_date` / `start_date` | `YYYY-MM-DD` from date fields |

**Modules** (Plane create takes no module — needs a second call): if a project has modules whose names match a dropdown's options (e.g. ARH `KEPERLUAN ANYUR` → modules PEMBIAYAAN/PENDANAAN/KERJA SAMA), set spec `module_field` + `module_map` ({option → module UUID}). The builder adds an "Add to module" HTTP node (`POST .../modules/{id}/module-issues/` body `{issues:[id]}`, continue-on-fail) after create. Fetch labels/modules/states per project via the REST API with `X-API-Key` + the `CF_Authorization` cookie (the MCP often 500s on Cloudflare).

Do not auto-resolve emails → UUIDs without a member map. The `MEMBER_MAP` (built from live Plane members) IS that map for the user-picker case.

## Procedure

1. **Resolve target project**: `list_projects` (Plane MCP), match the Jira project key to a Plane project `identifier`; capture its UUID. `get_project_members` for that project → build the `MEMBER_MAP` for any user-picker field.
2. **Read every screenshot** in the supplied folder (vision). Extract per field: exact label, type, required marker (red `*`), help text, and ALL dropdown options (ask the user to expand truncated dropdowns).
3. **Present** the field inventory table + Plane payload mapping + the standard decisions, then **STOP**:
   - title (`name`) format
   - user-picker → assignee (MEMBER_MAP) vs capture-only
   - any link fields: `text` vs `textarea`
   - any choice field → description vs Plane label
4. **On confirmation**, write the spec to `n8n/specs/<slug>.json` and run the generic builder: `python3 n8n/build_form_workflow.py n8n/specs/<slug>.json` → emits `n8n/<slug>.workflow.json` (it `json.loads`-validates before writing).
5. **Report** the output path, the placeholders to fill, and the member-snapshot caveat.

## Builder (generic, spec-driven)

`n8n/build_form_workflow.py` turns a spec JSON into the workflow — do NOT hand-write per-form Python or per-form JS. One data-driven Code-node body serves every form; only the spec varies. The spec shape is documented at the top of that file; key fields: `slug`, `workflow_name`, `form_title`, `project_identifier`, `project_uuid`, `title_template` (with `{FIELD LABEL}` tokens), `assignee_field` (or `""`), `member_map`, `date_mappings`, `fields[]` (`label`, `n8n_type`, `required`, `placeholder`, `options[]`, `multiselect`, `is_link`), `manual_flags[]`. The builder auto-fills the assignee field's dropdown options from `member_map` and renders the sticky note.

Decode HTML entities (`&amp;` → `&`, via `html.unescape`) in labels/options/placeholders before writing the spec — vision extraction tends to HTML-encode `&`.

Worked references: every form is spec-driven — see `n8n/specs/*.json` (e.g. `hlrs-sp3-form-to-plane.json`). Conventions: title_template is the single primary/identifying field directly (e.g. `{NAMA NASABAH}`), NOT a `category – name` composite; category/choice fields land in the description; no tool-attribution footer in the description.

Related: [migration-user-strategy](../migration-user-strategy/SKILL.md) (assignee/author capture rules), CLAUDE.md (MCP defaults, Plane payload don'ts).

#!/usr/bin/env python3
"""Build the n8n workflow JSON for: HIJRA-LEGAL REVIEW SP3 (Jira form 63) -> Plane work item.

Run:  python3 n8n/build_hlrs_sp3_workflow.py
Emits: n8n/hlrs-sp3-form-to-plane.workflow.json  (importable into n8n)

All secrets/IDs are hardcoded PLACEHOLDERS (see the sticky note in the workflow):
  - YOUR_PLANE_BASE            -> self-hosted Plane host, e.g. https://plane.example.com
  - PLANE_TARGET_PROJECT_ID    -> 6328c439-cf0b-4e44-b779-73c82201fa29  (HLRS / "Legal Review SP3")
  - YOUR_PLANE_API_KEY         -> Plane API token (X-API-Key)
  - workspace slug             -> "hijra" (known constant; change if needed)
"""
import json
import uuid

# Deterministic-ish ids (fine for a hand-built workflow).
def nid():
    return str(uuid.uuid4())

FORM_TRIGGER_ID = nid()
CODE_ID = nid()
HTTP_ID = nid()
COMPLETION_ID = nid()
WEBHOOK_ID = nid()

# --- Code node JS: form submission -> Plane create-work-item body --------------
# NOTE: n8n task-runner sandbox blocks require('crypto'); this code needs none.
CODE_JS = r"""// Map HIJRA-LEGAL REVIEW SP3 form submission -> Plane work item payload.
// Plane create body fields: name (required), description_html, priority,
// assignees[] (member UUIDs), labels[] (label UUIDs), target_date/start_date.
//
// Field keys below are the EXACT Form Trigger labels (Indonesian, verbatim).

const f = $json;

const namaNasabah  = (f['NAMA NASABAH'] || '').trim();
const muap         = (f['MUAP, RISK REVIEW, KOMITE/MOM (SHARE GOOGLE DRIVE)'] || '').trim();
const draftSp3     = (f['DRAFT SP3'] || '').trim();
const pilihanSp3   = (f['PILIHAN SP3'] || '').trim();
const atasanLabel  = (f['ATASAN USER'] || '').trim();

// ATASAN USER -> Plane assignee.
// Jira's user picker has no n8n equivalent, so ATASAN USER is a dropdown of friendly
// labels. This explicit map (snapshot of Plane HLRS members) turns the chosen label
// into a member UUID. MANUAL: add an entry here whenever the dropdown gains an option.
// Strategy (per CLAUDE.md): hit -> set assignees; miss -> leave empty AND capture the
// chosen supervisor in the description so nothing is lost.
const MEMBER_MAP = {
  'Danny Dwi Cahyono (dcahyono@hijra.id)': 'f799f9fe-ed67-427c-8e51-199de6cd54a6',
};
const atasanUserUuid = MEMBER_MAP[atasanLabel] || '';

// --- Title ---
const name = ('SP3 ' + pilihanSp3 + ' – ' + namaNasabah).trim();

// --- Description (HTML) — audit trail of links + selection ---
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const link = (url) => {
  const u = String(url || '').trim();
  if (!u) return '<em>(kosong)</em>';
  return /^https?:\/\//i.test(u) ? ('<a href="' + esc(u) + '">' + esc(u) + '</a>') : esc(u);
};
const parts = [
  '<p><strong>Pilihan SP3:</strong> ' + esc(pilihanSp3) + '</p>',
  '<p><strong>MUAP, Risk Review, Komite/MOM (Google Drive):</strong><br/>' + link(muap) + '</p>',
  '<p><strong>Draft SP3:</strong><br/>' + link(draftSp3) + '</p>',
];
// --- Assignees ---  (hit -> set; miss -> capture supervisor in description)
const assignees = atasanUserUuid ? [atasanUserUuid] : [];
if (atasanLabel && !atasanUserUuid) {
  parts.push('<p><strong>Atasan User (belum terpetakan ke member Plane):</strong> ' + esc(atasanLabel) + '</p>');
}
parts.push('<hr/>');
parts.push('<p><em>Dibuat via n8n form (HIJRA-LEGAL REVIEW SP3).</em></p>');
const description_html = parts.join('\n');

// --- Plane create body ---
const body = {
  name: name,
  description_html: description_html,
  priority: 'none',            // form has no priority field
  assignees: assignees,
  // labels: [],               // MANUAL: no label-UUID map provided; PILIHAN SP3
  //                           //         is captured in the description instead.
  // target_date: null,        // MANUAL: form has no date field.
};

// Pass-through for the completion screen / debugging.
return { body: body, _meta: { pilihanSp3: pilihanSp3, namaNasabah: namaNasabah } };
"""

# --- Completion screen: reference + link from the Plane create response --------
# The HTTP node feeds this node, so $json here is Plane's created work item.
# Plane returns sequence_id (the number) and id (UUID).
COMPLETION_MESSAGE = (
    "=Created HLRS-{{ $json.sequence_id }} · "
    "https://YOUR_PLANE_BASE/hijra/projects/PLANE_TARGET_PROJECT_ID/issues/{{ $json.id }}"
)

# --- ATASAN USER dropdown options ---------------------------------------------
# n8n form dropdown options are a single string used as BOTH label and submitted
# value, so we show a FRIENDLY label and let the Code node's MEMBER_MAP turn it into
# a Plane member UUID. Keep these option strings byte-identical to MEMBER_MAP keys.
# SNAPSHOT of current HLRS Plane members (only the API owner has joined so far);
# add an option here AND a MEMBER_MAP entry in CODE_JS as teammates sign up.
ATASAN_OPTIONS = [
    {"option": "Danny Dwi Cahyono (dcahyono@hijra.id)"},
]

workflow = {
    "name": "HLRS · LEGAL REVIEW SP3 form → Plane work item",
    "nodes": [
        {
            "parameters": {
                "formTitle": "HIJRA-LEGAL REVIEW SP3",
                "formDescription": "Form permintaan Legal Review SP3.",
                "formFields": {
                    "values": [
                        {
                            "fieldLabel": "NAMA NASABAH",
                            "fieldType": "text",
                            "placeholder": "Diisi dengan Nama Nasabah",
                            "requiredField": True,
                        },
                        {
                            "fieldLabel": "MUAP, RISK REVIEW, KOMITE/MOM (SHARE GOOGLE DRIVE)",
                            "fieldType": "text",
                            "placeholder": "Mohon di share Link dokumen yang telah final termasuk dokumen nasabah dan jaminan yang diperlukan",
                            "requiredField": True,
                        },
                        {
                            "fieldLabel": "DRAFT SP3",
                            "fieldType": "text",
                            "placeholder": "Mohon Share Link Dokumen Draft SP3 (Google Dok/Ms.W)",
                            "requiredField": True,
                        },
                        {
                            "fieldLabel": "PILIHAN SP3",
                            "fieldType": "dropdown",
                            "requiredField": True,
                            "fieldOptions": {
                                "values": [
                                    {"option": "PLAFOND"},
                                    {"option": "ONE SHOOT"},
                                    {"option": "REALISASI"},
                                    {"option": "RESTRUKTUR/ADDENDUM"},
                                ]
                            },
                        },
                        {
                            # Jira "user picker" has no n8n equivalent -> dropdown of
                            # Plane member UUIDs. MANUAL: refresh options as members join.
                            "fieldLabel": "ATASAN USER",
                            "fieldType": "dropdown",
                            "requiredField": True,
                            "fieldOptions": {"values": ATASAN_OPTIONS},
                        },
                    ]
                },
                "options": {},
            },
            "id": FORM_TRIGGER_ID,
            "name": "On form submission",
            "type": "n8n-nodes-base.formTrigger",
            "typeVersion": 2.2,
            "position": [0, 0],
            "webhookId": WEBHOOK_ID,
        },
        {
            "parameters": {
                "mode": "runOnceForEachItem",
                "language": "javaScript",
                "jsCode": CODE_JS,
            },
            "id": CODE_ID,
            "name": "Map → Plane payload",
            "type": "n8n-nodes-base.code",
            "typeVersion": 2,
            "position": [240, 0],
        },
        {
            "parameters": {
                "method": "POST",
                "url": "https://YOUR_PLANE_BASE/api/v1/workspaces/hijra/projects/PLANE_TARGET_PROJECT_ID/issues/",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {"name": "X-API-Key", "value": "YOUR_PLANE_API_KEY"},
                        {"name": "Content-Type", "value": "application/json"},
                    ]
                },
                "sendBody": True,
                "specifyBody": "json",
                "jsonBody": "={{ $json.body }}",
                "options": {},
            },
            "id": HTTP_ID,
            "name": "Create Plane work item",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [480, 0],
        },
        {
            "parameters": {
                "operation": "completion",
                "completionTitle": "Permintaan SP3 berhasil dibuat",
                "completionMessage": COMPLETION_MESSAGE,
                "options": {},
            },
            "id": COMPLETION_ID,
            "name": "Form ending",
            "type": "n8n-nodes-base.form",
            "typeVersion": 1,
            "position": [720, 0],
        },
        {
            "parameters": {
                "content": (
                    "## HLRS SP3 form → Plane\n"
                    "Fill the PLACEHOLDERS before enabling:\n"
                    "- **URL host** `YOUR_PLANE_BASE` (HTTP node + Form ending link)\n"
                    "- **`PLANE_TARGET_PROJECT_ID`** → `6328c439-cf0b-4e44-b779-73c82201fa29` (HLRS / Legal Review SP3)\n"
                    "- **`YOUR_PLANE_API_KEY`** → Plane token (X-API-Key)\n"
                    "- workspace slug = `hijra`\n\n"
                    "### ATASAN USER dropdown (snapshot of Plane members)\n"
                    "Dropdown shows friendly labels; the Code node's **MEMBER_MAP** turns the\n"
                    "chosen label into a Plane member UUID (hit → assignee; miss → captured in\n"
                    "the description). As people sign up, add BOTH a dropdown option AND a\n"
                    "MEMBER_MAP entry (keep the strings identical).\n"
                    "- `Danny Dwi Cahyono (dcahyono@hijra.id)` → `f799f9fe-ed67-427c-8e51-199de6cd54a6`\n\n"
                    "Refresh via Plane: GET project members for the HLRS project."
                )
            },
            "id": nid(),
            "name": "READ ME — placeholders",
            "type": "n8n-nodes-base.stickyNote",
            "typeVersion": 1,
            "position": [-40, -260],
            # width/height
        },
    ],
    "connections": {
        "On form submission": {
            "main": [[{"node": "Map → Plane payload", "type": "main", "index": 0}]]
        },
        "Map → Plane payload": {
            "main": [[{"node": "Create Plane work item", "type": "main", "index": 0}]]
        },
        "Create Plane work item": {
            "main": [[{"node": "Form ending", "type": "main", "index": 0}]]
        },
    },
    "active": False,
    "settings": {"executionOrder": "v1"},
    "pinData": {},
    "meta": {"templateId": "hlrs-sp3-form-to-plane"},
}

# Sticky note size
for n in workflow["nodes"]:
    if n["type"] == "n8n-nodes-base.stickyNote":
        n["parameters"]["height"] = 320
        n["parameters"]["width"] = 460

out_path = "n8n/hlrs-sp3-form-to-plane.workflow.json"
text = json.dumps(workflow, indent=2, ensure_ascii=False)
# Validate it parses.
json.loads(text)
with open(out_path, "w", encoding="utf-8") as fh:
    fh.write(text + "\n")
print("OK wrote", out_path, "(", len(text), "bytes )")
print("nodes:", [n["name"] for n in workflow["nodes"]])

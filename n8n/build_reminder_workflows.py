#!/usr/bin/env python3
"""Build per-project Plane notifier workflows as importable n8n JSON.

Two workflows per project:
  1. <IDENT> — Due Date Reminder   (daily 08:00 WIB; emails each assignee of tickets due today)
  2. <IDENT> — Daily Pending Digest (daily 11:00 WIB; one table of all pending tickets)

Why Python: embedded JS in the Code node must be escaped exactly once; json.dump
handles that. Every file is validated with json.loads before writing.

Per-workflow shape (HTTP-node layout):
  Schedule Trigger (Asia/Jakarta)
    -> Fetch states       (HTTP GET /states/)
    -> Fetch work items   (HTTP GET /issues/ ?expand=assignees,state&per_page=1000)
    -> Build emails       (Code, runOnceForAllItems — reads both nodes, shapes email items)
    -> Send               (Gmail)

No pagination: this instance honors per_page=1000 and returns a whole project in
ONE page (verified live 2026-06-11: HDR 61, ARH 259, HIJ 173, HLRS 404, LRP 100 —
all next_page_results=false). That sidesteps the cursor entirely. The Build node
guards against silent truncation: if any page reports next_page_results=true (a
project grew past 1000) it warns and the digest shows a banner — re-enable cursor
pagination then. /issues/ is the working list endpoint here (/work-items/ 404s).

Logic is project-agnostic: "pending" and the reminder skip-list both derive from
the live state's `group` (everything except completed/cancelled) — no per-project
state list. Only id / identifier / mailbox vary.

Placeholders the user fills after import:
  - host  YOUR_PLANE_BASE     (both HTTP node URLs + Code WEB_BASE)
  - token YOUR_PLANE_API_KEY  (X-API-Key header in both HTTP nodes)
"""
import json

# key: (identifier, project_id, digest_recipient). UUIDs verified live 2026-06-11.
PROJECTS = [
    {"key": "hdr",  "ident": "HDR",  "pid": "a9f5d28f-72e0-4e3c-af57-d8357c22c7cf", "to": "legalhijra@hijra.id"},
    {"key": "arh",  "ident": "ARH",  "pid": "ef603ac8-09d4-413f-ab6e-b9aea65af65a", "to": "legalhijra@hijra.id"},
    {"key": "hij",  "ident": "HIJ",  "pid": "e89c3f8b-5603-41af-9187-11638d1f65ce", "to": "legalhijra@hijra.id"},
    {"key": "hlrs", "ident": "HLRS", "pid": "6328c439-cf0b-4e44-b779-73c82201fa29", "to": "legalhijra@hijra.id"},
    {"key": "lrp",  "ident": "LRP",  "pid": "ec9b3331-893a-468b-89b2-f8801c97a5af", "to": "legalhijra@hijra.id"},
]
SLUG = "hijra"

# --- shared JS helpers, inlined at the top of each Code node ---------------
# Tokens replaced per project: __PROJECT_ID__, __IDENT__, __DIGEST_TO__
JS_PRELUDE = r"""
const WEB_BASE   = 'https://YOUR_PLANE_BASE';   // Plane web UI host (ticket links)
const SLUG       = 'hijra';
const PROJECT_ID = '__PROJECT_ID__';
const IDENT      = '__IDENT__';
const SKIP_GROUPS = ['completed', 'cancelled'];  // never reminded / never "pending"

const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// "today" in Asia/Jakarta (UTC+7, no DST) — independent of the n8n server tz.
const jkt = new Date(Date.now() + 7 * 3600 * 1000);
const today = jkt.getUTCFullYear() + '-' + pad(jkt.getUTCMonth() + 1) + '-' + pad(jkt.getUTCDate());
const todayMs = Date.parse(today + 'T00:00:00Z');

// state id -> {name, group} from the "Fetch states" node (fallback for when a
// work item's `state` comes back as a bare UUID rather than an expanded object).
const stateMap = {};
for (const it of $('Fetch states').all()) {
  const b = it.json;
  const arr = Array.isArray(b) ? b : (b.results || []);
  for (const s of arr) stateMap[s.id] = { name: s.name, group: s.group };
}

// Flatten work items from the fetch. Single per_page=1000 page covers every one
// of these projects (largest = HLRS 404). Guard against silent truncation if a
// project ever grows past 1000 — then re-enable cursor pagination on the HTTP node.
const items = [];
let truncated = false;
for (const it of $input.all()) {
  const b = it.json;
  const arr = Array.isArray(b) ? b : (b.results || []);
  items.push(...arr);
  if (b && b.next_page_results === true) truncated = true;
}
if (truncated) console.warn('WARNING: >1000 issues — only the first 1000 were fetched. Re-enable pagination.');

const stateOf = (wi) => {
  const sid = (wi.state && typeof wi.state === 'object') ? wi.state.id : wi.state;
  return stateMap[sid] || (typeof wi.state === 'object' ? wi.state : {});
};
const emailsOf = (wi) => (wi.assignees || [])
  .map((a) => (a && typeof a === 'object') ? a.email : null)
  .filter(Boolean);
const linkOf = (wi) => WEB_BASE + '/' + SLUG + '/projects/' + PROJECT_ID + '/issues/' + wi.id + '/';
const refOf = (wi) => IDENT + '-' + wi.sequence_id;
"""

# --- Workflow 1: Due Date Reminder ----------------------------------------
JS_REMINDER = JS_PRELUDE + r"""
// One email per (ticket due today) x (assignee). Skip unassigned; skip
// completed/cancelled. Day-of only — no pre-warning, no overdue repeat.
const out = [];
for (const wi of items) {
  const due = String(wi.target_date || '').slice(0, 10);
  if (due !== today) continue;
  const st = stateOf(wi);
  if (SKIP_GROUPS.includes(st.group)) continue;
  const emails = emailsOf(wi);
  if (!emails.length) continue;

  const ref = refOf(wi);
  const title = wi.name || '(untitled)';
  const link = linkOf(wi);
  const row = (k, v) =>
    '<tr><td style="border:1px solid #e5e7eb;padding:6px"><strong>' + k + '</strong></td>' +
    '<td style="border:1px solid #e5e7eb;padding:6px">' + v + '</td></tr>';
  const html =
    '<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937">' +
    '<p>Reminder — this ticket is <strong>due today (' + esc(today) + ')</strong>:</p>' +
    '<table style="border-collapse:collapse;border:1px solid #e5e7eb">' +
    row('Ref', esc(ref)) +
    row('Title', esc(title)) +
    row('Status', esc(st.name || '')) +
    row('Assignee', esc(emails.join(', '))) +
    row('Due date', esc(due)) +
    '</table>' +
    '<p style="margin-top:16px">' +
    '<a href="' + esc(link) + '" style="background:#3b82f6;color:#fff;padding:10px 16px;' +
    'border-radius:6px;text-decoration:none;display:inline-block">Open in Plane</a></p>' +
    '</div>';
  const subject = 'Reminder: ' + ref + ' is due today — ' + title;
  for (const email of emails) {
    out.push({ json: { to: email, subject: subject, html: html, ref: ref } });
  }
}
return out;
"""

# --- Workflow 2: Daily Pending Digest -------------------------------------
JS_DIGEST = JS_PRELUDE + r"""
// "Pending" = every state EXCEPT completed/cancelled groups. Single table to the
// project mailbox; skip the send entirely if nothing is pending.
const TO = '__DIGEST_TO__';

const rows = [];
for (const wi of items) {
  const st = stateOf(wi);
  if (!st.group || SKIP_GROUPS.includes(st.group)) continue;  // skip final + unknown-state items
  const due = String(wi.target_date || '').slice(0, 10);
  let overdue = 0;
  if (due) {
    const d = Date.parse(due + 'T00:00:00Z');
    if (d < todayMs) overdue = Math.round((todayMs - d) / 86400000);
  }
  rows.push({
    ref: refOf(wi),
    title: wi.name || '(untitled)',
    state: st.name || '',
    assignee: emailsOf(wi).join(', ') || '—',
    due: due,
    dueMs: due ? Date.parse(due + 'T00:00:00Z') : Infinity,
    overdue: overdue,
    link: linkOf(wi),
  });
}

if (!rows.length) return [];  // nothing pending -> no "all clear" email

// overdue first (most days first), then non-overdue by due date asc (no-due last)
rows.sort((a, b) => {
  const ao = a.overdue > 0, bo = b.overdue > 0;
  if (ao && bo) return b.overdue - a.overdue;
  if (ao !== bo) return ao ? -1 : 1;
  return a.dueMs - b.dueMs;
});

const th = (t) => '<th style="border:1px solid #e5e7eb;padding:6px;background:#f3f4f6;text-align:left">' + t + '</th>';
const td = (t) => '<td style="border:1px solid #e5e7eb;padding:6px">' + t + '</td>';
const trs = rows.map((r) =>
  '<tr>' +
  td('<a href="' + esc(r.link) + '">' + esc(r.ref) + '</a>') +
  td(esc(r.title)) +
  td(esc(r.state)) +
  td(esc(r.assignee)) +
  td(esc(r.due || '—')) +
  td(r.overdue > 0 ? '<strong style="color:#b91c1c">' + r.overdue + '</strong>' : '0') +
  td('<a href="' + esc(r.link) + '">open</a>') +
  '</tr>'
).join('');

const banner = truncated
  ? '<p style="color:#b91c1c"><strong>⚠ Only the first 1000 issues were fetched — list may be incomplete. Re-enable pagination.</strong></p>'
  : '';
const html =
  '<div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937">' +
  banner +
  '<p>' + IDENT + ' pending tickets as of <strong>' + esc(today) + '</strong> ' +
  '(' + rows.length + ' total, overdue first):</p>' +
  '<table style="border-collapse:collapse;border:1px solid #e5e7eb">' +
  '<tr>' + th('Ref') + th('Title') + th('State') + th('Assignee') +
  th('Due date') + th('Days overdue') + th('Link') + '</tr>' +
  trs +
  '</table></div>';

return [{ json: { to: TO, subject: IDENT + ' — Daily Pending Tickets (' + rows.length + ')', html: html } }];
"""


def api_base(pid):
    return "https://YOUR_PLANE_BASE/api/v1/workspaces/" + SLUG + "/projects/" + pid


def schedule_node(hour):
    return {
        "parameters": {
            "rule": {"interval": [{"field": "days", "triggerAtHour": hour, "triggerAtMinute": 0}]}
        },
        "id": "11111111-1111-4111-8111-111111111111",
        "name": "Daily schedule",
        "type": "n8n-nodes-base.scheduleTrigger",
        "typeVersion": 1.2,
        "position": [0, 0],
    }


def states_node(pid):
    return {
        "parameters": {
            "url": api_base(pid) + "/states/",
            "sendHeaders": True,
            "headerParameters": {"parameters": [{"name": "X-API-Key", "value": "YOUR_PLANE_API_KEY"}]},
            "options": {},
        },
        "id": "22222222-2222-4222-8222-222222222222",
        "name": "Fetch states",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [240, 0],
    }


def items_node(pid):
    return {
        "parameters": {
            # /issues/ is this instance's working list endpoint; /work-items/ 404s. Verified live.
            "url": api_base(pid) + "/issues/",
            "sendHeaders": True,
            "headerParameters": {"parameters": [{"name": "X-API-Key", "value": "YOUR_PLANE_API_KEY"}]},
            "sendQuery": True,
            "queryParameters": {"parameters": [
                {"name": "expand", "value": "assignees,state"},
                # per_page=1000 returns a whole project in one page on this instance
                # (verified live: largest of these is HLRS at 404). No pagination needed.
                {"name": "per_page", "value": "1000"},
            ]},
            "options": {},
        },
        "id": "33333333-3333-4333-8333-333333333333",
        "name": "Fetch work items",
        "type": "n8n-nodes-base.httpRequest",
        "typeVersion": 4.2,
        "position": [480, 0],
    }


def code_node(js):
    return {
        "parameters": {"mode": "runOnceForAllItems", "language": "javaScript", "jsCode": js},
        "id": "44444444-4444-4444-8444-444444444444",
        "name": "Build emails",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [720, 0],
    }


def email_node(name, from_email):
    return {
        "parameters": {
            "fromEmail": from_email,
            "toEmail": "={{ $json.to }}",
            "subject": "={{ $json.subject }}",
            "emailFormat": "html",
            "html": "={{ $json.html }}",
            "options": {},
        },
        "id": "55555555-5555-4555-8555-555555555555",
        "name": name,
        "type": "n8n-nodes-base.emailSend",
        "typeVersion": 2.1,
        "position": [960, 0],
    }


def sticky(content):
    return {
        "parameters": {"content": content, "height": 470, "width": 540},
        "id": "66666666-6666-4666-8666-666666666666",
        "name": "READ ME — placeholders",
        "type": "n8n-nodes-base.stickyNote",
        "typeVersion": 1,
        "position": [-40, -520],
    }


def linear_connections(names):
    conns = {}
    for src, dst in zip(names, names[1:]):
        conns[src] = {"main": [[{"node": dst, "type": "main", "index": 0}]]}
    return conns


def build(name, template_id, hour, js, send_name, sticky_md, pid, from_email):
    chain = ["Daily schedule", "Fetch states", "Fetch work items", "Build emails", send_name]
    nodes = [
        schedule_node(hour),
        states_node(pid),
        items_node(pid),
        code_node(js),
        email_node(send_name, from_email),
        sticky(sticky_md),
    ]
    return {
        "name": name,
        "nodes": nodes,
        "connections": linear_connections(chain),
        "active": False,
        "settings": {"executionOrder": "v1", "timezone": "Asia/Jakarta"},
        "pinData": {},
        "meta": {"templateId": template_id},
    }


def sticky_md(ident, hour, pid, to, kind_lines):
    return (
        "## %s — %s\n" % (ident, kind_lines["title"])
        + "Fill the PLACEHOLDERS before enabling:\n"
        + "- **host** `YOUR_PLANE_BASE` → both HTTP node URLs and Code `WEB_BASE`\n"
        + "- **`YOUR_PLANE_API_KEY`** → Plane token (X-API-Key) in both HTTP nodes\n"
        + "- workspace slug = `hijra`, project id = `%s` — already hardcoded\n" % pid
        + "\n### Send Email (SMTP) node\n"
        + "Attach an **SMTP credential**. `From` is set to **%s** in the node (editable). " % to
        + "Make sure the SMTP server/account is allowed to send as that address.\n"
        + "\n### Fetch work items\n"
        + "Single `GET /issues/?per_page=1000&expand=assignees,state` — this instance returns a whole "
        + "project in one page (verified: largest here is HLRS=404), so no pagination is needed. "
        + "`/work-items/` 404s here, so `/issues/` is used. If a project ever exceeds 1000 issues the "
        + "Build node warns and the digest shows a banner — re-add cursor pagination then.\n"
        + "\n### Schedule\n"
        + "Daily at **%s:00 Asia/Jakarta** (workflow timezone set on Settings).\n\n" % hour
        + kind_lines["body"]
    )


def main():
    written = []
    for p in PROJECTS:
        ident, pid, to, key = p["ident"], p["pid"], p["to"], p["key"]

        wf1 = build(
            "Plane %s — Due Date Reminder" % ident,
            "%s-due-date-reminder" % key,
            8,
            JS_REMINDER.replace("__PROJECT_ID__", pid).replace("__IDENT__", ident).replace("__DIGEST_TO__", to),
            "Send reminder (SMTP)",
            sticky_md(ident, "08", pid, to, {
                "title": "Due Date Reminder",
                "body": "One email per ticket **due today**, to each assignee. Unassigned tickets and "
                        "completed/cancelled states are skipped. (Zero due-today tickets -> the Code node "
                        "shows one empty item and no mail is sent — that is expected.)\n",
            }),
            pid,
            to,
        )
        wf2 = build(
            "Plane %s — Daily Pending Digest" % ident,
            "%s-pending-digest" % key,
            11,
            JS_DIGEST.replace("__PROJECT_ID__", pid).replace("__IDENT__", ident).replace("__DIGEST_TO__", to),
            "Send digest (SMTP)",
            sticky_md(ident, "11", pid, to, {
                "title": "Daily Pending Digest",
                "body": "Single digest to **%s** of all **pending** tickets (every state except " % to
                        + "Done/Cancelled), sorted overdue-first. No email is sent when nothing is pending.\n",
            }),
            pid,
            to,
        )

        for fname, wf in [("%s-due-date-reminder.workflow.json" % key, wf1),
                          ("%s-pending-digest.workflow.json" % key, wf2)]:
            text = json.dumps(wf, indent=2, ensure_ascii=False)
            json.loads(text)  # validate round-trip
            with open(fname, "w") as f:
                f.write(text + "\n")
            written.append(fname)
            print("wrote", fname, "(%d bytes)" % len(text))
    print("\n%d files for %d projects" % (len(written), len(PROJECTS)))


if __name__ == "__main__":
    main()

// Pilot verification fetch for IHH: pull the 5 migrated work items from Plane via
// REST (MCP retrieve_work_item 404s on this CE build) and print the fields the
// verification skill compares.
import { loadConfig } from "../src/lib/config";
import { PlaneClient } from "../src/clients/plane";

const PROJECT_ID = "0fbdc5d0-2d02-42a2-9f02-2830cbe190f6";
const PAIRS: [string, string][] = [
  ["IHH-28", "09007e42-8673-47fe-9381-1d3549754c0a"],
  ["IHH-29", "2b02b8cd-6d35-4f2e-b9e0-b23fc47ee8bd"],
  ["IHH-30", "dfc49e8a-a3d5-4e2c-9b6a-76c5b13d8bed"],
  ["IHH-31", "ed12d4d7-aa1a-4af1-a6f3-26c38b159de4"],
  ["IHH-32", "7aa62677-3b08-475d-b304-e46c6566f334"],
];

const config = await loadConfig();
const plane = new PlaneClient(config);
const req = (plane as any).request.bind(plane);
const wsPath = (plane as any).projectPath.bind(plane);

const states = await plane.listStates(PROJECT_ID);
const stateName = new Map(states.map((s: any) => [s.id, `${s.name} (${s.group})`]));
const labels = await plane.listLabels(PROJECT_ID);
const labelName = new Map(labels.map((l: any) => [l.id, l.name]));
const members = await plane.listProjectMembers(PROJECT_ID);
const memberEmail = new Map(members.map((m: any) => [m.id, m.email ?? m.member?.email]));

for (const [jira, wid] of PAIRS) {
  const wi: any = await req(wsPath(PROJECT_ID, `/issues/${wid}/`));
  const desc: string = wi.description_html ?? wi.description_stripped ?? "";
  console.log(`\n=== ${jira} → ${wid} ===`);
  console.log("name:        ", wi.name);
  console.log("state:       ", stateName.get(wi.state) ?? wi.state);
  console.log("priority:    ", wi.priority);
  console.log("labels:      ", (wi.labels ?? []).map((id: string) => labelName.get(id) ?? id).join(", ") || "(none)");
  console.log("assignees:   ", (wi.assignees ?? []).map((id: string) => memberEmail.get(id) ?? id).join(", ") || "(none)");
  console.log("desc[0..240]:", desc.replace(/\s+/g, " ").slice(0, 240));
  const footerIdx = desc.indexOf("migrated-custom-fields");
  console.log("footer:      ", footerIdx >= 0 ? desc.slice(footerIdx, footerIdx + 200).replace(/\s+/g, " ") : "(none)");
}

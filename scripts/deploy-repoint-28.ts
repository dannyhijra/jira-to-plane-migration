/**
 * One-off: repoint the 28 DEPLOY work_item manifest entries from `failed`
 * back to `ok`, using their known-live plane_ids (verified live via full
 * inventory in scripts/deploy-verify-28.ts: 713 live = 713 keys, 28/28 live).
 *
 * This clears the stale `failed` status left by pass-1's transient PATCH
 * failures so the next `sync --backfill` re-renders their descriptions
 * (the ADF bold fix) instead of SKIPping them forever.
 *
 * Append-only: writes 28 new `ok` lines to state/manifest.jsonl. Idempotent
 * (re-running just appends identical entries; loadManifest takes last-wins).
 */
import { append } from '../src/state/manifest';

const MAP: Record<string, string> = {
  'DEPLOY-106': 'f05bc9b2-00b9-4002-a349-102311fe49c8',
  'DEPLOY-108': '93ec605c-3e1c-443f-973f-f1947ed9f71e',
  'DEPLOY-141': '8ceac408-a459-4285-8bb2-15c74fc65bc7',
  'DEPLOY-143': '54d2dc75-436f-405a-95cd-5f8ebfa5cd5a',
  'DEPLOY-158': '88485d98-c2c3-496b-8958-e76cacd01a47',
  'DEPLOY-159': '3dec1689-286a-439b-94b5-8ffaba8586f4',
  'DEPLOY-169': 'a532f1bc-9460-4f65-a562-a4750d3282d8',
  'DEPLOY-172': 'ee849c07-a282-41ce-8d01-6bb5e0229042',
  'DEPLOY-174': 'f41b1e32-29ed-4325-8d14-b077d055bbde',
  'DEPLOY-183': 'bad893ba-a5ce-4592-8355-61694ea4aa87',
  'DEPLOY-186': 'a5d8e3af-7189-4a39-bc66-4f40f9900447',
  'DEPLOY-190': 'd304af77-18b8-4616-8eda-3f0578bf27f6',
  'DEPLOY-191': '8e1e1a22-8ddd-426c-99dd-bf27518f238c',
  'DEPLOY-192': '62f0b9c9-09d3-4822-bbac-9249a83fc64c',
  'DEPLOY-193': 'fe4aa273-bd14-40c2-bde6-1aa91a4aaef1',
  'DEPLOY-194': '2c47b1a6-9834-4b33-b709-d9cb3b1f9067',
  'DEPLOY-195': 'cc3fb3e8-bd2b-45d9-81fe-45683d0c32b7',
  'DEPLOY-196': 'ea35ccc3-33f2-495e-bb4c-ba56a0cf15c9',
  'DEPLOY-197': '38fac8da-0ed9-41b6-8ee4-754f377d9bd0',
  'DEPLOY-199': '0d8b502b-bdf4-48f8-a576-38fc7b431212',
  'DEPLOY-200': '2c462028-bb89-4132-943e-445978198e85',
  'DEPLOY-201': '9670edb4-616b-4668-997a-4422c3170ddb',
  'DEPLOY-202': '3dd8c1cf-a8af-437c-b38c-2ac8128f8856',
  'DEPLOY-203': '1f8293d6-884b-4f09-a130-7224bdffd4bc',
  'DEPLOY-205': '568cccf8-a996-4c71-8dd9-0df77c2487aa',
  'DEPLOY-207': '6f3672c1-e908-4d46-8ce2-83735ccbec28',
  'DEPLOY-208': '2255cb50-a701-43a0-8ba7-c09229b48b98',
  'DEPLOY-68': '45a27d6d-7540-43ce-8067-5b065d679216'
};

const at = '2026-05-29T12:30:00.000Z'; // fixed stamp (no Date.now in this env policy)
let n = 0;
for (const [jira_key, plane_id] of Object.entries(MAP)) {
  await append({
    entity: 'work_item',
    project: 'DEPLOY',
    jira_key,
    plane_id,
    status: 'ok',
    at
  });
  n++;
}
console.log(
  `Repointed ${n} DEPLOY work_item entries failed→ok (all live-verified).`
);

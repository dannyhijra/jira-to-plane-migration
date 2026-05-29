// Point manifest appends at a throwaway file so this test never pollutes the
// real state/manifest.jsonl ledger (manifest reads the path lazily).
process.env.MANIFEST_PATH = '/tmp/test-manifest-issues.jsonl';
process.env.FAILURES_PATH = '/tmp/test-failures-issues.jsonl';

import { expect, test, beforeEach } from 'bun:test';
import { syncIssue } from './issues';
import { loadManifest } from '../state/manifest';
import type { PlaneClient } from '../clients/plane';
import type { MigrationContext } from '../state/types';
import type { JiraIssue } from '../clients/jira';

// Minimal config the payload mapper touches: mappings.custom_fields[project],
// status/priority maps default to empty (mapper falls back to unstarted state).
const config = {
  mappings: {
    custom_fields: { HLRS: {} },
    status: { HLRS: {} },
    priority: {}
  },
  projects: {
    HLRS: { plane_project_identifier: 'HLRS', plane_project_name: 'HLRS' }
  }
} as never;

const ctx = (backfill: boolean): MigrationContext =>
  ({
    config,
    jiraProject: 'HLRS',
    dryRun: false,
    batch: 50,
    resume: false,
    backfill
  }) as MigrationContext;

const issue = (key: string): JiraIssue =>
  ({
    key,
    fields: {
      summary: 'test issue',
      description: null,
      status: { name: 'Open' },
      priority: { name: 'Medium' },
      labels: [],
      assignee: null
    }
  }) as never;

const lookups = {
  memberLookup: new Map<string, string>(),
  stateLookup: new Map<string, string>(),
  stateByGroup: new Map<string, string>([['unstarted', 'state-unstarted']]),
  labelLookup: new Map<string, string>()
};

interface PlaneCalls {
  creates: number;
  updates: number;
}
function stubPlane(calls: PlaneCalls): PlaneClient {
  return {
    createWorkItem: async () => {
      calls.creates++;
      return { id: 'new-item', sequence_id: 999 };
    },
    updateWorkItem: async () => {
      calls.updates++;
      return { id: 'existing' };
    }
  } as unknown as PlaneClient;
}

beforeEach(async () => {
  const m = await loadManifest();
  // HLRS-106 has a FAILED manifest entry (the batch-1 scenario that caused
  // the duplicate-creation incident). HLRS-999 has no entry at all.
  m.set('work_item:HLRS-106', {
    entity: 'work_item',
    project: 'HLRS',
    jira_key: 'HLRS-106',
    plane_id: 'dead-uuid',
    status: 'failed',
    at: '2026-05-29T00:00:00.000Z'
  });
  m.delete('work_item:HLRS-999');
});

test('backfill SKIPS a failed-status item — never creates a duplicate', async () => {
  const calls: PlaneCalls = { creates: 0, updates: 0 };
  const res = await syncIssue({
    ctx: ctx(true),
    plane: stubPlane(calls),
    planeProjectId: 'proj',
    lookups,
    issue: issue('HLRS-106')
  });

  expect(res.action).toBe('skipped');
  expect(calls.creates).toBe(0); // the bug was: this would be 1
  expect(calls.updates).toBe(0);
});

test('backfill SKIPS an item with no manifest entry — never creates', async () => {
  const calls: PlaneCalls = { creates: 0, updates: 0 };
  const res = await syncIssue({
    ctx: ctx(true),
    plane: stubPlane(calls),
    planeProjectId: 'proj',
    lookups,
    issue: issue('HLRS-999')
  });

  expect(res.action).toBe('skipped');
  expect(calls.creates).toBe(0);
});

test('non-backfill sync still CREATEs a genuinely new issue', async () => {
  const calls: PlaneCalls = { creates: 0, updates: 0 };
  const res = await syncIssue({
    ctx: ctx(false),
    plane: stubPlane(calls),
    planeProjectId: 'proj',
    lookups,
    issue: issue('HLRS-999')
  });

  expect(res.action).toBe('created');
  expect(calls.creates).toBe(1);
});

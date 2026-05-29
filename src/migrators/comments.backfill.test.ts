// Point manifest appends at a throwaway file (manifest reads the path lazily).
process.env.MANIFEST_PATH = '/tmp/test-manifest-comments.jsonl';
process.env.FAILURES_PATH = '/tmp/test-failures-comments.jsonl';

import { expect, test, beforeEach } from 'bun:test';
import { syncComments } from './comments';
import { loadManifest } from '../state/manifest';
import type { JiraClient, JiraComment } from '../clients/jira';
import type { PlaneClient } from '../clients/plane';
import type { MigrationContext } from '../state/types';

// Minimal context — only the fields syncComments reads.
const ctx = (dryRun = false): MigrationContext =>
  ({
    config: {} as never,
    jiraProject: 'IHH',
    dryRun,
    batch: 50,
    resume: false
  }) as MigrationContext;

const jiraComment = (id: string): JiraComment =>
  ({
    id,
    author: { emailAddress: 'a@b.com', displayName: 'A' },
    created: '2026-01-01T00:00:00.000Z',
    // strong text with a trailing newline — the bug fixed in adf.ts
    body: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Intercom Ticket ID :\n',
              marks: [{ type: 'strong' }]
            },
            { type: 'text', text: '-' }
          ]
        }
      ]
    }
  }) as never;

function stubJira(comments: JiraComment[]): JiraClient {
  return { listComments: async () => comments } as unknown as JiraClient;
}

interface PlaneCalls {
  updates: { commentId: string; html: string }[];
  adds: number;
}

function stubPlane(calls: PlaneCalls): PlaneClient {
  return {
    updateComment: async (
      _p: string,
      _w: string,
      commentId: string,
      payload: { comment_html: string }
    ) => {
      calls.updates.push({ commentId, html: payload.comment_html });
      return { id: commentId };
    },
    addComment: async () => {
      calls.adds++;
      return { id: 'new' };
    }
  } as unknown as PlaneClient;
}

beforeEach(async () => {
  // Seed the in-memory manifest cache: comment IHH-1#100 already migrated.
  const m = await loadManifest();
  m.set('comment:IHH-1#100', {
    entity: 'comment',
    project: 'IHH',
    jira_key: 'IHH-1#100',
    plane_id: 'plane-comment-uuid',
    status: 'ok',
    at: '2026-01-01T00:00:00.000Z'
  });
});

test('backfill PATCHes an existing comment body via updateComment', async () => {
  const calls: PlaneCalls = { updates: [], adds: 0 };
  const res = await syncComments({
    ctx: ctx(false),
    jira: stubJira([jiraComment('100')]),
    plane: stubPlane(calls),
    planeProjectId: 'proj',
    jiraKey: 'IHH-1',
    planeWorkItemId: 'wi-uuid',
    backfill: true
  });

  expect(res.updated).toBe(1);
  expect(res.created).toBe(0);
  expect(calls.adds).toBe(0);
  expect(calls.updates).toHaveLength(1);
  expect(calls.updates[0]!.commentId).toBe('plane-comment-uuid');
  // The re-rendered body must contain the FIXED markdown (markers hugging text).
  expect(calls.updates[0]!.html).toContain('**Intercom Ticket ID :**');
  expect(calls.updates[0]!.html).not.toContain('ID :\n**');
});

test('without backfill, an existing comment is skipped (locked policy)', async () => {
  const calls: PlaneCalls = { updates: [], adds: 0 };
  const res = await syncComments({
    ctx: ctx(false),
    jira: stubJira([jiraComment('100')]),
    plane: stubPlane(calls),
    planeProjectId: 'proj',
    jiraKey: 'IHH-1',
    planeWorkItemId: 'wi-uuid',
    backfill: false
  });

  expect(res.skipped).toBe(1);
  expect(res.updated).toBe(0);
  expect(calls.updates).toHaveLength(0);
  expect(calls.adds).toBe(0);
});

test('backfill dry-run previews (counts as updated) but makes no Plane write', async () => {
  const calls: PlaneCalls = { updates: [], adds: 0 };
  const res = await syncComments({
    ctx: ctx(true),
    jira: stubJira([jiraComment('100')]),
    plane: stubPlane(calls),
    planeProjectId: 'proj',
    jiraKey: 'IHH-1',
    planeWorkItemId: 'wi-uuid',
    backfill: true
  });

  // No write, but the would-do work is counted so the preview is honest.
  expect(calls.updates).toHaveLength(0);
  expect(res.updated).toBe(1);
  expect(res.skipped).toBe(0);
});

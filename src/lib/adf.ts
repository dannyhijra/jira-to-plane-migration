import type { AdfDoc, AdfNode } from '../clients/jira';

/**
 * Render an Atlassian Document Format (ADF) document to Markdown.
 *
 * Per LDRH discovery: mentions are kept as literal "@<displayName>" text,
 * media nodes become placeholder lines preserving filename + media id so
 * the attachments migrator can later resolve them.
 */
export function adfToMarkdown(doc: AdfDoc | null | undefined): string {
  if (!doc || doc.type !== 'doc' || !Array.isArray(doc.content)) return '';
  return renderNodes(doc.content).trimEnd();
}

function renderNodes(nodes: AdfNode[]): string {
  return nodes.map(renderNode).join('');
}

function renderNode(node: AdfNode): string {
  switch (node.type) {
    case 'paragraph':
      return renderInline(node.content ?? []) + '\n\n';
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 6);
      return `${'#'.repeat(level)} ${renderInline(node.content ?? [])}\n\n`;
    }
    case 'bulletList':
      return renderList(node.content ?? [], '- ') + '\n';
    case 'orderedList':
      return renderList(node.content ?? [], (i) => `${i + 1}. `) + '\n';
    case 'listItem':
      return renderInline(node.content ?? []);
    case 'blockquote':
      return (
        (node.content ?? [])
          .map((c) => renderNode(c).trimEnd())
          .join('\n')
          .split('\n')
          .map((l) => `> ${l}`)
          .join('\n') + '\n\n'
      );
    case 'codeBlock': {
      const lang = String(node.attrs?.language ?? '');
      const text = (node.content ?? []).map((n) => n.text ?? '').join('');
      return `\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
    }
    case 'rule':
      return '---\n\n';
    case 'mediaSingle':
    case 'mediaGroup': {
      const media = (node.content ?? []).find((c) => c.type === 'media');
      const alt = String(media?.attrs?.alt ?? 'media');
      const id = String(media?.attrs?.id ?? '');
      return `_[media: ${alt}${id ? ` · jira-media-id=${id}` : ''}]_\n\n`;
    }
    case 'text':
      return applyMarks(node);
    case 'hardBreak':
      return '  \n';
    case 'inlineCard': {
      const url = String(node.attrs?.url ?? '');
      return url ? `<${url}>` : '';
    }
    case 'mention': {
      const text = String(
        node.attrs?.text ?? node.attrs?.displayName ?? '@user'
      );
      return text.startsWith('@') ? text : `@${text}`;
    }
    case 'emoji':
      return String(node.attrs?.text ?? node.attrs?.shortName ?? '');
    case 'table':
    case 'tableRow':
    case 'tableCell':
    case 'tableHeader':
      // Tables are rare in LDRH; render their text content inline.
      return renderInline(node.content ?? []) + '\n';
    default:
      // Unknown node: best-effort fall through to child content.
      return renderInline(node.content ?? []);
  }
}

function renderInline(nodes: AdfNode[]): string {
  return nodes
    .map(renderNode)
    .join('')
    .replace(/\n{3,}/g, '\n\n');
}

function renderList(
  items: AdfNode[],
  marker: string | ((i: number) => string)
): string {
  return items
    .map((item, i) => {
      const m = typeof marker === 'string' ? marker : marker(i);
      const inner = renderInline(item.content ?? []).trimEnd();
      return `${m}${inner.replace(/\n/g, '\n  ')}\n`;
    })
    .join('');
}

/**
 * Wrap text in symmetric inline markers, hoisting any leading/trailing
 * whitespace OUTSIDE the markers. Jira's ADF frequently leaves trailing
 * spaces or newlines inside a marked text node ("Intercom Ticket ID :\n");
 * `**...\n**` is not a valid CommonMark emphasis run and renders literally.
 * Whitespace-only text is returned unchanged (no empty `****`).
 */
function wrap(text: string, left: string, right: string): string {
  const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!m) return text;
  const [, pre, core, post] = m;
  return core ? `${pre}${left}${core}${right}${post}` : text;
}

function applyMarks(node: AdfNode): string {
  let text = node.text ?? '';
  if (!text) return '';
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case 'strong':
        text = wrap(text, '**', '**');
        break;
      case 'em':
        text = wrap(text, '_', '_');
        break;
      case 'code':
        text = wrap(text, '`', '`');
        break;
      case 'strike':
        text = wrap(text, '~~', '~~');
        break;
      case 'underline':
        text = wrap(text, '<u>', '</u>');
        break;
      case 'link': {
        const href = String(mark.attrs?.href ?? '');
        text = href ? `[${text}](${href})` : text;
        break;
      }
    }
  }
  return text;
}

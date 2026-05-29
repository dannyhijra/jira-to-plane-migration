import { expect, test } from 'bun:test';
import { adfToMarkdown } from './adf';

const doc = (...content: unknown[]) => ({ type: 'doc', content }) as never;
const para = (...content: unknown[]) => ({ type: 'paragraph', content });
const text = (t: string, marks?: { type: string; attrs?: unknown }[]) => ({
  type: 'text',
  text: t,
  ...(marks ? { marks } : {})
});
const strong = [{ type: 'strong' }];

// Regression: Jira often emits a trailing newline INSIDE a strong-marked text
// node ("Intercom Ticket ID :\n"). Wrapping markers around the raw text yields
// "**...:\n**" which Markdown renders literally (asterisks on their own line).
test('hoists trailing newline out of bold markers', () => {
  const md = adfToMarkdown(
    doc(para(text('Intercom Ticket ID :\n', strong), text('-')))
  );
  expect(md).toBe('**Intercom Ticket ID :**\n-');
});

test('hoists trailing space out of bold markers', () => {
  const md = adfToMarkdown(doc(para(text('Label: ', strong), text('value'))));
  expect(md).toBe('**Label:** value');
});

test('hoists leading space out of bold markers', () => {
  const md = adfToMarkdown(doc(para(text('a'), text(' bold', strong))));
  expect(md).toBe('a **bold**');
});

test('preserves internal whitespace, hoists edges (doc trimEnd strips final space)', () => {
  // mid-document so the hoisted trailing space survives trimEnd
  const md = adfToMarkdown(doc(para(text(' two words ', strong), text('x'))));
  expect(md).toBe(' **two words** x');
});

test('whitespace-only marked text is left untouched', () => {
  const md = adfToMarkdown(
    doc(para(text('a', strong), text(' ', strong), text('b', strong)))
  );
  expect(md).toBe('**a** **b**');
});

test('applies to em, code, strike, underline too (trailing space survives mid-doc)', () => {
  const t = (mark: string) =>
    adfToMarkdown(doc(para(text('x ', [{ type: mark }]), text('y'))));
  expect(t('em')).toBe('_x_ y');
  expect(t('code')).toBe('`x` y');
  expect(t('strike')).toBe('~~x~~ y');
  expect(t('underline')).toBe('<u>x</u> y');
});

test('unmarked text is unaffected', () => {
  expect(adfToMarkdown(doc(para(text('plain text'))))).toBe('plain text');
});

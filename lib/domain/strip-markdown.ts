/**
 * Every generated section is rendered as plain text — the workspace display
 * (`whitespace-pre-wrap`), the final PDF (`@react-pdf/renderer` plain
 * `<Text>`), and the plain-text client email all take the string as-is, with
 * no markdown parser anywhere. Claude nonetheless tends to write markdown
 * (`**bold**`, numbered/bulleted lines) out of habit, especially on Haiku,
 * which then shows up as literal asterisks/list markers in front of the
 * client. The prompt already asks for plain text; this is the deterministic
 * backstop for whenever that instruction gets ignored.
 */
export function stripMarkdownFormatting(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(?<!\*)\*(?!\*)([^*\n]+?)\*(?!\*)/g, "$1")
    .replace(/(?<!_)_(?!_)([^_\n]+?)_(?!_)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}(?:\d+[.)]|[-*•])\s+/gm, "")
    .trim();
}

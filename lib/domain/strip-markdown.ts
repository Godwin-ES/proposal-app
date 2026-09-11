/**
 * Every generated section is rendered as plain text — the workspace display
 * (`whitespace-pre-wrap`), the final PDF (`@react-pdf/renderer` plain
 * `<Text>`), and the plain-text client email all take the string as-is, with
 * no markdown parser anywhere. Claude nonetheless tends to reach for
 * markdown emphasis out of habit, especially on Haiku, which then shows up
 * as literal stray asterisks/hashes to the client. The prompt already asks
 * for plain text; this is the deterministic backstop for whenever that
 * instruction gets ignored.
 *
 * A leading `- ` list marker is deliberately left alone — it's the one
 * listing style these proposal sections actually use and is meant to render
 * as-is. A numbered or `*`/`•` marker is normalized to that same `- ` rather
 * than stripped outright, so the model reaching for the wrong list syntax
 * doesn't collapse a real list into flat, indistinguishable paragraphs.
 */
export function stripMarkdownFormatting(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(?<!\*)\*(?!\*)([^*\n]+?)\*(?!\*)/g, "$1")
    .replace(/(?<!_)_(?!_)([^_\n]+?)_(?!_)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}(?:\d+[.)]|[*•])\s+/gm, "- ")
    .trim();
}

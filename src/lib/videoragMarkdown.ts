function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(
      /\[(\d+:\d{2}(?:\s*-\s*\d+:\d{2})?)\]/g,
      '<span class="msg__timestamp">[$1]</span>',
    );
}

/** Hand-rolled markdown-lite, ported from VideoRAG_Frontend's MessageBubble:
 * ### headings, **bold**, `code`, [m:ss] / [m:ss - m:ss] timestamp pills,
 * -/• or 1. bullet lists, everything else as paragraphs. */
export function renderMarkdown(raw: string): string {
  const lines = raw.split("\n");
  const out: string[] = [];
  let inList = false;

  function closeList() {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  }

  for (const rawLine of lines) {
    const line = escapeHtml(rawLine);

    if (/^###\s+/.test(line)) {
      closeList();
      out.push(`<h4 class="msg__heading">${inline(line.replace(/^###\s+/, ""))}</h4>`);
      continue;
    }

    const bullet = line.match(/^[-•]\s+(.*)/) || line.match(/^\d+\.\s+(.*)/);
    if (bullet) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(bullet[1])}</li>`);
      continue;
    }

    closeList();
    if (line.trim() === "") continue;
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join("");
}

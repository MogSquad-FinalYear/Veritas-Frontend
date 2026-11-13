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

function tableCells(line: string): string[] | null {
    const trimmed = line.trim();
    if (!trimmed.includes("|")) return null;

    const content = trimmed.replace(/^\|/, "").replace(/\|$/, "");
    const cells = content.split("|").map((cell) => cell.trim());
    return cells.length > 1 ? cells : null;
}

function isTableSeparator(line: string): boolean {
    const cells = tableCells(line);
    return cells !== null && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

/** Hand-rolled markdown-lite, ported from VideoRAG_Frontend's MessageBubble:
 * ### headings, **bold**, `code`, [m:ss] / [m:ss - m:ss] timestamp pills,
 * -/• or 1. bullet lists, pipe-delimited tables, everything else as paragraphs. */
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

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const line = escapeHtml(rawLine);

    const headerCells = tableCells(rawLine);
    if (headerCells && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      closeList();
      const rows: string[][] = [];
      i += 2;

      while (i < lines.length) {
        const row = tableCells(lines[i]);
        if (!row) {
          i -= 1;
          break;
        }
        rows.push(row);
        i += 1;
      }

      out.push('<div class="msg__table-wrap"><table class="msg__table">');
      out.push(
        `<thead><tr>${headerCells
          .map((cell) => `<th scope="col">${inline(escapeHtml(cell))}</th>`)
          .join("")}</tr></thead>`,
      );
      if (rows.length > 0) {
        out.push(
          `<tbody>${rows
            .map(
              (row) =>
                `<tr>${headerCells
                  .map((_, index) => `<td>${inline(escapeHtml(row[index] ?? ""))}</td>`)
                  .join("")}</tr>`,
            )
            .join("")}</tbody>`,
        );
      }
      out.push("</table></div>");
      continue;
    }

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

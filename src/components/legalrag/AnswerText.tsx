import type { ReactNode } from "react";
import type { Citation } from "../../lib/api/legalrag";
import { validityTone } from "./ui";

const TOKEN_RE =
  /(\[\[([A-Za-z0-9_./-]{2,40})\]\]|\[([A-Za-z0-9_./-]{2,40})\]|`([^`]+)`|\*\*(.+?)\*\*|__(.+?)__|\*([^*\n]+)\*|_([^_\n]+)_)/g;

const TONE_CLASS: Record<string, string> = {
  success: "bg-[var(--lr-success-soft)] text-[var(--lr-success)]",
  warning: "bg-[var(--lr-warning-soft)] text-[var(--lr-warning)]",
  danger: "bg-[var(--lr-danger-soft)] text-[var(--lr-danger)]",
  info: "bg-[var(--lr-info-soft)] text-[var(--lr-info)]",
  brand: "bg-[var(--lr-brand-soft)] text-[var(--lr-brand)]",
  neutral: "bg-[var(--lr-bg-subtle)] text-[var(--lr-text-muted)]",
};

function InlineContent({
  text,
  citations,
  onCitationClick,
}: {
  text: string;
  citations: Citation[];
  onCitationClick: (citation: Citation) => void;
}) {
  const bySection = new Map(citations.map((c) => [c.section_id.toUpperCase(), c]));
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  TOKEN_RE.lastIndex = 0;

  for (let match = TOKEN_RE.exec(text); match; match = TOKEN_RE.exec(text)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const sectionId = match[2] || match[3];
    const citation = sectionId && bySection.get(sectionId.toUpperCase());
    if (sectionId) {
      const label = match[2] ? `[${sectionId}]` : match[0];
      parts.push(
        citation ? (
          <a
            key={`citation-${key++}`}
            href={`#citation-${citation.section_id}`}
            onClick={(event) => {
              event.preventDefault();
              onCitationClick(citation);
            }}
            className={`inline-flex rounded-md px-1.5 py-0.5 align-baseline font-mono text-[11px] font-semibold no-underline transition-opacity hover:opacity-75 ${TONE_CLASS[validityTone(citation.validity)]}`}
          >
            {label}
          </a>
        ) : (
          <span key={`token-${key++}`} className="font-mono text-[11px] text-[var(--lr-text-faint)]">
            {label}
          </span>
        ),
      );
    } else if (match[4]) {
      parts.push(
        <code
          key={`code-${key++}`}
          className="rounded-md bg-[var(--lr-bg-subtle)] px-1.5 py-0.5 font-mono text-[0.88em] text-[var(--lr-text)]"
        >
          {match[4]}
        </code>,
      );
    } else if (match[5] || match[6]) {
      parts.push(
        <strong key={`strong-${key++}`} className="font-semibold text-[var(--lr-text)]">
          {match[5] || match[6]}
        </strong>,
      );
    } else {
      parts.push(
        <em key={`em-${key++}`} className="italic">
          {match[7] || match[8]}
        </em>,
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderBlocks(
  text: string,
  citations: Citation[],
  onCitationClick: (citation: Citation) => void,
): ReactNode[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(
      <p key={`p-${key++}`}>
        {paragraph.map((line, index) => (
          <span key={index}>
            {index > 0 && <br />}
            <InlineContent text={line} citations={citations} onCitationClick={onCitationClick} />
          </span>
        ))}
      </p>,
    );
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    const List = list.ordered ? "ol" : "ul";
    blocks.push(
      <List key={`list-${key++}`}>
        {list.items.map((item, index) => (
          <li key={index}>
            <InlineContent text={item} citations={citations} onCitationClick={onCitationClick} />
          </li>
        ))}
      </List>,
    );
    list = null;
  };

  lines.forEach((line) => {
    if (/^\s*(?:\*{1,2}|_{1,2})?\s*based\s+on\s*:/i.test(line)) {
      flushParagraph();
      flushList();
      return;
    }
    const heading = line.match(/^\s{0,3}(#{1,4})\s+(.+?)\s*#*\s*$/);
    const bullet = line.match(/^\s*[-*•]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const Heading = heading[1].length === 1 ? "h2" : "h3";
      blocks.push(
        <Heading key={`heading-${key++}`}>
          <InlineContent
            text={heading[2]}
            citations={citations}
            onCitationClick={onCitationClick}
          />
        </Heading>,
      );
    } else if (bullet || ordered) {
      flushParagraph();
      const orderedList = Boolean(ordered);
      if (!list || list.ordered !== orderedList) {
        flushList();
        list = { ordered: orderedList, items: [] };
      }
      list.items.push((bullet || ordered)![1]);
    } else if (line.trim() === "") {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line);
    }
  });
  flushParagraph();
  flushList();
  return blocks;
}

export function AnswerText({
  text,
  citations,
  onCitationClick,
}: {
  text: string;
  citations: Citation[];
  onCitationClick: (citation: Citation) => void;
}) {
  return (
    <div className="lr-markdown text-[14.5px] leading-7 text-[var(--lr-text)]">
      {renderBlocks(text, citations, onCitationClick)}
    </div>
  );
}

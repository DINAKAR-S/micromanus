// Tiny, dependency-free Markdown -> HTML for chat rendering (headings, lists, tables, inline).
export function mdToHtml(src: string): string {
  const esc = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = esc.split("\n");
  const out: string[] = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
  const isRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
  const isSep = (l: string) => /^\s*\|[\s:|-]+\|\s*$/.test(l);
  const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => inline(c.trim()));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // GFM table: header row + separator row + data rows.
    if (isRow(line) && i + 1 < lines.length && isSep(lines[i + 1])) {
      closeList();
      const header = cells(line);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && isRow(lines[j]) && !isSep(lines[j])) { rows.push(cells(lines[j])); j++; }
      out.push(
        `<div class="tablewrap"><table class="mdtable"><thead><tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr></thead>` +
        `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
      );
      i = j - 1;
      continue;
    }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    const li = line.match(/^[-*]\s+(.*)$/);
    if (h) { closeList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); }
    else if (li) { if (!inList) { out.push("<ul>"); inList = true; } out.push(`<li>${inline(li[1])}</li>`); }
    else if (/^\s*---+\s*$/.test(line)) { closeList(); out.push("<hr/>"); }
    else if (!line.trim()) { closeList(); }
    else { closeList(); out.push(`<p>${inline(line)}</p>`); }
  }
  closeList();
  return out.join("");
}

function inline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" style="color:#93a1b8">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s)]+)/g, '$1<a href="$2" target="_blank" rel="noreferrer" style="color:#93a1b8">$2</a>');
}

"""Journal file import parsing (md / docx / zip-of-md)."""

from __future__ import annotations

import re
import zipfile
from datetime import date
from io import BytesIO
from xml.etree import ElementTree as ET

DATE_LINE = re.compile(
    r"^\s*日期[:：]\s*(\d{4})[-年/.](\d{1,2})[-月/.](\d{1,2})日?\s*$",
    re.UNICODE,
)
ISO_INLINE = re.compile(r"(\d{4})-(\d{1,2})-(\d{1,2})")
CN_INLINE = re.compile(r"(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日")


def _pad_date(y: str, m: str, d: str) -> str:
    return f"{y}-{m.zfill(2)}-{d.zfill(2)}"


def _today_iso() -> str:
    return date.today().isoformat()


def _extract_date(lines: list[str]) -> tuple[str, bool, list[str]]:
    rest = list(lines)
    for i in range(min(len(rest), 4)):
        m = DATE_LINE.match(rest[i])
        if m:
            rest.pop(i)
            return _pad_date(m.group(1), m.group(2), m.group(3)), False, rest
    head = "\n".join(rest[:3])
    iso = ISO_INLINE.search(head)
    if iso:
        return _pad_date(iso.group(1), iso.group(2), iso.group(3)), True, rest
    cn = CN_INLINE.search(head)
    if cn:
        return _pad_date(cn.group(1), cn.group(2), cn.group(3)), True, rest
    return _today_iso(), True, rest


def _split_blocks(raw: str) -> list[str]:
    normalized = raw.replace("\r\n", "\n").strip()
    if not normalized:
        return []

    if re.search(r"\n---+\n", f"\n{normalized}\n"):
        return [b.strip() for b in re.split(r"\n---+\n", normalized) if b.strip()]

    if re.search(r"^#\s+", normalized, re.MULTILINE):
        parts = re.split(r"\n(?=#\s+)", normalized)
        return [b.strip() for b in parts if b.strip()]

    loose = [b.strip() for b in re.split(r"\n{2,}", normalized) if b.strip()]
    if len(loose) >= 2:
        merged: list[str] = []
        i = 0
        while i < len(loose):
            chunk = [loose[i]]
            if i + 1 < len(loose) and DATE_LINE.match(loose[i + 1]):
                chunk.append(loose[i + 1])
                i += 1
                if (
                    i + 1 < len(loose)
                    and not DATE_LINE.match(loose[i + 1])
                    and not re.match(r"^#\s+", loose[i + 1])
                ):
                    chunk.append(loose[i + 1])
                    i += 1
            merged.append("\n".join(chunk))
            i += 1
        if len(merged) >= 2:
            return merged

    return [normalized]


def parse_journal_text(raw: str) -> list[dict[str, object]]:
    blocks = _split_blocks(raw)
    entries: list[dict[str, object]] = []

    for idx, block in enumerate(blocks):
        lines = [
            line.replace("\u00a0", " ").rstrip()
            for line in block.split("\n")
        ]
        # trim leading/trailing blanks
        while lines and not lines[0].strip():
            lines.pop(0)
        while lines and not lines[-1].strip():
            lines.pop()
        if not lines:
            continue

        title = re.sub(r"^#+\s*", "", lines[0]).strip() or f"未命名日记 {idx + 1}"
        body_lines = lines[1:]

        if DATE_LINE.match(lines[0]):
            picked_date, inferred, rest = _extract_date(lines)
            title = (
                re.sub(r"^#+\s*", "", rest[0]).strip() if rest else title
            ) or title
            body = "\n".join(rest[1:]).strip() if len(rest) > 1 else "\n".join(rest).strip()
            body = body or title
            excerpt = body[:40] + ("……" if len(body) > 40 else "")
            entries.append(
                {
                    "temp_id": f"t{idx + 1}",
                    "title": title,
                    "event_date": picked_date,
                    "date_inferred": inferred,
                    "excerpt": excerpt,
                    "body": body,
                }
            )
            continue

        event_date, inferred, rest = _extract_date(body_lines if body_lines else [])
        body = "\n".join(rest).strip() or title
        excerpt = body[:40] + ("……" if len(body) > 40 else "")
        entries.append(
            {
                "temp_id": f"t{idx + 1}",
                "title": title,
                "event_date": event_date,
                "date_inferred": inferred,
                "excerpt": excerpt,
                "body": body,
            }
        )

    return entries


def extract_docx_text(data: bytes) -> str:
    with zipfile.ZipFile(BytesIO(data)) as zf:
        try:
            xml = zf.read("word/document.xml")
        except KeyError as exc:
            raise ValueError("无法读取 Word 正文") from exc
    root = ET.fromstring(xml)
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs: list[str] = []
    for p in root.findall(".//w:p", ns):
        texts = [t.text or "" for t in p.findall(".//w:t", ns)]
        paragraphs.append("".join(texts))
    return "\n".join(paragraphs)


def extract_markdown_from_zip(data: bytes) -> str:
    with zipfile.ZipFile(BytesIO(data)) as zf:
        names = sorted(
            n
            for n in zf.namelist()
            if n.lower().endswith(".md") and not n.endswith("/")
        )
        if not names:
            raise ValueError("压缩包内未找到 .md 文件")
        chunks = [zf.read(n).decode("utf-8", errors="replace").strip() for n in names]
    return "\n\n---\n\n".join(chunks)


def bytes_to_preview_entries(filename: str, data: bytes) -> list[dict[str, object]]:
    name = filename.lower()
    if name.endswith((".md", ".markdown", ".txt")) or "." not in name:
        text = data.decode("utf-8", errors="replace")
    elif name.endswith(".docx"):
        text = extract_docx_text(data)
    elif name.endswith(".zip"):
        text = extract_markdown_from_zip(data)
    else:
        raise ValueError("不支持的文件类型")

    entries = parse_journal_text(text)
    if not entries:
        raise ValueError("未能从文件中解析出日记内容，请按模板整理后重试")
    return entries

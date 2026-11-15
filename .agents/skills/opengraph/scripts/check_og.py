#!/usr/bin/env python3
"""Validate Open Graph (og:*) metadata in HTML documents.

Usage:
    python3 check_og.py page.html [more.html ...]
    python3 check_og.py dist/                  # scans *.html recursively
    python3 check_og.py --url https://example.com/pricing
    python3 check_og.py page.html --json
    python3 check_og.py page.html --strict     # warnings also fail the run

Exit codes:
    0  no errors (warnings tolerated unless --strict)
    1  at least one error (or a warning under --strict)
    2  the document could not be read or fetched
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

REQUIRED = ("og:title", "og:type", "og:image", "og:url")
RECOMMENDED = ("og:description", "og:site_name", "og:locale")
SINGLE_VALUE = (
    "og:title",
    "og:type",
    "og:url",
    "og:description",
    "og:site_name",
    "og:locale",
    "og:determiner",
)
ROOTS = ("og:image", "og:video", "og:audio")
STRUCTURED = {
    "og:image": (
        "og:image:url",
        "og:image:secure_url",
        "og:image:type",
        "og:image:width",
        "og:image:height",
        "og:image:alt",
    ),
    "og:video": (
        "og:video:url",
        "og:video:secure_url",
        "og:video:type",
        "og:video:width",
        "og:video:height",
        "og:video:alt",
    ),
    "og:audio": ("og:audio:url", "og:audio:secure_url", "og:audio:type"),
}
URL_PROPERTIES = ("og:url", "og:image", "og:video", "og:audio",
                  "og:image:url", "og:image:secure_url",
                  "og:video:url", "og:video:secure_url",
                  "og:audio:url", "og:audio:secure_url")

KNOWN_TYPES = {
    "website",
    "article",
    "book",
    "profile",
    "payment.link",
    "music.song",
    "music.album",
    "music.playlist",
    "music.radio_station",
    "video.movie",
    "video.episode",
    "video.tv_show",
    "video.other",
}
LOCALE_RE = re.compile(r"^[a-z]{2,3}_[A-Z]{2}$")
MIME_RE = re.compile(r"^[a-z0-9.+-]+/[a-z0-9.+-]+$", re.IGNORECASE)


@dataclass
class Finding:
    severity: str  # "error" | "warning" | "note"
    code: str
    message: str


@dataclass
class Document:
    source: str
    location: str | None = None
    metas: list[tuple[str, str, bool]] = field(default_factory=list)
    plain_metas: list[tuple[str, str]] = field(default_factory=list)
    canonical: str | None = None
    base_href: str | None = None
    title: str | None = None


class HeadParser(HTMLParser):
    """Collect meta/link/title data while tracking whether we are inside <head>."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.metas: list[tuple[str, str, bool]] = []
        self.plain_metas: list[tuple[str, str]] = []
        self.canonical: str | None = None
        self.base_href: str | None = None
        self.title: str | None = None
        self._in_head = False
        self._in_title = False
        self._title_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key.lower(): (value or "") for key, value in attrs}
        if tag == "head":
            self._in_head = True
        elif tag == "title":
            self._in_title = True
        elif tag == "base" and self.base_href is None and values.get("href"):
            self.base_href = values["href"]
        elif tag == "link" and "canonical" in values.get("rel", "").lower().split():
            if self.canonical is None and values.get("href"):
                self.canonical = values["href"]
        elif tag == "meta":
            content = values.get("content", "")
            prop = values.get("property")
            if prop:
                self.metas.append((prop, content, self._in_head))
            elif values.get("name"):
                self.plain_metas.append((values["name"], content))

    def handle_endtag(self, tag: str) -> None:
        if tag == "head":
            self._in_head = False
        elif tag == "title":
            self._in_title = False
            self.title = "".join(self._title_parts).strip() or None

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self._title_parts.append(data)


def parse_document(source: str, html: str, location: str | None = None) -> Document:
    parser = HeadParser()
    parser.feed(html)
    parser.close()
    return Document(
        source=source,
        location=location,
        metas=parser.metas,
        plain_metas=parser.plain_metas,
        canonical=parser.canonical,
        base_href=parser.base_href,
        title=parser.title,
    )


def is_absolute(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme in ("http", "https") and bool(parsed.netloc)


def check(document: Document, base_url: str | None = None) -> list[Finding]:
    findings: list[Finding] = []
    grouped: dict[str, list[str]] = {}
    first_seen: dict[str, str] = {}
    current_root: dict[str, bool] = {prefix.split(":")[1]: False for prefix in ROOTS}

    for prop, content, in_head in document.metas:
        grouped.setdefault(prop, []).append(content)
        first_seen.setdefault(prop, content)

        if not in_head:
            findings.append(
                Finding(
                    "error",
                    "meta-outside-head",
                    f"{prop} is outside <head>; most crawlers will ignore it.",
                )
            )

        if not prop.lower().startswith("og:"):
            continue

        root = next((prefix for prefix in ROOTS if prop == prefix), None)
        if root:
            current_root[root.split(":")[1]] = True
            if not content.strip():
                findings.append(Finding("error", "empty-value", f"{prop} has an empty content value."))
            continue

        for prefix, allowed in STRUCTURED.items():
            if prop in allowed:
                key = prefix.split(":")[1]
                if not current_root[key]:
                    findings.append(
                        Finding(
                            "error",
                            "orphan-structured-property",
                            f"{prop} appears before any {prefix}; structured properties belong "
                            f"immediately after their root tag.",
                        )
                    )
                break

        if prop in URL_PROPERTIES and content.strip() and not is_absolute(content.strip()):
            hint = ""
            if base_url:
                hint = f" Did you mean {urljoin(base_url, content.strip())}?"
            findings.append(
                Finding(
                    "error",
                    "relative-url",
                    f"{prop} must be an absolute http(s) URL, got {content!r}.{hint}",
                )
            )

    for prop in REQUIRED:
        values = grouped.get(prop)
        if not values:
            findings.append(Finding("error", "missing-required", f"Missing required property {prop}."))
        elif not any(value.strip() for value in values):
            findings.append(Finding("error", "empty-value", f"{prop} has no usable value."))

    for prop in RECOMMENDED:
        if prop not in grouped:
            findings.append(Finding("warning", "missing-recommended", f"Missing recommended property {prop}."))

    for prop in SINGLE_VALUE:
        if len(grouped.get(prop, [])) > 1:
            readings = " / ".join(repr(value) for value in grouped[prop])
            findings.append(
                Finding(
                    "error",
                    "duplicate-property",
                    f"{prop} appears {len(grouped[prop])} times ({readings}); the protocol keeps "
                    "the first value, so later ones are silently ignored.",
                )
            )

    images = grouped.get("og:image", [])
    if images:
        if "og:image:alt" not in grouped:
            findings.append(
                Finding(
                    "warning",
                    "missing-image-alt",
                    "og:image is set without og:image:alt; add a description of the image.",
                )
            )
        if len(images) > 1:
            findings.append(
                Finding(
                    "note",
                    "multiple-images",
                    f"{len(images)} og:image values found; this is legal, but the first is preferred "
                    "unless the page is incomplete without them.",
                )
            )
        if "og:image:width" not in grouped or "og:image:height" not in grouped:
            findings.append(
                Finding(
                    "warning",
                    "missing-image-dimensions",
                    "Add og:image:width and og:image:height (ideally 1200x630) so platforms can "
                    "reserve layout space.",
                )
            )
        if "og:image:type" in grouped:
            mime = grouped["og:image:type"][0].strip()
            if not mime.startswith("image/"):
                findings.append(
                    Finding("warning", "bad-image-type", f"og:image:type {mime!r} is not an image MIME type.")
                )

    for prop in ("og:image:width", "og:image:height", "og:video:width", "og:video:height"):
        for value in grouped.get(prop, []):
            if not value.strip().isdigit() or int(value) <= 0:
                findings.append(
                    Finding("error", "bad-dimension", f"{prop} must be a positive integer, got {value!r}.")
                )

    if "og:image:width" in grouped and "og:image:height" in grouped:
        try:
            width = int(grouped["og:image:width"][0])
            height = int(grouped["og:image:height"][0])
            if width and height and abs(width / height - 1.91) > 0.25:
                findings.append(
                    Finding(
                        "note",
                        "image-aspect",
                        f"og:image is {width}x{height} (ratio {width / height:.2f}); 1.91:1 "
                        "(e.g. 1200x630) is the widest-supported shape.",
                    )
                )
        except ValueError:
            pass

    title = first_seen.get("og:title", "")
    if title:
        if len(title) > 70:
            findings.append(
                Finding("warning", "title-too-long", f"og:title is {len(title)} characters; ~60-70 keeps it unclipped.")
            )
    description = first_seen.get("og:description", "")
    if len(description) > 200:
        findings.append(
            Finding(
                "warning",
                "description-too-long",
                f"og:description is {len(description)} characters; ~110-160 reads as a sentence.",
            )
        )

    og_type = first_seen.get("og:type", "").strip()
    if og_type:
        if og_type not in KNOWN_TYPES and ":" not in og_type:
            findings.append(
                Finding(
                    "warning",
                    "unknown-type",
                    f"og:type {og_type!r} is not a protocol type; use website/article/profile or a "
                    "namespaced type such as music.song.",
                )
            )
        if og_type == "article" and "article:published_time" not in grouped:
            findings.append(
                Finding(
                    "note",
                    "article-published-time",
                    "og:type is article but article:published_time is absent; add it when the date exists.",
                )
            )

    locale = first_seen.get("og:locale", "").strip()
    if locale and not LOCALE_RE.match(locale):
        findings.append(
            Finding(
                "warning",
                "bad-locale",
                f"og:locale {locale!r} should be language_TERRITORY, e.g. en_US (underscore, "
                "region uppercase).",
            )
        )

    determiner = first_seen.get("og:determiner", "").strip()
    if determiner and determiner not in ("a", "an", "the", "auto", ""):
        findings.append(
            Finding("warning", "bad-determiner", f"og:determiner {determiner!r} must be a, an, the, auto, or empty.")
        )

    og_url = first_seen.get("og:url", "").strip()
    if og_url and document.canonical:
        canonical = document.canonical.strip()
        if is_absolute(og_url) and is_absolute(canonical) and og_url.rstrip("/") != canonical.rstrip("/"):
            findings.append(
                Finding(
                    "warning",
                    "url-canonical-mismatch",
                    f"og:url ({og_url}) differs from rel=canonical ({canonical}); both identify the page.",
                )
            )

    if not document.canonical:
        findings.append(
            Finding("note", "no-canonical", "No <link rel=canonical> found; og:url is then the only page identity.")
        )

    twitter = {prop.lower(): content for prop, content in document.plain_metas}
    if "twitter:card" in twitter and "og:image" in grouped:
        notes = twitter.get("twitter:card", "")
        if notes.strip() in ("summary", "") and images:
            findings.append(
                Finding(
                    "note",
                    "twitter-card-override",
                    "twitter:card is 'summary' while a wide og:image is present; X will show a small "
                    "thumbnail. Use summary_large_image if that is unintentional.",
                )
            )

    return findings


def summarize(findings: Iterable[Finding]) -> dict[str, int]:
    counts = {"error": 0, "warning": 0, "note": 0}
    for finding in findings:
        counts[finding.severity] += 1
    return counts


def render(document: Document, findings: list[Finding], as_json: bool, verbose: bool) -> str:
    counts = summarize(findings)
    if as_json:
        return json.dumps(
            {
                "source": document.source,
                "summary": counts,
                "findings": [
                    {"severity": f.severity, "code": f.code, "message": f.message} for f in findings
                ],
                "properties": {prop: values for prop, values in grouped_properties(document).items()},
            },
            indent=2,
        )

    lines = [f"{document.source}"]
    if document.title:
        lines.append(f"  <title>: {document.title}")
    if not findings:
        lines.append("  OK: no Open Graph problems found.")
    for severity, label in (("error", "ERROR"), ("warning", "WARN"), ("note", "NOTE")):
        subset = [f for f in findings if f.severity == severity]
        for finding in subset:
            lines.append(f"  {label:5} [{finding.code}] {finding.message}")
    lines.append(
        f"  {counts['error']} error(s), {counts['warning']} warning(s), {counts['note']} note(s)"
    )
    if verbose:
        lines.append("  parsed properties:")
        for prop, values in grouped_properties(document).items():
            for value in values:
                lines.append(f"    {prop} = {value!r}")
    return "\n".join(lines)


def grouped_properties(document: Document) -> dict[str, list[str]]:
    grouped: dict[str, list[str]] = {}
    for prop, content, _ in document.metas:
        grouped.setdefault(prop, []).append(content)
    return grouped


def decode(raw: bytes, content_type: str | None) -> str:
    charset = None
    if content_type:
        match = re.search(r"charset=([\w-]+)", content_type, re.IGNORECASE)
        if match:
            charset = match.group(1)
    if not charset:
        match = re.search(rb"<meta[^>]+charset=[\"']?([\w-]+)", raw[:4096], re.IGNORECASE)
        if match:
            charset = match.group(1).decode("ascii", "ignore")
    try:
        return raw.decode(charset or "utf-8", errors="replace")
    except LookupError:
        return raw.decode("utf-8", errors="replace")


def collect_targets(paths: list[str]) -> list[Path]:
    targets: list[Path] = []
    for raw in paths:
        path = Path(raw)
        if path.is_dir():
            targets.extend(sorted(p for p in path.rglob("*") if p.suffix.lower() in (".html", ".htm")))
        else:
            targets.append(path)
    return targets


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate Open Graph metadata in HTML.")
    parser.add_argument("targets", nargs="*", help="HTML files or directories")
    parser.add_argument("--url", action="append", default=[], help="fetch and check this URL (explicit only)")
    parser.add_argument("--json", action="store_true", help="machine-readable output")
    parser.add_argument("--strict", action="store_true", help="treat warnings as failures")
    parser.add_argument("--base-url", help="resolve relative URLs against this origin in hints")
    parser.add_argument("--verbose", "-v", action="store_true", help="also print parsed properties")
    args = parser.parse_args(argv)

    if not args.targets and not args.url:
        parser.error("provide at least one file, directory, or --url")

    documents: list[Document] = []
    try:
        for target in collect_targets(args.targets):
            raw = target.read_bytes()
            documents.append(parse_document(str(target), decode(raw, None)))
        for url in args.url:
            request = Request(url, headers={"User-Agent": "og-check/1.0"})
            with urlopen(request, timeout=20) as response:  # noqa: S310 - explicit user-supplied URL
                raw = response.read()
                documents.append(parse_document(url, decode(raw, response.headers.get("Content-Type")), url))
    except (OSError, ValueError) as exc:
        print(f"check_og: cannot read document: {exc}", file=sys.stderr)
        return 2

    exit_code = 0
    for document in documents:
        base = args.base_url
        if not base and document.location:
            parsed = urlparse(document.location)
            base = f"{parsed.scheme}://{parsed.netloc}"
        elif not base and document.base_href:
            base = document.base_href
        findings = check(document, base_url=base)
        print(render(document, findings, args.json, args.verbose))
        counts = summarize(findings)
        if counts["error"] or (args.strict and counts["warning"]):
            exit_code = 1

    return exit_code


if __name__ == "__main__":
    sys.exit(main())

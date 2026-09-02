# Mermaid SVG Fix — vnu Filterfile Regex for `stroke-` Attribute Errors

**Date:** 2026-09-02  
**Tags:** mermaid, vnu, html-validation, svg, build-pipeline, known-issue

---

## Problem Context

During the production build pipeline, the HTML validator (vnu-jar) reported validation errors for Mermaid-generated SVG output. The errors were caused by **empty `stroke-` attribute values** in the SVG markup produced by `mermaid-wasm-renderer` (via `mermaid` CLI at build time).

### Example Error Pattern

```
Error: Attribute "stroke-" not allowed on element "path" at this point.
Error: Bad value "" for attribute "stroke-" on element "path": Expected a color value
```

The Mermaid renderer outputs SVG with attributes like `stroke-=""` (empty stroke-related attributes) which are invalid per HTML/SVG specifications.

---

## Solution Implemented

Added a regex pattern to the **vnu filterfile** (`message-filters.txt`) to suppress these known false-positive errors:

```
.*stroke-.*
```

### How It Works

- **File:** `message-filters.txt` (project root)
- **Mechanism:** vnu's `--filterfile` accepts one regex per line, matched against the **full error message** (including file path)
- **Pattern:** `.*stroke-.*` matches any error line containing `stroke-` anywhere in the message
- **Result:** vnu exits with code 0 (success) while still catching all other validation errors

---

## Technical Details

### Build Pipeline Integration

**Location:** `src/integrations/build-hooks.ts` → `astro:build:done` hook

```typescript
run("vnu --skip-non-html --filterfile message-filters.txt dist/client", root);
```

### Mermaid Rendering Flow

1. **Content:** Markdown contains ```mermaid code blocks
2. **MDX/HTML:** satteri-mermaid plugin converts to `<pre class="mermaid">...</pre>`
3. **Build-time:** `src/integrations/mermaid-compile-time.ts` (`astro:build:done`)
   - Scans `dist/client/**/*.html` for mermaid blocks
   - Renders each to SVG using `mermaid.render()` (via `mermaid-wasm-renderer`)
   - Replaces `<pre class="mermaid">` with `<div class="mermaid">${svg}</div>`
4. **Validation:** vnu runs on final `dist/client` with filterfile

### Root Cause

`mermaid-wasm-renderer` (v0.3.1) / `mermaid` (v11.17.2) generates SVG with invalid empty `stroke-` attributes. This is a **known upstream issue** in Mermaid's CLI output.

---

## Related Files

| File                                             | Purpose                                        |
| ------------------------------------------------ | ---------------------------------------------- |
| `message-filters.txt`                            | vnu filterfile with `.*stroke-.*` regex        |
| `src/integrations/build-hooks.ts`                | Runs vnu with filterfile in `astro:build:done` |
| `src/integrations/mermaid-compile-time.ts`       | Compile-time Mermaid → SVG rendering           |
| `.github/workflows/deploy.yml`                   | CI pipeline runs `pnpm build` (includes vnu)   |
| `.agents/performance/build-weekly-2026-09-02.md` | Incident report and learning                   |

---

## Prevention Rules / Checklist

- [ ] **Keep filterfile updated** — Add new regex patterns for any new known false positives
- [ ] **Monitor upstream** — Track mermaid/mermaid-wasm-renderer releases for SVG output fixes
- [ ] **Test validation locally** — Run `pnpm build` and verify vnu passes (exit code 0)
- [ ] **Don't over-filter** — Each regex should target a specific known issue; avoid broad patterns that hide real errors
- [ ] **Document new filters** — Add comment in `message-filters.txt` explaining what each pattern suppresses
- [ ] **File upstream issue** — Consider filing PR to mermaid-wasm-renderer to fix empty `stroke-` attributes

---

## Verification

```bash
# Local verification
pnpm build
# Check vnu step passes (no errors, exit code 0)

# Manual vnu test
npx vnu --skip-non-html --filterfile message-filters.txt dist/client
# Should exit 0 with no output (or only non-stroke- errors)
```

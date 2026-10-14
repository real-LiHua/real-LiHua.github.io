# Knowledge Base Index

**Last Updated:** 2026-09-02

**Maintained By:** Build-Deploy Engineer / Quality-DX Guardian

> [!NOTE] 设施状态（2026-10）
> 项目正按 `REWRITE_PLAN.md` **从零重写**：`src/`、`.github/workflows/`、`.agents/scripts/`、`.agents/tasks/` 均已在工作区就位。
> 文中 `⏸` 标注对应**尚未落地**的部分。`tgcloud/` 目录从未存在；Bot 源码为根级 `handlers/`、`schema.js`。

---

## Entries

| #   | Title                                                                                         | Date       | Tags                                                                                   | Status    |
| --- | --------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------- | --------- |
| 1   | [Mermaid SVG Fix — vnu Filterfile Regex for `stroke-` Attribute Errors](./mermaid-svg-fix.md) | 2026-09-02 | mermaid, vnu, html-validation, svg, build-pipeline, known-issue                        | ✅ Active |
| 2   | [Deployment Procedures — Multi-Target Deployment Process](./deployment-procedures.md)         | 2026-09-02 | deployment, ci-cd, tgcloud, codeberg-pages, github-pages, ipfs, pinata, github-actions | ✅ Active |
| 3   | [Dependency Matrix — Key Dependencies & Update Policies](./dependency-matrix.md)              | 2026-09-02 | dependencies, package-management, update-policy, security, maintenance, pnpm           | ✅ Active |

---

## Categories

### Build & Validation

- [Mermaid SVG Fix](./mermaid-svg-fix.md) — vnu filterfile workaround for Mermaid SVG output bug

### Deployment & CI/CD

- [Deployment Procedures](./deployment-procedures.md) — multi-target deployment (tgcloud + static Pages) via GitHub Actions

### Dependencies & Maintenance

- [Dependency Matrix](./dependency-matrix.md) — Catalog of critical deps with update policies and security practices

---

## Contributing

### Adding New Entries

1. Create `topic-name.md` in `.agents/knowledge/`
2. Follow the template:

   ```markdown
   # Title — Brief Description

   **Date:** YYYY-MM-DD
   **Tags:** comma, separated, tags

   ---

   ## Problem Context

   ...

   ## Solution / Procedure

   ...

   ## Technical Details

   ...

   ## Related Files

   ...

   ## Prevention Rules / Checklist

   - [ ] Item 1
   - [ ] Item 2
   ```

3. Add entry to this index.md table
4. Link from relevant ADR, agent docs, or incident reports

### Maintenance

- **Review quarterly** — Verify entries still accurate
- **Update on incidents** — Add learnings to existing entries
- **Archive obsolete** — Move to `archive/` subdirectory with date prefix
- **Cross-reference** — Link related entries (e.g., mermaid-svg-fix ↔ dependency-matrix)

---

## Related Resources

| Resource                     | Location                                     |
| ---------------------------- | -------------------------------------------- |
| ADR 0002: Draft Isolation    | `docs/adr/0002-draft-isolation-submodule.md` |
| ADR 003: Deployment Strategy | `docs/adr/0003-deployment-strategy.md`       |
| Build Weekly Reports         | `.agents/performance/build-weekly-*.md` ⏸    |
| Build-Deploy Engineer Agent  | `.opencode/agents/build-deploy-engineer.md`  |
| Quality-DX Guardian Agent    | `.opencode/agents/quality-dx-guardian.md`    |
| CI/CD Workflow               | `.github/workflows/deploy.yml`               |
| Project AGENTS.md            | `AGENTS.md`                                  |

---

## Quick Reference

### Common Commands

```bash
# Build + validate (runs all checks)
pnpm build

# Type check only
pnpm check

# Lint + format check
pnpm exec oxlint . && pnpm exec oxfmt --check

# Dependency audit
pnpm audit

# Update dependencies (interactive)
pnpm update --interactive

# Local deployment preview
pnpm preview

# Mermaid SVG validation test
npx vnu --skip-non-html --filterfile message-filters.txt dist/client  # message-filters.txt
```

### Key Files to Monitor

| File                                       | Watch For                   |
| ------------------------------------------ | --------------------------- |
| `message-filters.txt`                      | New vnu filter patterns     |
| `tgcloud.jsonc`                            | 项目配置与部署目标一致性    |
| `pnpm-lock.yaml`                           | Dependency version changes  |
| `.github/workflows/deploy.yml`             | Job failures, new secrets   |
| `src/integrations/mermaid-compile-time.ts` | Mermaid rendering changes ⏸ |

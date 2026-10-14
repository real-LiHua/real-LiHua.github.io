# Test fixtures

E2E specs run against the repository's own content in `src/posts/` (see
`src/posts/hello-world.md` and `src/posts/protected-example.md`), so dedicated
fixture files are not required yet.

When a spec needs isolated data (frontmatter edge cases, MDX components,
auth mocks), add it here and reference it from the spec. See
[`docs/TESTING.md`](../../docs/TESTING.md) §5.

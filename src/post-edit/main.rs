//! `post-edit` — 管理博客文章的命令行工具.
//!
//! Covers the full post lifecycle for a single author:
//!
//! - `new`     — create a post from a template
//! - `edit`    — open `$EDITOR` or preview with `bat`
//! - `list`    — list posts (including drafts), optional `--json`
//! - `delete`  — remove a post (confirmation unless `--force`)
//! - `publish` — move a draft into `src/posts/`, filling `publishDate`
//!
//! Drafts live in `src/posts/drafts/`; the directory a file lives in *is* its
//! published state (see docs/adr/0002-draft-isolation-submodule.md and
//! docs/POST_EDIT_CLI.md). Interactive prompts (skim / editor) fall back to a
//! non-interactive branch when stdin is not a TTY so the tool stays usable in
//! CI and pipelines.

use std::collections::HashMap;
use std::env;
use std::fs;
use std::io::{self, IsTerminal, Write};
use std::path::{Path, PathBuf};
use std::process::Command;

use anyhow::{Context, Result, anyhow, bail};
use bat::PrettyPrinter;
use chrono::Local;
use clap::{Parser, Subcommand};
use gray_matter::{Matter, Pod, engine::YAML};
use itertools::Itertools;
use pinyin::{Pinyin, to_pinyin_vec};
use skim::prelude::*;
use slug::slugify;

/// Directory holding published posts (relative to the repository root).
const POSTS_DIR: &str = "src/posts";
/// Directory holding drafts — excluded from production builds.
const DRAFTS_DIR: &str = "src/posts/drafts";

/// Fields we render a fresh frontmatter block for `new`.
const DEFAULT_AUTHORS: &[&str] = &["real-LiHua"];

#[derive(Parser)]
#[command(
    name = "post-edit",
    version,
    about = "管理博客文章的命令行工具 (Manage blog posts)"
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Create a new post from the standard template.
    New {
        /// Post title (also used to derive the slug unless `--slug` is given).
        title: String,
        /// Create the post in `src/posts/drafts/` instead of `src/posts/`.
        #[arg(long)]
        draft: bool,
        /// Comma-separated tags.
        #[arg(long, value_delimiter = ',')]
        tags: Vec<String>,
        /// Comma-separated authors (defaults to the site owner).
        #[arg(long, value_delimiter = ',')]
        authors: Vec<String>,
        /// Explicit slug (skips pinyin/slug generation).
        #[arg(long)]
        slug: Option<String>,
    },
    /// Open a post in `$EDITOR`, or preview it with `bat`.
    Edit {
        /// Slug or fuzzy keyword. Omit to pick interactively.
        query: Option<String>,
        /// Render the post with `bat` instead of opening an editor.
        #[arg(long)]
        preview: bool,
        /// Editor command, overriding `$EDITOR` / `$VISUAL`.
        #[arg(long)]
        editor: Option<String>,
    },
    /// List posts (published and/or drafts).
    List {
        /// Only list drafts.
        #[arg(long)]
        drafts: bool,
        /// Only list published posts.
        #[arg(long)]
        published: bool,
        /// Machine-readable JSON output.
        #[arg(long)]
        json: bool,
        /// Only list posts carrying this tag.
        #[arg(long)]
        tags: Option<String>,
    },
    /// Delete a post (asks for confirmation unless `--force`).
    Delete {
        /// Slug of the post to delete.
        id: String,
        /// Skip the confirmation prompt.
        #[arg(long)]
        force: bool,
    },
    /// Publish a draft: move it to `src/posts/` and set `publishDate`.
    Publish {
        /// Slug of the draft to publish.
        id: String,
        /// Override the publish date (`YYYY-MM-DD`, defaults to today).
        #[arg(long)]
        date: Option<String>,
    },
}

/// A post discovered on disk, with just enough frontmatter to list and select.
#[derive(Debug, Clone)]
struct PostEntry {
    path: PathBuf,
    slug: String,
    title: String,
    is_draft: bool,
    publish_date: Option<String>,
    tags: Vec<String>,
}

fn main() -> Result<()> {
    match Cli::parse().command {
        Commands::New {
            title,
            draft,
            tags,
            authors,
            slug,
        } => cmd_new(&title, draft, &tags, &authors, slug),
        Commands::Edit {
            query,
            preview,
            editor,
        } => cmd_edit(query.as_deref(), preview, editor.as_deref()),
        Commands::List {
            drafts,
            published,
            json,
            tags,
        } => cmd_list(drafts, published, json, tags.as_deref()),
        Commands::Delete { id, force } => cmd_delete(&id, force),
        Commands::Publish { id, date } => cmd_publish(&id, date.as_deref()),
    }
}

// ===== Commands =====

fn cmd_new(
    title: &str,
    draft: bool,
    tags: &[String],
    authors: &[String],
    slug: Option<String>,
) -> Result<()> {
    let slug = slug.unwrap_or_else(|| slug_from_title(title));
    if slug.is_empty() {
        bail!("could not derive a slug from {title:?}; pass --slug explicitly");
    }

    let dir = if draft { DRAFTS_DIR } else { POSTS_DIR };
    fs::create_dir_all(dir).with_context(|| format!("failed to create {dir}"))?;

    let path = Path::new(dir).join(format!("{slug}.md"));
    if path.exists() {
        bail!("{} already exists", path.display());
    }

    let authors = if authors.is_empty() {
        DEFAULT_AUTHORS.iter().map(|s| (*s).to_string()).collect()
    } else {
        authors.to_vec()
    };

    fs::write(
        &path,
        render_new_post(title, &today_string(), tags, &authors),
    )
    .with_context(|| format!("failed to write {}", path.display()))?;
    println!("created {}", path.display());
    Ok(())
}

fn cmd_edit(query: Option<&str>, preview: bool, editor: Option<&str>) -> Result<()> {
    let posts = collect_posts()?;
    if posts.is_empty() {
        bail!("no posts found under {POSTS_DIR}");
    }

    let post = resolve_post(&posts, query.unwrap_or_default())?;

    if preview {
        let mut printer = PrettyPrinter::new();
        printer.input_file(&post.path);
        printer
            .print()
            .with_context(|| format!("failed to preview {}", post.path.display()))?;
        return Ok(());
    }

    let editor = editor
        .map(str::to_string)
        .or_else(|| env::var("EDITOR").ok())
        .or_else(|| env::var("VISUAL").ok());

    match editor {
        Some(editor) => open_in_editor(&editor, &post.path),
        None => {
            println!("{}", post.path.display());
            Ok(())
        }
    }
}

fn cmd_list(drafts: bool, published: bool, json: bool, tag: Option<&str>) -> Result<()> {
    let mut posts = collect_posts()?;
    if drafts {
        posts.retain(|post| post.is_draft);
    }
    if published {
        posts.retain(|post| !post.is_draft);
    }
    if let Some(tag) = tag {
        posts.retain(|post| post.tags.iter().any(|candidate| candidate == tag));
    }

    if json {
        print_json(&posts);
    } else {
        print_table(&posts);
    }
    Ok(())
}

fn cmd_delete(id: &str, force: bool) -> Result<()> {
    let posts = collect_posts()?;
    let post = resolve_post(&posts, id)?;

    if !force && !confirm(&format!("Delete {}?", post.path.display()))? {
        println!("aborted");
        return Ok(());
    }

    fs::remove_file(&post.path)
        .with_context(|| format!("failed to delete {}", post.path.display()))?;
    println!("deleted {}", post.path.display());
    Ok(())
}

fn cmd_publish(id: &str, date: Option<&str>) -> Result<()> {
    let posts = collect_posts()?;
    let post = resolve_post(&posts, id)?;

    if !post.is_draft {
        bail!("{} is already published", post.slug);
    }

    let file_name = post
        .path
        .file_name()
        .context("draft path has no file name")?;
    let dest = Path::new(POSTS_DIR).join(file_name);
    if dest.exists() {
        bail!("{} already exists", dest.display());
    }

    let date = date.map_or_else(today_string, str::to_string);
    let raw = fs::read_to_string(&post.path)
        .with_context(|| format!("failed to read {}", post.path.display()))?;
    fs::write(&post.path, set_publish_date(&raw, &date))
        .with_context(|| format!("failed to update {}", post.path.display()))?;

    fs::create_dir_all(POSTS_DIR).with_context(|| format!("failed to create {POSTS_DIR}"))?;
    fs::rename(&post.path, &dest).with_context(|| {
        format!(
            "failed to move {} -> {}",
            post.path.display(),
            dest.display()
        )
    })?;

    println!("published {} -> {}", post.slug, dest.display());
    Ok(())
}

// ===== Post discovery & selection =====

fn collect_posts() -> Result<Vec<PostEntry>> {
    let mut posts = Vec::new();

    for (dir, is_draft) in [(POSTS_DIR, false), (DRAFTS_DIR, true)] {
        let dir_path = Path::new(dir);
        if !dir_path.is_dir() {
            continue;
        }

        for entry in fs::read_dir(dir_path).with_context(|| format!("failed to read {dir}"))? {
            let path = entry?.path();
            if !is_markdown(&path) {
                continue;
            }
            posts.push(read_post(path, is_draft)?);
        }
    }

    Ok(posts
        .into_iter()
        .sorted_by(|a, b| a.slug.cmp(&b.slug))
        .collect())
}

fn is_markdown(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }
    matches!(
        path.extension().and_then(|ext| ext.to_str()),
        Some("md" | "mdx")
    )
}

fn read_post(path: PathBuf, is_draft: bool) -> Result<PostEntry> {
    let raw =
        fs::read_to_string(&path).with_context(|| format!("failed to read {}", path.display()))?;
    let (frontmatter, _) = parse_frontmatter(&raw)
        .with_context(|| format!("failed to parse frontmatter in {}", path.display()))?;

    let slug = path
        .file_stem()
        .and_then(|stem| stem.to_str())
        .context("post path has no file stem")?
        .to_string();

    Ok(PostEntry {
        path,
        slug: slug.clone(),
        title: pod_string(&frontmatter, "title").unwrap_or(slug),
        is_draft,
        publish_date: pod_string(&frontmatter, "publishDate"),
        tags: pod_string_list(&frontmatter, "tags"),
    })
}

/// Resolve a user-supplied `query` to exactly one post. Prefers an exact slug
/// match, then a case-insensitive substring match; several matches prompt an
/// interactive picker when a TTY is available.
fn resolve_post(posts: &[PostEntry], query: &str) -> Result<PostEntry> {
    if let Some(exact) = posts.iter().find(|post| post.slug == query) {
        return Ok(exact.clone());
    }

    let mut candidates = if query.is_empty() {
        posts.to_vec()
    } else {
        fuzzy_candidates(posts, query)
    };

    match candidates.len() {
        0 => bail!("no post matches {query:?}"),
        1 => Ok(candidates.remove(0)),
        _ => {
            if io::stdin().is_terminal() && io::stdout().is_terminal() {
                interactive_select(&candidates)
            } else {
                let list = candidates.iter().map(|post| post.slug.as_str()).join(", ");
                bail!("multiple posts match {query:?}: {list}; pass an exact slug");
            }
        }
    }
}

fn fuzzy_candidates(posts: &[PostEntry], query: &str) -> Vec<PostEntry> {
    let needle = query.to_lowercase();
    posts
        .iter()
        .filter(|post| {
            post.slug.to_lowercase().contains(&needle)
                || post.title.to_lowercase().contains(&needle)
        })
        .cloned()
        .collect()
}

fn interactive_select(candidates: &[PostEntry]) -> Result<PostEntry> {
    let labels: Vec<String> = candidates
        .iter()
        .map(|post| format!("{}  ·  {}", post.slug, post.title))
        .collect();

    let options = SkimOptionsBuilder::default()
        .height("40%")
        .build()
        .map_err(|error| anyhow!("failed to configure the picker: {error}"))?;

    let output =
        Skim::run_items(options, labels).map_err(|error| anyhow!("picker failed: {error}"))?;

    let selected = output
        .selected_items
        .first()
        .ok_or_else(|| anyhow!("no post selected"))?;
    let text = selected.text().into_owned();
    let slug = text.split("  ·  ").next().unwrap_or_default().trim();

    candidates
        .iter()
        .find(|post| post.slug == slug)
        .cloned()
        .ok_or_else(|| anyhow!("selection {slug:?} does not match any post"))
}

// ===== Frontmatter =====

fn parse_frontmatter(raw: &str) -> Result<(HashMap<String, Pod>, String)> {
    let matter = Matter::<YAML>::new();
    let parsed = matter.parse::<Pod>(raw)?;
    let frontmatter = match parsed.data {
        Some(pod) => pod.as_hashmap()?,
        None => HashMap::new(),
    };
    Ok((frontmatter, parsed.content))
}

fn pod_string(frontmatter: &HashMap<String, Pod>, key: &str) -> Option<String> {
    match frontmatter.get(key) {
        Some(Pod::String(value)) => Some(value.clone()),
        Some(Pod::Integer(value)) => Some(value.to_string()),
        _ => None,
    }
}

fn pod_string_list(frontmatter: &HashMap<String, Pod>, key: &str) -> Vec<String> {
    match frontmatter.get(key) {
        Some(Pod::Array(items)) => items
            .iter()
            .filter_map(|item| match item {
                Pod::String(value) => Some(value.clone()),
                _ => None,
            })
            .collect(),
        Some(Pod::String(value)) => vec![value.clone()],
        _ => Vec::new(),
    }
}

const FRONTMATTER_FENCE: &str = "---";

fn render_new_post(title: &str, date: &str, tags: &[String], authors: &[String]) -> String {
    let mut out = String::from(FRONTMATTER_FENCE);
    out.push('\n');
    out.push_str(&format!("title: {}\n", quote(title)));
    out.push_str(&format!("publishDate: {date}\n"));
    out.push_str("description: \"\"\n");
    push_list(&mut out, "tags", tags);
    push_list(&mut out, "authors", authors);
    out.push_str(FRONTMATTER_FENCE);
    out.push_str("\n\n");
    out.push_str(&format!("# {title}\n\n"));
    out
}

fn push_list(out: &mut String, key: &str, values: &[String]) {
    if values.is_empty() {
        return;
    }
    out.push_str(&format!("{key}:\n"));
    for value in values {
        out.push_str(&format!("  - {}\n", quote(value)));
    }
}

/// Replace or insert `publishDate` inside the frontmatter block, leaving the
/// rest of the file (including unknown fields) byte-for-byte intact.
fn set_publish_date(raw: &str, date: &str) -> String {
    let mut lines: Vec<String> = raw.lines().map(str::to_string).collect();

    if lines.first().map(String::as_str) != Some(FRONTMATTER_FENCE) {
        return format!("{FRONTMATTER_FENCE}\npublishDate: {date}\n{FRONTMATTER_FENCE}\n\n{raw}");
    }

    let close = lines
        .iter()
        .skip(1)
        .position(|line| line.trim_end() == FRONTMATTER_FENCE)
        .map(|index| index + 1);

    if let Some(close) = close {
        let existing = lines
            .iter()
            .take(close)
            .position(|line| line.trim_start().starts_with("publishDate:"));
        match existing {
            Some(index) => lines[index] = format!("publishDate: {date}"),
            None => lines.insert(close, format!("publishDate: {date}")),
        }
    }

    let mut out = lines.join("\n");
    if raw.ends_with('\n') {
        out.push('\n');
    }
    out
}

// ===== Output =====

fn print_table(posts: &[PostEntry]) {
    for post in posts {
        let status = if post.is_draft { "draft" } else { "published" };
        let date = post.publish_date.as_deref().unwrap_or("-");
        println!(
            "{:<40} {:<10} {:<10} {}",
            post.slug, status, date, post.title
        );
    }
}

fn print_json(posts: &[PostEntry]) {
    let items: Vec<String> = posts
        .iter()
        .map(|post| {
            let publish_date = post
                .publish_date
                .as_deref()
                .map_or_else(|| "null".to_string(), |date| format!("\"{}\"", json_escape(date)));
            let tags = post
                .tags
                .iter()
                .map(|tag| format!("\"{}\"", json_escape(tag)))
                .join(", ");
            format!(
                "    {{\n      \"slug\": \"{}\",\n      \"title\": \"{}\",\n      \"draft\": {},\n      \"publishDate\": {},\n      \"path\": \"{}\",\n      \"tags\": [{}]\n    }}",
                json_escape(&post.slug),
                json_escape(&post.title),
                post.is_draft,
                publish_date,
                json_escape(&post.path.display().to_string()),
                tags,
            )
        })
        .collect();

    println!("[\n{}\n]", items.join(",\n"));
}

fn json_escape(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for ch in input.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            control if control.is_control() => {
                out.push_str(&format!("\\u{:04x}", control as u32));
            }
            other => out.push(other),
        }
    }
    out
}

// ===== Helpers =====

fn today_string() -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

fn quote(value: &str) -> String {
    format!("\"{}\"", value.replace('\\', "\\\\").replace('"', "\\\""))
}

fn confirm(prompt: &str) -> Result<bool> {
    if !io::stdin().is_terminal() {
        bail!(
            "refusing to continue without confirmation in a non-interactive session; pass --force"
        );
    }
    print!("{prompt} [y/N] ");
    io::stdout().flush()?;

    let mut input = String::new();
    io::stdin().read_line(&mut input)?;
    Ok(matches!(input.trim().to_lowercase().as_str(), "y" | "yes"))
}

fn open_in_editor(editor: &str, path: &Path) -> Result<()> {
    let mut parts = editor.split_whitespace();
    let program = parts.next().context("editor command is empty")?;
    let status = Command::new(program)
        .args(parts)
        .arg(path)
        .status()
        .with_context(|| format!("failed to launch {program}"))?;
    if !status.success() {
        bail!("editor exited with {status}");
    }
    Ok(())
}

/// Derive a URL slug from a (possibly Chinese) title via pinyin + slug.
fn slug_from_title(title: &str) -> String {
    let mut buffer = String::new();
    for ch in title.chars() {
        if ch.is_ascii_alphanumeric() {
            buffer.push(ch);
        } else if is_cjk(ch) {
            for syllable in to_pinyin_vec(&ch.to_string(), Pinyin::plain) {
                buffer.push_str(syllable);
                buffer.push(' ');
            }
        } else {
            buffer.push(' ');
        }
    }
    slugify(buffer)
}

const fn is_cjk(ch: char) -> bool {
    matches!(
        ch as u32,
        0x3400..=0x4DBF | 0x4E00..=0x9FFF | 0xF900..=0xFAFF
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slugifies_chinese_titles_to_pinyin() {
        assert_eq!(slug_from_title("Hello World"), "hello-world");
        let slug = slug_from_title("Astro 迁移踩坑记");
        assert!(slug.starts_with("astro-"), "unexpected slug: {slug}");
        assert!(!slug.contains(' '), "slug must not contain spaces: {slug}");
    }

    #[test]
    fn renders_frontmatter_block() {
        let rendered = render_new_post(
            "Hello: World",
            "2026-10-12",
            &["web".to_string()],
            &["real-LiHua".to_string()],
        );
        assert!(rendered.starts_with("---\n"));
        assert!(rendered.contains("title: \"Hello: World\"\n"));
        assert!(rendered.contains("publishDate: 2026-10-12\n"));
        assert!(rendered.contains("  - \"web\"\n"));
    }

    #[test]
    fn inserts_publish_date_when_missing() {
        let raw = "---\ntitle: \"Draft\"\n---\n\nBody\n";
        let updated = set_publish_date(raw, "2026-10-12");
        assert!(updated.contains("publishDate: 2026-10-12\n"));
        assert!(updated.contains("Body"));
        assert_eq!(updated.matches("publishDate").count(), 1);
    }

    #[test]
    fn replaces_existing_publish_date() {
        let raw = "---\ntitle: \"Draft\"\npublishDate: 2020-01-01\n---\nBody\n";
        let updated = set_publish_date(raw, "2026-10-12");
        assert!(updated.contains("publishDate: 2026-10-12\n"));
        assert!(!updated.contains("2020-01-01"));
        assert_eq!(updated.matches("publishDate").count(), 1);
    }

    #[test]
    fn escapes_json_strings() {
        assert_eq!(json_escape("a\"b"), "a\\\"b");
        assert_eq!(json_escape("line\nbreak"), "line\\nbreak");
    }
}

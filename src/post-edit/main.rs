use bat::PrettyPrinter;
use chrono::Datelike;
use clap::{Parser, Subcommand};
use gray_matter::engine::YAML;
use gray_matter::Matter;
use pinyin::ToPinyin;
use serde::Deserialize;
use skim::prelude::*;
use slug::slugify;
use std::fs;
use std::io::{Cursor, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

#[derive(Parser, Debug)]
#[command(name = "post-edit")]
#[command(about = "管理博客文章")]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,

    #[arg(short, long, default_value = "src/posts")]
    posts_dir: String,
}

#[derive(Subcommand, Debug)]
enum Commands {
    Preview {
        filepath: String,
    },
    Search {
        #[arg(short, long)]
        query: Option<String>,
    },
}

#[derive(Debug, Clone, Deserialize)]
struct FrontMatter {
    title: Option<String>,
    #[serde(alias = "publishDate")]
    date: Option<String>,
    tags: Option<Vec<String>>,
    description: Option<String>,
    draft: Option<bool>,
}

#[derive(Debug, Clone)]
struct PostInfo {
    date: String,
    description: String,
    filename: String,
    is_draft: bool,
    tags: Vec<String>,
    title: String,
}

fn main() {
    let args = Cli::parse();

    match args.command {
        Some(Commands::Search { query }) => search_posts(&args.posts_dir, query.as_deref()),
        Some(Commands::Preview { filepath }) => preview_file(&filepath),
        None => interactive_menu(&args.posts_dir),
    }
}

fn preview_file(filepath: &str) {
    let path = Path::new(filepath);
    if !path.exists() {
        println!("无预览");
        return;
    }

    let _ = PrettyPrinter::new()
        .input_file(path)
        .language("markdown")
        .grid(true)
        .term_width(80)
        .print();
}

fn interactive_menu(posts_dir: &str) {
    let posts = get_all_posts(posts_dir);

    let mut choices: Vec<(String, String)> = vec![
        ("📝 新建文章".to_owned(), "new".to_owned()),
        ("🔍 搜索文章".to_owned(), "search".to_owned()),
    ];

    choices.extend(posts.iter().map(|post| {
        let draft_mark = if post.is_draft { " [草稿]" } else { "" };
        let tags_str = if post.tags.is_empty() {
            String::new()
        } else {
            format!(" | {}", post.tags.join(", "))
        };
        let display = format!(
            "{} | {}{}{} [{}]",
            post.title, post.date, tags_str, draft_mark, post.filename
        );
        (display, post.filename.clone())
    }));

    let selected = skim_select(&choices, Some(posts_dir));

    match selected.as_str() {
        "new" => create_new_post(posts_dir),
        "search" => {
            let query = read_input("输入搜索关键词: ");
            search_posts(posts_dir, Some(&query));
            interactive_menu(posts_dir);
        }
        s if !s.is_empty() => post_actions(posts_dir, s),
        _ => {}
    }
}

fn post_actions(posts_dir: &str, filename: &str) {
    let filepath = get_full_path(posts_dir, filename);
    if filepath.exists() {
        println!("\n--- 预览 ---\n");
        preview_file(&filepath.to_string_lossy());
        println!("\n--- 预览结束 ---\n");
    }

    let post_info = get_post_info(posts_dir, filename);

    let actions: Vec<(&str, &str)> = if post_info.is_draft {
        vec![
            ("编辑文章", "edit"),
            ("发布文章", "publish"),
            ("设为草稿", "draft"),
            ("删除文章", "delete"),
            ("返回", "back"),
        ]
    } else {
        vec![
            ("编辑文章", "edit"),
            ("设为草稿", "draft"),
            ("删除文章", "delete"),
            ("返回", "back"),
        ]
    };

    let choices: Vec<(String, String)> = actions
        .iter()
        .map(|(label, action)| (label.to_string(), action.to_string()))
        .collect();

    let selected = skim_select(&choices, Some(posts_dir));

    match selected.as_str() {
        "edit" => edit_post(posts_dir, filename),
        "publish" => toggle_draft(posts_dir, filename, false),
        "draft" => toggle_draft(posts_dir, filename, true),
        "delete" => delete_post(posts_dir, filename),
        "back" => interactive_menu(posts_dir),
        _ => {}
    }
}

fn get_full_path(posts_dir: &str, filename: &str) -> PathBuf {
    if filename.starts_with("../drafts/") {
        let drafts_dir = format!("{}/drafts", posts_dir.trim_end_matches("/posts"));
        PathBuf::from(drafts_dir).join(filename.replace("../drafts/", ""))
    } else {
        PathBuf::from(posts_dir).join(filename)
    }
}

fn get_all_posts(dir: &str) -> Vec<PostInfo> {
    let drafts_dir = format!("{}/drafts", dir.trim_end_matches("/posts"));
    let drafts_path = Path::new(&drafts_dir);

    let mut posts: Vec<PostInfo> = fs::read_dir(Path::new(dir))
        .map(|entries| {
            entries
                .filter_map(std::result::Result::ok)
                .filter(|entry| {
                    let path = entry.path();
                    let ext = path.extension();
                    ext.is_some_and(|e| e == "md") || ext.is_some_and(|e| e == "mdx")
                })
                .filter_map(|entry| entry.path().to_str().map(String::from))
                .map(|path| {
                    let filename = Path::new(&path)
                        .file_name()
                        .and_then(std::ffi::OsStr::to_str)
                        .unwrap_or("")
                        .to_owned();
                    get_post_info(dir, &filename)
                })
                .collect()
        })
        .unwrap_or_default();

    if drafts_path.exists() {
        let draft_posts: Vec<PostInfo> = fs::read_dir(drafts_path)
            .map(|entries| {
                entries
                    .filter_map(std::result::Result::ok)
                    .filter(|entry| {
                        let path = entry.path();
                        let ext = path.extension();
                        ext.is_some_and(|e| e == "md") || ext.is_some_and(|e| e == "mdx")
                    })
                    .filter_map(|entry| entry.path().to_str().map(String::from))
                    .map(|path| {
                        let filename = Path::new(&path)
                            .file_name()
                            .and_then(std::ffi::OsStr::to_str)
                            .unwrap_or("")
                            .to_owned();
                        let mut info = get_post_info(&drafts_dir, &filename);
                        info.filename = format!("../drafts/{filename}");
                        info.is_draft = true;
                        info
                    })
                    .collect()
            })
            .unwrap_or_default();
        posts.extend(draft_posts);
    }

    posts.sort_by(|a, b| b.date.cmp(&a.date));
    posts
}

fn get_post_info(dir: &str, filename: &str) -> PostInfo {
    let filepath = format!("{dir}/{filename}");
    let content = fs::read_to_string(&filepath).unwrap_or_default();

    let matter = Matter::<YAML>::new();
    let parsed = matter.parse::<FrontMatter>(&content).ok();
    let frontmatter = parsed.and_then(|p| p.data);
    let title = frontmatter
        .as_ref()
        .and_then(|f| f.title.clone())
        .unwrap_or_else(|| {
            Path::new(filename)
                .file_stem()
                .and_then(std::ffi::OsStr::to_str)
                .unwrap_or("")
                .to_owned()
        });

    PostInfo {
        date: frontmatter
            .as_ref()
            .and_then(|f| f.date.clone())
            .unwrap_or_default(),
        description: frontmatter
            .as_ref()
            .and_then(|f| f.description.clone())
            .unwrap_or_default(),
        filename: filename.to_owned(),
        is_draft: frontmatter.as_ref().and_then(|f| f.draft).unwrap_or(false),
        tags: frontmatter.and_then(|f| f.tags).unwrap_or_default(),
        title,
    }
}

fn extract_filename_from_choice(text: &str) -> Option<String> {
    let start = text.find('[')?;
    let end = text.rfind(']')?;
    if end > start + 1 {
        Some(text[start + 1..end].to_string())
    } else {
        None
    }
}

fn skim_select(choices: &[(String, String)], _posts_dir: Option<&str>) -> String {
    let options = SkimOptionsBuilder::default()
        .height("50%".to_owned())
        .reverse(true)
        .prompt("选择: ".to_owned())
        .no_mouse(true)
        .bind(vec!["ctrl-y:accept".to_string()])
        .build()
        .unwrap();

    let input = choices
        .iter()
        .map(|(title, _)| title.clone())
        .collect::<Vec<_>>()
        .join("\n");

    let item_reader = SkimItemReader::default();
    let receiver = item_reader.of_bufread(Cursor::new(input));
    let selected = Skim::run_with(&options, Some(receiver));

    selected
        .and_then(|sk| {
            sk.selected_items.first().map(|item| {
                let binding = item.text();
                let selected_text = binding.as_ref();
                extract_filename_from_choice(selected_text)
                    .or_else(|| {
                        choices
                            .iter()
                            .find(|(title, _)| title.as_str() == selected_text)
                            .map(|(_, filename)| filename.clone())
                    })
                    .unwrap_or_default()
            })
        })
        .unwrap_or_default()
}

fn search_posts(posts_dir: &str, query: Option<&str>) {
    let posts = get_all_posts(posts_dir);

    let query = query.unwrap_or("").to_lowercase();

    let filtered: Vec<PostInfo> = posts
        .into_iter()
        .filter(|p| {
            query.is_empty()
                || p.title.to_lowercase().contains(&query)
                || p.tags.iter().any(|t| t.to_lowercase().contains(&query))
                || p.description.to_lowercase().contains(&query)
        })
        .collect();

    if filtered.is_empty() {
        println!("没有找到匹配的文章");
        return;
    }

    let choices: Vec<(String, String)> = filtered
        .iter()
        .map(|p| {
            let draft_mark = if p.is_draft { " [草稿]" } else { "" };
            let tags_str = if p.tags.is_empty() {
                String::new()
            } else {
                format!(" | {}", p.tags.join(", "))
            };
            let display = format!("{}{}{} [{}]", p.title, tags_str, draft_mark, p.filename);
            (display, p.filename.clone())
        })
        .collect();

    let selected = skim_select(&choices, Some(posts_dir));

    if !selected.is_empty() {
        post_actions(posts_dir, &selected);
    }
}

fn create_new_post(posts_dir: &str) {
    let title = read_input("请输入文章标题: ");
    if title.is_empty() {
        eprintln!("标题不能为空");
        std::process::exit(1);
    }

    let slug = title_to_pinyin(&title);
    let date = chrono_lite_date();
    let filename = format!("{date}-{slug}.md");
    let filepath = format!("{posts_dir}/{filename}");

    if Path::new(&filepath).exists() {
        eprintln!("文件已存在: {filepath}");
        std::process::exit(1);
    }

    let description = read_input("请输入文章描述 (可选): ");

    let tags_input = read_input("请输入标签，用逗号分隔 (可选): ");
    let tags_str = if tags_input.is_empty() {
        "[]".to_string()
    } else {
        let tags: Vec<String> = tags_input
            .split(',')
            .map(|s| format!("\"{}\"", s.trim()))
            .collect();
        format!("[{}]", tags.join(", "))
    };

    let content = format!(
        "---\ntitle: {title}\ndescription: {description}\ntags: {tags_str}\npublishDate: {date}\ndraft: false\n---\n\n"
    );

    let _ = fs::write(&filepath, content);

    println!("已创建: {filepath}");
    edit_post(posts_dir, &filename);
}

fn edit_post(posts_dir: &str, filename: &str) {
    let filepath = if filename.starts_with("../drafts/") {
        let drafts_dir = format!("{}/drafts", posts_dir.trim_end_matches("/posts"));
        format!("{drafts_dir}/{}", filename.replace("../drafts/", ""))
    } else {
        format!("{posts_dir}/{filename}")
    };
    let _ = Command::new("nvim")
        .arg(&filepath)
        .stdin(Stdio::inherit())
        .status();
}

fn toggle_draft(posts_dir: &str, filename: &str, is_draft: bool) {
    let filepath = if filename.starts_with("../drafts/") {
        format!(
            "{}/drafts/{}",
            posts_dir.trim_end_matches("/posts"),
            filename.replace("../drafts/", "")
        )
    } else {
        format!("{posts_dir}/{filename}")
    };

    let content = fs::read_to_string(&filepath).unwrap_or_default();
    let new_content = update_frontmatter_bool(&content, "draft", is_draft);

    if let Err(e) = fs::write(&filepath, new_content) {
        eprintln!("写入文件失败: {e}");
        std::process::exit(1);
    }

    println!(
        "已{}: {filepath}",
        if is_draft { "设为草稿" } else { "发布" },
    );
}

fn update_frontmatter_bool(content: &str, key: &str, value: bool) -> String {
    let mut result = String::new();
    let mut in_frontmatter = false;
    let mut modified = false;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed == "---" {
            if !in_frontmatter {
                in_frontmatter = true;
                result.push_str(line);
                result.push('\n');
                continue;
            }
            if !modified {
                result.push_str(&format!("{key}: {value}"));
                result.push('\n');
            }
            result.push_str(line);
            result.push('\n');
            continue;
        }

        if in_frontmatter && trimmed.starts_with(&format!("{key}:")) {
            result.push_str(&format!("{key}: {value}"));
            result.push('\n');
            modified = true;
        } else {
            result.push_str(line);
            result.push('\n');
        }
    }

    result
}

fn delete_post(posts_dir: &str, filename: &str) {
    let filepath = if filename.starts_with("../drafts/") {
        format!(
            "{}/drafts/{}",
            posts_dir.trim_end_matches("/posts"),
            filename.replace("../drafts/", "")
        )
    } else {
        format!("{posts_dir}/{filename}")
    };

    print!("确认删除 {filepath} ? (y/N): ");
    std::io::stdout().flush().ok();

    let mut confirm = String::new();
    std::io::stdin().read_line(&mut confirm).ok();

    if confirm.trim().to_lowercase() == "y" {
        if let Err(e) = fs::remove_file(&filepath) {
            eprintln!("删除失败: {e}");
            std::process::exit(1);
        }
        println!("已删除: {filepath}");
    } else {
        println!("取消删除");
    }
}

fn read_input(prompt: &str) -> String {
    print!("{prompt}");
    std::io::stdout().flush().ok();

    let mut input = String::new();
    std::io::stdin().read_line(&mut input).ok();
    input.trim().to_string()
}

fn title_to_pinyin(title: &str) -> String {
    let contains_chinese = title.chars().any(|c| matches!(c, '\u{4E00}'..='\u{9FFF}'));
    let only_numbers_and_spaces = title
        .chars()
        .all(|c| c.is_ascii_digit() || c.is_whitespace());

    if only_numbers_and_spaces {
        return title.split_whitespace().collect::<Vec<_>>().join("-");
    }

    let pinyin = title
        .to_pinyin()
        .flatten()
        .map(|p| p.plain())
        .collect::<Vec<_>>()
        .join("-")
        .to_lowercase();

    if pinyin.is_empty() || contains_chinese {
        slugify(title)
    } else {
        pinyin
    }
}

fn chrono_lite_date() -> String {
    use chrono::Local;
    let now = Local::now();
    format!("{:04}-{:02}-{:02}", now.year(), now.month(), now.day())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_title_to_pinyin_chinese() {
        assert_eq!(title_to_pinyin("测试文章"), "ce-shi-wen-zhang");
    }

    #[test]
    fn test_title_to_pinyin_english() {
        assert_eq!(title_to_pinyin("Hello World"), "hello-world");
    }

    #[test]
    fn test_title_to_pinyin_mixed() {
        assert_eq!(title_to_pinyin("Rust 编程语言"), "rust-bian-cheng-yu-yan");
    }

    #[test]
    fn test_title_to_pinyin_numbers() {
        assert_eq!(title_to_pinyin("123 Test"), "123-test");
    }

    #[test]
    fn test_title_to_pinyin_special_chars() {
        assert_eq!(title_to_pinyin("Hello! World?"), "hello-world");
    }

    #[test]
    fn test_slugify_fallback() {
        assert_eq!(slugify("Pure English Title"), "pure-english-title");
    }

    #[test]
    fn test_title_to_pinyin_numbers_only() {
        assert_eq!(title_to_pinyin("123"), "123");
        assert_eq!(title_to_pinyin("123 456"), "123-456");
    }

    #[test]
    fn test_update_frontmatter_bool_set_true() {
        let content = "---\ntitle: Test\ndraft: false\n---\n\nHello";
        let result = update_frontmatter_bool(content, "draft", true);
        assert!(result.contains("draft: true"));
    }

    #[test]
    fn test_update_frontmatter_bool_set_false() {
        let content = "---\ntitle: Test\ndraft: true\n---\n\nHello";
        let result = update_frontmatter_bool(content, "draft", false);
        assert!(result.contains("draft: false"));
    }

    #[test]
    fn test_update_frontmatter_bool_add_new_key() {
        let content = "---\ntitle: Test\n---\n\nHello";
        let result = update_frontmatter_bool(content, "draft", true);
        assert!(result.contains("draft: true"));
    }

    #[test]
    fn test_update_frontmatter_bool_preserves_content() {
        let content = "---\ntitle: Test\ndate: 2024-01-01\n---\n\nHello World";
        let result = update_frontmatter_bool(content, "draft", false);
        assert!(result.contains("title: Test"));
        assert!(result.contains("date: 2024-01-01"));
        assert!(result.contains("draft: false"));
        assert!(result.contains("Hello World"));
    }

    #[test]
    fn test_chrono_lite_date_format() {
        let date = chrono_lite_date();
        assert!(date.len() == 10);
        assert!(date.chars().nth(4) == Some('-'));
        assert!(date.chars().nth(7) == Some('-'));
    }

    #[test]
    fn test_extract_filename_from_choice() {
        let text = "测试文章 | 2024-01-01 | tag1 [post.md]";
        assert_eq!(
            extract_filename_from_choice(text),
            Some("post.md".to_string())
        );
    }

    #[test]
    fn test_extract_filename_from_choice_without_delimiters() {
        let text = "测试文章 | 2024-01-01";
        assert_eq!(extract_filename_from_choice(text), None);
    }

    #[test]
    fn test_extract_filename_from_choice_with_brackets() {
        let text = "test [file-with-dash.md]";
        assert_eq!(
            extract_filename_from_choice(text),
            Some("file-with-dash.md".to_string())
        );
    }
}

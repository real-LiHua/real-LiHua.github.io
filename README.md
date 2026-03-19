# blog

[![State-of-the-art Shitcode](https://img.shields.io/static/v1?label=State-of-the-art&message=Shitcode&color=7B5804)](https://github.com/trekhleb/state-of-the-art-shitcode)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/real-LiHua/real-LiHua.github.io)

## Description

This project is a blog built using [Astro](https://astro.build/), a modern static site generator. It's designed to be deployed on [Cloudflare Workers](https://workers.cloudflare.com/), utilizing features like Workers' asset hosting and observability.

## Key Features

- Static site generation with Astro + MDX.
- Deployment to Cloudflare Workers.
- Tailwind CSS 4 and DaisyUI 5 for styling.
- RSS feed and sitemap generation.
- PWA support with @vite-pwa/astro.
- Code protection with astro-obfuscator.
- LLM integration for content generation.
- Uses [Bun](https://bun.sh/) as package manager.
- Uses [oxlint](https://oxc.rs/) and [oxfmt](https://oxc.rs/) for linting and formatting.
- Rust CLI tool for post management.

## Setup

To set up the project locally, follow these steps:

1.  **Install dependencies:**

    The project uses `bun` as a package manager.

    ```bash
    # install bun
    npm install -g bun

    # install dependencies
    bun install
    ```

2.  **Rust CLI tool (optional):**

    The project includes a Rust CLI tool for managing blog posts.

    ```bash
    # install rust toolchain
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

    # build the post-edit tool
    cargo build
    ```

3.  **Run the development server:**

    ```bash
    bun run dev
    ```

    Access the site at `http://localhost:3000`.

4.  **Build for production:**

    ```bash
    bun run build
    ```

    Output will be in the `dist` directory.

5.  **Preview and deploy:**

    ```bash
    bun run preview   # preview locally
    wrangler deploy   # deploy to Cloudflare Workers
    ```

## Links

- **Live Site:** [https://lihua.codeberg.page](https://lihua.codeberg.page)

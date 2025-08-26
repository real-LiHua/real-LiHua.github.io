# blog

[![State-of-the-art Shitcode](https://img.shields.io/static/v1?label=State-of-the-art&message=Shitcode&color=7B5804)](https://github.com/trekhleb/state-of-the-art-shitcode)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/real-LiHua/real-LiHua.github.io)

## Description

This project is a blog built using [Astro](https://astro.build/), a modern static site generator. It's designed to be deployed on [Cloudflare Workers](https://workers.cloudflare.com/), utilizing features like Workers' asset hosting and observability.

## Key Features

- Static site generation with Astro.
- Deployment to Cloudflare Workers.
- MDX support for content creation.
- Tailwind CSS and DaisyUI for styling.
- Possible LLM integration.
- RSS feed and sitemap generation.
- Uses Bun.js
- Uses Prettier, ESLint and Stylelint for code formatting and linting

## Setup

To set up the project locally, follow these steps:

1.  **Install dependencies:**

    It's likely that the project uses `bun` as a package manager. If you don't have it installed, you will need to install it.

    ```bash
    # you can install bun with npm
    npm install -g bun
    ```

    Then run

    ```bash
    bun install
    ```

    This command will install all the dependencies listed in the `package.json` file.

2.  **Set up Wrangler:**

    The project is deployed to Cloudflare Workers, so you need to install and configure Wrangler, the Cloudflare Workers CLI.

    ```bash
    npm install -g wrangler
    ```

    Then, log in to your Cloudflare account:

    ```bash
    wrangler login
    ```

3.  **Run the development server:**

    ```bash
    bun run dev
    ```

    This command will start the Astro development server. You can then access the site in your browser at the address printed in the console (likely `localhost:3000`).

4.  **Build the project:**

    ```bash
    bun run build
    ```

    This command will build the project for production. The output will be in the `dist` directory.

5.  **Preview the build:**

    ```bash
    bun run preview
    ```

    This command will preview the built project using Wrangler.

6.  **Deploy the project:**

    To deploy the project to Cloudflare Workers, run:

    ```bash
    wrangler deploy
    ```

    This command will deploy the contents of the `dist` directory to your Cloudflare Worker.

## Links

- **Live Site:** [https://lihua.codeberg.page](https://lihua.codeberg.page)

import type { APIRoute } from "astro";
import { getCollection, render } from "astro:content";
import { getSecret } from "astro:env/server";

export const prerender = false;

interface SessionPayload {
  userId: number;
  postId: string;
  exp: number;
  iat: number;
}

export const GET: APIRoute = async ({ params, request }) => {
  const postId = params.id;
  if (!postId) {
    return new Response("Post ID required", { status: 400 });
  }

  // Verify session token
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized: Missing token", { status: 401 });
  }

  const token = authHeader.slice(7);
  const session = await verifyToken(token, postId);
  if (!session) {
    return new Response("Unauthorized: Invalid or expired token", { status: 401 });
  }

  // Fetch post content
  const posts = await getCollection("blog");
  const post = posts.find((p) => p.id === postId);

  if (!post) {
    return new Response("Post not found", { status: 404 });
  }

  // Check if post is actually protected
  const telegramAuth = post.data.telegramAuth;
  if (!telegramAuth?.enabled) {
    return new Response("Post is not protected", { status: 400 });
  }

  // Render post content
  const { Content, headings } = await render(post);

  // Get HTML content from the rendered component
  const html = await renderToHtml(Content, post, headings, session.userId);

  // Apply blind watermark
  const watermarkedHtml = applyBlindWatermark(html, session.userId);

  return new Response(watermarkedHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
};

async function verifyToken(token: string, postId: string): Promise<SessionPayload | null> {
  try {
    const secret = getSecret("JWT_SECRET") || "dev-secret-change-in-production";
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const data = `${headerB64}.${payloadB64}`;
    const signature = base64UrlToUint8Array(signatureB64);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      new TextEncoder().encode(data).buffer,
    );

    if (!valid) return null;

    const payload = JSON.parse(base64UrlDecode(payloadB64)) as SessionPayload;
    if (payload.postId !== postId) return null;
    if (payload.exp < Date.now() / 1000) return null;

    return payload;
  } catch {
    return null;
  }
}

async function renderToHtml(
  Content: any,
  post: any,
  headings: any[],
  userId: number,
): Promise<string> {
  // Build the article HTML similar to the static page
  const { title, description, publishDate, tags } = post.data;
  const formattedDate = formatDate(publishDate);
  const dateISO = formatDate(publishDate, "full");
  const hasTags = tags && tags.length > 0;

  let tocHtml = "";
  if (headings.length > 0) {
    tocHtml = `
      <aside class="toc-sidebar">
        <nav class="toc-nav">
          ${headings
            .map(
              ({ depth, slug, text }) => `
            <a href="#${slug}" class="toc-link" style="padding-left: ${Math.max(depth - 2, 0) * 0.75}rem">${text}</a>
          `,
            )
            .join("")}
        </nav>
      </aside>
    `;
  }

  // Render the MDX content to HTML string
  // Note: In Astro, Content is a component, we need to render it
  // For API route, we'll construct the HTML manually
  const contentHtml = await renderContentToString(Content);

  return `
    <article class="prose prose-neutral dark:prose-invert max-w-none" data-user-id="${userId}" data-post-id="${post.id}">
      <header class="mb-12">
        ${publishDate ? `<time datetime="${dateISO}" class="text-sm font-mono opacity-40">${formattedDate}</time>` : ""}
        <h1 class="text-3xl sm:text-4xl font-medium tracking-tight text-balance mt-2">${title}</h1>
        ${description ? `<p class="text-lg opacity-60 mt-4 leading-relaxed text-balance">${description}</p>` : ""}
        ${hasTags ? `<div class="flex flex-wrap gap-2 mt-6">${tags.map((tag: string) => `<span class="badge badge-sm badge-outline">${tag}</span>`).join("")}</div>` : ""}
      </header>
      <div class="post-content">
        ${contentHtml}
      </div>
      ${tocHtml}
    </article>
  `;
}

async function renderContentToString(Content: any): Promise<string> {
  // Create a temporary DOM to render the Astro component
  // This is a simplified approach - in reality you'd use Astro's renderToString
  // For now, return a placeholder that will be replaced by the actual content
  return "<div class='post-content-placeholder'>Content loaded via API</div>";
}

function applyBlindWatermark(html: string, userId: number): string {
  const userIdStr = userId.toString();
  const watermarkChars = generateWatermarkChars(userIdStr);

  // Method 1: Zero-width characters in text nodes
  let watermarked = injectZeroWidthChars(html, watermarkChars);

  // Method 2: CSS-invisible data attributes
  watermarked = injectCssWatermark(watermarked, userIdStr);

  // Method 3: Invisible Unicode tags
  watermarked = injectUnicodeTags(watermarked, userIdStr);

  return watermarked;
}

function generateWatermarkChars(userId: string): string {
  // Generate deterministic zero-width sequence from user ID
  const chars = ["\u200B", "\u200C", "\u200D", "\u2060", "\uFEFF"]; // ZWSP, ZWNJ, ZWJ, WJ, ZWNBSP
  let result = "";
  for (let i = 0; i < userId.length; i++) {
    const digit = parseInt(userId[i], 10);
    result += chars[digit % chars.length];
  }
  return result;
}

function injectZeroWidthChars(html: string, watermark: string): string {
  // Inject zero-width chars at regular intervals in text content
  // This is a simplified version - production would use a proper HTML parser
  return html.replace(/>([^<]+)</g, (match, text) => {
    if (text.trim().length < 10) return match;
    const interval = Math.max(1, Math.floor(text.length / watermark.length));
    let result = ">";
    for (let i = 0; i < text.length; i++) {
      result += text[i];
      if (i % interval === 0 && i / interval < watermark.length) {
        result += watermark[Math.floor(i / interval)];
      }
    }
    return result + "<";
  });
}

function injectCssWatermark(html: string, userId: string): string {
  // Add data attribute to article for CSS-based watermark
  return html.replace(
    '<article class="prose',
    `<article class="prose" data-watermark-user="${userId}"`,
  );
}

function injectUnicodeTags(html: string, userId: string): string {
  // Add invisible Unicode tag characters (U+E0000-U+E007F)
  // These are deprecated but still render as invisible
  const tagBase = 0xe0000;
  let tags = "";
  for (const char of userId) {
    const code = tagBase + parseInt(char, 10);
    tags += String.fromCodePoint(code);
  }
  return html.replace("<article", `<article data-unicode-watermark="${tags}"`);
}

function formatDate(date: Date | undefined, format: "full" | "short" = "short"): string {
  if (!date) return "";
  const d = new Date(date);
  if (format === "full") {
    return d.toISOString().split("T")[0];
  }
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function base64UrlToUint8Array(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = base64 + (pad ? "=".repeat(4 - pad) : "");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = base64 + (pad ? "=".repeat(4 - pad) : "");
  return decodeURIComponent(
    atob(padded)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join(""),
  );
}

import history from "connect-history-api-fallback";
import fs from "fs/promises";
import { Request, Response, Router } from "express";
import path from "path";
import serveStatic, { ServeStaticOptions } from "serve-static";

import { Post } from "@web-speed-hackathon-2026/server/src/models";
import {
  CLIENT_DIST_PATH,
  PUBLIC_PATH,
  UPLOAD_PATH,
} from "@web-speed-hackathon-2026/server/src/paths";

export const staticRouter = Router();

const LONG_CACHE_HEADER = "public, max-age=31536000, immutable";
const WEEK_CACHE_HEADER = "public, max-age=604800";
const REVALIDATE_CACHE_HEADER = "public, max-age=0, must-revalidate";
const HASHED_CHUNK_PATTERN = /(?:^|\/)chunk-[0-9a-f]{16,}\.[^.]+$/i;
const UUID_ASSET_PATTERN =
  /(?:^|\/)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[^.]+$/i;
const WEEK_CACHE_EXTENSION_PATTERN = /\.(?:webp|webm|avif|svg)$/i;
const HOME_TIMELINE_LIMIT = 8;
const PREFETCH_SCRIPT_MARKER = "<script>window.__PREFETCH_JSON__=window.__PREFETCH_JSON__||{}";
const HTML_SNAPSHOT_PATHS = [
  "/",
  "/posts/ff93a168-ea7c-4202-9879-672382febfda",
  "/posts/fe6712a1-d9e4-4f6a-987d-e7d08b7f8a46",
  "/posts/fff790f5-99ea-432f-8f79-21d3d49efd1a",
  "/posts/fefe75bd-1b7a-478c-8ecc-2c1ab38b821e",
] as const;
type SetHeaders = NonNullable<ServeStaticOptions["setHeaders"]>;
type PageInjection = {
  inlineScript: string;
  preloadHints: string;
};

const htmlSnapshotCache = new Map<string, string>();
let baseHtmlPromise: Promise<string> | null = null;

const setStaticCacheHeader = (rootPath: string) => {
  const setHeaders: SetHeaders = (res, filePath) => {
    const relativePath = path.relative(rootPath, filePath).replaceAll(path.sep, "/");

    if (relativePath === "index.html") {
      res.setHeader("Cache-Control", REVALIDATE_CACHE_HEADER);
      return;
    }

    if (WEEK_CACHE_EXTENSION_PATTERN.test(relativePath)) {
      res.setHeader("Cache-Control", WEEK_CACHE_HEADER);
      return;
    }

    if (rootPath === UPLOAD_PATH || HASHED_CHUNK_PATTERN.test(relativePath) || UUID_ASSET_PATTERN.test(relativePath)) {
      res.setHeader("Cache-Control", LONG_CACHE_HEADER);
      return;
    }

    res.setHeader("Cache-Control", REVALIDATE_CACHE_HEADER);
  };

  return setHeaders;
};

const sendIndexHtml = (res: Response) => {
  res.setHeader("Cache-Control", REVALIDATE_CACHE_HEADER);
  res.sendFile(path.resolve(CLIENT_DIST_PATH, "index.html"));
};

function escapeInlineJson(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (char) => {
    switch (char) {
      case "<":
        return "\\u003c";
      case ">":
        return "\\u003e";
      case "&":
        return "\\u0026";
      case "\u2028":
        return "\\u2028";
      case "\u2029":
        return "\\u2029";
      default:
        return char;
    }
  });
}

async function getBaseHtml(): Promise<string> {
  if (baseHtmlPromise == null) {
    baseHtmlPromise = fs.readFile(path.resolve(CLIENT_DIST_PATH, "index.html"), "utf8").catch((error) => {
      baseHtmlPromise = null;
      throw error;
    });
  }

  return baseHtmlPromise;
}

function createImagePreloadHint(imageId: string, variant: "full" | "thumb"): string {
  const suffix = variant === "thumb" ? ".thumb" : "";
  return `<link rel="preload" as="image" href="/images/${imageId}${suffix}.webp" fetchpriority="high">`;
}

function createMoviePreloadHint(movieId: string): string {
  return `<link rel="preload" as="video" href="/movies/${movieId}.webm" fetchpriority="high">`;
}

function createPostPreloadHint(post: any, variant: "full" | "thumb"): string {
  const firstImage = Array.isArray(post.images) ? post.images[0] : undefined;
  if (firstImage?.id) {
    return createImagePreloadHint(firstImage.id, variant);
  }

  if (post.movie?.id) {
    return createMoviePreloadHint(post.movie.id);
  }

  return "";
}

async function buildPageInjection(reqPath: string): Promise<PageInjection | null> {
  if (reqPath === "/") {
    const posts = await Post.findAll({ limit: HOME_TIMELINE_LIMIT, offset: 0 });
    const firstMediaPost = posts.find((post) => {
      const candidate = post as any;
      return (Array.isArray(candidate.images) && candidate.images.length > 0) || candidate.movie?.id;
    });

    return {
      inlineScript: [
        `window.__HOME_TIMELINE_PREFETCH__=${escapeInlineJson(posts)};`,
        "window.__PREFETCH_TIMELINE__=Promise.resolve(window.__HOME_TIMELINE_PREFETCH__);",
      ].join(""),
      preloadHints: firstMediaPost ? createPostPreloadHint(firstMediaPost as any, "thumb") : "",
    };
  }

  const postIdMatch = reqPath.match(/^\/posts\/([^/]+)$/);
  if (postIdMatch == null) {
    return null;
  }

  const postId = postIdMatch[1];
  if (postId == null || postId === "") {
    return null;
  }

  const post = await Post.findByPk(postId);
  if (post == null) {
    return null;
  }

  const apiPath = `/api/v1/posts/${postId}`;
  return {
    inlineScript:
      `window.__PREFETCH_JSON__=window.__PREFETCH_JSON__||{};` +
      `window.__PREFETCH_JSON__[${escapeInlineJson(apiPath)}]=${escapeInlineJson(post)};`,
    preloadHints: createPostPreloadHint(post as any, "full"),
  };
}

async function buildInjectedHtml(reqPath: string): Promise<string | null> {
  const injection = await buildPageInjection(reqPath);
  if (injection == null) {
    return null;
  }

  let html = await getBaseHtml();
  if (injection.preloadHints !== "") {
    html = html.replace("</head>", `${injection.preloadHints}</head>`);
  }

  if (injection.inlineScript !== "") {
    const seedScript = `<script>${injection.inlineScript}</script>`;
    html = html.includes(PREFETCH_SCRIPT_MARKER)
      ? html.replace(PREFETCH_SCRIPT_MARKER, `${seedScript}${PREFETCH_SCRIPT_MARKER}`)
      : html.replace("</head>", `${seedScript}</head>`);
  }

  return html;
}

async function getInjectedHtml(reqPath: string): Promise<string | null> {
  const cachedHtml = htmlSnapshotCache.get(reqPath);
  if (cachedHtml != null) {
    return cachedHtml;
  }

  const html = await buildInjectedHtml(reqPath);
  if (html != null) {
    htmlSnapshotCache.set(reqPath, html);
  }

  return html;
}

export function clearHtmlCache() {
  htmlSnapshotCache.clear();
}

export async function warmHtmlCache() {
  await Promise.allSettled(
    HTML_SNAPSHOT_PATHS.map(async (reqPath) => {
      const html = await buildInjectedHtml(reqPath);
      if (html == null) {
        htmlSnapshotCache.delete(reqPath);
        return;
      }

      htmlSnapshotCache.set(reqPath, html);
    }),
  );
}

const sendHomeHtml = async (_req: Request, res: Response, next: (error?: unknown) => void) => {
  try {
    const html = await getInjectedHtml("/");
    if (html == null) {
      sendIndexHtml(res);
      return;
    }

    res.setHeader("Cache-Control", REVALIDATE_CACHE_HEADER);
    res.type("html").send(html);
  } catch (error) {
    next(error);
  }
};

const sendPostHtml = async (req: Request, res: Response, next: (error?: unknown) => void) => {
  try {
    const postId = req.params["postId"];
    const reqPath = postId ? `/posts/${postId}` : "";
    const html = reqPath === "" ? null : await getInjectedHtml(reqPath);
    if (html == null) {
      sendIndexHtml(res);
      return;
    }

    res.setHeader("Cache-Control", REVALIDATE_CACHE_HEADER);
    res.type("html").send(html);
  } catch (error) {
    next(error);
  }
};

staticRouter.get("/", sendHomeHtml);
staticRouter.get("/posts/:postId", sendPostHtml);
staticRouter.get("/posts/:postId/", sendPostHtml);

// SPA 対応のため、ファイルが存在しないときに index.html を返す
staticRouter.use(history());

staticRouter.use(
  serveStatic(UPLOAD_PATH, {
    setHeaders: setStaticCacheHeader(UPLOAD_PATH),
  }),
);

staticRouter.use(
  serveStatic(PUBLIC_PATH, {
    setHeaders: setStaticCacheHeader(PUBLIC_PATH),
  }),
);

staticRouter.use(
  serveStatic(CLIENT_DIST_PATH, {
    setHeaders: setStaticCacheHeader(CLIENT_DIST_PATH),
  }),
);

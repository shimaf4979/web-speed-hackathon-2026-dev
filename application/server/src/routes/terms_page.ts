import {
  TERMS_ARTICLE_CLASS_NAME,
  TERMS_ARTICLE_HTML,
  TERMS_PAGE_TITLE,
} from "../../../terms_content.js";

const HOME_PRELOAD_LINK_PATTERN =
  /\s*<link rel="preload" as="image" href="\/images\/029b4b75-bbcc-4aa5-8bd7-e4bb12a33cd3\.thumb\.avif" type="image\/avif" fetchpriority="high">\s*/;

const APP_MAIN_PATTERN =
  /<main class="([^"]*)"><div aria-hidden="true" id="skeleton">[\s\S]*?<\/main>/;

export function renderTermsPage(indexHtml: string) {
  const withTitle = indexHtml.replace("<title>CaX</title>", `<title>${TERMS_PAGE_TITLE}</title>`);
  const withoutHomePreload = withTitle.replace(HOME_PRELOAD_LINK_PATTERN, "\n");
  const withArticle = withoutHomePreload.replace(
    APP_MAIN_PATTERN,
    (_match, className: string) =>
      `<main class="${className}"><article class="${TERMS_ARTICLE_CLASS_NAME}">${TERMS_ARTICLE_HTML}</article></main>`,
  );

  if (withArticle === withoutHomePreload) {
    throw new Error("Failed to inject terms article into index.html");
  }

  return withArticle;
}

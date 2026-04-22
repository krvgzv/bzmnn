import type { APIRoute } from "astro";
import { execSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SITE = "https://bzmnn.site";

type SitemapItem = {
  url: string;
  lastmod?: string;
};

function walkDir(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      return walkDir(fullPath);
    }

    return [fullPath];
  });
}

function getGitLastModified(filePath: string): string | undefined {
  try {
    const output = execSync(`git log -1 --format=%cI -- "${filePath}"`, {
      encoding: "utf-8",
    }).trim();

    return output || undefined;
  } catch {
    return undefined;
  }
}

function getFileLastModified(filePath: string): string | undefined {
  try {
    return statSync(filePath).mtime.toISOString();
  } catch {
    return undefined;
  }
}

function getLastModified(filePath: string): string | undefined {
  return getGitLastModified(filePath) ?? getFileLastModified(filePath);
}

function pagePathToUrl(filePath: string): string | null {
  const normalized = filePath.replaceAll("\\", "/");

  if (!normalized.startsWith("src/pages/")) return null;
  if (!normalized.endsWith(".astro")) return null;

  if (normalized.endsWith("sitemap.xml.ts")) return null;
  if (normalized.endsWith("/404.astro")) return null;
  if (normalized.includes("/api/")) return null;
  if (normalized.includes("/_")) return null;

  let route = normalized
    .replace(/^src\/pages/, "")
    .replace(/index\.astro$/, "")
    .replace(/\.astro$/, "");

  if (route === "") {
    route = "/";
  }

  if (!route.endsWith("/")) {
    route = `${route}/`;
  }

  return new URL(route, SITE).toString();
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export const GET: APIRoute = async () => {
  const files = walkDir("src/pages");

  const items: SitemapItem[] = files
    .flatMap((filePath) => {
      const url = pagePathToUrl(filePath);

      if (!url) {
        return [];
      }

      return [
        {
          url,
          lastmod: getLastModified(filePath),
        },
      ];
    })
    .sort((a, b) => a.url.localeCompare(b.url));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items
  .map((item) => {
    return `  <url>
    <loc>${escapeXml(item.url)}</loc>
    ${item.lastmod ? `<lastmod>${escapeXml(item.lastmod)}</lastmod>` : ""}
  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
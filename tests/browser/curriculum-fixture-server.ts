/** Local browser -> actual API -> isolated PostgreSQL. Auth/cookies/cache are fixture boundaries. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import {
  curriculumWorkspaceFixture,
  curriculumId,
} from "../helpers/curriculum-workspace-fixture";

async function main() {
  const fixture = await curriculumWorkspaceFixture();
  const root = process.cwd(),
    staticRoot = path.resolve(".next/static");
  const cssDir = path.join(staticRoot, "css");
  if (!fs.existsSync(cssDir))
    throw new Error("Run npm run build before browser QA.");
  const css = fs
    .readdirSync(cssDir)
    .filter((name) => name.endsWith(".css"))
    .map((name) => fs.readFileSync(path.join(cssDir, name), "utf8"))
    .join("\n");
  const entry = `import React from 'react';import {createRoot} from 'react-dom/client';import Page from './app/(dashboard)/admin/exam-standards/page';createRoot(document.getElementById('root')).render(<Page/>);`;
  const boundaries: Record<string, string> = {
    "@/lib/auth-context": `export const useAuth=()=>({activeAcademicYear:{id:'${curriculumId(11)}'}});`,
    "next/navigation":
      "export const useSearchParams=()=>new URLSearchParams(location.search);",
  };
  const bundle = await build({
    stdin: { contents: entry, resolveDir: root, loader: "tsx" },
    bundle: true,
    write: false,
    platform: "browser",
    format: "iife",
    define: { "process.env.NODE_ENV": '"development"' },
    plugins: [
      {
        name: "test-boundaries",
        setup(builder) {
          builder.onResolve({ filter: /.*/ }, (args) =>
            Object.hasOwn(boundaries, args.path)
              ? { path: args.path, namespace: "fixture" }
              : undefined,
          );
          builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
            contents: boundaries[args.path],
            loader: "js",
          }));
        },
      },
    ],
  });
  http
    .createServer(async (request, response) => {
      try {
        const url = new URL(request.url || "/", "http://127.0.0.1:4188");
        if (url.pathname.startsWith("/api/")) {
          const chunks: Buffer[] = [];
          for await (const chunk of request) chunks.push(Buffer.from(chunk));
          const result = await fixture.handle(
            new Request(url, {
              method: request.method,
              ...(chunks.length
                ? {
                    body: Buffer.concat(chunks).toString("utf8"),
                    headers: { "Content-Type": "application/json" },
                  }
                : {}),
            }),
          );
          response.writeHead(result.status, Object.fromEntries(result.headers));
          response.end(await result.text());
          return;
        }
        if (url.pathname === "/fixture.js") {
          response.setHeader("Content-Type", "text/javascript; charset=utf-8");
          response.end(bundle.outputFiles[0].contents);
          return;
        }
        if (url.pathname === "/fixture.css") {
          response.setHeader("Content-Type", "text/css; charset=utf-8");
          response.end(css);
          return;
        }
        if (url.pathname.startsWith("/_next/static/")) {
          const target = path.resolve(
            staticRoot,
            "." +
              decodeURIComponent(url.pathname.slice("/_next/static".length)),
          );
          if (
            !target.startsWith(staticRoot + path.sep) ||
            !fs.existsSync(target)
          ) {
            response.writeHead(404).end();
            return;
          }
          response.setHeader(
            "Content-Type",
            target.endsWith(".woff2")
              ? "font/woff2"
              : "application/octet-stream",
          );
          fs.createReadStream(target).pipe(response);
          return;
        }
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end(
          '<!doctype html><html lang="km"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Curriculum local QA — isolated PostgreSQL</title><link rel="stylesheet" href="/fixture.css"><body style="margin:0;background:#f4f7fe;padding:20px"><div id="root"></div><script src="/fixture.js"></script></body></html>',
        );
      } catch {
        response.writeHead(500).end("Local fixture error");
      }
    })
    .listen(4188, "127.0.0.1", () =>
      console.log(
        "Curriculum local QA: http://127.0.0.1:4188/admin/exam-standards",
      ),
    );
}
void main();

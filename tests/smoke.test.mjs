import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(import.meta.dirname, "..");

function readRepoFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(full));
    } else {
      files.push(path.relative(ROOT, full));
    }
  }
  return files;
}

describe("mandrusia-personalweb smoke checks", () => {
  it("preserves CNAME with www.mandrusia.tech", () => {
    const cname = readRepoFile("CNAME");
    assert.equal(cname, "www.mandrusia.tech");
  });

  it("has no .DS_Store files or leftover TODO/FIXME markers", () => {
    const files = walkFiles(ROOT);
    assert.equal(
      files.some((f) => path.basename(f) === ".DS_Store"),
      false,
      "Repository should not contain .DS_Store files"
    );

    for (const file of ["index.html", "fedora.html", "styles.css"]) {
      const content = readRepoFile(file);
      assert.equal(
        /\b(?:TODO|FIXME|XXX|HACK)\b/.test(content),
        false,
        `${file} should not contain TODO/FIXME/XXX/HACK markers`
      );
    }
  });

  for (const page of ["index.html", "fedora.html"]) {
    it(`${page} has required HTML document metadata and landmarks`, () => {
      const html = readRepoFile(page);
      assert.match(html, /<!doctype html>/i);
      assert.match(html, /<html\s+lang="en">/i);
      assert.match(html, /<meta\s+name="viewport"/i);
      assert.match(html, /<meta\s+name="description"/i);
      assert.match(html, /<title>[^<]+<\/title>/i);
      assert.match(html, /<main[\s>]/i);

      const h1Matches = html.match(/<h1[\s>]/gi) ?? [];
      assert.equal(h1Matches.length, 1, `${page} should have exactly one <h1>`);

      // Verify all external target="_blank" links enforce rel="noopener"
      const blankLinkRegex = /<a\b[^>]*target="_blank"[^>]*>/gi;
      for (const match of html.match(blankLinkRegex) ?? []) {
        assert.match(
          match,
          /rel="[^"]*\bnoopener\b[^"]*"/i,
          `target="_blank" link in ${page} must include rel="noopener": ${match}`
        );
      }

      // Verify local href/src references resolve to files in the repo
      const refRegex = /\b(?:href|src)="([^"]+)"/gi;
      let refMatch;
      const ids = new Set(
        Array.from(html.matchAll(/\bid="([^"]+)"/g), (m) => m[1])
      );
      while ((refMatch = refRegex.exec(html)) !== null) {
        const target = refMatch[1];
        if (target.startsWith("#")) {
          assert.ok(
            ids.has(target.slice(1)),
            `Broken internal fragment ${target} in ${page}`
          );
        } else if (!/^(?:https?:|mailto:|tel:|data:)/i.test(target)) {
          const cleanTarget = target.split(/[?#]/)[0];
          assert.ok(
            fs.existsSync(path.join(ROOT, cleanTarget)),
            `Missing local asset ${target} referenced by ${page}`
          );
        }
      }
    });
  }

  it("index.html inline script parses cleanly as valid JavaScript", () => {
    const html = readRepoFile("index.html");
    const scripts = Array.from(
      html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi),
      (m) => m[1]
    );
    assert.ok(scripts.length >= 1, "index.html should include its reveal script");
    for (const code of scripts) {
      assert.doesNotThrow(() => {
        new vm.Script(code, { filename: "index.html#inline-script" });
      });
    }
  });

  it("styles.css has balanced braces and accessibility/motion media rules", () => {
    const css = readRepoFile("styles.css");
    let depth = 0;
    for (const ch of css) {
      if (ch === "{") depth += 1;
      else if (ch === "}") depth -= 1;
      assert.ok(depth >= 0, "Unexpected closing brace in styles.css");
    }
    assert.equal(depth, 0, "Unbalanced braces in styles.css");

    assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    assert.match(css, /@media\s*\(forced-colors:\s*active\)/);
    assert.match(css, /@media\s+print/);
    assert.equal(
      /\*\s*,\s*\*::before\s*,\s*\*::after[^}]*0\.?01ms/.test(css),
      false,
      "Avoid global 0.01ms transition wildcard under prefers-reduced-motion"
    );
  });
});

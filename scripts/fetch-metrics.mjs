/**
 * 构建时拉取实时指标：GitHub star 数、最新 Release（应用下载入口用）、NuGet 累计下载量。
 * 任何失败都不阻塞构建（保留默认值/旧值），支持 GITHUB_TOKEN / GH_TOKEN 提高限额。
 * 产物：src/generated/metrics.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/generated/metrics.json');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/projects.json'), 'utf8'));
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const ghHeaders = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'codewf-docs-build',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};
const OLD = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};

async function fetchJson(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: ghHeaders, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const repoOf = (url) => {
  const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  return m ? `${m[1]}/${m[2]}` : null;
};

async function main() {
  const stars = {};
  const releases = {};
  const nuget = {};
  const pkgIds = new Set();

  for (const p of MANIFEST.projects) {
    for (const id of p.nuget ?? []) pkgIds.add(id);
  }

  const jobs = [];
  for (const p of MANIFEST.projects) {
    const repo = repoOf(p.repo);
    if (!repo) continue;
    jobs.push(
      fetchJson(`https://api.github.com/repos/${repo}`).then((d) => {
        stars[p.slug] = d ? d.stargazers_count : (OLD.stars?.[p.slug] ?? 0);
      }),
    );
    jobs.push(
      fetchJson(`https://api.github.com/repos/${repo}/releases/latest`).then((d) => {
        if (d && d.tag_name) {
          releases[p.slug] = {
            version: d.tag_name.replace(/^v/i, ''),
            date: (d.published_at || '').slice(0, 10) || null,
            url: d.html_url,
          };
        } else {
          releases[p.slug] = OLD.releases?.[p.slug] ?? null;
        }
      }),
    );
  }
  for (const id of pkgIds) {
    jobs.push(
      fetchJson(`https://azuresearch-usnc.nuget.org/query?q=packageid:${encodeURIComponent(id)}&exact=true&take=1`).then(
        (d) => {
          const hit = d?.data?.[0];
          nuget[id] = hit ? hit.totalDownloads : (OLD.nuget?.[id] ?? 0);
        },
      ),
    );
  }

  await Promise.all(jobs);

  const out = { fetchedAt: new Date().toISOString(), stars, releases, nuget };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log(
    `指标完成：star ${Object.values(stars).reduce((a, b) => a + b, 0)} · releases ${Object.values(releases).filter(Boolean).length}/${MANIFEST.projects.length} · NuGet 包 ${Object.keys(nuget).length}`,
  );
}

main().catch((e) => {
  console.error('指标拉取失败（不阻塞构建）：', e.message);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ fetchedAt: null, stars: {}, releases: {}, nuget: {} }, null, 1));
});

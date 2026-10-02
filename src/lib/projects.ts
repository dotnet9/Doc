import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import manifest from '../data/projects.json';

/** Astro 打包后 import.meta.url 指向 dist/chunks，运行期文件一律以项目根（cwd）解析 */
const fromRoot = (...segs: string[]) => path.resolve(process.cwd(), ...segs);

export interface Project {
  slug: string;
  type: 'app' | 'lib';
  name: string;
  tagline: string;
  description: string;
  repo: string;
  repoPath: string;
  category: string | null;
  tags: string[];
  platforms: string[];
  frameworks: string[];
  nuget?: string[];
  primaryPackage?: string;
  features: { icon: string; title: string; desc: string }[];
  quickStart?: { title: string; desc: string }[];
  screenshots?: { src: string; caption: string }[];
  archImage?: string;
  demoImage?: string;
  samples?: { title: string; lang: string; code: string }[];
  docs?: { sources: string[]; strip: string[] } | null;
  changelog: string[];
  builtWith: string[];
  usedBy: string[];
}

export const projects = manifest.projects as Project[];
export const categories = manifest.categories as Record<string, { label: string }>;
export const platformLabels = manifest.platforms as Record<string, { label: string }>;

export const bySlug = (slug: string) => projects.find((p) => p.slug === slug);
export const byType = (type: 'app' | 'lib') => projects.filter((p) => p.type === type);
export const sectionOf = (p: Project) => (p.type === 'app' ? 'apps' : 'libs');
export const baseOf = (p: Project) => `/${sectionOf(p)}/${p.slug}/`;

export const categoryLabel = (p: Project) =>
  p.category ? (categories[p.category]?.label ?? p.category) : '';

export const repoName = (p: Project) => {
  const m = p.repo.match(/github\.com[/:][^/]+\/([^/.]+)/);
  return m ? m[1] : p.slug;
};

function readJson<T>(file: string | URL, fallback: T): T {
  try {
    const p = typeof file === 'string' ? file : fileURLToPath(file);
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

/* ── 文档 ─────────────────────────── */
export interface DocPage {
  path: string;
  title: string;
  excerpt: string;
  html: string;
  toc: { level: number; text: string; id: string }[];
  sourcePath: string;
}
export interface DocsData {
  pages: DocPage[];
  updatedAt: string | null;
}

export const loadDocs = (slug: string): DocsData =>
  readJson(fromRoot('src', 'generated', 'docs', `${slug}.json`), { pages: [], updatedAt: null });

/** 文档页排序：概述（index）在最前，其余按路径排序 */
export const orderedDocs = (docs: DocsData) => {
  const index = docs.pages.find((p) => p.path === '');
  const rest = docs.pages.filter((p) => p.path !== '').sort((a, b) => a.path.localeCompare(b.path, 'zh-Hans'));
  return [...(index ? [index] : []), ...rest];
};

export const docUrl = (p: Project, pagePath: string) =>
  `${baseOf(p)}docs/${pagePath ? encodeURIComponent(pagePath) + '/' : ''}`;

/* ── 更新日志 ─────────────────────── */
export interface ChangelogEntry {
  version: string;
  date: string | null;
  title: string;
  digest: string;
  html: string;
}
export interface ChangelogData {
  source: string | null;
  updatedAt: string | null;
  entries: ChangelogEntry[];
}

export const loadChangelog = (slug: string): ChangelogData =>
  readJson(fromRoot('src', 'generated', 'changelog', `${slug}.json`), {
    source: null,
    updatedAt: null,
    entries: [],
  });

/** 跨项目更新动态（按日期倒序，取前 n 条） */
export function recentUpdates(n = 8) {
  const items: { project: Project; entry: ChangelogEntry }[] = [];
  for (const p of projects) {
    const cl = loadChangelog(p.slug);
    for (const e of cl.entries.slice(0, 3)) items.push({ project: p, entry: e });
  }
  return items
    .sort((a, b) => (b.entry.date ?? '').localeCompare(a.entry.date ?? ''))
    .slice(0, n);
}

/* ── 指标 ─────────────────────────── */
export interface Metrics {
  fetchedAt: string | null;
  stars: Record<string, number>;
  releases: Record<string, { version: string; date: string | null; url: string } | null>;
  nuget: Record<string, number>;
}

export const loadMetrics = (): Metrics =>
  readJson(fromRoot('src', 'generated', 'metrics.json'), {
    fetchedAt: null,
    stars: {},
    releases: {},
    nuget: {},
  });

export const starText = (n?: number) =>
  !n ? '—' : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);

export const countText = (n?: number) =>
  !n ? '—' : n >= 10000 ? `${(n / 10000).toFixed(1).replace(/\.0$/, '')}w+` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k+` : String(n);

export const logoSrc = (slug: string) => `/logos/${slug}.svg`;

/** 同步元信息（文档页「同步于」展示） */
export const loadSyncInfo = () =>
  readJson<{ mode: string; generatedAt: string; projects: Record<string, { ok: boolean; updatedAt?: string | null }> }>(
    fromRoot('src', 'generated', 'sync.json'),
    { mode: '-', generatedAt: '', projects: {} },
  );

/** 检查构建产物中是否存在某静态资源（用于架构图/演示图条件渲染） */
export const hasAsset = (rel: string) => {
  try {
    return fs.existsSync(fromRoot('public', 'assets', rel));
  } catch {
    return false;
  }
};

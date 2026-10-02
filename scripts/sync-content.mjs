/**
 * 内容同步脚本：把 11 个源仓库的文档 / 更新日志 / logo 同步进本站。
 *
 * 两种模式：
 *   node scripts/sync-content.mjs        本地模式：直接读取兄弟目录的仓库检出（projects.json 的 repoPath）
 *   node scripts/sync-content.mjs --ci   CI 模式：depth-1 克隆 GitHub 仓库到 .source/ 再读取
 *
 * 产物（均为 gitignore，构建时生成）：
 *   public/logos/{slug}.*                 项目 logo
 *   public/assets/{slug}/**               文档内引用的图片等静态资源
 *   src/generated/docs/{slug}.json        渲染好的文档页（html/toc/标题/来源路径）
 *   src/generated/changelog/{slug}.json   解析好的更新日志条目
 *   src/generated/sync.json               同步元信息（各项目文档数与最后提交时间）
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { renderMarkdown } from './lib/markdown.mjs';
import { parseChangelog } from './lib/changelog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CI = process.argv.includes('--ci');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/projects.json'), 'utf8'));
const MD_RE = /\.(md|markdown)$/i;

const walk = (dir, base = dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, base, out);
    else out.push(full);
  }
  return out;
};

const toNs = (p) => path.relative(path.sep, p).split(path.sep).join('/');
const norm = (p) => p.split(path.sep).join('/');

/** 应用 strip 前缀：'docs/a.md' 且 strip=['docs'] → 'a.md' */
function applyStrip(ns, strip) {
  let parts = ns.split('/');
  while (strip.includes(parts[0])) parts = parts.slice(1);
  return parts.join('/');
}

function gitLastDate(repoDir) {
  try {
    return execFileSync('git', ['-C', repoDir, 'log', '-1', '--format=%cs'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function cloneRepo(slug, repoUrl) {
  const dest = path.join(ROOT, '.source', slug);
  fs.rmSync(dest, { recursive: true, force: true });
  console.log(`  clone ${repoUrl} -> .source/${slug}`);
  execFileSync('git', ['clone', '--depth', '1', '--quiet', repoUrl, dest], { stdio: 'inherit' });
  return dest;
}

/** 重写 Markdown 中的相对链接：md → 站内文档 URL；资源 → /assets/{slug}/…（带同名兜底） */
function makeRewriter(ctx, curDir) {
  const docUrl = (ns) => {
    const noExt = ns.replace(MD_RE, '');
    const isIndex = /^(readme|index)(\.markdown)?$/i.test(noExt);
    const tail = isIndex ? '' : encodeURIComponent(noExt) + '/';
    return `/${ctx.type}s/${ctx.slug}/docs/${tail}`;
  };
  const rewrite = (href) => {
    if (/^(https?:|mailto:|#|data:|\/\/)/i.test(href)) return href;
    const [target, anchor = ''] = href.split('#');
    if (!target) return href;
    let ns = path.posix.normalize(path.posix.join(curDir, target.replace(/\\/g, '/')));
    while (ns.startsWith('../')) ns = ns.slice(3); // 逃出文档根的引用按根内路径兜底
    ns = ns.replace(/^\.\//, '');
    const anchorPart = anchor ? `#${anchor}` : '';
    if (MD_RE.test(ns)) {
      if (ctx.mdSet.has(ns)) return docUrl(ns) + anchorPart;
      const hit = ctx.mdByBase.get(ns.split('/').pop().toLowerCase());
      if (hit) return docUrl(hit) + anchorPart;
      return href;
    }
    if (ctx.assetSet.has(ns)) return `/assets/${ctx.slug}/${ns.split('/').map(encodeURIComponent).join('/')}`;
    const hit = ctx.assetByBase.get(ns.split('/').pop().toLowerCase());
    if (hit) return `/assets/${ctx.slug}/${hit.split('/').map(encodeURIComponent).join('/')}`;
    return href;
  };
  return (text) =>
    text
      // [text](href "title")
      .replace(/(\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g, (m, pre, href, post) => pre + rewrite(href) + post)
      // <img src="...">
      .replace(/(<img[^>]+?src=)(["'])([^"']+)\2/gi, (m, pre, q, href) => pre + q + rewrite(href) + q);
}

const results = {};

for (const p of MANIFEST.projects) {
  console.log(`== ${p.slug} (${p.type}) ==`);
  try {
    let srcRoot;
    if (CI) {
      srcRoot = cloneRepo(p.slug, p.repo.endsWith('.git') ? p.repo : p.repo + '.git');
    } else {
      srcRoot = path.resolve(ROOT, p.repoPath);
      if (!fs.existsSync(srcRoot)) {
        console.log(`  跳过：本地目录不存在 ${srcRoot}`);
        results[p.slug] = { ok: false, reason: 'missing-local' };
        continue;
      }
    }

    // 1. 收集命名空间内的 md 与资源文件
    const mdFiles = []; // {ns, abs, sourcePath}
    const assetFiles = []; // {ns, abs}
    const sources = p.docs?.sources ?? [];
    const strip = p.docs?.strip ?? [];
    for (const entry of sources) {
      const abs = path.join(srcRoot, entry);
      if (!fs.existsSync(abs)) {
        console.log(`  警告：文档来源不存在 ${entry}`);
        continue;
      }
      if (fs.statSync(abs).isFile()) {
        const ns = applyStrip(norm(entry), strip);
        (MD_RE.test(ns) ? mdFiles : assetFiles).push({ ns, abs, sourcePath: norm(entry) });
      } else {
        const baseDir = path.dirname(abs);
        for (const f of walk(abs)) {
          const rawNs = applyStrip(norm(path.relative(srcRoot, f)), strip);
          const sourcePath = norm(path.relative(srcRoot, f));
          (MD_RE.test(f) ? mdFiles : assetFiles).push({ ns: rawNs, abs: f, sourcePath });
        }
      }
    }

    // 2. 资源复制 → public/assets/{slug}/
    const assetSet = new Set(assetFiles.map((a) => a.ns));
    const assetByBase = new Map(assetFiles.map((a) => [a.ns.split('/').pop().toLowerCase(), a.ns]));
    const assetDest = path.join(ROOT, 'public', 'assets', p.slug);
    fs.rmSync(assetDest, { recursive: true, force: true });
    for (const a of assetFiles) {
      const dest = path.join(assetDest, a.ns);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(a.abs, dest);
    }

    // 3. Markdown 渲染与链接重写
    const mdSet = new Set(mdFiles.map((m) => m.ns));
    const mdByBase = new Map(mdFiles.map((m) => [m.ns.split('/').pop().toLowerCase(), m.ns]));
    const lastDate = gitLastDate(srcRoot);
    const pages = [];
    for (const m of mdFiles) {
      const raw = fs.readFileSync(m.abs, 'utf8');
      const curDir = path.posix.dirname(m.ns);
      const curDirNs = curDir === '.' ? '' : curDir + '/';
      const rewritten = makeRewriter({ type: p.type, slug: p.slug, mdSet, mdByBase, assetSet, assetByBase }, curDirNs)(raw);
      const { html, toc, title, excerpt } = renderMarkdown(rewritten);
      const noExt = m.ns.replace(MD_RE, '');
      const isIndex = /^(readme|index)(\.markdown)?$/i.test(noExt);
      pages.push({
        path: isIndex ? '' : noExt,
        title,
        excerpt,
        html,
        toc,
        sourcePath: m.sourcePath,
      });
    }

    fs.mkdirSync(path.join(ROOT, 'src/generated/docs'), { recursive: true });
    fs.writeFileSync(
      path.join(ROOT, 'src/generated/docs', `${p.slug}.json`),
      JSON.stringify({ pages, updatedAt: lastDate }, null, 1),
    );

    // 4. 更新日志
    let changelog = { source: null, updatedAt: null, entries: [] };
    for (const f of p.changelog ?? []) {
      const abs = path.join(srcRoot, f);
      if (fs.existsSync(abs)) {
        const raw = fs.readFileSync(abs, 'utf8');
        changelog = { source: f, updatedAt: lastDate, entries: parseChangelog(raw) };
        break;
      }
    }
    fs.mkdirSync(path.join(ROOT, 'src/generated/changelog'), { recursive: true });
    fs.writeFileSync(
      path.join(ROOT, 'src/generated/changelog', `${p.slug}.json`),
      JSON.stringify(changelog, null, 1),
    );

    // 5. logo
    const logoNames = p.logo ? [p.logo] : ['logo.svg', 'logo.png', 'logo.ico'];
    for (const l of logoNames) {
      const abs = path.join(srcRoot, l);
      if (fs.existsSync(abs)) {
        fs.mkdirSync(path.join(ROOT, 'public/logos'), { recursive: true });
        fs.copyFileSync(abs, path.join(ROOT, 'public/logos', `${p.slug}${path.extname(l)}`));
        break;
      }
    }

    results[p.slug] = { ok: true, docs: pages.length, changelog: changelog.entries.length, updatedAt: lastDate };
    console.log(`  文档 ${pages.length} 页 · 日志 ${changelog.entries.length} 条 · 资源 ${assetFiles.length} 个`);
  } catch (err) {
    console.error(`  失败：${err.message}`);
    results[p.slug] = { ok: false, reason: err.message };
  }
}

fs.mkdirSync(path.join(ROOT, 'src/generated'), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, 'src/generated/sync.json'),
  JSON.stringify({ mode: CI ? 'ci' : 'local', generatedAt: new Date().toISOString(), projects: results }, null, 2),
);
const okCount = Object.values(results).filter((r) => r.ok).length;
console.log(`\n同步完成：${okCount}/${MANIFEST.projects.length} 个项目`);

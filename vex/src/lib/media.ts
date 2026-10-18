/**
 * 演示媒体解析：源仓库 `docs/media/` 下的实机截图与 GIF 由同步脚本复制到
 * `/assets/vex/media/`。这里按「候选文件名」挑第一个存在的文件，因此
 * 录制新 GIF 后只需在 content 里加一行文件名，无需改组件。
 *
 * 约定（录制后放进 Vex-Flutter 的 docs/media/）：
 *   views-instant.gif / views-source.gif / views-read.gif / views-mindmap.gif  四种视图
 *   mindmap-structures.gif   六种导图结构切换
 *   markdown-formulas.gif    公式 / 矩阵 / 化学表达式
 *   markdown-mermaid.gif     流程图 / 时序图 / 甘特图
 *   appearance-themes.gif    配色与正文排版切换
 *   export-formats.gif       导出与演示
 * 同名 `.png` 作为静态兜底；两者都不存在时组件退回图标卡片。
 */
import fs from 'node:fs';
import path from 'node:path';

const fromRoot = (...segs: string[]) => path.resolve(process.cwd(), ...segs);

export const exists = (rel: string) => {
  try {
    return fs.existsSync(fromRoot('public', 'assets', 'vex', rel));
  } catch {
    return false;
  }
};

export const assetUrl = (rel: string) => `/assets/vex/${rel.split('/').map(encodeURIComponent).join('/')}`;

/** 按候选顺序返回第一个存在的媒体（含是否为动图），都没有则返回 null */
export function pickMedia(candidates: string[]): { src: string; animated: boolean } | null {
  for (const rel of candidates) {
    const full = rel.startsWith('media/') ? rel : `media/${rel}`;
    if (exists(full)) return { src: assetUrl(full), animated: /\.gif$/i.test(full) };
  }
  return null;
}

/** 便捷包装：`media('views-instant')` → 先找 .gif 再找 .png */
export const media = (base: string) => pickMedia([`${base}.gif`, `${base}.png`]);

/** 站点自带示意图（放在 public/ 根下，如导出格式 SVG），始终可用 */
export const staticFile = (name: string): { src: string; animated: boolean } => ({
  src: `/${name}`,
  animated: false,
});

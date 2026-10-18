import rss from '@astrojs/rss';
import { contentProjects, loadChangelog, baseOf, type ChangelogEntry } from '../lib/projects';
import { SITE } from '../config/site';

/** 整站 RSS：聚合本站承载内容的各项目更新条目（外链项目如维刻 Vex 由子站自行提供订阅） */
export function GET(context) {
  const items = [];
  for (const p of contentProjects) {
    const cl = loadChangelog(p.slug);
    for (const e of cl.entries.slice(0, 10)) {
      items.push({ project: p, entry: e as ChangelogEntry });
    }
  }
  items.sort((a, b) => (b.entry.date ?? '').localeCompare(a.entry.date ?? ''));

  return rss({
    title: '码坊 CodeWF · 开源更新动态',
    description: '码坊出品的开源桌面应用与 .NET 组件库的版本更新聚合。',
    site: context.site ?? SITE.url,
    items: items.slice(0, 60).map(({ project, entry }) => ({
      title: `${project.name}${entry.version ? ` ${entry.version}` : ''} · ${entry.title || '更新'}`,
      description: entry.digest || project.tagline,
      link: new URL(`${baseOf(project)}changelog/`, context.site ?? SITE.url).toString(),
      pubDate: entry.date ? new Date(entry.date) : undefined,
      categories: [project.type === 'app' ? '应用' : '组件库', project.name],
    })),
    customData: '<language>zh-CN</language>',
  });
}

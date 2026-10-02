/** 站点级配置：部署域名、品牌、giscus 与统计接入。 */
export const SITE = {
  /** 线上地址（astro.config.mjs 的 site 与此保持一致） */
  url: 'https://doc.codewf.com',
  /** 品牌区默认文案（首页/列表页显示；项目页自动切换为项目品牌） */
  brand: { name: '码坊', sub: 'CodeWF' },
  /** 主站与 GitHub */
  blog: 'https://codewf.com',
  githubOrg: 'https://github.com/dotnet9',
  /** giscus 评论：在 https://giscus.app 生成后填入；enabled=false 时显示占位框 */
  giscus: {
    enabled: false,
    repo: 'dotnet9/Doc',
    repoId: '', // TODO: giscus.app 生成
    category: 'Announcements',
    categoryId: '', // TODO: giscus.app 生成
    mapping: 'pathname',
    reactionsEnabled: '1',
  },
  /** 访问统计：国内云统计（51.La），key 留空则不注入脚本 */
  analytics: {
    provider: '51la',
    key: '', // TODO: 51.La 站点 ID
  },
} as const;

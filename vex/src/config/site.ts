/** 站点级配置：域名、品牌、仓库、giscus、统计与下载矩阵元数据。 */
export const SITE = {
  /** 线上地址（astro.config.mjs 的 site 与此保持一致） */
  url: 'https://vex.codewf.com',
  /** 品牌 */
  brand: {
    name: '维刻',
    en: 'Vex',
    slogan: '写下想法，看见脉络',
    desc: '本地优先的开源 Markdown 写作空间。',
  },
  /** 源仓库 */
  repo: 'https://github.com/dotnet9/Vex-Flutter',
  releases: 'https://github.com/dotnet9/Vex-Flutter/releases',
  releasesLatest: 'https://github.com/dotnet9/Vex-Flutter/releases/latest',
  issues: 'https://github.com/dotnet9/Vex-Flutter/issues/new/choose',
  /** 母站与作者 */
  home: 'https://codewf.com',
  docsSite: 'https://doc.codewf.com',
  author: '沙漠尽头的狼 / CodeWF',
  /**
   * giscus 评论。启用步骤（缺一步都会退回「评论即将开启」提示，不会渲染坏掉的评论区）：
   *   1. dotnet9/Vex-Flutter → Settings → General → Features → 勾选 Discussions；
   *   2. 在该仓库安装 https://github.com/apps/giscus；
   *   3. 打开 https://giscus.app 选中该仓库，把生成的 categoryId 填到下面。
   * repoId 已按仓库实际值填好；mapping 用 url，因此每页评论互不串台。
   */
  giscus: {
    enabled: true,
    repo: 'dotnet9/Vex-Flutter',
    repoId: 'R_kgDOVMe9Sw',
    category: 'General',
    categoryId: '', // TODO: 开启 Discussions 后填入分类 ID
    mapping: 'url',
    reactionsEnabled: '1',
  },
  /** 访问统计：国内云统计（51.La），key 留空则不注入脚本 */
  analytics: {
    provider: '51la',
    key: '', // TODO: 51.La 站点 ID（vex.codewf.com）
  },
} as const;

/** 平台下载矩阵：主 CTA 统一指向最新 Release，页面按此表给出选择建议与签名现状。 */
export const DOWNLOADS = [
  {
    platform: 'Windows',
    arch: 'x64',
    file: 'Vex-v{version}-windows-x64-setup.exe',
    hint: '下载安装程序后双击安装。',
    note: '暂无 Authenticode 签名，系统可能提示来源。',
    available: true,
  },
  {
    platform: 'macOS',
    arch: 'Universal',
    file: 'Vex-v{version}-universal.dmg',
    hint: '同一个安装包支持 Intel 与 Apple 芯片。',
    note: '暂无 Developer ID 签名与公证，系统可能提示信任问题。',
    available: true,
  },
  {
    platform: 'Linux',
    arch: 'x64 / ARM64',
    file: 'Vex-v{version}-{target}.deb',
    hint: '按系统架构选择，适用于 DEB 系发行版。',
    note: '',
    available: true,
  },
  {
    platform: 'Android',
    arch: 'ARMv7 / ARM64 / x86_64',
    file: 'Vex-v{version}-{abi}.apk',
    hint: '近年的实体手机通常选 ARM64；按设备实际架构选择。',
    note: '含发行签名构建。',
    available: true,
  },
  {
    platform: 'iOS',
    arch: '—',
    file: '',
    hint: '当前仅做无签名编译检查。',
    note: '暂无可安装 IPA，等待分发签名与设备验证。',
    available: false,
  },
  {
    platform: 'HarmonyOS',
    arch: '—',
    file: '',
    hint: '工程、工具链与设备适配待完善。',
    note: '暂无 HAP，不把原型当作已支持。',
    available: false,
  },
] as const;

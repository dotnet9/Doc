# CodeWF Docs（doc.codewf.com · vex.codewf.com）

本仓库包含**两个独立静态站**，共用一份构建脚本约定但各自安装依赖、各自部署：

| 站点 | 目录 | 线上地址 | 定位 |
|---|---|---|---|
| 码坊开源矩阵 | 仓库根目录 | `https://doc.codewf.com` | 展示 + 文档一体：应用/组件库矩阵、各项目文档与更新日志 |
| 维刻 Vex 官网 | `vex/` | `https://vex.codewf.com` | 维刻 Vex（`dotnet9/Vex-Flutter`）的独立官网：落地页 + 文档 + 更新日志 |

维刻 Vex 在汇总站只保留一张外链卡片（点击直达子站），其文档与更新日志只在子站维护；子站结构见下文章节「维刻 Vex 官网（`vex/`）」。

汇总站：

- 线上地址：`https://doc.codewf.com`（部署后生效）
- 技术栈：**Astro**（静态生成）+ 自研文档布局（Starlight 风格三栏）+ Pagefind 本地搜索
- 内容策略：文档留在各源仓库，**构建时自动同步聚合**；项目元数据集中在 `src/data/projects.json`
- 状态：**已实现，待配置部署**

## 快速开始

```bash
npm run install:all   # 安装两个站的依赖（等价于 npm install && npm --prefix vex install）

npm run dev           # 汇总站开发（自动以本地模式同步兄弟仓库的文档）
npm run build         # 汇总站构建：同步 → 拉取指标 → astro build → pagefind 索引
npm run preview       # 预览汇总站 dist

npm run dev:vex       # Vex 子站开发（http://localhost:4322）
npm run build:vex     # Vex 子站构建：同步 Vex-Flutter → 指标 → astro build → pagefind
npm run preview:vex   # 预览 Vex 子站 dist
```

本地同步直接读取兄弟目录的仓库检出（`../QuickApp`、`../../libs/*`、`../Vex-Flutter`），无需联网克隆；
实时指标（star / 最新 Release / NuGet 下载量）拉取失败时自动降级，不阻塞构建。

> 两个站各自维护 `node_modules` 与 `package-lock.json`；`npm run build` 只构建汇总站，Vex 站用 `npm run build:vex`。

## 项目结构

```
src/
  data/projects.json      项目清单（单一事实源：元数据、特性、示例、文档来源；external 字段表示外链项目）
  config/site.ts          站点配置（域名、giscus、统计）
  lib/projects.ts         清单加载与派生数据（文档/日志/指标；contentByType 排除外链项目）
  styles/                 设计令牌（对齐主站 .NET 紫）+ 全局样式
  layouts/Base.astro      页面骨架（亮暗主题、搜索、统计注入）
  components/             页头（品牌按项目切换）/页脚/搜索弹窗/Giscus/Logo
  components/pages/       门面页 / 文档页 / 更新日志页 模板
  pages/                  路由：/ /apps/ /libs/ /apps/{slug}/… /download/ /rss.xml
scripts/
  sync-content.mjs        内容同步（本地模式 / --ci 克隆模式）
  fetch-metrics.mjs       构建时拉取 GitHub / NuGet 指标
  build.mjs               构建编排
  lib/markdown.mjs        Markdown 渲染（TOC、代码高亮、标题 slug）
  lib/changelog.mjs       更新日志解析（版本/日期/HTML）
design/                   评审用 HTML 原型（保留存档）
vex/                      维刻 Vex 官网子站（结构与本表同构，见下文）
```

## 路由架构

```
/                              首页（产品矩阵 + 最近更新动态）
/apps/ · /libs/                应用 / 组件库列表
/apps/{slug}/                  应用门面页（截图墙、特性、文档入口、生态关联）
/apps/{slug}/changelog/        更新日志
/apps/{slug}/docs/{path}/      文档（来自源仓库 docs/）
/libs/{slug}/…                 组件库同构（另含安装命令、包列表、代码示例）
/download/                     统一下载中心
/rss.xml · /sitemap-index.xml  订阅与 SEO
```

清单里带 `external` 的项目（维刻 Vex → `https://vex.codewf.com`）**不生成** `/apps/{slug}/**` 内容页：
卡片与导图节点外链到项目官网，下载页与 RSS 也不列该项目。

## 内容同步机制

```
源仓库 push（docs/**、UpdateLog.md …）
  └─ 源仓库小 workflow 发 repository_dispatch（可选，实时性）
Doc 仓库 deploy workflow 触发条件：
  push main / 每日定时兜底 / repository_dispatch
  ├─ sync-content.mjs --ci：depth-1 克隆 11 个仓库 → 抽取 docs + 日志 + logo
  │   ├─ Markdown 渲染（代码高亮、TOC、标题 slug）
  │   ├─ 相对图片链接重写 → /assets/{slug}/…（带同名兜底）
  │   └─ 更新日志解析为结构化条目
  ├─ fetch-metrics.mjs：star / 最新 Release / NuGet 下载量（失败降级）
  ├─ astro build + pagefind 索引
  └─ rsync dist/ → 服务器
```

## 更新日志统一规范（各仓库约定）

- **文件**：仓库根目录 `UpdateLog.md`（唯一日志文件，不要另建 RELEASES/CHANGELOG 复本）
- **格式**：`# 更新日志` 标题 + `## 版本号 (YYYY-MM-DD)` 分节 + `- ` 要点列表，最新版本在最上
- **同步**：push 后由 notify workflow 自动通知文档站；文档站解析该文件生成更新日志页与首页动态
- **应用内读取**：枝见、维刻的帮助窗口运行时读取此文件（csproj 打包），格式变更需同步应用解析逻辑
- 说明：QuickApp / ClearC 的历史日志已自 GitHub Releases 整理入库
- 例外：`Vex-Flutter` 使用 `apps/vex/assets/documents/CHANGELOG.md`（随应用打包的内置文档），由 Vex 子站在 `src/data/content.json` 里单独配置路径，不走本约定

## 新项目接入（一分钟）

1. 在 `src/data/projects.json` 加一条记录（slug、类型、简介、特性、NuGet 包、文档来源等，字段见现有条目）；
2. 源仓库按惯例提供 `docs/`（或清单里配置 `docs.sources`）与 `UpdateLog.md`（或 `changelog` 配置）；
3. （可选，为了实时性）在源仓库加同步通知 workflow：

```yaml
name: 通知文档站同步
on:
  push:
    branches: [main]
    paths: ['docs/**', 'doc/**', 'UpdateLog.md', 'README.md']
jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.DOC_SITE_PAT }}" \
            -H "Accept: application/vnd.github+json" \
            https://api.github.com/repos/dotnet9/Doc/dispatches \
            -d '{"event_type":"source-updated"}'
```

（`DOC_SITE_PAT` 为具备 `repo` 权限的 PAT，存于各源仓库 Secrets；不加此 workflow 也能工作，文档更新延迟至每日兜底同步。）

## 维刻 Vex 官网（`vex/`）

独立静态站，介绍 `dotnet9/Vex-Flutter`：长落地页（实机截图、四视图、导图、公式/Mermaid、导出、本机 MCP、平台下载矩阵）+ 文档区（36 篇，侧栏分「使用与发布 / 开发与验收」两组）+ 更新日志 + Pagefind 搜索 + RSS/sitemap + giscus，另托管 `design/` 可交互设计原型。

```
vex/
  astro.config.mjs       站点配置（site: https://vex.codewf.com）
  src/data/content.json  内容清单（源仓库、文档分组、标题覆盖）—— 单一事实源
  src/config/site.ts     站点配置（品牌、仓库、giscus、统计、下载矩阵）
  src/lib/content.ts     生成物加载与派生（分组、排序、链接、资产探测）
  src/styles/tokens.css  设计令牌（品牌墨青 #24766B，与设计原型同源）
  src/components/        页头/页脚/搜索弹窗/Giscus + pages/{Landing,DocsPage,ChangelogPage}
  src/pages/             / /docs/{path}/ /changelog/ /rss.xml /404
  scripts/
    sync-content.mjs     同步 Vex-Flutter：docs + README/CONTRIBUTING/SECURITY + CHANGELOG + logo + design/
    fetch-metrics.mjs    拉取仓库 star 与最新 Release（含附件清单）
    build.mjs            构建编排（同步 → 指标 → astro build → pagefind）
    lib/markdown.mjs     Markdown 渲染（与汇总站同源）
    lib/changelog.mjs    更新日志解析（与汇总站同源）
```

与汇总站不同的三处约定：

1. **更新日志来源**是 `apps/vex/assets/documents/CHANGELOG.md`（源仓库没有根目录 `UpdateLog.md`），同步时剥离文件首行标题；
2. **越界链接**（`../CONTRIBUTING.md`、`../packages/…`、`.flutter-version` 等指向仓库根目录的引用）统一改写成 GitHub blob/tree 链接，站内不产生死链；
3. **附件白名单**：只同步图片类资源（png/jpg/gif/webp/svg/zip），`docs/validation/**` 下的性能 JSON 归档不进站，正文里指向它们的链接走 GitHub。

实时同步：`dotnet9/Vex-Flutter` 的 `.github/workflows/notify-docs.yml` 在文档/日志/原型变更时发 `vex-source-updated`，本仓库 `deploy-vex.yml` 收到后重建；未配置 PAT 时由每日定时兜底。

## 实施状态

| 阶段 | 状态 |
|---|---|
| P0 原型评审（design/ 五页） | ✅ 已确认 |
| P1 站点骨架（设计令牌、五类页面模板、亮暗主题） | ✅ |
| P2 清单 + 同步机制（11 项目全量接入） | ✅ |
| P3 功能（Pagefind / giscus / 下载页 / 日志页 / 首页动态 / 实时徽章） | ✅ |
| P4 部署（workflow + 部署手册就绪） | ✅ |
| P5 SEO（sitemap / RSS / meta） | ✅ |
| P6 主站改造 | ✅ 主站 doc 代码已移除、菜单外链化（develop 分支）；资源站 site/doc/ 已删除 |
| P7 维刻 Vex 独立站（`vex/`，落地页 + 文档 + 日志 + 搜索 + 原型托管） | ✅ |

## 与主站/资源站的改造（独立阶段执行）

- [ ] 主站 `CodeWF` 仓库：移除 doc 相关路由、页面与内容类型代码；
- [ ] 主站导航「文档」菜单改为外部链接，指向**站点配置项**（如 `siteSettings.docsSiteUrl`，默认 `https://doc.codewf.com`），他人 clone 部署时改配置即可换域名；
- [ ] `Assets.Dotnet9` 资源站：清理 doc 相关内容；
- [ ] 主站项目展示板块跳转 doc 站对应门面页（互链）。

## 决策记录（2026-10-02 评审确定）

| 决策项 | 结论 |
|---|---|
| 站点定位 | 展示 + 文档一体；为后续新增应用/库预留扩展（清单驱动，接入=加一条 JSON） |
| 技术栈 | Astro；文档区为按已确认原型自研的三栏布局（品牌切换页头与 Starlight 原生样式冲突，故未直接使用 Starlight 主题，文档体验对齐其设计） |
| 内容同步 | 源仓库推送触发（repository_dispatch）+ 每日定时兜底，构建时聚合 |
| 站点语言 | 仅中文（结构预留 i18n） |
| 部署 | 自有服务器，GitHub Actions 构建后 rsync，Nginx 配 doc.codewf.com |
| 品牌策略 | 无站名，按项目切换品牌（docs.microsoft.com 式页头） |
| 站内搜索 | Pagefind（构建时本地索引，Ctrl K 唤起） |
| 下载/安装 | 项目页内嵌 + 统一下载页 |
| 更新日志 | 拉取各仓 UpdateLog 等生成日志页 + 首页动态流 + RSS |
| 评论 / 统计 / 徽章 / SEO | giscus（待配 key）；51.La（待配 key）；star 与 NuGet 下载量构建时拉取；sitemap + RSS 全套 |
| 视觉 | 对齐主站「Fluent 白 × .NET 紫」（#512bd4），暗色为紫黑系 |
| 主站边界 | 移除主站 doc 代码；资源站同步清理；主站文档菜单配置化跳转（不写死域名） |

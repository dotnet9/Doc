# CodeWF Docs（doc.codewf.com）

码坊开源项目文档站：**展示 + 文档一体**的开源矩阵站点，部署于主站 codewf.com 的二级域名。

- 线上地址：`https://doc.codewf.com`（部署后生效）
- 技术栈：**Astro**（静态生成）+ 自研文档布局（Starlight 风格三栏）+ Pagefind 本地搜索
- 内容策略：文档留在各源仓库，**构建时自动同步聚合**；项目元数据集中在 `src/data/projects.json`
- 状态：**已实现，待配置部署**

## 快速开始

```bash
npm install

npm run dev      # 开发（自动以本地模式同步兄弟仓库的文档）
npm run build    # 构建：同步 → 拉取指标 → astro build → pagefind 索引
npm run preview  # 预览 dist
```

本地同步直接读取兄弟目录的仓库检出（`../QuickApp`、`../../libs/*`），无需联网克隆；
实时指标（star / 最新 Release / NuGet 下载量）拉取失败时自动降级，不阻塞构建。

## 项目结构

```
src/
  data/projects.json      项目清单（单一事实源：元数据、特性、示例、文档来源）
  config/site.ts          站点配置（域名、giscus、统计）
  lib/projects.ts         清单加载与派生数据（文档/日志/指标）
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

## 上线前配置清单（TODO）

| 项 | 位置 | 状态 |
|---|---|---|
| DNS | 域名解析 | ✅ `doc.codewf.com` 已解析到 185.245.41.161 |
| Nginx + 证书 | 服务器 | ⬜ 按 [docs/deploy.md](docs/deploy.md) 第 4-5 步执行 |
| 部署 Secrets | Doc 仓库 Settings → Secrets | ⬜ 按 [docs/deploy.md](docs/deploy.md) 第 2-3 步生成密钥并配置 |
| giscus | `src/config/site.ts` | ✅ ID 已填并启用；⬜ 仅剩安装 giscus App（github.com/apps/giscus 选 dotnet9/Doc） |
| 访问统计 | `src/config/site.ts` | ⬜ 51.La 添加站点后填 `analytics.key` |
| 实时同步 | 各源仓库 | ✅ 11 个源仓库已加通知 workflow；⬜ 创建 PAT 配置各仓 `DOC_SITE_PAT`（见 deploy.md 第 7 步） |

## 实施状态

| 阶段 | 状态 |
|---|---|
| P0 原型评审（design/ 五页） | ✅ 已确认 |
| P1 站点骨架（设计令牌、五类页面模板、亮暗主题） | ✅ |
| P2 清单 + 同步机制（11 项目全量接入） | ✅ |
| P3 功能（Pagefind / giscus / 下载页 / 日志页 / 首页动态 / 实时徽章） | ✅（统计待填 51.La key） |
| P4 部署（workflow + 部署手册就绪，服务器侧待执行） | ⏳ 按 docs/deploy.md 执行 |
| P5 SEO（sitemap / RSS / meta） | ✅ |
| P6 主站改造 | ✅ 主站 doc 代码已移除、菜单外链化（develop 分支）；资源站 site/doc/ 已删除 |

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

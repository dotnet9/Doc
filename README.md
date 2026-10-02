# CodeWF Docs（doc.codewf.com）

码坊开源项目文档站：**展示 + 文档一体**的开源矩阵站点，独立部署于主站 codewf.com 的二级域名。

- 线上地址（规划）：`https://doc.codewf.com`
- 技术栈：**Astro + Starlight**（仅中文，预留 i18n 路由结构）
- 状态：**原型设计阶段**，等待原型确认后进入实施

## 设计原型（design/）

零依赖单文件 HTML，**双击即可打开**（logo 通过相对路径引用兄弟仓库的真实 logo 文件）：

| 文件 | 对应线上 URL | 说明 |
|---|---|---|
| `index.html` | `/` | 首页：产品矩阵（应用/组件库分区）+ 最近更新动态流 |
| `app.html` | `/apps/vex/` | 应用门面页示例（维刻 Vex），验证「按项目切换品牌」页头 |
| `lib.html` | `/libs/codewf-eventbus/` | 组件库门面页示例（CodeWF.EventBus）：安装命令、代码示例、包列表 |
| `doc.html` | `/libs/codewf-eventbus/docs/quick-start/` | 文档阅读页：左侧文档树 / 正文 / 右侧本页目录（TOC） |
| `download.html` | `/download/` | 统一下载页：应用安装包 + NuGet 组件库安装命令 |

原型内数据（版本号、star 数、更新日志摘要）均为**示意**，实施时由构建脚本从 GitHub / NuGet API 拉取。

### 待确认点（原型评审清单）

1. **URL 架构**：原型采用 `/apps/{slug}` + `/libs/{slug}` 双分类方案，导航与面包屑按此组织——是否认可？
2. **首页板块**：Hero 文案、应用 2×2 卡片、组件库 3 列卡片（含分类筛选 chips）、最近更新时间线——信息密度与顺序是否合适？
3. **门面页结构**：应用页（截图墙 → 特性 → 快速开始 → 文档入口 → 更新日志 → 生态关联 → 评论）、组件库页（安装 → 代码示例 → 特性 → 包列表 → 架构图 → 文档 → 使用者 → 日志）——板块增减？
4. **文档页三栏布局**与「在 GitHub 编辑此页」「来源仓库 + 同步时间」信息条——是否符合预期？
5. **视觉**：对齐主站「Fluent 白 × .NET 紫」+ 补充的紫黑暗色主题——是否需要调整？

## 决策记录（2026-10-02 评审确定）

| 决策项 | 结论 |
|---|---|
| 站点定位 | 展示 + 文档一体；**必须为后续新增应用/库预留扩展** |
| 技术栈 | Astro + Starlight |
| 内容同步 | 文档留在各仓库，CI 拉取聚合：**源仓库推送触发（repository_dispatch）+ 每日定时兜底** |
| 站点语言 | 仅中文（路由结构预留 i18n） |
| 部署 | **自有服务器**（与 codewf.com 同机），GitHub Actions 构建后同步，Nginx 配 `doc.codewf.com` |
| 品牌策略 | **无站名，按项目切换品牌**（docs.microsoft.com 式页头：全局导航 + 项目品牌区） |
| 站内搜索 | Pagefind（构建时本地索引，Starlight 内置支持） |
| 下载/安装 | 项目门面页内嵌下载区 + 独立统一下载页 |
| 更新日志 | 拉取各仓 CHANGELOG/UpdateLog 生成每项目日志页 + 首页跨项目动态流 |
| 评论 | giscus（基于 GitHub Discussions） |
| 访问统计 | 国内云统计（倾向 51.La，备选百度统计；脚本位已预留） |
| 徽章 | star 数 / NuGet 下载量，构建时拉取（避免运行时外部依赖） |
| SEO | sitemap.xml + 每页 meta + 整站 RSS（对齐主站风格） |
| 视觉 | 对齐主站「Fluent 白 × .NET 紫」（`#512bd4`），暗色主题为紫黑 `#1e1b2e` 系 |
| 主站边界 | **移除主站 doc 相关代码**；资源站（Assets.Dotnet9）相关内容同步移除；主站文档菜单改为跳转文档站二级域名，**域名必须走站点配置，不允许写死** |

## 信息架构（工作草案，待原型确认）

```
/                         首页（产品矩阵 + 最近更新）
/apps/                    应用列表（可从首页「应用」板块进入）
/apps/{slug}/             应用门面页
/apps/{slug}/docs/…       应用文档（Starlight）
/apps/{slug}/changelog/   更新日志
/libs/                    组件库列表
/libs/{slug}/             组件库门面页
/libs/{slug}/docs/…       组件文档
/libs/{slug}/api/…        API 参考（后续可由源码生成）
/download/                统一下载页
```

slug 规划：`quickapp`、`clearc`、`zhijian`、`vex`；`lang-avalonia`、`codewf-markdown`、`codewf-tools`、`codewf-netweaver`、`codewf-logviewer`、`codewf-eventbus`、`codewf-eventbus-socket`。

## 项目清单（单一事实源）

新项目接入 = 在 `src/data/projects.json` 加一条记录 + 源仓库 docs 按约定存放。门面页、导航、下载页、首页矩阵、同步任务全部由清单驱动：

```jsonc
{
  "slug": "codewf-eventbus",
  "type": "lib",                          // app | lib
  "name": "CodeWF.EventBus",
  "displayName": "CodeWF.EventBus",
  "category": "net",                      // ui | net | base（应用为场景标签数组）
  "tagline": "轻量进程内事件总线",
  "description": "Command 分发 + Query 查询回传，多 IOC 集成，更轻的 MediatR 替代。",
  "repo": "https://github.com/dotnet9/CodeWF.EventBus",
  "logo": "logo.svg",                     // 源仓库根目录相对路径
  "docsPath": "docs",                     // 源仓库文档目录（同步来源）
  "changelogPath": "CHANGELOG.md",        // 日志文件（UpdateLog.md / RELEASES.md 亦可）
  "nuget": ["CodeWF.EventBus", "CodeWF.AspNetCore.EventBus", "CodeWF.DryIoc.EventBus", "CodeWF.IOC.EventBus"],
  "platforms": [],                        // 应用：windows | macos | linux
  "frameworks": ["net8.0", "net10.0", "net11.0"],
  "builtWith": [],                        // 应用：依赖的自家库 slug（生态关联）
  "usedBy": ["vex", "zhijian", "quickapp"]// 库：使用它的应用 slug
}
```

## 文档同步机制

```
源仓库 push (docs/** 或 CHANGELOG)
  └─ 源仓库 workflow → repository_dispatch → Doc 仓库「同步」workflow
Doc 仓库「同步」workflow（亦支持 schedule 每日兜底 + workflow_dispatch 手动）
  ├─ 读取 src/data/projects.json
  ├─ 逐仓库 sparse-checkout：docs 目录 + CHANGELOG + logo
  ├─ 归一化到 src/content/{app,lib}/{slug}/（保留相对图片引用并重写路径）
  └─ 提交产物 → 触发构建 workflow
构建 workflow
  ├─ astro build（生成站内索引前先拉取实时数据：star/下载量/最新 Release 版本）
  ├─ pagefind 建索引
  └─ rsync 产物到服务器 → Nginx（doc.codewf.com）
```

各仓库需要的改动（一次性）：

1. 按约定整理 docs 目录与 CHANGELOG 文件名（清单里已可配置路径，无强制重命名）；
2. （可选，为了实时性）在源仓库加一个 10 行的 workflow：push 到主分支时向 Doc 仓库发 `repository_dispatch`。不加也能工作，只是更新延迟到每日定时任务。

## 与主站/资源站的改造（独立阶段执行）

- [ ] 主站 `CodeWF` 仓库：移除 doc 相关路由、页面与内容类型代码；
- [ ] 主站导航「文档」菜单改为外部链接，指向**站点配置项**（如 `siteSettings.docsSiteUrl`，默认 `https://doc.codewf.com`），他人 clone 部署时改配置即可换域名；
- [ ] `Assets.Dotnet9` 资源站：清理 doc 相关内容；
- [ ] 主站项目展示板块跳转 doc 站对应门面页（互链）。

## 实施路线图

| 阶段 | 内容 | 产出 |
|---|---|---|
| P0 原型评审 | 本目录 5 页原型确认（含 URL 架构拍板） | 定稿设计 |
| P1 站点骨架 | Astro + Starlight 工程、设计令牌（对齐主站 CSS 变量）、亮暗主题、全局导航/项目页头组件、5 类页面模板 | 可本地跑的空站 |
| P2 清单与同步 | projects.json + 同步 workflow + 拉取脚本 + docs 约定文档 | 11 个项目内容自动进站 |
| P3 功能完善 | Pagefind、giscus、下载页、changelog 页、首页动态流、徽章（GitHub/NuGet API） | 功能完整 |
| P4 部署 | Actions 构建流水线、服务器 Nginx + 证书、DNS `doc` 记录、统计接入 | 上线 |
| P5 SEO 收尾 | sitemap、RSS、每页 meta、主站互链 | 可被检索 |
| P6 主站改造 | 移除主站 doc 代码、配置化跳转、资源站清理、（观察后）旧路由 301 | 边界清晰 |

## 本地预览原型

```bash
# 方式一：直接双击 design/*.html（logo 相对路径引用兄弟仓库，本机有效）
# 方式二：起本地服务器（可点击页间链接）
python -m http.server 8123 --directory D:/github
# 打开 http://127.0.0.1:8123/apps/Doc/design/index.html
```

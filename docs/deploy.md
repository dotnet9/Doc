# 服务器部署手册（doc.codewf.com · vex.codewf.com）

> 本手册覆盖 GitHub Actions 之外的全部服务器/DNS 侧操作。**DNS 已就绪**：`doc.codewf.com` 已解析到 `185.245.41.161`（与主站同机）；当前访问会落到主站默认 vhost（307 → /zh-CN），完成本手册的 Nginx 配置后即指向文档站。
>
> 仓库内现有两个站点：**码坊开源矩阵**（根目录，`doc.codewf.com`）与 **维刻 Vex 官网**（`vex/` 子项目，`vex.codewf.com`）。两者构建、部署、Secrets 相互独立；下文第 1-9 节是文档站，第 11 节是 Vex 站。

## 1. 服务器准备（SSH 到 185.245.41.161）

```bash
# 部署目录
mkdir -p /var/www/doc.codewf.com
chown -R $USER /var/www/doc.codewf.com
```

## 2. 专用部署密钥（不复用现有私钥）

```bash
# 在服务器上生成一对专用密钥（或本地生成后上传公钥）
ssh-keygen -t ed25519 -f ~/doc-deploy-key -N "" -C "doc-site-deploy"
cat ~/doc-deploy-key.pub >> ~/.ssh/authorized_keys
# 私钥内容复制出来（用于 GitHub Secrets）：
cat ~/doc-deploy-key   # -----BEGIN OPENSSH PRIVATE KEY----- 整段
```

## 3. GitHub 仓库 Secrets（dotnet9/Doc → Settings → Secrets and variables → Actions）

| Secret | 值 |
|---|---|
| `DEPLOY_SSH_KEY` | 上一步的**私钥**全文（含 BEGIN/END 行） |
| `DEPLOY_HOST` | `185.245.41.161` |
| `DEPLOY_USER` | `root`（或你部署用的用户） |
| `DEPLOY_PATH` | `/var/www/doc.codewf.com/` |

## 4. Nginx 站点配置

`/etc/nginx/conf.d/doc.codewf.com.conf`（或 sites-available + 软链，按现有习惯）：

```nginx
server {
    listen      80;
    server_name doc.codewf.com;
    root        /var/www/doc.codewf.com;
    index       index.html;

    # gzip（与主站一致即可）
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    # 静态资源缓存
    location /_astro/ { expires 30d; add_header Cache-Control "public, immutable"; }
    location /pagefind/ { expires 7d; }

    # 静态站回退：目录形式 URL → index.html
    location / {
        try_files $uri $uri/ $uri/index.html =404;
    }

    error_page 404 /404.html;
}
```

```bash
nginx -t && systemctl reload nginx
```

## 5. HTTPS 证书

DNS 已解析到本机，HTTP-01 验证可直接通过：

```bash
certbot --nginx -d doc.codewf.com --redirect
# 或与主站同一张证书扩展子域名：
# certbot --nginx -d codewf.com -d doc.codewf.com --expand --redirect
```

## 6. 首次部署

GitHub → dotnet9/Doc → Actions → 「构建并部署文档站」→ Run workflow（workflow_dispatch）。
此后每次 push main 自动部署；源仓库文档变更通过推送通知/每日兜底自动重建。

## 7. 实时同步通知（源仓库 → 文档站）

11 个源仓库已添加 `.github/workflows/notify-docs.yml`（未配置 PAT 时自动跳过，不会报错）。
要启用实时同步，创建一个 PAT 并配置到各源仓库的 `DOC_SITE_PAT` secret：

1. GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate：
   - Repository access：仅选择 `dotnet9/Doc`
   - Permissions：Contents → **Read and write**（repository_dispatch 所需）
2. 将 token 分别配置到 11 个源仓库的 Secrets，名称 `DOC_SITE_PAT`
   （也可用 GitHub CLI 批量：`gh secret set DOC_SITE_PAT -R dotnet9/<repo>`）

## 8. 其余两处账号操作

| 项 | 操作 |
|---|---|
| giscus 评论 | 站点配置已填好 ID 并启用；还需安装 giscus App：<https://github.com/apps/giscus> → Configure → 仅选 `dotnet9/Doc` |
| 访问统计 | <https://lang.51.la> 添加站点（doc.codewf.com），把站点 key 填入 Doc 仓库 `src/config/site.ts` 的 `analytics.key` |

## 9. 部署后验证清单

```bash
curl -I https://doc.codewf.com/                     # 200
curl -I https://doc.codewf.com/apps/vex/            # 200（应用门面页）
curl -I "https://doc.codewf.com/libs/codewf-eventbus/docs/CodeWF.EventBus设计文档/"  # 200（文档页）
curl -I https://doc.codewf.com/rss.xml              # 200
curl -I https://doc.codewf.com/pagefind/pagefind.js # 200（搜索索引）
```

浏览器：首页矩阵 / 门面页截图 / 文档三栏页 / Ctrl K 搜索 / 暗色切换 / giscus 评论框。

## 10. 上线后的收尾（可选）

- 主站导航「文档」已改为外链（`NEXT_PUBLIC_DOC_SITE_URL`，默认本站）——主站重新发布时生效；
- 主站旧 /project、/doc 路由已移除，若担心旧链接，可在主站 Nginx 加 301：

```nginx
# 主站 server 块内（已有证书）
location ~ ^/(doc|project) { return 301 https://doc.codewf.com$request_uri; }
```

- 观察一至两个月后，源仓库内旧 docs/ 与本站的重复内容如何收敛，由你决定（当前策略：文档事实源在各仓库，本站构建时聚合）。

## 11. 维刻 Vex 官网（vex.codewf.com）

站点代码在 `vex/` 子项目，独立依赖树与独立 workflow（`.github/workflows/deploy-vex.yml`）；内容来自 `dotnet9/Vex-Flutter` 的 `docs/`、`README.md`、`CONTRIBUTING.md`、`SECURITY.md`、`apps/vex/assets/documents/CHANGELOG.md`、`design/` 与 `logo.svg`。

### 11.1 DNS

`vex.codewf.com` A 记录 → `185.245.41.161`（与 doc 站同机）。

### 11.2 部署目录与密钥

```bash
mkdir -p /var/www/vex.codewf.com
chown -R $USER /var/www/vex.codewf.com
```

可复用文档站的部署密钥（第 2 节），也可另生成一对：

```bash
ssh-keygen -t ed25519 -f ~/vex-deploy-key -N "" -C "vex-site-deploy"
cat ~/vex-deploy-key.pub >> ~/.ssh/authorized_keys
```

### 11.3 GitHub 仓库 Secrets（dotnet9/Doc）

| Secret | 值 |
|---|---|
| `VEX_DEPLOY_SSH_KEY` | 部署私钥全文（复用 doc 站私钥时填同一份） |
| `VEX_DEPLOY_HOST` | `185.245.41.161` |
| `VEX_DEPLOY_USER` | `root`（或你部署用的用户） |
| `VEX_DEPLOY_PATH` | `/var/www/vex.codewf.com/` |

另外在 **dotnet9/Vex-Flutter** 仓库配置 `DOC_SITE_PAT`（Fine-grained token，仅 `dotnet9/Doc`，Contents: Read and write），供 `notify-docs.yml` 在文档/日志/原型变更时实时触发本站构建；未配置时仅每日定时兜底同步。

### 11.4 Nginx 站点配置

`/etc/nginx/conf.d/vex.codewf.com.conf`：

```nginx
server {
    listen      80;
    server_name vex.codewf.com;
    root        /var/www/vex.codewf.com;
    index       index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    # 静态资源缓存；设计原型目录随源仓库更新，不做长缓存
    location /_astro/ { expires 30d; add_header Cache-Control "public, immutable"; }
    location /pagefind/ { expires 7d; }
    location /design/ { expires 1h; }

    # 静态站回退：目录形式 URL → index.html
    location / {
        try_files $uri $uri/ $uri/index.html =404;
    }

    error_page 404 /404.html;
}
```

```bash
nginx -t && systemctl reload nginx
certbot --nginx -d vex.codewf.com --redirect
```

### 11.5 首次部署与验证

GitHub → dotnet9/Doc → Actions → 「构建并部署 Vex 站」→ Run workflow。此后 `vex/**` 变更自动部署，源仓库推送与每日定时各自兜底。

```bash
curl -I https://vex.codewf.com/                     # 200
curl -I https://vex.codewf.com/docs/                # 200（文档索引）
curl -I https://vex.codewf.com/changelog/           # 200
curl -I https://vex.codewf.com/pagefind/pagefind.js # 200（搜索索引）
curl -I https://vex.codewf.com/design/index.html    # 200（设计原型）
curl -I https://doc.codewf.com/apps/vex/            # 404（Vex 内容已迁至子站，不做旧链接兼容）
```

浏览器：落地页截图与下载矩阵 / 文档三栏与侧栏分组 / 更新日志 / Ctrl K 搜索 / 暗色切换 / 评论区块（填入 giscus 配置后显示）。

### 11.6 评论（giscus，可选）

在 `dotnet9/Vex-Flutter` 仓库安装 <https://github.com/apps/giscus>、开启 Discussions 并建 `General` 分类，把 `repoId` / `categoryId` 填入 `vex/src/config/site.ts`，并将 `giscus.enabled` 改为 `true`。未配置时文档页与更新日志页显示「到 GitHub 提交 Issue」的替代入口。

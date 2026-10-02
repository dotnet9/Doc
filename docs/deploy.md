# 服务器部署手册（doc.codewf.com）

> 本手册覆盖 GitHub Actions 之外的全部服务器/DNS 侧操作。**DNS 已就绪**：`doc.codewf.com` 已解析到 `185.245.41.161`（与主站同机）；当前访问会落到主站默认 vhost（307 → /zh-CN），完成本手册的 Nginx 配置后即指向文档站。

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

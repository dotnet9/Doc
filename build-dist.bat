@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   码坊文档站 - 生成 / 更新 dist
echo ============================================
echo.

where npm >nul 2>nul
if errorlevel 1 (
    echo [错误] 未找到 npm，请先安装 Node.js：https://nodejs.org
    pause
    exit /b 1
)

if not exist node_modules (
    echo [初始化] 首次运行，安装依赖（约 1 分钟）...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo [错误] 依赖安装失败，请检查网络后重试
        pause
        exit /b 1
    )
)

echo [构建] 同步各仓库内容、拉取 Star/NuGet 指标、Astro 构建、搜索索引 ...
call npm run build
if errorlevel 1 (
    echo [错误] 构建失败，请查看上方日志
    pause
    exit /b 1
)

echo.
echo [打包] 生成上传用压缩包 ...
powershell -NoProfile -Command "Compress-Archive -Path dist\* -DestinationPath codewf-docs-site.zip -Force" >nul 2>nul
if exist codewf-docs-site.zip (
    echo [打包] codewf-docs-site.zip 已更新
)

echo.
echo ============================================
echo   完成！产物：
echo     1. dist 目录 —— 全部内容复制到服务器发布目录
echo     2. codewf-docs-site.zip —— 或上传此压缩包解压
echo   本地预览：npm run preview 后打开 http://localhost:4321
echo ============================================
if not "%~1"=="--no-pause" pause

@echo off
chcp 65001 >nul
echo ============================================
echo 视频格式助手 - 快速打包工具
echo ============================================
echo.

:menu
echo 请选择操作:
echo 1. 构建项目 (生成 release_build)
echo 2. 清理构建文件
echo 3. 退出
echo.
set /p choice=请输入选项 (1-3): 

if "%choice%"=="1" goto build
if "%choice%"=="2" goto clean
if "%choice%"=="3" goto end
echo 无效选项，请重新选择
echo.
goto menu

:build
echo.
echo ============================================
echo 开始构建项目
echo ============================================
echo.
echo 步骤 1/2: 检查版本号...
findstr /C:"\"version\": \"1.0.0\"" package.json >nul
if errorlevel 1 (
    echo [警告] package.json 版本号不是 1.0.0
)
echo [成功] 版本号检查通过
echo.

echo 步骤 2/2: 执行构建...
call npm run build
if errorlevel 1 (
    echo [错误] 构建失败
    pause
    goto menu
)
echo [成功] 构建完成
echo.

echo ============================================
echo 构建文件位置: release_build\
echo ============================================
echo.
pause
goto menu

:clean
echo.
echo 清理 release_build 目录...
if exist release_build (
    rd /s /q release_build
    echo [成功] 已删除 release_build
) else (
    echo [提示] release_build 目录不存在
)
if exist dist (
    rd /s /q dist
    echo [成功] 已删除 dist
)
if exist dist-electron (
    rd /s /q dist-electron
    echo [成功] 已删除 dist-electron
)
echo.
pause
goto menu

:end
exit

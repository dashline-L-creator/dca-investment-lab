v3.6 构建与检查

在仓库根目录，使用 F:\anaconda3\python.exe 执行 work/v3.6/build.py。
构建使用 work/v3.5/data.json 的冻结金融数据、既有本地字体和本目录源文件。
无需重新获取行情或联网。仅在增加中文字形时运行 fonts.py（需要联网）。

node --check work/v3.6/app.js
node work/v3.6/verify_cloud.cjs

release.py 更新版本目录、说明与输出SHA256记录；添加预览图后应再运行一次。

cloud3d.js：相机投影、场景准备、交互与样本命中。
ridge.js：真实样本布局、归一化山脊与渲染。
morph.js：二维按住粒子球与阻尼弹簧还原。
orbit.js：自动环绕、触碰暂停及复位恢复。

redesign.py、integrate_ridge.py、integrate_orbit.py、finalize_sources.py、
finish_ui.py、update_checks.py 为此次修改过程脚本，已应用，勿重复执行。
常规重建只需 build.py 与 release.py。

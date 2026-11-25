v3.7 构建：在仓库根目录使用 F:\anaconda3\python.exe 执行 work/v3.7/build.py。
金融研究数据固定取自work/v3.5/data.json；market-snapshot.json是独立的真实市场快照，运行时自动获取最近分时数据。
构建不需要联网；仅更新中文字符覆盖时需要执行fonts.py联网取字体。
检查：node --check work/v3.7/app.js；node work/v3.7/checks.cjs。
release.py 更新版本记录、说明与SHA256；新增预览图后需再运行一次。
bootstrap.py、integrate.py、adapt_electric.py、tidy.py、layout_fix.py、polish.py、final_tweaks.py 为已应用的一次性过程脚本，勿重复执行。
常规重建只运行build.py与release.py。electric-reference.jsx及electric-demo.jsx为原始来源参考；electric.js为本应用适配版。
测试夹具probe_*.txt和us-minute-*.txt均为实际公开响应。运行源码附完整React Bits与OGL许可。

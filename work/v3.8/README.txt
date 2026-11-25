v3.8常规构建：在仓库根目录用 F:\anaconda3\python.exe 执行 work/v3.8/build.py，再执行release.py更新说明与SHA256。
检查：node --check work/v3.8/app.js；node work/v3.8/checks.cjs；node work/v3.8/check_intro.cjs。
数据：研究读取work/v3.5/data.json，市场快照读取本目录market-snapshot.json，二者独立。
gold-response.json是真实COMEX接口测试响应。五指数测试夹具沿用已冻结work/v3.7中的真实响应。
refresh_seed.py/refresh_seed.cjs仅用于更新内置真实市场快照，需联网；Python抓取使用本机已启用的代理。网站运行时直接请求公开HTTPS接口，不依赖本机代理地址或Python。
bootstrap.py、integrate.py、chart_changes.py、adapt_glow.py、polish.py、mobile_polish.py、latest_changes.py、axis_inline.py、prepare_checks.py、finalize_checks.py、update_latest_checks.py为已应用的一次性过程脚本，勿重复执行。
GlowCursor按真实曲线自动驱动，无鼠标事件。原始参考glow-reference.jsx及许可随源码保留。

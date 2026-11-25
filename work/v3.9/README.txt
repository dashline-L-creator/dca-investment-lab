v3.9运行源码

构建：F:\anaconda3\python.exe work/v3.9/build.py
验证：node work/v3.9/checks.cjs；node work/v3.9/check_sessions.cjs；node work/v3.9/check_intro.cjs
发布说明与校验清单：F:\anaconda3\python.exe work/v3.9/release.py

responsive.css、responsive.js实现多设备适配；sessions.js控制真实行情的完整时段坐标；playback.js驱动实际曲线的辉光回放。
金融研究数据沿用work/v3.5/data.json，独立于实时行情。字体、OGL与React Bits许可随源码保留。字体采用既有嵌入子集，Adobe字体尚待实际Web项目链接。
不要覆盖旧版本目录。

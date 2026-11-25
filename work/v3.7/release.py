from pathlib import Path
import json,hashlib,shutil
q=Path('work/v3.7');o=Path('outputs/v3.7')
p=Path('outputs/版本记录.html');s=p.read_text(encoding='utf8')
if 'v3.7 ·' not in s:
 s=s.replace('v3.6 · 2026-11-25 · CURRENT','v3.6 · 2026-11-25 · ARCHIVED');i=s.index('<section>');s=s[:i]+'''<section><div class="tag">v3.7 · 2026-11-25 · CURRENT</div><h2><a href="v3.7/定投交互实验室_v3.7.html">打开电流开场、市场脉搏与浅色直方图 →</a></h2><p>A方案浅色立体直方图，默认1个百分点分箱，可调0.5/1/2/5个百分点；XYZ标题与轴线同步转动。开场使用柔和电流Logo，并在开场/背景展示上证、深证、恒生、纳斯达克综合、标普500最近交易日分时行情，联网每60秒刷新，失败保留最近可用数据。定投研究数据与v3.6完全一致。</p><a href="v3.7/使用与数据说明.txt">使用与数据说明</a> · <a href="v3.5/七资产各自全部历史统计.csv">七资产统计</a> · <a href="v3.5/七资产全部滚动样本.csv">全部样本</a></section>'''+s[i:];p.write_text(s,encoding='utf8')
p=Path('README.md');s=p.read_text(encoding='utf8')
if '- **v3.7**' not in s:s=s.replace('- **v3.6**','- **v3.7**：浅色细分立体直方图、随轴线转动的XYZ标题、柔和电流Logo开场，以及每60秒更新的五指数市场脉搏。定投研究数据保持冻结。\n- **v3.6**')
s=s.replace('`v3.5` 与 `v3.6`','`v3.5`、`v3.6` 与 `v3.7`');p.write_text(s,encoding='utf8')
notes='''v3.7 — 2026-11-25
- 采用A方案浅色新拟态立体直方图，统一四资产收益范围、分箱边界与样本比例刻度。默认1个百分点，可选0.5、1、2、5个百分点分箱；解决十进制精确边界的浮点误差。
- X轴：完整五年累计收益率；Y轴：当前四种资产（01—04，对应带编号图例）；Z轴：分箱样本数/该资产样本总数。XYZ文字从实际轴段投影角度计算旋转，与轴线平行；Y轴放右侧，Z轴放左侧，另保留固定轴含义卡。
- 柱体悬停显示资产、收益区间、样本数及比例；点击柱体切换详情资产并高亮该区间，不跳转到任意起投日期。保留手动旋转、缩放、自动环绕、触碰暂停与复位恢复。
- 保留二维真实样本点阵及按住粒子球变形。所有金融样本均参与分箱，研究数据与v3.6逐字一致。
- 开场将React Bits ElectricLogo实际距离场/电流着色器适配至本单文件网页，使用OGL 1.0.11内置模块。保留A2标识形状，主色#5c50a1、辉光#9b8bcf；glow 0.68、intensity 0.82、speed 0.85、strands 2、bend 0.24、crackle 0.42、arcs 0.22、flicker 0.10、light主题。减少刺眼光晕及闪烁，开场时长约3.5秒。
- WebGL2不可用时使用原静态Logo；减少动态效果偏好下跳过自动开场。跳过、Esc、重播、飞入页首均保留。修正原重播逻辑误操作新增WebGL画布的问题。
- 新增五指数最近交易日分时背景：上证sh000001、深证成指sz399001、恒生hkHSI、纳斯达克综合us.IXIC、标普500 us.INX。此处“纳指”指纳斯达克综合指数；研究资产中的纳指ETF仍追踪纳斯达克100，未改变研究数据。
- 行情源为腾讯公开分钟接口；内地/香港minute路由，美股UsMinute路由。涨跌幅以各自前收盘价为基准。日期及行情时间保持各市场当地时间；页面同时显示浏览器获取时间。不同市场最近交易日可能不同。
- 打开页面即联网获取；前台每60秒刷新；切回前台或恢复网络时更新；后台不发请求。10秒超时，每个指数独立处理失败，保留最近缓存及真实内置快照，不生成虚构走势。公开接口可能延迟，不承诺交易所逐笔实时。
- 新增“市场脉搏”详情与手动刷新；背景仅放页面两侧空白处，窄屏隐藏页外背景，开场保留五市场布局。行情与冻结研究数据相互独立。
- 英文、数字、中文备用字体与既有口径延续；Adobe中文机械体仍待实际Web项目CSS链接。
- 验证280组分箱组合（35种四资产组合×2种范围×4种宽度），每个样本恰好入箱一次，各资产比例合计100%；覆盖零收益、负收益与十进制边界、旋转投影、柱体命中、手动暂停、复位恢复；五个真实接口响应通过日期/前收/分钟数据校验。
- 浏览器本地HTTP预览验证实际五指数联网刷新、电流Logo和重播、中英文、细分箱、二维保留、390px窄屏及恢复正常尺寸；最终独立预览无控制台错误。浏览器工具不允许直接导航file协议，因此未用该工具直接验证file打开；成品仍为内嵌依赖的单HTML。
- Git标签v3.7；旧版保留。
'''
p=Path('outputs/版本说明.txt');s=p.read_text(encoding='utf8')
if 'v3.7 —' not in s:p.write_text(s+'\n\n'+notes,encoding='utf8')
(o/'使用与数据说明.txt').write_text('定投交互实验室 v3.7\n\n'+notes+'''
打开本目录的定投交互实验室_v3.7.html。研究数据、字体、电流Logo模块与图表均内置；五指数行情更新需要联网。
研究数据、ETF事件及全部样本/统计CSV见相邻v3.5目录。历史样本高度重叠，历史频率不是未来概率。

原组件及许可：
https://reactbits.dev/animations/electric-logo?glow=1.35
https://github.com/DavidHDev/react-bits
Copyright 2026 David Haz / MIT + Commons Clause，见reactbits-license.txt。
https://github.com/oframe/ogl — OGL 1.0.11，Unlicense，见OGL-LICENSE.txt。

五个行情接口：
https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=sh000001
https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=sz399001
https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=hkHSI
https://web.ifzq.gtimg.cn/appstock/app/UsMinute/query?code=us.IXIC
https://web.ifzq.gtimg.cn/appstock/app/UsMinute/query?code=us.INX
''',encoding='utf-8-sig')
(q/'README.txt').write_text('''v3.7 构建：在仓库根目录使用 F:\\anaconda3\\python.exe 执行 work/v3.7/build.py。
金融研究数据固定取自work/v3.5/data.json；market-snapshot.json是独立的真实市场快照，运行时自动获取最近分时数据。
构建不需要联网；仅更新中文字符覆盖时需要执行fonts.py联网取字体。
检查：node --check work/v3.7/app.js；node work/v3.7/checks.cjs。
release.py 更新版本记录、说明与SHA256；新增预览图后需再运行一次。
bootstrap.py、integrate.py、adapt_electric.py、tidy.py、layout_fix.py、polish.py、final_tweaks.py 为已应用的一次性过程脚本，勿重复执行。
常规重建只运行build.py与release.py。electric-reference.jsx及electric-demo.jsx为原始来源参考；electric.js为本应用适配版。
测试夹具probe_*.txt和us-minute-*.txt均为实际公开响应。运行源码附完整React Bits与OGL许可。
''',encoding='utf8')
for folder in [q,o]:
 for f in folder.glob('*LICENSE*.txt'):
  f.write_text('\n'.join(line.rstrip() for line in f.read_text(encoding='utf8').splitlines())+'\n',encoding='utf8')
 for f in folder.glob('*license.txt'):
  f.write_text('\n'.join(line.rstrip() for line in f.read_text(encoding='utf8').splitlines())+'\n',encoding='utf8')
(o/'SHA256.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(o.iterdir()) if p.is_file() and p.name!='SHA256.json'},ensure_ascii=False,indent=2),encoding='utf8')
print('Saved v3.7 release documentation, archive entry and checksums.')

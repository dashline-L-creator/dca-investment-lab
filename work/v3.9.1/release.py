from pathlib import Path
import json,hashlib,shutil
o=Path('outputs/v3.9.1');q=Path('work/v3.9.1')
notes='''v3.9.1 — 2026-11-25
- 修复手机本金/市值图X轴日期重叠：使用Canvas当前字体的实际文字宽度，按可用绘图区依次尝试5/4/3/2个刻度，确保相邻文字至少间隔12px，优先保留起止日期；极窄绘图区只显示一个刻度。小图使用11px字体及更合理的左右留白。金额轴与真实轨迹不变。
- 实测390px手机宽度采用4个日期刻度，320px采用3个；手机中英文、宽屏恢复与页面无横向溢出均验证。原问题是固定绘制五个日期且端点对齐后侵入相邻文字，而非数据错误。
- 上证/深证午休11:30–13:00、恒生午休12:00–13:00从分时时间坐标中折叠。排除接口填充的休市内部重复点，将上午收尾与下午开盘接到同一时间边界，消除长横线。实际交易时段内的平价走势保留，不删除真实成交信息。港股半日市保留12:00–12:10收市竞价。
- 美国指数、纽约金没有上述午休，不按价格相同与否任意删点。六市场沿用同一绘图机制；最新数据后至收盘的空白继续保留，辉光只沿真实曲线移动。开场脚注明示午休折叠。
- 手机开场小行情图的日期与交易时间范围分为两行，避免窄卡内相互挤占。
- 主标题加入低饱和紫色流光，7秒缓慢扫过，与原新拟态底色协调；中英文共享效果，关闭动态背景或系统要求减少动态效果时停止，保留静态深色文字。大屏排版和原字号不变。
- 测试：374种窄/宽绘图区的文字边界无碰撞；沪深港午休边界压缩、实际价格保持、未来留白及港股半日竞价；350组直方图、冻结研究数据一致性、开场生命周期、纽约金跨午夜及夏冬令时回归通过。浏览器验证320/390px手机中英文与1280px桌面，标题动画开关及开场行情。
- 定投研究数据保持15354个原始样本不变；原v3.9独立保留，Git标签v3.9.1。
'''
old=Path('outputs/v3.9/使用与数据说明.txt').read_text(encoding='utf8')
(o/'使用与数据说明.txt').write_text('定投交互实验室 v3.9.1\n\n'+notes+'\n继承说明：\n'+old,encoding='utf8')
shutil.copy2('outputs/v3.9/时间的复利_A2收细圆环.svg',o/'时间的复利_A2收细圆环.svg')
p=Path('README.md');s=p.read_text(encoding='utf8')
if '- **v3.9.1**' not in s:s=s.replace('- **v3.9**','- **v3.9.1**：修复手机日期刻度重叠，折叠分时午休横线，主标题加入可暂停的紫色流光。\n- **v3.9**',1)
p.write_text(s,encoding='utf8')
p=Path('outputs/版本记录.html');s=p.read_text(encoding='utf8')
if 'v3.9.1 ·' not in s:
 s=s.replace('v3.9 · 2026-11-25 · CURRENT','v3.9 · 2026-11-25 · ARCHIVED');i=s.index('<section>')
 s=s[:i]+'''<section><div class="tag">v3.9.1 · 2026-11-25 · CURRENT</div><h2><a href="v3.9.1/定投交互实验室_v3.9.1.html">打开刻度修复与标题流光新版 →</a></h2><p>手机日期刻度按真实文字宽度自动减少，避免重叠；行情午休时段折叠，保留最新数据之后的收盘前空白；主标题加入可暂停的柔和紫色流光。</p><a href="v3.9.1/使用与数据说明.txt">使用与数据说明</a> · <a href="v3.9.1/手机日期刻度修复.jpg">手机图表预览</a></section>'''+s[i:];p.write_text(s,encoding='utf8')
p=Path('outputs/版本说明.txt');s=p.read_text(encoding='utf8')
if 'v3.9.1 —' not in s:p.write_text(s+'\n\n'+notes,encoding='utf8')
(q/'README.txt').write_text('v3.9.1源码\n\n构建：F:\\anaconda3\\python.exe work/v3.9.1/build.py\n测试：node work/v3.9.1/check_visual_fixes.cjs；node work/v3.9.1/check_sessions.cjs；node work/v3.9.1/checks.cjs；node work/v3.9.1/check_intro.cjs\n发布记录：F:\\anaconda3\\python.exe work/v3.9.1/release.py\n\naxis.js负责实际字体测量及防碰撞刻度；sessions.js折叠午休并保留完整交易时段；responsive.css末尾实现标题流光及静态回退。研究数据继续读取work/v3.5/data.json。\n金融数据、字体、图表与已有交互继承v3.9；原始许可随源码保留。\n',encoding='utf8')
(o/'SHA256.json').write_text(json.dumps({f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(o.iterdir()) if f.is_file() and f.name!='SHA256.json'},ensure_ascii=False,indent=2),encoding='utf8')
print('Saved v3.9.1 release and checksums')

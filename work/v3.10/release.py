from pathlib import Path
import json,hashlib,shutil
q=Path('work/v3.10');o=Path('outputs/v3.10')
notes='''v3.10 — 2026-11-26
- 手机开场重新分区：顶部三市场、中央Logo及文案/进入提示、底部三市场，使用动态可用视口高度。Logo根据中央保留区域、屏幕宽高及外围电流辉光的实际扩展比例缩放。较宽设备使用左右行情与中央标识分栏，不再让标识侵入走势区域。
- “点击任意位置进入”改为中央文字区中的正常布局元素，独立于副标题，不使用绝对bottom定位。首次自动开场和手动重播逻辑保留；手动重播播放完继续等待点击。
- 每张行情图采用自己的日内最高/最低涨跌幅范围与14%上下留边，不再强制把零涨跌线纳入显示范围。数据和报价没有归一化或改写，窄幅波动更清晰。零线只在本图范围内显示。不同图的曲线高度不能直接用于比较资产波动幅度，开场脚注明示独立纵轴。
- 手机开场使用简短市场名避免与右侧涨跌幅重叠。日期和开/收盘时间分行显示；午休折叠、未来行情留白及沿真实曲线回放的辉光保持。
- 主图手机日期改为独立HTML文本层，仅保留首尾日期，避开Canvas日期绘制及字体加载/浏览器字号差异造成的重复挤占。字体就绪后重新绘图。金额轴左边距使用五个金额标签的实际最宽值加9px计算，不再保留固定宽空白。
- 默认保留资产名称、排名、收益率、市值、投入、盈亏、样本范围及核心统计。图表操作/计算说明归入可展开的“图表说明”；手机资产代码与最终估值日期归入各卡片“详情”，完整信息仍可读取。
- 手机宽度小于600px时隐藏主页背景图标，并暂停该背景绘制；开场和页首Logo保留。电脑/平板维持原背景。
- 修正语言模块重复写入相同语言属性和按钮文字导致的更新循环，使详情/注释展开及语言切换保持稳定。相同语言重复应用不再产生这些DOM写入。
- 页面页首增加v3.10版本标识，便于区分手机缓存/旧副本。原v3.9.1独立保存。
- 验证：9种开场尺寸（320×550至1945×1251）预留区域与Logo辉光不相交；负收益、正收益与窄幅市场路径分别使用大于70%绘图区高度。350组直方图、研究数据一致性、午休/收盘时段、374种日期刻度、开场生命周期及语言更新幂等性通过测试。
- 浏览器验证320×550、390×700手机与1024×768平板，手机中英文首尾日期文字实际边界、详情展开、图表说明、手机背景关闭及开场提示间距；未见脚本错误。附手机开场与主图截图。
- 定投研究数据仍为原七资产15354个五年样本。Git标签v3.10。
'''
old=Path('outputs/v3.9.1/使用与数据说明.txt').read_text(encoding='utf8')
(o/'使用与数据说明.txt').write_text('定投交互实验室 v3.10\n\n'+notes+'\n继承说明：\n'+old,encoding='utf8')
shutil.copy2('outputs/v3.9.1/时间的复利_A2收细圆环.svg',o/'时间的复利_A2收细圆环.svg')
p=Path('README.md');s=p.read_text(encoding='utf8')
if '- **v3.10**' not in s:s=s.replace('- **v3.9.1**','- **v3.10**：手机开场分区、Logo自适应及独立行情纵轴；手机日期文本层、金额轴留白优化、可展开注释/详情，关闭手机主页背景图标。\n- **v3.9.1**',1)
p.write_text(s,encoding='utf8')
p=Path('outputs/版本记录.html');s=p.read_text(encoding='utf8')
if 'v3.10 ·' not in s:
 s=s.replace('v3.9.1 · 2026-11-25 · CURRENT','v3.9.1 · 2026-11-25 · ARCHIVED');i=s.index('<section>')
 s=s[:i]+'''<section><div class="tag">v3.10 · 2026-11-26 · CURRENT</div><h2><a href="v3.10/定投交互实验室_v3.10.html">打开手机开场与精简主图新版 →</a></h2><p>开场Logo按空间自适应，进入提示与文案分开，六市场独立纵轴。手机主图首尾日期单独排版，金额轴按文字宽度留白；小字说明归入注释与详情，手机关闭主页背景图标。</p><a href="v3.10/使用与数据说明.txt">使用与数据说明</a> · <a href="v3.10/手机开场分区.jpg">开场预览</a> · <a href="v3.10/手机精简图表.jpg">主图预览</a></section>'''+s[i:];p.write_text(s,encoding='utf8')
p=Path('outputs/版本说明.txt');s=p.read_text(encoding='utf8')
if 'v3.10 —' not in s:p.write_text(s+'\n\n'+notes,encoding='utf8')
(q/'README.txt').write_text('v3.10源码\n构建：F:\\anaconda3\\python.exe work/v3.10/build.py\n测试：node work/v3.10/check_layout.cjs；node work/v3.10/check_language.cjs；node work/v3.10/checks.cjs；node work/v3.10/check_sessions.cjs；node work/v3.10/check_visual_fixes.cjs；node work/v3.10/check_intro.cjs\n发布：F:\\anaconda3\\python.exe work/v3.10/release.py\n\nclean.js折叠非关键说明及手机卡片详情；playback.js内introComposition统一计算Logo保留区和六行情区域。responsive.css处理手机显示及动态视口。主图日期标签为独立DOM层，金融数据沿用work/v3.5/data.json。\n字体/图表/OGL/React Bits许可随源码保留。\n',encoding='utf8')
(o/'SHA256.json').write_text(json.dumps({f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(o.iterdir()) if f.is_file() and f.name!='SHA256.json'},ensure_ascii=False,indent=2),encoding='utf8')
print('Saved v3.10 release and checksums')

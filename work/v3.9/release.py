from pathlib import Path
import hashlib,json,shutil
q=Path('work/v3.9');o=Path('outputs/v3.9')
notes='''v3.9 — 2026-11-25
- 保留1200px及以上的既有电脑排版。平板压缩字号、内边距、控件与图表高度；900–1199px分布图与风险摘要并排。小于1200px时，七选四控制区默认收起，一键展开，保留全部选项及更新按钮。
- 手机收益卡采用两列；700px及以上平板采用四列。手机首屏优先展示研究说明、范围切换、三个视图、起投控制与收益卡，完整图表和统计沿页面自然滚动，不将全部内容强行压入一屏。
- 手机英文版缩短可见按钮文案，保留原完整无障碍名称；日期输入、字号、卡片、图例、扫描仪与表格分别适配。表格内部允许横向滚动，页面本身不横向溢出。
- 行情横轴按交易时段固定到收盘，曲线只绘制已取得的真实分时点。最新报价之后保持空白，辉光只沿已有曲线回放，面积填充也止于真实数据末端。
- A股使用09:30–15:00；港股包含收市竞价至16:10（圣诞前夕/除夕半日至12:10）；美国指数09:30–16:00美东，已加入2025及2026已知提前收盘日。纽约金沿用COMEX黄金主连，以北京时间显示，常规交易日夏令时06:00至次日05:00、冬令时07:00至次日06:00。夏冬令时根据数据日期计算。
- 行情时间轴针对正常交易日及源码中列明的半日市；尚非覆盖全球全部节假日、农历除夕与临时停市的完整交易所日历。特殊交易日的时间安排仍需按交易所公告维护。休市或连接失败时保留最近可用真实行情，并展示日期及获取状态。
- 恒生分时源末尾存在18:31的盘后时间戳，绘图排除交易时段外的分时点，避免横轴错误延伸；最新报价值及接口报价时间仍按原始响应展示。盘前/盘后报价不改写为盘中点。
- 定投研究数据与v3.8完全一致；全部七资产、五年口径、15354个样本、中英文、达标率、4个百分点默认分箱、三维旋转和二维粒子交互均保留。
- 验证：350组直方图配置、研究数据一致性、手动开场状态；五指数盘中/收盘坐标、真实终点、未来留白、纽约金夏冬令时和跨午夜、已知半日市及恒生盘后时间戳。浏览器检查320/390/768/1024/1945px宽度，手机中英文、资产面板展开、分布图与开场，控制台未见脚本错误。截图附发布目录。
- 旧版本独立保留；版本标签v3.9。
'''
sources='''
交易时段依据（2026-11-25核对）：
Nasdaq常规及2026提前收盘：https://www.nasdaq.com/market-activity/stock-market-holiday-schedule
HKEX交易及收市竞价时段：https://www.hkex.com.hk/Services/Trading-hours-and-Severe-Weather-Arrangements/Trading-Hours/Securities-Market?sc_lang=en
CME黄金合约时段：https://www.cmegroup.com/markets/metals/precious/gold/specs
CME节假日时段公告：https://www.cmegroup.com/trading-hours.html
'''
previous=Path('outputs/v3.8/使用与数据说明.txt').read_text(encoding='utf8')
(o/'使用与数据说明.txt').write_text('定投交互实验室 v3.9\n\n'+notes+sources+'\n继承的研究和交互说明：\n'+previous,encoding='utf8')
shutil.copy2('outputs/v3.8/时间的复利_A2收细圆环.svg',o/'时间的复利_A2收细圆环.svg')
p=Path('README.md');s=p.read_text(encoding='utf8')
if '- **v3.9**' not in s:s=s.replace('- **v3.8**','- **v3.9**：手机/平板适配，保留电脑布局；小屏可展开资产选择、紧凑收益卡与双语控件；行情横轴延伸至收盘，未来时段留白。\n- **v3.8**',1)
p.write_text(s,encoding='utf8')
p=Path('outputs/版本记录.html');s=p.read_text(encoding='utf8')
if 'v3.9 ·' not in s:
 s=s.replace('v3.8 · 2026-11-25 · CURRENT','v3.8 · 2026-11-25 · ARCHIVED')
 i=s.index('<section>');s=s[:i]+'''<section><div class="tag">v3.9 · 2026-11-25 · CURRENT</div><h2><a href="v3.9/定投交互实验室_v3.9.html">打开手机、平板与电脑适配新版 →</a></h2><p>电脑布局保留。手机与平板重新调整字号、卡片、间距及控件，小屏资产选择一键展开，手机四张收益卡两列展示。行情横轴固定至收盘，最新报价之后留白，辉光只沿真实曲线回放。研究数据保持一致。</p><a href="v3.9/使用与数据说明.txt">使用与数据说明</a> · <a href="v3.9/手机首屏.jpg">手机预览</a> · <a href="v3.9/平板首屏.jpg">平板预览</a></section>'''+s[i:]
 p.write_text(s,encoding='utf8')
p=Path('outputs/版本说明.txt');s=p.read_text(encoding='utf8')
if 'v3.9 —' not in s:p.write_text(s+'\n\n'+notes,encoding='utf8')
(q/'README.txt').write_text('v3.9运行源码\n\n构建：F:\\anaconda3\\python.exe work/v3.9/build.py\n验证：node work/v3.9/checks.cjs；node work/v3.9/check_sessions.cjs；node work/v3.9/check_intro.cjs\n发布说明与校验清单：F:\\anaconda3\\python.exe work/v3.9/release.py\n\nresponsive.css、responsive.js实现多设备适配；sessions.js控制真实行情的完整时段坐标；playback.js驱动实际曲线的辉光回放。\n金融研究数据沿用work/v3.5/data.json，独立于实时行情。字体、OGL与React Bits许可随源码保留。字体采用既有嵌入子集，Adobe字体尚待实际Web项目链接。\n不要覆盖旧版本目录。\n',encoding='utf8')
(o/'SHA256.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(o.iterdir()) if p.is_file() and p.name!='SHA256.json'},ensure_ascii=False,indent=2),encoding='utf8')
print('Saved v3.9 release, archive index and checksums')

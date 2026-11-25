from pathlib import Path
import json,hashlib
q=Path('work/v3.5');o=Path('outputs/v3.5');p=Path('outputs/版本记录.html');s=p.read_text(encoding='utf8')
if 'v3.5 ·' not in s:
 s=s.replace('v3.4 · 2026-11-25 · CURRENT','v3.4 · 2026-11-25 · ARCHIVED');i=s.index('<section>');s=s[:i]+'''<section><div class="tag">v3.5 · 2026-11-25 · CURRENT</div><h2><a href="v3.5/定投交互实验室_v3.5.html">打开七资产达标率新版 →</a></h2><p>新增10年国债ETF 511260与标普500ETF 513500，勾选四种后统一更新。仪表改为收益率≥门槛的达标比例，包含等于门槛的样本。三个背景图标；英文采用内置IBM Plex Sans。中文机械体等待Adobe项目CSS链接，当前使用备用字体。</p><a href="v3.5/七资产各自全部历史统计.csv">七资产统计</a> · <a href="v3.5/七资产全部滚动样本.csv">全部样本</a> · <a href="v3.5/数据口径与来源.txt">数据及字体状态</a></section>'''+s[i:];s=s.replace('v3.3.1 / v3.4。','v3.3.1 / v3.4 / v3.5。');p.write_text(s,encoding='utf8')
p=Path('outputs/版本说明.txt');s=p.read_text(encoding='utf8')
if 'v3.5 —' not in s:
 s+='''\n\nv3.5 — 2026-11-25
- 修正收益门槛仪表主指标：由“不高于门槛”改为“达到或超过门槛”，计算return >= target，严格未达标为return < target；等于门槛、零收益均按相应定义计入。
- 增加国泰上证10年期国债ETF 511260（2017-08-24起，1,014个样本）与博时标普500ETF 513500（2014-01-15起，1,896个样本）。两者均使用人民币场内价格，全持有期5年。
- 10年国债五次现金分红按除息日收盘再投资；标普500在2022-03-29按1:2拆分且停牌，3月30日起乘2连接价格，当日不投入。
- 从七种资产中勾选四种并点击更新，选择数量不等于4时禁用提交；更新后同时重算共同区间、回放、统计、分布、仪表和导出，记忆选择。
- 原五资产数据与样本保持完全一致；七资产合计15,354个完整5年样本。
- 背景从两处改为三处大小不同的量化线场，避开内容，保留暂停、减少动态效果与交互回弹。
- 英文标题与正文内置IBM Plex Sans，600/400；数字继续使用既有Lab Numbers。字体来自用户指定CSS地址，转换为WOFF2并附SIL OFL许可。
- 中文HelloFont ID Ji Xie Ti仅完成接入口，尚未获得用户Adobe Web项目CSS链接，当前仍使用Noto Sans SC备用字体；未声称已启用。
- 验证35种四资产组合、70种范围、695次轨迹、2,520个达标计数、560个点阵布局及精确相等/零收益边界；新增ETF原始份额账本与全收益计算一致。
- 浏览器检查七选四禁用/提交、达标方向、5%与10%门槛、新资产、中英文、IBM字体字重、三个背景；无控制台错误。
- Git标签v3.5；旧版冻结保留。
''';p.write_text(s,encoding='utf8')
p=Path('README.md');s=p.read_text(encoding='utf8')
if '- **v3.5**' not in s:s=s.replace('- **v3.4**','- **v3.5**：七选四，新增10年国债/标普500ETF，仪表显示收益率≥门槛的达标比例，三个背景图标及IBM Plex Sans英文。中文机械体待Adobe项目CSS链接。\n- **v3.4**')
s=s.replace('华夏恒生ETF 159920；网页每次展示其中四种。','华夏恒生ETF 159920、10年国债ETF 511260、人民币标普500ETF 513500；网页每次展示其中四种。');s=s.replace('`v3.3.1` 与 `v3.4`','`v3.3.1`、`v3.4` 与 `v3.5`');p.write_text(s,encoding='utf8')
d=json.loads((q/'data.json').read_text(encoding='utf8'));lines=['定投交互实验室 v3.5 / 2026-11-25','', '每日各标的交易日收盘投入人民币50元，持续完整5年；允许小数份额，忽略交易费用及价差。累计收益=期末市值/总投入-1，未年化。包含起投日，不含最终估值日投入。','起投截止2021-10-31，最后实际起投日2021-10-29；行情截至2026-10-31，最后交易日2026-10-30。','', '资产与各自全部历史样本：']
for a in d['assets']:lines.append(f"{a['name']} {a['code']}：{len(a['samples']):,}个，自{a['samples'][0][0]}起。")
lines += ['合计15,354个样本，原五类资产与v3.4完全一致。','', '选择与统计：每次选择四种；共同范围为其可用起投日的实际交集，各自全部历史保留各标的样本，滑轨为起投日并集。10年国债纳入共同范围时，最早起点不早于2017-08-24。','七资产各自全部历史统计.csv为各资产独立全历史统计；网页导出的CSV为当前四种资产及当前范围。','达标仪表：数量=count(return >= target)，达标比例=数量/样本数；未达标=count(return < target)。不能使用1-P(return <= target)，因为那会排除刚好等于目标的样本。0%达标包含零收益。','', '新增ETF事件：', '10年国债511260每份现金分红：2025-09-23 1.36元；2025-12-26 0.8330元；2026-03-25 0.6711元；2026-06-25 1.2686元；2026-09-18 1.2747元。均按除息日收盘再投资。上市前的2017年初始份额折算不再重复调整。','标普500 513500：2022-03-29按1:2拆分并停牌，当日不投入；3月30日起价格乘2。后复权序列逐日核对一致，截至研究截止未发现现金分红。','分红与拆分已用原始市场价格、实际份额增减的账本独立核对。','原五类资产其他事件、来源与口径见v3.4的数据口径与来源.txt。','', '新增数据及公告来源：', 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get', 'https://fundf10.eastmoney.com/fhsp_511260.html', 'https://fundf10.eastmoney.com/fhsp_513500.html', 'https://www.sse.com.cn/disclosure/fund/announcement/c/new/2026-03-19/511260_20260319_NNHW.pdf', 'https://www.sse.com.cn/disclosure/fund/announcement/c/new/2026-06-26/513500_20260626_PDT5.pdf', 'https://www.sse.com.cn/disclosure/fund/announcement/c/new/2026-06-22/511260_20260622_BWI3.pdf', 'https://static.cninfo.com.cn/finalpage/2022-03-30/1212733058.PDF', '', '字体状态：', '英文IBM Plex Sans已内置，标题600、正文400；来源为用户提供的 https://fonts.loli.net/css2?family=IBM+Plex+Sans:wght@400;600&display=swap ，许可见IBMPlexSans-OFL.txt。','中文HelloFont ID Ji Xie Ti：尚未提供Adobe Web项目CSS链接，本版仅预留接入口，实际使用内置Noto Sans SC备用字体。实际链接到位后接入，不下载或打包Adobe字体文件。','数字保留Space Grotesk；所有现有内容、数据与已内置字体仍可离线使用。', '', '历史样本频率不代表未来概率；相邻起投样本高度重叠。']
(o/'数据口径与来源.txt').write_text('\n'.join(lines),encoding='utf-8-sig')
(o/'SHA256.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in o.iterdir() if p.is_file() and p.name!='SHA256.json'},ensure_ascii=False,indent=2),encoding='utf8')
print('Saved v3.5; Adobe Chinese font explicitly pending; English and other requested work completed.')

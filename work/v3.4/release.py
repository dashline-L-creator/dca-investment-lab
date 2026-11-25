from pathlib import Path
import json,hashlib
o=Path('outputs/v3.4');p=Path('outputs/版本记录.html');s=p.read_text(encoding='utf8')
if 'v3.4 ·' not in s:
 s=s.replace('v3.3.1 · 2026-11-25 · CURRENT','v3.3.1 · 2026-11-25 · ARCHIVED');i=s.index('<section>')
 s=s[:i]+'''<section><div class="tag">v3.4 · 2026-11-25 · CURRENT</div><h2><a href="v3.4/定投交互实验室_v3.4.html">打开五资产自选四种新版 →</a></h2><p>新增华夏恒生ETF 159920，自五类资产中选择展示四种，图表与统计联动。起投截止延至2021-10-31，行情覆盖至2026-10-31。新增新拟态鼠标交互与图标逐步填充开场。</p><a href="v3.4/五资产统计汇总.csv">五资产统计</a> · <a href="v3.4/五资产全部滚动样本.csv">全部滚动样本</a> · <a href="v3.4/数据口径与来源.txt">口径与来源</a></section>'''+s[i:]
 s=s.replace('v3.3 / v3.3.1。','v3.3 / v3.3.1 / v3.4。');p.write_text(s,encoding='utf8')
p=Path('outputs/版本说明.txt');s=p.read_text(encoding='utf8')
if 'v3.4 —' not in s:
 s+='''\n\nv3.4 — 2026-11-25
- 新增人民币交易的华夏恒生ETF 159920，自2012-10-22上市日起，2018-06-22每份0.076元分红按除息日收盘再投资。
- 五种资产中始终展示四种，以“暂不展示”单选控件切换并记忆选择；原四资产为首次打开的默认组合。
- 共同范围使用当前四资产实际起投日交集；各自全部历史保留各自样本，滑轨使用并集。资产颜色固定，切换后点阵、扫描仪、统计表、CSV导出和热力图同步。
- 起投截止由2020-12-31延至2021-10-31，该日为周日，最后实际起投日2021-10-29；行情覆盖到2026-10-31，最后交易日2026-10-30。
- 补齐原四资产2026年行情，纳入国债ETF2026年三次现金分红。五类资产共12,444个完整5年样本；原四资产既有样本数值保持一致。
- 鼠标参考StyleKit新拟态：200px环境柔光、轻微磁吸按钮、卡片压凹；图表和输入区域淡出柔光，触控及减少动效模式保留原生交互。
- 开场图标参考Motion Fill text：淡色底图与从左到右裁切揭示的实色层，保留自动结束、缩入页首、跳过、重播和会话记忆。采用原创CSS实现，无外部运行时依赖。
- 检查：10种资产/范围组合、102次轨迹重建、12,444个样本结构、10个独立现金份额分红账本、旧样本逐项一致、JavaScript语法。
- 浏览器检查：资产切换、恒生收益分布、中英文、2021年月地图、最后起投日、鼠标柔光、图标填充过程与跳过；控制台无错误。保存预览截图。
- 旧版本冻结，新增Git标签v3.4。
''';p.write_text(s,encoding='utf8')
p=Path('README.md');s=p.read_text(encoding='utf8')
if '- **v3.4**' not in s:s=s.replace('- **v3.3.1**','- **v3.4**：新增恒生ETF、五选四、起投截止延至2021-10-31、新拟态鼠标与图标填充开场。\n- **v3.3.1**')
s=s.replace('沪深300全收益指数H00300、黄金ETF 518880、5年国债ETF 511010、人民币纳指QDII ETF 513100。','沪深300全收益指数H00300、黄金ETF 518880、5年国债ETF 511010、人民币纳指QDII ETF 513100、华夏恒生ETF 159920；网页每次展示其中四种。')
s=s.replace('起投日不晚于2020-12-31，持有完整5年，数据覆盖至2025-12-31。','起投日不晚于2021-10-31，持有完整5年，数据覆盖至2026-10-31；最后实际起投日为2021-10-29。')
s=s.replace('共同起投区间为2013-07-29至2020-12-31，每类1812个样本。','共同区间取所选四资产实际可用起投日交集；默认组合为2013-07-29至2021-10-29，每类2010个样本。各自全部历史按标的上市/数据起点计算。')
s=s.replace('`v3.3` 与 `v3.3.1`','`v3.3`、`v3.3.1` 与 `v3.4`');p.write_text(s,encoding='utf8')
(o/'数据口径与来源.txt').write_text('''定投实验室 v3.4 / 2026-11-25

每日各资产交易日收盘投入人民币50元，允许小数份额，持有完整5年。
累计收益率=期末总市值/总投入-1，未年化。包含起投日，不含最终估值日的投入。
五周年逢非交易日按该资产前一可交易收盘估值。停牌日不投入。
起投截止2021-10-31（周日），最后实际起投日2021-10-29；行情截取至2026-10-31，最后交易日2026-10-30。

样本数（各自全部历史）
沪深300全收益 H00300：4,088，自2004-12-31；包括指数回溯历史。
华安黄金ETF 518880：2,010，自2013-07-29。
国泰5年期国债ETF 511010：2,092，自2013-03-25。
国泰纳斯达克100 QDII ETF 513100：2,060，自2013-05-15。
华夏恒生ETF 159920：2,194，自2012-10-22。
合计12,444。网页始终显示四种；共同范围按当前四种资产实际样本交集计算。
五资产统计汇总.csv中的common5是所有五种资产共同样本区间，all为各自全部历史。
网页导出CSV则对应当前选择的四种资产及当前范围。

收益与分红
沪深300使用全收益指数；ETF使用人民币场内收盘价，并按现金分红除息日收盘即时再投资。
恒生ETF：2018-06-22每份0.076元。
国债ETF：2013-06-03每份0.28元；2015-10-09每份1元；2025-09-23每份1.45元；2025-12-26每份0.6542元；2026-03-25每份0.5715元；2026-06-25每份0.8144元；2026-09-18每份0.6204元。
纳指ETF：2022-01-13按1:5拆分，当日停牌不投入；其后价格乘5，以保持每份价格序列连续。
基金内部费用反映在市场价格中；忽略交易费用、价差和分红到账等待。
价格/净值不是同一口径：本研究按实际可交易场内价格计算，包含人民币汇率和折溢价影响。
基金内部收到但未向持有人分配的股息已反映在基金价格/净值中，不额外重复加回。

数据来源
中证指数官方：
https://www.csindex.com.cn/csindex-home/perf/index-perf?indexCode=H00300&startDate=20250101&endDate=20261031
腾讯公开日线（代码、年度和复权参数见work/v34_fetch.py）：
https://web.ifzq.gtimg.cn/appstock/app/fqkline/get
ETF事件校核：
https://fund.eastmoney.com/pingzhongdata/511010.js
https://fund.eastmoney.com/pingzhongdata/159920.js
https://fundf10.eastmoney.com/fhsp_511010.html
华夏恒生ETF上市与币种（基金产品资料概要）：
https://www.chinaamc.com/upload/resources/file/2026/05/29/6857ff7e1d1743be9f1f64009fe54711.pdf
恒生ETF2018年分红公告：
https://pdf.dfcfw.com/pdf/H2_AN201806191156679402_1.pdf
国债ETF2026年3月分红公告：
https://www.sse.com.cn/disclosure/fund/announcement/c/new/2026-03-20/511010_20260320_Y87H.pdf
国债ETF2026年6月分红公告：
https://www.sse.com.cn/disclosure/fund/announcement/c/new/2026-06-22/511010_20260622_0EYP.pdf

动效参考（独立实现，网页离线内置）
https://www.stylekit.top/zh/mouse-interactions#rooms — Neumorphism / Press dent, magnetic soft button, follow aura
https://motion.dev/examples/js-loading-fill-text — 双层图形、从左向右clip-path揭示

验证
旧四资产既有样本数值与冻结版本一致；新增数据重新计算。
检查10种四资产/范围组合、102次轨迹、所有12,444个样本。
国债及恒生10个样本用原始交易价格和实际现金分红份额账本独立核对。
相邻起投样本高度重叠，历史频率不代表未来概率。
''',encoding='utf-8-sig')
(o/'SHA256.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in o.iterdir() if p.is_file() and p.name!='SHA256.json'},ensure_ascii=False,indent=2),encoding='utf8')
print('Recorded v3.4 release and source provenance.')

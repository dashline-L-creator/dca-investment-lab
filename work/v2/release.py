from pathlib import Path
import json,hashlib,shutil
p=Path('outputs');v=p/'v2.0'
log='''定投交互实验室 / 版本记录

v1.0（冻结）— 原三资产中文版
- 沪深300全收益、华安黄金ETF、国泰5年国债ETF。
- 保留原网页、研究报告、Excel、全部CSV、清洗后数据和预览。
- Git标签：v1.0。原始文件未覆盖。

v2.0 — 2026-11-25
- 加入人民币交易的国泰纳斯达克100 QDII ETF（513100）。
- 上市日2013-05-15；截至2025年底行情；处理2022-01-13的1:5拆分与停牌。
- 纳指各自历史1862个起点；四资产共同区间每类1812个起点。
- 新增中英文切换，涵盖页面、图表、提示、研究口径、导出标题；保存语言偏好。
- 使用内嵌Noto Sans SC与Space Grotesk字体，SIL OFL授权文件随附。
- 新增动态光晕、网格背景和关闭选项，尊重系统减少动态效果偏好。
- 新增原三资产对照，原三类资产统计结果保持不变。
- 允许各标的停牌日差异，卡片标注各自最终估值日。
- 9458个资产/起投日轨迹验证通过；11行范围统计与独立计算结果一致。
- 原三资产数据下载2026-11-24；纳指数据下载2026-11-25。
- Git标签：v2.0。所有版本仅保存在本机，未配置远程仓库。

使用方式
直接在浏览器打开v1.0或v2.0文件夹中的HTML文件，无需联网。
四资产共同区间依然从2013-07-29开始，因为黄金上市晚于纳指。
收益均为累计收益，未年化；历史样本高度重叠，历史频率不代表未来概率。

数据出处
上市：https://www.gtfund.com/contents/2013/5/14-1ee92bc6e3b147699a40d612256a4873.html
拆分及停牌：https://static.cninfo.com.cn/finalpage/2022-01-07/1212113731.PDF
行情：腾讯web.ifzq.gtimg.cn公开接口（raw/hfq交叉核验）；事件：东方财富pingzhongdata。

本地版本管理
工作目录：F:\\本人相关材料\\收益率
.git目录保存版本历史。outputs保存可打开的版本；work保存构建脚本、原始响应和中间数据。
运行outputs/版本管理.ps1可查看提交记录；该脚本仅为本项目隔离本机已有的无效全局Git配置，不修改全局设置。
恢复旧版时优先直接打开冻结网页，无需切换整个工作目录。
'''
(p/'版本说明.txt').write_text(log,encoding='utf8')
(p/'版本记录.html').write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>定投实验室 · 版本档案</title><style>body{background:#0d1523;color:#e4ecfa;font:16px/1.8 "Microsoft YaHei",sans-serif;max-width:900px;padding:40px 24px;margin:auto}h1{font-weight:500}section{background:#152237;border:1px solid #30435f;border-radius:16px;padding:25px;margin:24px 0}a{color:#9dc8ff}small,p{color:#a9bad2}.tag{color:#eac67b;font-size:12px;letter-spacing:3px}</style><div class="tag">THE LONG GAME / RELEASE ARCHIVE</div><h1>定投实验室 · 版本档案</h1><p>原版冻结保存，新版独立发布。两版都可以离线打开。</p><section><div class="tag">v2.0 · 2026-11-25</div><h2><a href="v2.0/定投交互实验室_v2.0.html">打开双语四资产新版 →</a></h2><p>新增纳指QDII ETF、中英文切换、专业字体与可关闭动态背景。保留原三资产对照。</p><a href="v2.0/四资产统计汇总.csv">统计汇总 CSV</a> · <a href="v2.0/纳斯达克100ETF_全部滚动样本.csv">纳指全部样本 CSV</a></section><section><div class="tag">v1.0 · FROZEN</div><h2><a href="v1.0/定投交互实验室.html">打开原三资产中文版 →</a></h2><p>保持原始界面、数据和研究口径。完整报告与Excel一并保存。</p><a href="v1.0/五年定投研究报告.html">原研究报告</a> · <a href="v1.0/五年定投统计.xlsx">原Excel明细</a></section><p><a href="版本说明.txt">查看完整更新日志与数据出处</a></p><small>本地Git标签：v1.0 / v2.0。未上传远程服务。历史样本频率不代表未来概率。</small></html>''',encoding='utf8')
manifest={str(f.relative_to(v)):hashlib.sha256(f.read_bytes()).hexdigest() for f in v.iterdir() if f.is_file() and f.name!='SHA256.json'};(v/'SHA256.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
# Confirm preservation against the original files.
assert (p/'定投交互实验室.html').read_bytes()==(p/'v1.0/定投交互实验室.html').read_bytes()
print('Archived original checksum verified; release index and changelog saved.')

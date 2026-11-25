from pathlib import Path
import json
q=Path('work/v3.7');p=q/'template.html';s=p.read_text(encoding='utf8')
oldtitle='四资产收益山脊';title='四资产立体直方图'
oldcaption='共享收益横轴，四层山脊展示分布形状；每个粒子仍是一个真实起投样本。山高按各资产峰值归一化，不用于比较样本数量。'
caption='X轴为五年累计收益率，Y轴区分资产，Z轴为分箱样本比例；四种资产共享坐标与刻度。默认每1个百分点分箱。'
oldaria='四资产收益山脊：横轴收益率，山高为各资产归一化分布，深度区分资产；方向键旋转，加减键缩放，Home复位'
aria='四资产立体直方图：X轴累计收益率，Y轴资产类别，Z轴样本比例；方向键旋转，加减键缩放，Home复位'
oldnote='颜色区分资产 · 红线为零收益 · 山高各自归一化';note='颜色区分资产 · 红线为零收益 · 共用样本比例刻度'
for a,b in [(oldtitle,title),(oldcaption,caption),(oldaria,aria),(oldnote,note)]:s=s.replace(a,b)
s=s.replace('<div class="intro-mark" id="introMark">','<div class="intro-mark" id="introMark"><div id="electricLogo" aria-hidden="true"></div>')
s=s.replace('<div class="intro-relief relief-one"','<canvas id="introMarketField" class="intro-market-field" aria-hidden="true"></canvas><div class="intro-relief relief-one"')
s=s.replace('<body>','<body><canvas id="marketField" class="market-field" aria-hidden="true"></canvas>')
s=s.replace('<button id="methodBtn">','<button id="marketBtn">市场脉搏 ↗</button><button id="methodBtn">')
s=s.replace('<div class="chart swarm-chart">','<div class="hist-bin-control"><label><span>分箱宽度</span><select id="histBinWidth" aria-label="直方图分箱宽度"><option value="0.005">0.5 个百分点</option><option value="0.01" selected>1 个百分点</option><option value="0.02">2 个百分点</option><option value="0.05">5 个百分点</option></select></label><span class="tiny muted">柱高 = 区间样本数 ÷ 该资产样本总数</span></div><div class="chart swarm-chart">',1)
s=s.replace('<div class="legend"><span style="color:var(--gold)">◉ 当前起点</span>','<div id="histAxisKeys" class="hist-axis-keys"><span><b>X</b> 累计收益率（%）</span><span><b>Y</b> 资产类别（01—04）</span><span><b>Z</b> 样本比例（%）</span></div><div class="legend"><span id="histSelectedNote" style="color:var(--gold)">◉ 当前起点</span>',1)
s=s.replace('installOrbit();setScope','installOrbit();installHistogram();setScope')
s=s.replace('__INTRO_JS__','__ELECTRIC_JS__\n__INTRO_JS__\n__MARKETS_JS__')
s=s.replace('</body>','''<div class="modal-backdrop market-dialog" id="marketDialog" role="dialog" aria-modal="true" aria-label="市场脉搏" hidden><div class="modal market-modal"><div class="chart-head"><div><div class="eyebrow">MARKET PULSE / LATEST SESSION</div><h2>五个市场，最近一个交易日。</h2><p class="tiny muted" id="marketStatus">每60秒自动刷新 · 公开行情可能延迟</p></div><div class="flex"><button id="marketRefresh">↻ 刷新行情</button><button id="marketClose" aria-label="关闭市场脉搏">关闭 ×</button></div></div><div id="marketCards" class="market-cards"></div><p class="footnote">涨跌幅以各指数前收盘价为基准。交易日期及行情时间按各市场当地时间展示；休市显示最近交易日。开场与背景只展示行情，不参与定投研究计算。数据来源：腾讯公开行情。</p><a href="https://gu.qq.com/" target="_blank" rel="noopener">行情来源 ↗</a></div></div></body>''')
# The market dialog must exist before app initialization runs.
marker='<div class="modal-backdrop market-dialog';i=s.index(marker);j=s.index('</body>',i);modal=s[i:j];s=s[:i]+s[j:];s=s.replace('<script id="dataset"',modal+'\n<script id="dataset"')
s=s.replace('</style>','''
/* v3.7: the chart belongs to the same pale neumorphic surface as the page. */
.is-3d .swarm-chart{background:radial-gradient(ellipse at 50% 20%,#e9eef5 0%,#e0e5ec 70%);border:0;box-shadow:inset 4px 4px 12px #bec7d5,inset -4px -4px 12px #f8fbff;overflow:hidden}.is-3d .swarm-chart{height:610px}.hist-bin-control{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:18px 0}.hist-bin-control label{display:flex;align-items:center;gap:12px;font-size:14px;color:var(--muted)}.hist-axis-keys{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:20px 0}.hist-axis-keys span{border-radius:14px;box-shadow:var(--inset);padding:14px 10px;font-size:13px;color:var(--muted)}.hist-axis-keys b{font:600 17px "Lab Numbers",sans-serif;color:var(--gold);margin-right:8px}.cloud-panel:not(.is-3d) .hist-bin-control,.cloud-panel:not(.is-3d) #histAxisKeys{display:none}.is-3d #histSelectedNote{display:none}
#electricLogo{position:absolute;inset:-12%;pointer-events:none}#electricLogo canvas{width:100%;height:100%;display:block}.electric-ready .mark-fill{opacity:.08}.electric-ready .mark-ghost{opacity:.06}.intro-market-field{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}.intro-stage{z-index:2}.brand-intro.is-leaving .intro-market-field{opacity:0;transition:opacity .25s}.market-field{position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}body>main{position:relative;z-index:1}.market-dialog{z-index:110}.market-modal{max-width:1120px;width:calc(100vw - 40px);max-height:90vh;overflow:auto}.market-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.market-card{padding:22px;border-radius:20px;box-shadow:var(--inset)}.market-card strong{font-size:16px}.market-value{font:600 26px "Lab Numbers",sans-serif;margin:18px 0}.market-value span{font-size:16px;margin-left:15px}.market-mini{height:155px}.market-meta{font-size:11px;color:var(--muted);line-height:1.9}.market-modal a{font-size:12px;color:#6d5dfc}.market-card .code{font-size:10px}
@media(max-width:850px){.market-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.market-modal{padding:22px}}@media(max-width:580px){.hist-bin-control{flex-direction:column;align-items:flex-start}.hist-axis-keys{gap:8px}.hist-axis-keys span{padding:12px 8px;font-size:11px}.hist-axis-keys b{display:block;margin:0 0 4px}.is-3d .swarm-chart{height:470px}.market-cards{grid-template-columns:1fr}}
</style>''')
p.write_text(s,encoding='utf8')
p=q/'cloud3d.js';s=p.read_text(encoding='utf8')
for a,b in [(oldtitle,title),(oldcaption,caption),(oldaria,aria),(oldnote,note)]:s=s.replace(a,b)
s=s.replace('scale:Math.min(c.w*.315,c.h*.35)','scale:Math.min(c.w*.275,c.h*.33)')
s=s.replace('if(hit?.r!==cloudHover?.r||hit?.k!==cloudHover?.k)','if(hit?.index!==cloudHover?.index||hit?.k!==cloudHover?.k)')
start=s.index('if(hit){let r=hit.r;tooltip(');end=s.index("else $('histTip').hidden=true",start);s=s[:start]+"if(hit){tooltip('histTip',e,histogramTip(hit))}"+s[end:]
s=s.replace("setStart(closest(hit.r[0]))","histPicked={k:hit.k,index:hit.index};drawDistribution()")
p.write_text(s,encoding='utf8')
p=q/'build.py';s=p.read_text(encoding='utf8').replace("(q/'ridge.js').read_text(encoding='utf8')","(q/'histogram3d.js').read_text(encoding='utf8')")
s=s.replace(".replace('__INTRO_JS__'",".replace('__ELECTRIC_JS__',(q/'electric.js').read_text(encoding='utf8').replace('__OGL_MODULE_URL__','data:text/javascript;base64,'+base64.b64encode((q/'ogl.bundle.mjs').read_bytes()).decode())).replace('__MARKETS_JS__',(q/'markets.js').read_text(encoding='utf8').replace('__MARKET_SNAPSHOT__',(q/'market-snapshot.json').read_text(encoding='utf8'))).replace('__INTRO_JS__'")
s+="\nfor name in ['OGL-LICENSE.txt','reactbits-license.txt']:\n shutil.copy2(q/name,o/name)\n"
p.write_text(s,encoding='utf8')
p=q/'intro.js';s=p.read_text(encoding='utf8').replace('finish(),2450','finish(),3500');p.write_text(s,encoding='utf8')
p=q/'fonts.py';s=p.read_text(encoding='utf8').replace("(p/'ridge.js')","(p/'histogram3d.js')").replace("+(p/'orbit.js').read_text(encoding='utf8')","+(p/'orbit.js').read_text(encoding='utf8')+(p/'markets.js').read_text(encoding='utf8')");p.write_text(s,encoding='utf8')
p=q/'translations.json';d=json.loads(p.read_text(encoding='utf8'));d.update({title:'Four-asset 3D histogram',caption:'X: five-year return. Y: asset. Z: sample share per bin. All four assets share the same axes and scale. Default bin width: 1 percentage point.',aria:'Four-asset 3D histogram: X return, Y asset category, Z sample percentage. Arrow keys rotate, +/- zoom, Home resets.',note:'Asset colours · Red = zero return · Shared sample-share scale','分箱宽度':'Bin width','直方图分箱宽度':'Histogram bin width','0.5 个百分点':'0.5 pp','1 个百分点':'1 pp','2 个百分点':'2 pp','5 个百分点':'5 pp','柱高 = 区间样本数 ÷ 该资产样本总数':'Height = Bin count / Asset sample count','累计收益率（%）':'Cumulative return (%)','资产类别（01—04）':'Asset category (01–04)','样本比例（%）':'Sample share (%)','市场脉搏 ↗':'Market pulse ↗','市场脉搏':'Market pulse','五个市场，最近一个交易日。':'Five markets. Their latest trading sessions.','每60秒自动刷新 · 公开行情可能延迟':'Refresh every 60s · Public quotes may be delayed','部分连接失败 · 显示最近可用行情':'Some connections failed · Last available quotes shown','正在刷新…':'Refreshing…','↻ 刷新行情':'↻ Refresh quotes','关闭市场脉搏':'Close market pulse','涨跌幅以各指数前收盘价为基准。交易日期及行情时间按各市场当地时间展示；休市显示最近交易日。开场与背景只展示行情，不参与定投研究计算。数据来源：腾讯公开行情。':'Changes are relative to the previous close. Session dates and quote timestamps use each market’s local time. Closed markets show their latest session. Background quotes are separate from the DCA research. Source: Tencent public quotes.','行情来源 ↗':'Quote source ↗'})
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
print('Integrated v3.7 histogram, aligned axes, electric intro and live markets')

from pathlib import Path
import shutil,json,re
q=Path('work/v3.4');old=Path('work/v3.3.1');o=Path('outputs/v3.4')
for name in ['build.py','i18n.js','intro.js','linefield.js','favicon.html','NotoSansSC-400.woff2','NotoSansSC-600.woff2']:
 shutil.copy2(old/name,q/name)
 if name.endswith(('.py','.js')):
  p=q/name;p.write_text(p.read_text(encoding='utf8').replace('v3.3.1','v3.4').replace('v331','v34'),encoding='utf8')
shutil.copy2('outputs/v3.3.1/时间的复利_A2收细圆环.svg',o/'时间的复利_A2收细圆环.svg')
s=(old/'template.html').read_text(encoding='utf8').replace('v3.3.1','v3.4').replace('2020-12-31','2021-10-31').replace('2020.12.31','2021.10.31').replace('2020. 12. 31','2021. 10. 31').replace('2025-12-31','2026-10-31').replace('2025.12.31','2026.10.31').replace('2025. 12. 31','2026. 10. 31')
s=s.replace("COLORS=['#506bb7','#97712c','#227d75','#6d5dfc']", "PALETTE=['#506bb7','#97712c','#227d75','#6d5dfc','#b16647']")
s=s.replace('let ACTIVE=DATA.assets;',"let ACTIVE=DATA.assets.slice(0,4),COLORS=PALETTE.slice(0,4),omitted='159920';try{let stored=localStorage.getItem('dca-omitted-asset');if(DATA.assets.some(a=>a.code===stored))omitted=stored}catch{}")
s=s.replace('ACTIVE.forEach(a=>{a.lookup=', 'DATA.assets.forEach(a=>{a.lookup=')
a=s.index('function setScope(s)');b=s.index('function setStart(',a)
s=s[:a]+'''function setScope(s){stopTravel();stopGrowth();stopScan();scope=s;ACTIVE=DATA.assets.filter(a=>a.code!==omitted);COLORS=ACTIVE.map(a=>PALETTE[DATA.assets.indexOf(a)]);swarmKey='';
document.querySelectorAll('.assetSelect').forEach(el=>{let oldCode=el.dataset.assetCode||ACTIVE[+el.value||0]?.code;el.innerHTML=ACTIVE.map((a,k)=>`<option value="${k}">${a.name}</option>`).join('');el.value=Math.max(0,ACTIVE.findIndex(a=>a.code===oldCode));el.dataset.assetCode=ACTIVE[+el.value].code});
$('cdfLegend').innerHTML=ACTIVE.map((a,k)=>`<span><i style="background:${COLORS[k]}"></i>${a.name}</span>`).join('');
const common=ACTIVE[0].samples.map(r=>r[0]).filter(d=>ACTIVE.every(a=>a.lookup.has(d))),commonSet=new Set(common);starts=s==='all'?[...new Set(ACTIVE.flatMap(a=>a.samples.map(r=>r[0])))].sort():common;scopeData=ACTIVE.map(a=>a.samples.filter(r=>s==='all'||commonSet.has(r[0])));statistics=scopeData.map(stats);
document.querySelectorAll('[data-scope]').forEach(b=>{b.classList.toggle('active',b.dataset.scope===s);b.setAttribute('aria-pressed',b.dataset.scope===s)});$('startSlider').max=starts.length-1;$('startDate').min=starts[0];$('startDate').max=starts.at(-1);$('rangeStart').textContent=starts[0];$('rangeEnd').textContent=starts.at(-1);$('scopeNote').textContent=s==='all'?ACTIVE.map((a,k)=>a.name+' '+fmt(scopeData[k].length)).join(' · ')+' 个样本':'所选四资产相同起投日 · 每类'+fmt(common.length)+'个完整样本';
$('assetChips').innerHTML=ACTIVE.map((a,k)=>`<span style="--asset:${COLORS[k]}"><i class="dot"></i>${a.name}</span>`).join('');$('omitAsset').value=omitted;setStart(closest(selected));renderStats();renderMap();drawDistribution()}
function installAssetPicker(){$('omitAsset').innerHTML=DATA.assets.map(a=>`<option value="${a.code}">${a.name} · ${a.code}</option>`).join('');$('omitAsset').value=omitted;$('omitAsset').onchange=e=>{omitted=e.target.value;try{localStorage.setItem('dca-omitted-asset',omitted)}catch{}setScope(scope)}}
''' + s[b:]
s=s.replace('y<=2020','y<=2021').replace("installDistribution();setScope('common');","installAssetPicker();installDistribution();setScope('common');")
s=s.replace('<span>2021-10-31</span>','<span id="rangeEnd">2021-10-29</span>')
s=s.replace('s.onchange=()=>{drawDistribution();renderMap()}',"s.onchange=()=>{s.dataset.assetCode=ACTIVE[+s.value].code;drawDistribution();renderMap()}")
s=s.replace("let r=scopeData[0].reduce((a,b)=>a[5]<b[5]?a:b)","let k=Math.max(0,ACTIVE.findIndex(a=>a.code==='H00300'));let r=scopeData[k].reduce((a,b)=>a[5]<b[5]?a:b)")
s=s.replace("let r=scopeData[1].reduce((a,b)=>a[5]>b[5]?a:b)","let k=Math.max(0,ACTIVE.findIndex(a=>a.code==='518880'));let r=scopeData[k].reduce((a,b)=>a[5]>b[5]?a:b)")
s=s.replace('沪深300最差起点','所选资产最差起点').replace('黄金最好起点','所选资产最好起点')
# Both shortcut labels now explicitly follow the current distribution selector.
s=s.replace("let k=Math.max(0,ACTIVE.findIndex(a=>a.code==='H00300'));", "let k=+$('histAsset').value||0;").replace("let k=Math.max(0,ACTIVE.findIndex(a=>a.code==='518880'));", "let k=+$('histAsset').value||0;")
s=s.replace('极端起点按当前样本范围选择。','极端起点按收益分布页所选资产与当前样本范围选择。')
s=s.replace('观察沪深300、黄金、国债与纳指的成长轨迹。','从沪深300、黄金、国债、纳指和恒生中，选择四种资产一起比较。')
s=s.replace('选择四种资产一起比较。</p>','选择四种资产一起比较。</p><p class="tiny muted study-dates">起投截止 2021.10.31 · 估值覆盖至 2026.10.31</p>')
s=s.replace('<div class="toolbar">','''<div class="asset-picker panel"><div><div class="mini-label">YOUR COMPARISON / 4 OF 5</div><h2>五种资产，选择四种一起看。</h2><div id="assetChips" class="asset-chips"></div></div><label class="omit-label"><span>暂不展示</span><select id="omitAsset" aria-label="选择暂不展示的资产"></select></label></div><div class="toolbar">''',1)
s=re.sub(r'(<div class="intro-mark" id="introMark">)<canvas class="identity-mark" aria-hidden="true"></canvas>\s*',r'\1<canvas class="identity-mark mark-ghost" aria-hidden="true"></canvas><canvas class="identity-mark mark-fill" aria-hidden="true"></canvas>',s)
css='''
.asset-picker{display:flex;justify-content:space-between;align-items:center;gap:24px;margin:0 0 32px;padding:24px 28px}.asset-picker h2{font-size:20px;margin:5px 0 14px}.asset-chips{display:flex;flex-wrap:wrap;gap:10px 24px;font-size:14px;color:var(--muted)}.asset-chips>span{display:flex;align-items:center}.asset-chips .dot{margin-right:8px}.omit-label{display:flex;align-items:center;gap:16px;white-space:nowrap;font-size:14px}.omit-label select{max-width:280px}
.intro-mark{position:relative}.intro-mark .identity-mark{position:absolute;inset:0}.intro-mark .mark-ghost{opacity:.16}.intro-mark .mark-fill{clip-path:inset(0 100% 0 0)}.brand-intro.is-playing .intro-mark{animation:none!important;filter:none;opacity:1;transform:none}.brand-intro.is-playing .mark-fill{animation:identity-fill 1.85s cubic-bezier(.16,.6,.35,1) .15s both}@keyframes identity-fill{0%{clip-path:inset(0 100% 0 0)}20%{clip-path:inset(0 82% 0 0)}48%{clip-path:inset(0 62% 0 0)}75%{clip-path:inset(0 20% 0 0)}100%{clip-path:inset(0 0 0 0)}}
#softAura{position:fixed;left:0;top:0;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(150,170,190,.30),transparent 62%);filter:blur(24px);mix-blend-mode:multiply;pointer-events:none;z-index:6;opacity:0;will-change:transform;transition:opacity .3s}.soft-magnet{translate:var(--mag-x,0px) var(--mag-y,0px)}.asset-card.soft-near{box-shadow:inset 4px 4px 10px #bdc5d2,inset -4px -4px 10px #f6f9fc;transition:box-shadow .24s}
@media(max-width:700px){.asset-picker{flex-direction:column;align-items:stretch;padding:24px 20px}.omit-label{justify-content:space-between}.omit-label select{width:70%;max-width:none}.asset-chips{gap:12px 20px}}
@media(pointer:coarse),(prefers-reduced-motion:reduce){#softAura{display:none}.soft-magnet{translate:none!important}}@media(prefers-reduced-motion:reduce){.brand-intro.is-playing .mark-fill{animation:none!important;clip-path:inset(0)}}
'''
s=s.replace('__FONTCSS__',css+'\n__FONTCSS__').replace('__FIELD_JS__','__FIELD_JS__\n__MOUSE_JS__')
# Replace the methodology as a coherent current-version description.
a=s.index('<ul>',s.index('id="method"'));b=s.index('</ul>',a)+5
method=[
'每个标的交易日收盘投入50元，允许小数份额；累计收益率=期末市值÷总投入−1，未年化。',
'起投截止为2021-10-31；该日为周日，最后可选交易日起点为2021-10-29。行情覆盖至2026-10-31，最后交易日为2026-10-30；每个样本均持有完整5年。',
'包含起投日，不含最终估值日的投入。五周年遇非交易日向前取该标的最近交易日；停牌日不投入。',
'沪深300使用全收益指数H00300，自2004-12-31起，包含回溯历史；黄金采用华安黄金ETF 518880；国债采用国泰5年期国债ETF 511010。',
'纳指采用人民币交易的国泰纳斯达克100 QDII ETF 513100，自2013-05-15上市日起；2022-01-13按1:5拆分并停牌，当日不投入。拆分后价格乘5构建连续序列。',
'恒生采用人民币交易的华夏恒生ETF 159920，自2012-10-22上市日起。2018-06-22每份分红0.076元，按除息日收盘即时再投资；场内价格反映汇率、跟踪误差和溢价。',
'国债ETF现金分红均按除息日收盘即时再投资。2026年新增每份分红：3月25日0.5715元、6月25日0.8144元、9月18日0.6204元。忽略到账等待、交易费用和价差；基金内部费用已反映在价格中。',
'每次展示所选的四种资产。共同区间取这四种资产实际可用起投日的交集；各自全部历史分别保留其全部样本，时间滑轨取起投日并集。切换资产后重新统计。',
'相邻样本高度重叠，不是独立观察；历史亏损比例不代表未来概率。分布统计基于完整5年，回放卡片反映当前持有时点。最差5%均值取最低向上取整5%样本，标准差采用总体口径。',
'数据来源：中证指数官方接口、腾讯公开行情、基金管理人分红及上市公告。数据于2026-11-25下载。旧版冻结保存，本版v3.4新增恒生资产、四选五、截止日期延长及鼠标和开场动效。'
]
s=s[:a]+'<ul>'+''.join('<li>'+v+'</li>' for v in method)+'</ul>'+s[b:]
s=re.sub('数据截至2026-10-31 · 原数据2026-11-24 · 纳指2026-11-25','数据截至2026-10-31 · 更新于2026-11-25',s)
(q/'template.html').write_text(s,encoding='utf8')
b=(q/'build.py').read_text(encoding='utf8').replace("(p/'data.json')","(q/'data.json')").replace(".replace('__FAVICON__'", ".replace('__MOUSE_JS__',(q/'mouse.js').read_text(encoding='utf8')).replace('__FAVICON__'")
(q/'build.py').write_text(b,encoding='utf8')
d=json.loads((old/'translations.json').read_text(encoding='utf8'))
d.update({'恒生ETF':'Hang Seng ETF','五种资产，选择四种一起看。':'Five assets. Choose four to compare.','暂不展示':'Leave out','选择暂不展示的资产':'Choose the asset to leave out','所选四资产相同起投日 · 每类':'Same start dates for the selected four · Each has ','个完整样本':' complete observations','所选资产最差起点':'Selected asset: worst start','所选资产最好起点':'Selected asset: best start','从沪深300、黄金、国债、纳指和恒生中，选择四种资产一起比较。':'Compare four assets chosen from CSI 300, gold, Treasuries, Nasdaq and Hang Seng.','极端起点按收益分布页所选资产与当前样本范围选择。':'Extremes use the asset selected on the distribution tab and the current sample scope.','数据截至2026-10-31 · 更新于2026-11-25':'Data through 2026-10-31 · Updated 2026-11-25'})
eng=[
'Invest RMB 50 at each asset’s trading-day close, allowing fractional units. Cumulative return = terminal value / contributions − 1; not annualized.',
'Start cutoff: 2021-10-31 (Sunday); last selectable start: 2021-10-29. Data cutoff: 2026-10-31; last trading day: 2026-10-30. Every observation spans five full years.',
'Include the start-day contribution, exclude the final valuation-day contribution. If the fifth anniversary is not a trading day, use the previous available trading close; no investment during trading suspensions.',
'CSI 300 uses total-return index H00300 from 2004-12-31, including backfilled index history. Gold: HuaAn Gold ETF 518880. Treasuries: Guotai 5Y Treasury ETF 511010.',
'Nasdaq: RMB-traded Guotai Nasdaq-100 QDII ETF 513100, listed 2013-05-15. A 1:5 split and trading suspension occurred on 2022-01-13; no contribution that day. Multiply subsequent prices by five for continuity.',
'Hang Seng: RMB-traded ChinaAMC Hang Seng ETF 159920, listed 2012-10-22. The RMB 0.076 per-unit dividend on 2018-06-22 is reinvested at the ex-date close. Exchange prices include currency, tracking and premium effects.',
'Treasury ETF dividends are reinvested at each ex-date close. Added 2026 distributions per unit: RMB 0.5715 on March 25, 0.8144 on June 25 and 0.6204 on September 18. Ignore payment delays, fees and spreads; fund expenses are reflected in prices.',
'Four selected assets are shown at a time. Common scope uses their actual start-date intersection. Full-history scope keeps all samples per asset and uses the start-date union for the slider. Changing assets recalculates the statistics.',
'Adjacent samples overlap heavily and are not independent. Historical loss frequencies are not future probabilities. Distributions use complete five-year results; playback cards show the current holding stage. Worst-5% mean uses the lowest ceil(N × 5%) observations; standard deviation uses the population definition.',
'Sources: CSI official API, Tencent market prices, and fund-manager distribution and listing announcements. Downloaded 2026-11-25. Earlier versions are archived. Version 3.4 adds Hang Seng, four-of-five selection, extended dates and new pointer/opening effects.'
]
d.update(zip(method,eng));(q/'translations.json').write_text(json.dumps(d,ensure_ascii=False),encoding='utf8')
d.update({'每天50元，连续5年。穿越不同起点，从沪深300、黄金、国债、纳指和恒生中，选择四种资产一起比较。':'RMB 50 each trading day, for five years. Compare four of CSI 300, gold, Treasuries, Nasdaq and Hang Seng across historical start dates.','起投截止 2021.10.31 · 估值覆盖至 2026.10.31':'Start cutoff 2021.10.31 · Valuation data through 2026.10.31'})
(q/'translations.json').write_text(json.dumps(d,ensure_ascii=False),encoding='utf8')
(q/'linefield.js').write_text((q/'linefield.js').read_text(encoding='utf8').replace("icon(document.querySelector('#introMark canvas'))","document.querySelectorAll('#introMark canvas').forEach(icon)"),encoding='utf8')
(q/'intro.js').write_text((q/'intro.js').read_text(encoding='utf8').replace('2200','2450'),encoding='utf8')
print('Prepared v3.4 UI and methodology.')

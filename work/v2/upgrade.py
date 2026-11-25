from pathlib import Path
import re,json
p=Path('work/v2');s=Path('work/dashboard.html').read_text(encoding='utf8')
s=s.replace('<body><main>','<body><div class="ambient" aria-hidden="true"><i></i><i></i><i></i></div><main>')
s=s.replace('<button id="methodBtn">','<button id="langBtn" aria-label="Switch language">EN</button><button id="motionBtn">动态背景：开</button><button id="methodBtn">')
s=s.replace('观察股票、黄金与国债的成长轨迹。','观察沪深300、黄金、国债与纳指的成长轨迹。')
s=s.replace('<button class="active" data-scope="common">共同起投区间</button>','<button class="active" data-scope="common">四资产共同区间</button><button data-scope="common3">原三资产对照</button>')
start=s.index('<ul><li>核心指标');end=s.index('</ul>',start)+len('</ul>')
method=['每个标的交易日收盘投入50元，允许小数份额；累计收益率=期末市值÷总投入−1，未年化。','包含起投日，不含最终估值日的投入。五周年遇非交易日向前取该标的最近交易日；停牌日不投入。','沪深300使用全收益指数H00300，自2004-12-31起，包含回溯历史；黄金采用华安黄金ETF 518880；国债采用国泰5年期国债ETF 511010。','纳指采用人民币交易的国泰纳斯达克100 QDII ETF 513100，自2013-05-15上市日起。人民币场内价格反映汇率、基金跟踪和场内溢价变化。','513100在2022-01-13按1:5拆分并停牌，当日不投入；拆分后价格乘5构建连续序列。数据中的后复权价格与该处理逐日一致，截至2025年底未发现现金分红。','国债现金分红按除息日收盘即时再投资，忽略到账等待。忽略交易费用、价差；基金内部费用已反映在价格中。','四资产共同起投区间仍为2013-07-29至2020-12-31，每类1812个样本。原三资产对照仅显示原有三类资产，结果保持不变。','相邻样本高度重叠，不是独立观察；历史亏损比例不代表未来概率。分布统计始终基于完整5年，回放卡片反映当前持有时点。','回放在停牌日以前收盘价估值，不投入。若最终估值日不同，各卡片注明各自日期。最差5%均值取最低向上取整5%样本，标准差采用总体口径。','版本v1.0冻结保存；本版v2.0新增第四资产、双语和动态背景。本地Git记录源文件、数据和发布文件，未上传至远程服务。','数据来源：中证指数、腾讯行情、东方财富基金事件记录。纳指上市与拆分经基金管理人公告核实；截至2025-12-31，新增数据于2026-11-25下载。']
s=s[:start]+'<ul>'+''.join('<li>'+x+'</li>' for x in method)+'</ul>'+s[end:]
s=s.replace('本网页所有数据与图形逻辑均内置，无需联网，无外部字体或图表服务。','数据、字体和图表逻辑均内置，离线可用。字体：Noto Sans SC 与 Space Grotesk，采用SIL OFL授权。')
s=s.replace('</style>','''
body{font-family:"Lab Sans",sans-serif;font-weight:400}.big,.card-money,.time-title,.code,.range-labels,.stat-row strong,td:not(:first-child),.cell,.year{font-family:"Lab Numbers","Lab Sans",sans-serif;font-variant-numeric:tabular-nums}.big{font-weight:500;letter-spacing:-1.5px}h1{font-weight:600;letter-spacing:-1px}h2,h3{font-weight:500}.cards{grid-template-columns:repeat(4,minmax(0,1fr))}.big{font-size:34px}.brand{font-weight:500}.panel{background:linear-gradient(130deg,#142238df,#101a2ce8);backdrop-filter:blur(16px)}main{position:relative;z-index:1}.ambient{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:0;background-image:linear-gradient(#7898c206 1px,transparent 1px),linear-gradient(90deg,#7898c206 1px,transparent 1px);background-size:64px 64px}.ambient i{position:absolute;width:65vw;height:65vw;max-width:1000px;max-height:1000px;border-radius:50%;filter:blur(90px);opacity:.13;animation:drift 27s ease-in-out infinite alternate;background:radial-gradient(circle,#448df2,transparent 68%);left:-20%;top:5%}.ambient i:nth-child(2){left:55%;top:20%;background:radial-gradient(circle,#9675ff,transparent 65%);animation-delay:-9s;animation-duration:34s}.ambient i:nth-child(3){left:30%;top:70%;background:radial-gradient(circle,#42bc9c,transparent 65%);animation-delay:-18s}body.motion-off .ambient i{animation:none;opacity:.06}@keyframes drift{to{transform:translate(18vw,-12vh) scale(1.15)}}html[lang=en] h1{font-size:34px;letter-spacing:-1px}html[lang=en] .card-bottom{flex-direction:column}header .flex{justify-content:flex-end}@media(max-width:1150px){.cards{grid-template-columns:repeat(2,1fr)}header{align-items:flex-start}.hero aside{display:none}}@media(max-width:580px){.cards{grid-template-columns:1fr}header{flex-direction:column}.hero h1{font-size:27px}.segmented{flex-wrap:wrap}.range-labels span:nth-child(2){display:none}.ambient i{filter:blur(50px)}}@media(prefers-reduced-motion:reduce){.ambient i{animation:none!important}}
__FONTCSS__
</style>''')
s=s.replace("COLORS=['#6fa9ff','#efc471','#5ed9b6']","COLORS=['#6fa9ff','#efc471','#5ed9b6','#b29aff']")
s=s.replace("let scope='common'","let ACTIVE=DATA.assets;\nlet scope='common'")
# Use active asset selection throughout; the source data remains immutable.
s=s.replace('DATA.assets','ACTIVE').replace('let ACTIVE=ACTIVE','let ACTIVE=DATA.assets')
# Move ACTIVE initialization before first usage.
s=s.replace('let ACTIVE=DATA.assets;\n','');s=s.replace('const dateIndex=', 'let ACTIVE=DATA.assets;\nconst dateIndex=')
s=s.replace('scope=s;starts=',"scope=s;ACTIVE=scope==='common3'?DATA.assets.slice(0,3):DATA.assets;document.querySelectorAll('.assetSelect').forEach(el=>{let v=+el.value||0;el.innerHTML=ACTIVE.map((a,k)=>`<option value=\"${k}\">${a.name}</option>`).join('');el.value=Math.min(v,ACTIVE.length-1)});$('cdfLegend').innerHTML=ACTIVE.map((a,k)=>`<span><i style=\"background:${COLORS[k]}\"></i>${a.name}</span>`).join('');starts=")
s=s.replace("s==='common'?'相同起投日 · 每类1,812个完整样本':'沪深300 3,890 · 黄金 1,812 · 国债 1,894 个样本'","s==='all'?'沪深300 3,890 · 黄金 1,812 · 国债 1,894 · 纳指 1,862 个样本':s==='common3'?'原三资产对照 · 每类1,812个完整样本':'四资产相同起投日 · 每类1,812个完整样本'")
a=s.index('function buildPaths()');b=s.index('function currentPoint',a)
s=s[:a]+'''function buildPaths(){const valid=ACTIVE.map(a=>a.lookup.get(selected)).filter(Boolean);const globalEnd=Math.max(...valid.map(r=>dateIndex.get(r[1])));trajectories=ACTIVE.map((a,k)=>{const r=a.lookup.get(selected);if(!r)return null;let start=dateIndex.get(selected),end=dateIndex.get(r[1]),units=0,capital=0,points=[];for(let i=start;i<=globalEnd;i++){if(i<end&&(!a.trading||a.trading[i])){units+=50/a.prices[i];capital+=50}points.push({date:DATA.dates[i],value:units*a.prices[Math.min(i,end)],capital})}if(Math.abs(points.at(-1).value-r[4])>.001||capital!==r[3])throw Error('市值校验失败：'+a.name);return {points,sample:r,k}});let path=trajectories.find(Boolean);$('growthStart').textContent=selected;$('growthEnd').textContent=DATA.dates[globalEnd];$('growthLegend').innerHTML=ACTIVE.flatMap((a,k)=>trajectories[k]?[`<span><i style="background:${COLORS[k]}"></i>${a.name}</span>`]:[]).join('')+'<span>┄ 累计投入</span>'}
+'''.replace('\n+','\n')+s[b:]
s=s.replace('<div class="card-bottom"><span','<p class="tiny muted">最终估值日 ${t.sample[1]} · 总投入 ${money(t.sample[3])}</p><div class="card-bottom"><span')
s=s.replace("ctx.font='11px \"Microsoft YaHei\",sans-serif'","ctx.font='11px \"Lab Numbers\",\"Lab Sans\",sans-serif'")
s=s.replace("v=>(v/10000).toFixed(1)+'万'","v=>LANG==='en'?(v/1000).toFixed(0)+'k':(v/10000).toFixed(1)+'万'")
s=s.replace("ctx.fillText('人民币 / 元',c.l,0)","ctx.fillText(LANG==='en'?'RMB / CNY':'人民币 / 元',c.l,0)")
s=s.replace("scope==='common'?'共同起投区间':'各自全部历史'","scope==='all'?'各自全部历史':scope==='common3'?'原三资产对照':'四资产共同区间'")
s=s.replace("rows.map(r=>r.join(','))","rows.map(r=>r.map(x=>typeof x==='string'?translate(x):x).join(','))")
s=s.replace("a.download='定投统计_'","a.download=(LANG==='en'?'DCA_statistics_':'定投统计_')")
s=s.replace('setScope(\'common\');','setScope(\'common\');\n__I18N__')
s=s.replace('每次投入 ¥50 · 连续5年 · 历史起投日频率不代表未来概率','v2.0 · 每次投入 ¥50 · 连续5年 · 历史起投日频率不代表未来概率')
s=s.replace('研究数据下载于2026-11-24','原数据2026-11-24 · 纳指2026-11-25')
# LANG is available during initial chart setup; i18n enhancement is installed afterward.
s=s.replace("'use strict';","'use strict';\nlet LANG='zh';try{LANG=localStorage.getItem('dca-language')||'zh'}catch{}")
(p/'template.html').write_text(s,encoding='utf8');(p/'method.json').write_text(json.dumps(method,ensure_ascii=False),encoding='utf8')

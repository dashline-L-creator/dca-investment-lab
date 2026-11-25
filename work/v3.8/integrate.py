from pathlib import Path
import json
q=Path('work/v3.8');p=q/'markets.js';s=p.read_text(encoding='utf8')
start=s.index('function marketDrawLine(');end=s.index('function marketCanvas(',start);s=s[:start]+s[end:]
start=s.index('function marketPaint(');end=s.index('function marketRender(',start);s=s[:start]+s[end:]
s=s.replace("canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);","if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);}")
s=s.replace("new MutationObserver(marketPaint).observe($('brandIntro'),{attributes:true,attributeFilter:['hidden','class']});",'')
s=s.replace("setInterval(()=>{if(!document.hidden)marketRefresh()},60000)","setInterval(()=>{if(!document.hidden&&(marketIntroVisible()||!dialog.hidden))marketRefresh()},60000)")
s=s.replace("marketRender();marketRefresh();setInterval", "marketRender();marketRefresh();installMarketPlayback();setInterval")
s=s.replace('installMarkets();','__PLAYBACK_JS__\ninstallMarkets();')
p.write_text(s,encoding='utf8')
p=q/'template.html';s=p.read_text(encoding='utf8');s=s.replace('<canvas id="marketField" class="market-field" aria-hidden="true"></canvas>','');s=s.replace('<canvas id="introMarketField" class="intro-market-field" aria-hidden="true"></canvas>','<canvas id="introMarketField" class="intro-market-field" aria-hidden="true"></canvas><canvas id="introMarketGlow" class="intro-market-glow" aria-hidden="true"></canvas>');s=s.replace('__MARKETS_JS__','__GLOW_JS__\n__MARKETS_JS__');s=s.replace('</style>','''
/* v3.8: enlarged intro identity; market animation exists only in the intro. */
.intro-mark{width:360px;height:360px}.intro-market-glow{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;opacity:.72}.brand-intro.is-leaving .intro-market-glow{opacity:0;transition:opacity .25s}.intro-stage{z-index:2}.market-field{display:none!important}
@media(max-width:700px){.intro-mark{width:285px;height:285px}.intro-stage{gap:24px}}
@media(prefers-reduced-motion:reduce){.intro-market-glow{display:none}}
</style>''');p.write_text(s,encoding='utf8')
p=q/'build.py';s=p.read_text(encoding='utf8').replace(".replace('__MARKETS_JS__'",".replace('__GLOW_JS__',(q/'glow.js').read_text(encoding='utf8')).replace('__MARKETS_JS__'");s=s.replace("(q/'markets.js').read_text(encoding='utf8').replace('__MARKET_SNAPSHOT__'","(q/'markets.js').read_text(encoding='utf8').replace('__PLAYBACK_JS__',(q/'playback.js').read_text(encoding='utf8')).replace('__MARKET_SNAPSHOT__'");p.write_text(s,encoding='utf8')
p=q/'glow.js';s=p.read_text(encoding='utf8');start=s.index('    const onPointerMove =');end=s.index('    const onVisibility =',start);s=s[:start]+s[end:]
for line in ["      window.removeEventListener('pointermove', onPointerMove);","      window.removeEventListener('pointerdown', onPointerDown);","      document.documentElement.removeEventListener('pointerleave', onPointerLeave);"]:
 s=s.replace(line,'')
p.write_text(s,encoding='utf8')
p=q/'fonts.py';s=p.read_text(encoding='utf8').replace("+(p/'markets.js').read_text(encoding='utf8')","+(p/'markets.js').read_text(encoding='utf8')+(p/'playback.js').read_text(encoding='utf8')");p.write_text(s,encoding='utf8')
print('Integrated autonomous glow playback; removed main background markets; logo +50%')

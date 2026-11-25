from pathlib import Path
q=Path('work/v3.8');p=q/'playback.js';s=p.read_text(encoding='utf8').replace('x:18,y:16,w:topW','x:18,y:48,w:topW').replace('x:34+topW,y:16,w:topW','x:34+topW,y:48,w:topW');s=s.replace("ctx.fillText(a.date+' '+a.points[0][0].slice(0,2)+':'+a.points[0][0].slice(2),x,y+h-3)","ctx.fillText(w<150?a.date:a.date+' '+a.points[0][0].slice(0,2)+':'+a.points[0][0].slice(2),x,y+h-3)");p.write_text(s,encoding='utf8')
p=q/'template.html';s=p.read_text(encoding='utf8').replace('</style>','''
@media(max-width:700px){.intro-skip{top:8px;right:16px;font-size:11px;min-height:28px;padding:5px 10px;border-radius:10px}}
@media(max-width:700px) and (max-height:760px){.intro-kicker,.intro-beats,.intro-foot{display:none}.intro-stage{gap:16px}.intro-title{margin-bottom:8px}.intro-subtitle{font-size:14px}}
</style>''');p.write_text(s,encoding='utf8')

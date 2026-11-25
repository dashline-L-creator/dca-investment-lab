from pathlib import Path
q=Path('work/v3.7');p=q/'histogram3d.js';s=p.read_text(encoding='utf8').replace('Math.floor(r[5]/width)-first','Math.floor(r[5]/width+1e-10)-first')
needle=' let faces=[];'
grid=""" const backZ=Math.cos(cloudYaw)>=0?.96:-.96,leftGridX=Math.cos(cloudYaw)>=0?-1.18:1.18;for(let j=1;j<=4;j++){let y=-.69+j*1.32/4;cloudLine(ctx,[leftGridX,y,-backZ],[leftGridX,y,backZ],'#bec9d844',.7);cloudLine(ctx,[-1.18,y,backZ],[1.18,y,backZ],'#bec9d844',.7)}
"""
s=s.replace(needle,grid+needle);p.write_text(s,encoding='utf8')
p=q/'checks.cjs';s=p.read_text(encoding='utf8');s=s.replace("let small=[", "let decimal=histogramBins([[['x',0,0,0,0,.29]]],.01,0,.4);if(Math.abs(decimal.bars[0].from-.29)>1e-12)throw Error('Decimal boundary shifted');let small=[");p.write_text(s,encoding='utf8')

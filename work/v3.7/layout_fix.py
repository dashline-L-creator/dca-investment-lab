from pathlib import Path
q=Path('work/v3.7');p=q/'cloud3d.js';s=p.read_text(encoding='utf8').replace('scene.h*.51','scene.h*.40');p.write_text(s,encoding='utf8')
p=q/'markets.js';s=p.read_text(encoding='utf8').replace('marketData[k],k,x,y,pw,ph)','marketData[k],k,x,y,pw,k===4&&h<=850?95:ph)');p.write_text(s,encoding='utf8')
# Numbered legend links the Y-axis categories to all asset names.
p=q/'cloud3d.js';s=p.read_text(encoding='utf8').replace('${a.name}</span>`).join',"${String(k+1).padStart(2,'0')} ${a.name}</span>`).join");p.write_text(s,encoding='utf8')

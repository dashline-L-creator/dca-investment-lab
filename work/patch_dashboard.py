from pathlib import Path
p=Path('work/dashboard.html');s=p.read_text(encoding='utf8');s=s.replace("...statistics.map(s=>s[key])","...statistics.map(s=>key==='sd'?s[key]*100:s[key])")
s=s.replace("$('insight').textContent=`${position===1000?", "$('insight').textContent=rank.length===1?`此起点只有${DATA.assets[best.k].name}具有可用数据；${position===1000?'完整5年':'当前回放时点'}收益为${pct(bp.value/bp.capital-1)}。`:`${position===1000?")
s=s.replace("DATA.assets.map((a,k)=>`<span><i style=\"background:${COLORS[k]}\"></i>${a.name}</span>`).join('')+'<span>┄ 累计投入</span>'", "DATA.assets.flatMap((a,k)=>trajectories[k]?[`<span><i style=\"background:${COLORS[k]}\"></i>${a.name}</span>`]:[]).join('')+'<span>┄ 累计投入</span>'")
p.write_text(s,encoding='utf8')

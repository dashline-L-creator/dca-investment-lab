from pathlib import Path
p=Path('work/v3.1/distribution.js');s=p.read_text(encoding='utf-8-sig');s=s.replace("$('thresholdNumber').value=value.toFixed(1);","if(document.activeElement!==$('thresholdNumber'))$('thresholdNumber').value=value.toFixed(1);")
s=s.replace("$('thresholdNumber').onchange=e=>{if(e.target.value!=='')setThreshold(Number(e.target.value)/100)};","$('thresholdNumber').oninput=e=>{if(e.target.value!=='')setThreshold(Number(e.target.value)/100)};$('thresholdNumber').onchange=e=>{if(e.target.value!=='')setThreshold(Number(e.target.value)/100)};$('thresholdNumber').onblur=()=>{$('thresholdNumber').value=(scanThreshold*100).toFixed(1)};")
p.write_text(s,encoding='utf8')
p=Path('work/v3.1/template.html');s=p.read_text(encoding='utf8');a=s.index('let scanThreshold=');b=s.index('const METRICS=',a);s=s[:a]+Path('work/v3.1/distribution.js').read_text(encoding='utf8')+'\n'+s[b:];p.write_text(s,encoding='utf8')

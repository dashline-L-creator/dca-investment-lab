from pathlib import Path
import json
q=Path('work/v3.6');p=q/'template.html';s=p.read_text(encoding='utf8');s=s.replace('__MORPH_JS__','__MORPH_JS__\n__ORBIT_JS__').replace('installMorphControls();','installMorphControls();installOrbit();');s=s.replace('<button id="cloudZoomOut"','<button id="cloudOrbit" aria-pressed="true">Ⅱ 暂停环绕</button><button id="cloudZoomOut"');s=s.replace('拖动旋转 · Shift＋滚轮缩放 · 点击样本定位','自动环绕 · 点击或拖动后暂停 · 复位重新开始');p.write_text(s,encoding='utf8')
p=q/'build.py';s=p.read_text(encoding='utf8').replace(".replace('__MOUSE_JS__'",".replace('__ORBIT_JS__',(q/'orbit.js').read_text(encoding='utf8')).replace('__MOUSE_JS__'");p.write_text(s,encoding='utf8')
p=q/'cloud3d.js';s=p.read_text(encoding='utf8');s=s.replace('function cloudResetView(){','function cloudResetView(){orbitResume();');s=s.replace("else paintCloud(1)\n}","else paintCloud(1);orbitEnsure()\n}");p.write_text(s,encoding='utf8')
p=q/'translations.json';d=json.loads(p.read_text(encoding='utf8'));d.update({'Ⅱ 暂停环绕':'Ⅱ Pause orbit','▶ 继续环绕':'▶ Resume orbit','自动环绕 · 点击或拖动后暂停 · 复位重新开始':'Auto orbit · Touch to pause · Reset to restart'});p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
p=q/'fonts.py';s=p.read_text(encoding='utf8').replace("+(p/'morph.js').read_text(encoding='utf8')","+(p/'morph.js').read_text(encoding='utf8')+(p/'orbit.js').read_text(encoding='utf8')");p.write_text(s,encoding='utf8')
print('Added auto orbit with persistent manual pause and reset restart')

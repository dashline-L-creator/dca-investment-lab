from pathlib import Path
q=Path('work/v3.6');p=q/'template.html';s=p.read_text(encoding='utf8').replace('<h2>四资产收益星图</h2>','<h2 id="cloudTitle">四资产收益星图</h2>').replace('<p class="tiny muted">三维同时展示所选四种资产；','<p class="tiny muted" id="cloudCaption">三维同时展示所选四种资产；');p.write_text(s,encoding='utf8')
p=q/'cloud3d.js';s=p.read_text(encoding='utf8').replace('scene.h*.48-ry','scene.h*.51-ry').replace('c.h*.37','c.h*.35');p.write_text(s,encoding='utf8')
p=q/'template.html';s=p.read_text(encoding='utf8').replace('.distribution-layout{grid-template-columns:', '.distribution-layout{align-items:start;grid-template-columns:');p.write_text(s,encoding='utf8')

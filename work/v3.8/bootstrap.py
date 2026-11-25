from pathlib import Path
import shutil
q=Path('work/v3.8');o=Path('outputs/v3.8');o.mkdir(exist_ok=True)
names=['template.html','build.py','i18n.js','intro.js','linefield.js','mouse.js','favicon.html','translations.json','font-project.json','fonts.py','cloud3d.js','morph.js','orbit.js','histogram3d.js','markets.js','electric.js','ogl.bundle.mjs','market-snapshot.json','OGL-LICENSE.txt','reactbits-license.txt','IBMPlexSans-400.woff2','IBMPlexSans-600.woff2','IBMPlexSans-OFL.txt','NotoSansSC-400.woff2','NotoSansSC-600.woff2']
for name in names:
 shutil.copy2(Path('work/v3.7')/name,q/name)
 if name.endswith(('.html','.py','.js','.json')):
  p=q/name;s=p.read_text(encoding='utf-8-sig').replace('v3.7','v3.8').replace('dca-intro-v37','dca-intro-v38');p.write_text(s,encoding='utf8')
shutil.copy2('outputs/v3.7/时间的复利_A2收细圆环.svg',o/'时间的复利_A2收细圆环.svg')
print('Created v3.8 source and release directories')

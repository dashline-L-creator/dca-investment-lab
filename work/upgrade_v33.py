from pathlib import Path
import re,json,shutil

q=Path('work/v3.3');o=Path('outputs/v3.3')
q.mkdir(exist_ok=True);o.mkdir(exist_ok=True)
old=Path('work/v3.2')
for name in ['NotoSansSC-400.woff2','NotoSansSC-600.woff2','intro.js','i18n.js','translations.json','build.py']:
    shutil.copy2(old/name,q/name)
    if name.endswith(('.js','.json','.py')):
        p=q/name;p.write_text(p.read_text(encoding='utf-8-sig').replace('v3.2','v3.3').replace('v32','v33'),encoding='utf8')
s=(old/'template.html').read_text(encoding='utf8').replace('v3.2','v3.3')
s=re.sub(r'<link rel="icon".*?>','__FAVICON__',s,count=1)
s=re.sub(r'<svg aria-hidden="true".*?</svg>','<canvas class="identity-mark" aria-hidden="true"></canvas>',s,flags=re.S)
s=s.replace('<div class="ambient" aria-hidden="true"><i></i><i></i><i></i></div>','<div class="ambient" aria-hidden="true"><canvas id="identityField"></canvas></div>')
s=s.replace('本版v3.3增加专属图标和开场过渡','本版v3.3采用收细圆环的新图标和动态线场背景')
css='''
/* A2 identity: a lighter open ring, with quiet quantized line fields. */
.ambient{background:none;contain:strict}.ambient canvas{display:block;width:100%;height:100%;pointer-events:none}
.brand-emblem .identity-mark{width:45px;height:45px;display:block}.intro-mark .identity-mark{width:100%;height:100%;display:block}.brand-emblem:hover .identity-mark{transform:translateY(-1px);transition:transform .3s ease}
.intro-mark{box-shadow:none;background:transparent;border-radius:0}.intro-relief{display:none}.brand-intro{background:#e0e5ec}
@media(prefers-reduced-motion:reduce){.brand-emblem:hover .identity-mark{transform:none}}
'''
s=s.replace('__FONTCSS__',css+'\n__FONTCSS__')
s=s.replace('__INTRO_JS__','__INTRO_JS__\n__FIELD_JS__')
(q/'template.html').write_text(s,encoding='utf8')
b=(q/'build.py').read_text(encoding='utf8').replace(".replace('__INTRO_JS__',(q/'intro.js').read_text(encoding='utf-8-sig'))", ".replace('__INTRO_JS__',(q/'intro.js').read_text(encoding='utf-8-sig')).replace('__FIELD_JS__',(q/'linefield.js').read_text(encoding='utf8')).replace('__FAVICON__',(q/'favicon.html').read_text(encoding='utf8'))")
(q/'build.py').write_text(b,encoding='utf8')
d=json.loads((q/'translations.json').read_text(encoding='utf8'))
d['旧版冻结保存；本版v3.3采用收细圆环的新图标和动态线场背景，保留全部样本和计算口径。']='Earlier releases are archived. Version 3.3 adds the refined A2 identity and a quiet animated line field. All data and calculation rules are preserved.'
(q/'translations.json').write_text(json.dumps(d,ensure_ascii=False),encoding='utf8')
print('Prepared v3.3 source.')

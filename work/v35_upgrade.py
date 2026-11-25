from pathlib import Path
import shutil,json
old=Path('work/v3.4');q=Path('work/v3.5');o=Path('outputs/v3.5');q.mkdir(exist_ok=True);o.mkdir(exist_ok=True)
for name in ['build.py','template.html','i18n.js','intro.js','linefield.js','mouse.js','favicon.html','translations.json','NotoSansSC-400.woff2','NotoSansSC-600.woff2']:
 shutil.copy2(old/name,q/name)
 if name.endswith(('.py','.html','.js','.json')):
  p=q/name;p.write_text(p.read_text(encoding='utf8').replace('v3.4','v3.5').replace('v34','v35'),encoding='utf8')
shutil.copy2('outputs/v3.4/时间的复利_A2收细圆环.svg',o/'时间的复利_A2收细圆环.svg')
p=q/'linefield.js';s=p.read_text(encoding='utf8').replace('const scenes=[3,29].map','const scenes=[3,29,51].map')
s=s.replace("Object.assign(scenes[0],{cx:w*.06,cy:h*.67,size});Object.assign(scenes[1],{cx:w*.95,cy:h*.20,size:size*.8});", "Object.assign(scenes[0],{cx:w*.045,cy:h*.23,size:size*.76});Object.assign(scenes[1],{cx:w*.97,cy:h*.53,size:size*.88});Object.assign(scenes[2],{cx:w*.085,cy:h*.91,size:size*.56});")
s=s.replace("(s.seed===3?.15:.13)","(s.seed===3?.13:s.seed===29?.12:.105)")
# Always protect the visible date line as well as the main introductory text.
s=s.replace('.hero .sub,.hero .eyebrow','.hero .sub,.hero .study-dates,.hero .eyebrow')
p.write_text(s,encoding='utf8')
p=q/'template.html';s=p.read_text(encoding='utf8');s=s.replace('__FONTCSS__','''
/* Requested Chinese face comes from the user's Adobe Fonts Web project. */
body,.intro-title{font-family:"__CJK_FAMILY__","Lab Sans",sans-serif}
.big,.card-money,.time-title,.code,.range-labels,.stat-row strong,td:not(:first-child),.cell,.year{font-family:"Lab Numbers","__CJK_FAMILY__","Lab Sans",sans-serif}
html[lang=en] body,html[lang=en] .intro-title{font-family:"Lab Sans",sans-serif}
__FONTCSS__''')
s=s.replace('</head>','__ADOBE_FONT__</head>').replace('"Lab Numbers","Lab Sans",sans-serif','"Lab Numbers","__CJK_FAMILY__","Lab Sans",sans-serif')
p.write_text(s,encoding='utf8')
p=q/'build.py';s=p.read_text(encoding='utf8').replace("(q/'data.json')","(Path('work/v3.4')/'data.json')")
s=s.replace("css=''", "config=json.loads((q/'font-project.json').read_text(encoding='utf8'));family=config['family'];url=config.get('cssUrl','');assert re.fullmatch(r'[\\w \\-]+',family);assert not url or re.fullmatch(r'https://use\\.typekit\\.net/[A-Za-z0-9]+\\.css',url);fontlink='<link id=\"adobe-font-project\" rel=\"stylesheet\" href=\"'+url+'\">' if url else '';s=s.replace('__CJK_FAMILY__',family).replace('__ADOBE_FONT__',fontlink)\ncss=''")
p.write_text(s,encoding='utf8')
if not (q/'font-project.json').exists():(q/'font-project.json').write_text(json.dumps({'family':'hellofont-id-ji-xie-ti','cssUrl':'','status':'Awaiting user Adobe Fonts Web project CSS URL'},ensure_ascii=False,indent=2),encoding='utf8')
print('Prepared three background marks and Adobe font connection. Font URL is pending.')

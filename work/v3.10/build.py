from pathlib import Path
import json,base64,re,shutil
p=Path('work/v2');o=Path('outputs/v3.10');q=Path('work/v3.10');s=(q/'template.html').read_text(encoding='utf8');i=(q/'i18n.js').read_text(encoding='utf-8-sig').replace('__DICT__',(q/'translations.json').read_text(encoding='utf8'))
config=json.loads((q/'font-project.json').read_text(encoding='utf8'));family=config['family'];url=config.get('cssUrl','');assert re.fullmatch(r'[\w \-]+',family);assert not url or re.fullmatch(r'https://use\.typekit\.net/[A-Za-z0-9]+\.css',url);fontlink='<link id="adobe-font-project" rel="stylesheet" href="'+url+'">' if url else '';s=s.replace('__CJK_FAMILY__',family).replace('__ADOBE_FONT__',fontlink)
css=''
for name,family in [('NotoSansSC','Lab Sans'),('SpaceGrotesk','Lab Numbers'),('IBMPlexSans','Lab English')]:
 for weight in [400,600]:
  css+='@font-face{font-family:"'+family+'";font-style:normal;font-weight:'+str(weight)+';font-display:swap;src:url(data:font/woff2;base64,'+base64.b64encode(((q if name in ['NotoSansSC','IBMPlexSans'] else p)/(name+'-'+str(weight)+'.woff2')).read_bytes()).decode()+') format("woff2");}'
s=s.replace('__DATA__',(Path('work/v3.5')/'data.json').read_text(encoding='utf8')).replace('__FONTCSS__',css).replace('__I18N__',i).replace('__ELECTRIC_JS__',(q/'electric.js').read_text(encoding='utf8').replace('__OGL_MODULE_URL__','data:text/javascript;base64,'+base64.b64encode((q/'ogl.bundle.mjs').read_bytes()).decode())).replace('__GOLD_JS__',(q/'gold.js').read_text(encoding='utf8')+'\n'+(q/'sessions.js').read_text(encoding='utf8')).replace('__GLOW_JS__',(q/'glow.js').read_text(encoding='utf8')).replace('__MARKETS_JS__',(q/'markets.js').read_text(encoding='utf8').replace('__PLAYBACK_JS__',(q/'playback.js').read_text(encoding='utf8')).replace('__MARKET_SNAPSHOT__',(q/'market-snapshot.json').read_text(encoding='utf8'))).replace('__INTRO_JS__',(q/'intro.js').read_text(encoding='utf-8-sig')).replace('__FIELD_JS__',(q/'linefield.js').read_text(encoding='utf8')).replace('__CLOUD_JS__',(q/'cloud3d.js').read_text(encoding='utf8')+'\n'+(q/'histogram3d.js').read_text(encoding='utf8')).replace('__MORPH_JS__',(q/'morph.js').read_text(encoding='utf8')).replace('__ORBIT_JS__',(q/'orbit.js').read_text(encoding='utf8')).replace('__MOUSE_JS__',(q/'mouse.js').read_text(encoding='utf8')).replace('__FAVICON__',(q/'favicon.html').read_text(encoding='utf8'))
s=s.replace('__CLEAN_JS__',(q/'clean.js').read_text(encoding='utf8'))
s=s.replace('__AXIS_JS__',(q/'axis.js').read_text(encoding='utf8'))
s=s.replace('__RESPONSIVE_CSS__',(q/'responsive.css').read_text(encoding='utf8')).replace('__RESPONSIVE_JS__',(q/'responsive.js').read_text(encoding='utf8'))
(o/'定投交互实验室_v3.10.html').write_text(s,encoding='utf8');(q/'app.js').write_text(re.findall(r'<script>(.*?)</script>',s,re.S)[0].strip()+'\n',encoding='utf8')
for name in ['NotoSansSC-OFL.txt','SpaceGrotesk-OFL.txt']:shutil.copy2(p/name,o/name)
print('release bytes',len(s.encode()))

shutil.copy2(q/'IBMPlexSans-OFL.txt',o/'IBMPlexSans-OFL.txt')
for f in o.glob('*-OFL.txt'):
 f.write_text('\n'.join(line.rstrip() for line in f.read_text(encoding='utf8').splitlines())+'\n',encoding='utf8')

for name in ['OGL-LICENSE.txt','reactbits-license.txt']:
 shutil.copy2(q/name,o/name)

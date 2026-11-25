from pathlib import Path
import json,base64,re,shutil
p=Path('work/v2');o=Path('outputs/v2.0');s=(p/'template.html').read_text(encoding='utf8');i=(p/'i18n.js').read_text(encoding='utf-8-sig').replace('__DICT__',(p/'translations.json').read_text(encoding='utf8'))
css=''
for name,family in [('NotoSansSC','Lab Sans'),('SpaceGrotesk','Lab Numbers')]:
 for weight in [400,600]:
  css+='@font-face{font-family:"'+family+'";font-style:normal;font-weight:'+str(weight)+';font-display:swap;src:url(data:font/woff2;base64,'+base64.b64encode((p/(name+'-'+str(weight)+'.woff2')).read_bytes()).decode()+') format("woff2");}'
s=s.replace('__DATA__',(p/'data.json').read_text(encoding='utf8')).replace('__FONTCSS__',css).replace('__I18N__',i)
(o/'定投交互实验室_v2.0.html').write_text(s,encoding='utf8');(p/'app.js').write_text(re.findall(r'<script>(.*?)</script>',s,re.S)[0],encoding='utf8')
for name in ['NotoSansSC-OFL.txt','SpaceGrotesk-OFL.txt']:shutil.copy2(p/name,o/name)
print('release bytes',len(s.encode()))

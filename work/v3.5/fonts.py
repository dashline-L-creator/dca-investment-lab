import requests,re
from pathlib import Path
p=Path('work/v3.5');text=(p/'template.html').read_text(encoding='utf8')+(p/'translations.json').read_text(encoding='utf8');chars=''.join(sorted(set(re.findall('[\u3000-\u9fff]',text))))+''.join(chr(x) for x in range(32,127))+'−◈▶Ⅱ↗↓┄·¥。↻'
s=requests.Session();s.trust_env=False;r=s.get('https://fonts.googleapis.com/css2',params={'family':'Noto Sans SC:wght@400;600','text':chars},timeout=30);r.raise_for_status()
for block in r.text.split('@font-face'):
 w=re.search(r'font-weight:\s*(\d+)',block);u=re.search(r'url\((https[^)]+)\)',block)
 if w and u:
  r=s.get(u.group(1),timeout=35);r.raise_for_status();(p/('NotoSansSC-'+w.group(1)+'.woff2')).write_bytes(r.content)
f=p/'build.py';b=f.read_text(encoding='utf8');b=b.replace("base64.b64encode((p/(name+'-'+str(weight)+'.woff2')).read_bytes())","base64.b64encode(((q if name=='NotoSansSC' else p)/(name+'-'+str(weight)+'.woff2')).read_bytes())");f.write_text(b,encoding='utf8');print('Updated embedded Chinese font coverage')


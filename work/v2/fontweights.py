import requests,re,concurrent.futures
from pathlib import Path
p=Path('work/v2');s=requests.Session();s.trust_env=False
text=(p/'template.html').read_text(encoding='utf8')+(p/'translations.json').read_text(encoding='utf8');chars=''.join(sorted(set(re.findall('[\u3000-\u9fff]',text))))+''.join(chr(x) for x in range(32,127))+'−◈▶Ⅱ↗↓┄·¥。'
def get(family,name,subset):
 r=s.get('https://fonts.googleapis.com/css2',params={'family':family+':wght@400;600','text':subset},timeout=35);r.raise_for_status();(p/(name+'.css')).write_text(r.text,encoding='utf8')
 for block in r.text.split('@font-face'):
  w=re.search(r'font-weight:\s*(\d+)',block);u=re.search(r'url\((https[^)]+)\)',block)
  if w and u:
   data=s.get(u.group(1),timeout=45);data.raise_for_status();(p/(name+'-'+w.group(1)+'.woff2')).write_bytes(data.content)
with concurrent.futures.ThreadPoolExecutor(2) as ex:list(ex.map(lambda x:get(*x),[('Noto Sans SC','NotoSansSC',chars),('Space Grotesk','SpaceGrotesk',''.join(chr(x) for x in range(32,127))+'−¥')]))
print('font weights ready')

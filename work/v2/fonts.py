import requests,re,json,concurrent.futures
from pathlib import Path
p=Path('work/v2');s=requests.Session();s.trust_env=False
text=(p/'template.html').read_text(encoding='utf8')+(p/'translations.json').read_text(encoding='utf8')
chars=''.join(sorted(set(re.findall('[\u3000-\u9fff]',text))))+''.join(chr(x) for x in range(32,127))+'−◈▶Ⅱ↗↓┄·¥。'
def font(family,name,subset):
 r=s.get('https://fonts.googleapis.com/css2',params={'family':family,'text':subset,'display':'swap'},headers={'User-Agent':'Mozilla/5.0'},timeout=35);r.raise_for_status();urls=re.findall(r'url\((https[^)]+)\)',r.text);print(name,len(urls),flush=True)
 u=urls[0];r=s.get(u,timeout=50);r.raise_for_status();(p/(name+'.woff2')).write_bytes(r.content);print(name,len(r.content),flush=True)
with concurrent.futures.ThreadPoolExecutor(4) as ex:
 fs=[ex.submit(font,'Noto Sans SC:wght@300..700','NotoSansSC',chars),ex.submit(font,'Space Grotesk:wght@400..700','SpaceGrotesk',''.join(chr(x) for x in range(32,127))+'−¥')]
 for f in fs:f.result()
for name,fam in [('NotoSansSC','notosanssc'),('SpaceGrotesk','spacegrotesk')]:
 r=s.get(f'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/{fam}/OFL.txt',timeout=35);r.raise_for_status();(p/(name+'-OFL.txt')).write_bytes(r.content)

import requests,re,json
from pathlib import Path
from bs4 import BeautifulSoup
q=Path('work/v3.4');s=requests.Session();s.trust_env=False
for name,url in [('mouse_reference','https://www.stylekit.top/zh/mouse-interactions')]+[(f'nav_{c}',f'https://fund.eastmoney.com/pingzhongdata/{c}.js') for c in ['511010','159920']]:
 r=s.get(url,timeout=35);raw=r.content;(q/(name+'.bin')).write_bytes(raw)
 texts=[(enc,raw.decode(enc,errors='replace')) for enc in ['utf8','gb18030']];enc,t=min(texts,key=lambda x:x[1].count('\ufffd'));(q/(name+'.decoded.txt')).write_text(t,encoding='utf8');print(name,enc,'replacement',t.count('\ufffd'))
 if name.startswith('nav'):
  a=json.loads(re.search(r'var Data_netWorthTrend\s*=\s*(\[.*?\]);',t).group(1));print([(x['x'],x['unitMoney']) for x in a if x['unitMoney']])
 else:
  h=BeautifulSoup(t,'html.parser');v=' '.join(h.stripped_strings);i=v.find('新拟态');print(v[max(0,i-100):i+500]);print('SCRIPTS',[x.get('src') for x in h.find_all('script',src=True)])
r=s.get('https://api.github.com/repos/AnxForever/stylekit/git/trees/main?recursive=1',timeout=35);j=r.json();(q/'stylekit_tree.json').write_text(json.dumps(j),encoding='utf8');print('FILES',[x['path'] for x in j.get('tree',[]) if any(v in x['path'].lower() for v in ['mouse-interaction','neumorph'])])

import requests,json,concurrent.futures,re
from pathlib import Path
s=requests.Session();s.trust_env=False
p=Path('work/v2')
def fetch(task):
 y,adj=task
 u=f'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh513100,day,{y}-01-01,{y}-12-31,640,{adj}'
 r=s.get(u,timeout=45);r.raise_for_status();j=r.json();(p/f'nasdaq_{y}_{adj or "raw"}.json').write_text(r.text,encoding='utf8');a=j['data']['sh513100'].get(adj+'day',[]);return (y,adj,len(a))
with concurrent.futures.ThreadPoolExecutor(4) as ex:print(list(ex.map(fetch,[(y,a) for y in range(2013,2026) for a in ['', 'hfq']])))
r=s.get('https://fund.eastmoney.com/pingzhongdata/513100.js',timeout=40);r.encoding='utf8';(p/'nasdaq_nav.js').write_text(r.text,encoding='utf8');a=json.loads(re.search(r'var Data_netWorthTrend\s*=\s*(\[.*?\]);',r.text).group(1));print('Events',[(x['x'],x['unitMoney']) for x in a if x['unitMoney']])
for name,u in {'NotoSansSC.ttf':'https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf','NotoSansSC-OFL.txt':'https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/OFL.txt','SpaceGrotesk.ttf':'https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf','SpaceGrotesk-OFL.txt':'https://raw.githubusercontent.com/google/fonts/main/ofl/spacegrotesk/OFL.txt'}.items():
 r=s.get(u,timeout=90);r.raise_for_status();(p/name).write_bytes(r.content);print(name,len(r.content))

import json,re
from pathlib import Path
p=Path('work/v2');raw=[];adj=[]
for y in range(2013,2026):
 raw+=json.loads((p/f'nasdaq_{y}_raw.json').read_text(encoding='utf8'))['data']['sh513100']['day'];adj+=json.loads((p/f'nasdaq_{y}_hfq.json').read_text(encoding='utf8'))['data']['sh513100']['hfqday']
d=json.loads(Path('work/dashboard_data.json').read_text(encoding='utf8'));dates=set(x[0] for x in raw);print(len(raw),raw[:1],raw[-1:]);print('missing',[x for x in d['dates'] if x>=raw[0][0] and x not in dates]);print('ratio',[(x[0],x[2],y[2]) for x,y in zip(raw,adj) if x[0] in ['2022-01-12','2022-01-13','2022-01-14']]);a=json.loads(re.search(r'var Data_netWorthTrend\s*=\s*(\[.*?\]);',(p/'nasdaq_nav.js').read_text(encoding='utf8')).group(1));print('events',[(x['x'],x['unitMoney']) for x in a if x['unitMoney']])

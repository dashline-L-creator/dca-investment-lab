import json,pandas as pd
c=pd.DataFrame(json.load(open('work/csi.txt',encoding='utf8'))['data']); c.index=pd.to_datetime(c.tradeDate)
b=[]
for y in range(2013,2026):b+=json.load(open(f'work/bond_{y}.json',encoding='utf8'))['data']['sh511010']['day']
b=pd.DataFrame(b); b.index=pd.to_datetime(b[0]);print('bond missing',c.loc[b.index.min():].index.difference(b.index))
g=json.load(open('work/em.txt',encoding='utf8'))['data']['klines'];g=pd.DataFrame([x.split(',') for x in g]);g.index=pd.to_datetime(g[0]);print('gold missing',c.loc[g.index.min():].index.difference(g.index))

import json,math,csv,hashlib
from pathlib import Path
from datetime import datetime
import pandas as pd,numpy as np
p=Path('work/v2');o=Path('outputs/v2.0');d=json.loads(Path('work/dashboard_data.json').read_text(encoding='utf8'));raw=[];adj=[]
for y in range(2013,2026):
 raw+=json.loads((p/f'nasdaq_{y}_raw.json').read_text(encoding='utf8'))['data']['sh513100']['day'];adj+=json.loads((p/f'nasdaq_{y}_hfq.json').read_text(encoding='utf8'))['data']['sh513100']['hfqday']
s=pd.Series({x[0]:float(x[2]) for x in adj});s.index=pd.to_datetime(s.index);s=s.sort_index();r0={x[0]:float(x[2]) for x in raw}
assert all(abs(float(x[2])*(5 if x[0]>='2022-01-14' else 1)-v)<1e-6 for x,v in zip(raw,s.values))
a=[]
for i,date in enumerate(s.index):
 if date>pd.Timestamp('2020-12-31'):break
 ann=date+pd.DateOffset(years=5);j=s.index.searchsorted(ann,side='right')-1;v=sum(50/s.iloc[i:j])*s.iloc[j];a.append([str(date.date()),str(s.index[j].date()),j-i,50*(j-i),v,v/(50*(j-i))-1])
cal=[x in r0 for x in d['dates']];filled=s.reindex(pd.to_datetime(d['dates'])).ffill();prices=[None if pd.isna(x) else float(x) for x in filled]
d['assets'].append({'name':'纳斯达克100ETF','code':'513100','prices':prices,'trading':cal,'samples':a});(p/'data.json').write_text(json.dumps(d,ensure_ascii=False,separators=(',',':'),default=lambda x:x.item()),encoding='utf8')
pd.DataFrame(a,columns=['起投日','估值日','投入次数','总投入_元','期末市值_元','累计收益率']).to_csv(o/'纳斯达克100ETF_全部滚动样本.csv',index=False,encoding='utf-8-sig')
pd.DataFrame({'日期':s.index,'原始收盘价':[r0[str(x.date())] for x in s.index],'拆分调整后价格':s.values}).to_csv(o/'纳指ETF日度数据.csv',index=False,encoding='utf-8-sig')
rows=[]
for scope in ['all','common3','common4']:
 for k,asset in enumerate(d['assets']):
  if scope=='common3' and k==3:continue
  rs=[r for r in asset['samples'] if scope=='all' or r[0]>='2013-07-29'];x=np.array([r[5] for r in rs]);q=np.quantile(x,[.05,.25,.5,.75,.95]);rows.append(dict(scope=scope,asset=asset['name'],n=len(x),mean=x.mean(),median=q[2],sd=x.std(),p5=q[0],p25=q[1],p75=q[3],p95=q[4],min=x.min(),max=x.max(),positive=(x>0).mean(),loss=(x<0).mean(),zero=(x==0).mean(),tail=np.sort(x)[:math.ceil(len(x)*.05)].mean()))
pd.DataFrame(rows).to_csv(o/'四资产统计汇总.csv',index=False,encoding='utf-8-sig');(p/'expected_stats.json').write_text(json.dumps(rows,ensure_ascii=False),encoding='utf8')
print(pd.DataFrame(rows).to_string(index=False))


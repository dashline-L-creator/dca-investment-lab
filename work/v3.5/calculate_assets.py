from pathlib import Path
import json,math,re
import pandas as pd,numpy as np
from bs4 import BeautifulSoup
q=Path('work/v3.5');o=Path('outputs/v3.5');d=json.loads(Path('work/v3.4/data.json').read_text(encoding='utf8'));dates=d['dates'];all_dates=set(dates);events={}
for code,first,name in [('511260',2017,'10年国债ETF'),('513500',2014,'标普500ETF')]:
 raw={};hfq={}
 for y in range(first,2027):
  j=json.loads((q/f'sh{code}_{y}_raw.json').read_text(encoding='utf8'))['data']['sh'+code];raw.update({r[0]:float(r[2]) for r in j['day']})
  j=json.loads((q/f'sh{code}_{y}_hfq.json').read_text(encoding='utf8'))['data']['sh'+code];hfq.update({r[0]:float(r[2]) for r in j.get('hfqday',j.get('day',[]))})
 raw={k:v for k,v in sorted(raw.items()) if k<='2026-10-31'};s=pd.Series(raw);assert set(raw)<=all_dates
 h=BeautifulSoup((q/f'fhsp_{code}.html').read_text(encoding='utf8'),'html.parser');divs={}
 for tr in h.find_all('tr'):
  cells=[x.get_text(' ',strip=True) for x in tr.find_all('td')]
  if len(cells)==5 and re.fullmatch(r'\d{4}-\d{2}-\d{2}',cells[2]):
   values=re.findall(r'\d+(?:\.\d+)?',cells[3]);assert values[0]=='10';divs[cells[2]]=float(values[-1])/10
 if code=='511260':
  assert len(divs)==5 and abs(sum(divs.values())-5.4074)<1e-6,divs
  cash=pd.Series({date:divs.get(date,0) for date in s.index});wealth=((s+cash)/s.shift()).fillna(1).cumprod()*s.iloc[0]
 else:
  assert not divs and '2022-03-29' not in raw
  wealth=s*pd.Series({date:2 if date>='2022-03-30' else 1 for date in s.index});assert all(abs(wealth.loc[date]-hfq[date])<1e-7 for date in wealth.index)
 idx=pd.to_datetime(s.index);p=wealth.to_numpy();prefix=np.r_[0,np.cumsum(50/p)];rows=[]
 for i,date in enumerate(idx):
  if date>pd.Timestamp('2021-10-31'):break
  ann=date+pd.DateOffset(years=5);assert ann<=pd.Timestamp('2026-10-31');j=idx.searchsorted(ann,side='right')-1;capital=50*(j-i);value=(prefix[j]-prefix[i])*p[j];rows.append([str(date.date()),str(idx[j].date()),int(j-i),int(capital),float(value),float(value/capital-1)])
 # Independent raw-unit ledger, including dividend reinvestment and the split.
 for r in [rows[0],rows[len(rows)//2],rows[-1]]:
  units=0;count=0
  for date,price in raw.items():
   if date<r[0]:continue
   if date>r[1]:break
   if code=='513500' and date=='2022-03-30':units*=2
   units*=1+divs.get(date,0)/price
   if date<r[1]:units+=50/price;count+=1
  assert count==r[2] and math.isclose(units*raw[r[1]],r[4],rel_tol=1e-10)
 aligned=wealth.reindex(dates).ffill();a=dict(name=name,code=code,prices=[None if pd.isna(v) else float(v) for v in aligned],trading=[date in raw for date in dates],samples=rows);d['assets'].append(a);events[code]={'dividends':divs,'split':{'2022-03-29':2} if code=='513500' else {}}
 print(code,name,len(rows),rows[0],rows[-1])
d['metadata']['additionalAssetEvents']=events;(q/'data.json').write_text(json.dumps(d,ensure_ascii=False,separators=(',',':')),encoding='utf8')
for a,b in zip(d['assets'],json.loads(Path('work/v3.4/data.json').read_text(encoding='utf8'))['assets']):assert a==b
rows=[];summary=[]
for a in d['assets']:
 for r in a['samples']:rows.append([a['name'],a['code']]+r)
 x=np.array([r[5] for r in a['samples']]);qs=np.quantile(x,[.05,.25,.5,.75,.95]);summary.append(dict(asset=a['name'],code=a['code'],n=len(x),mean=x.mean(),median=qs[2],sd=x.std(),p5=qs[0],p25=qs[1],p50=qs[2],p75=qs[3],p95=qs[4],min=x.min(),max=x.max(),positive=(x>0).mean(),loss=(x<0).mean(),tail=np.sort(x)[:math.ceil(len(x)*.05)].mean()))
pd.DataFrame(rows,columns=['资产','代码','起投日','估值日','投入次数','总投入_元','期末市值_元','累计收益率']).to_csv(o/'七资产全部滚动样本.csv',index=False,encoding='utf-8-sig');pd.DataFrame(summary).to_csv(o/'七资产各自全部历史统计.csv',index=False,encoding='utf-8-sig');(q/'expected_stats.json').write_text(json.dumps(summary,ensure_ascii=False),encoding='utf8')
print('Old five assets preserved byte-equivalent in value. Total samples:',len(rows))

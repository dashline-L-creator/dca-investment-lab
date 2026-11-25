from pathlib import Path
import json,math
import numpy as np,pandas as pd
q=Path('work/v3.4');o=Path('outputs/v3.4');o.mkdir(exist_ok=True)
old=json.loads(Path('work/v2/data.json').read_text(encoding='utf8'))
CUTOFF='2021-10-31';END='2026-10-31'
def lines(code,y,adj='raw'):
 j=json.loads((q/f'{code}_{y}_{adj}.json').read_text(encoding='utf8'))['data'][code]
 return j.get('day' if adj=='raw' else adj+'day',j.get('day',[]))
def raw(code,years):return pd.Series({r[0]:float(r[2]) for y in years for r in lines(code,y)}).sort_index()
newdates=[d for d in raw('sh518880',[2026]).index if d<=END]
dates=old['dates']+newdates
assert dates==sorted(set(dates)) and dates[-1]=='2026-10-30'
csi={r['tradeDate'][:4]+'-'+r['tradeDate'][4:6]+'-'+r['tradeDate'][6:]:r['close'] for r in json.loads((q/'csi_2026.json').read_text(encoding='utf8'))['data']}
assets=[]
bond_divs={'2026-03-25':.5715,'2026-06-25':.8144,'2026-09-18':.6204}
all_prices={};all_raw={};all_div={}
for k,a in enumerate(old['assets']):
 code=a['code'];s=pd.Series(a['prices'],index=old['dates'],dtype=float).dropna();trading=pd.Series(a.get('trading',[True]*len(old['dates'])),index=old['dates'])
 if k==0:
  extension=pd.Series({d:float(csi[d]) for d in newdates});assert (extension>0).all();s=pd.concat([s,extension]);trading=pd.concat([trading,pd.Series(True,index=newdates)])
 else:
  market='sh'+code;r=raw(market,[2025,2026]);e=r[(r.index>'2025-12-31')&(r.index<=END)]
  if k==2:
   last_raw=r.loc['2025-12-31'];last_wealth=s.iloc[-1];out={}
   for d,v in e.items():last_wealth*= (v+bond_divs.get(d,0))/last_raw;last_raw=v;out[d]=last_wealth
   extension=pd.Series(out)
  else:
   factor=5 if k==3 else 1
   assert abs(r.loc['2025-12-31']*factor-s.iloc[-1])<1e-8
   extension=e*factor
   hfq=raw(market,[2026]) if False else pd.Series({r[0]:float(r[2]) for r in lines(market,2026,'hfq')})
   if k==3:assert np.allclose(extension,hfq.reindex(extension.index),atol=1e-6)
  s=pd.concat([s,extension]);trading=pd.concat([trading,pd.Series([d in e.index for d in newdates],index=newdates)])
  all_raw[code]=r;all_div[code]=pd.Series({d:bond_divs.get(d,0) if k==2 else 0 for d in newdates})
 all_prices[code]=s.copy();assets.append(dict(name=a['name'],code=code,prices=s,trading=trading))
h=raw('sz159920',range(2012,2027));h=h[h.index<=END];div=pd.Series(0.,index=h.index);div.loc['2018-06-22']=.076
wealth=((h+div)/h.shift()).fillna(1).cumprod()*h.iloc[0]
assert h.index[0]=='2012-10-22'
assets.append(dict(name='恒生ETF',code='159920',prices=wealth,trading=pd.Series([d in h.index for d in dates],index=dates)))
all_prices['159920']=wealth;all_raw['159920']=h;all_div['159920']=div
allrows=[];summaries=[]
for a in assets:
 s=a['prices'];cal=a['trading'].reindex(s.index).fillna(False).astype(bool);s=s[cal];assert s.index.is_unique and (s>0).all()
 idx=pd.to_datetime(s.index);p=s.to_numpy();prefix=np.r_[0,np.cumsum(50/p)];rows=[]
 for i,d in enumerate(idx):
  if str(d.date())>CUTOFF:break
  ann=d+pd.DateOffset(years=5)
  # Require an actual full five-year horizon; weekends use the prior trading close.
  assert ann<=pd.Timestamp(END)
  j=idx.searchsorted(ann,side='right')-1;capital=(j-i)*50;value=(prefix[j]-prefix[i])*p[j];ret=value/capital-1
  if i%97==0:assert np.isclose(value,sum(50/p[i:j])*p[j],rtol=1e-10)
  row=[str(d.date()),str(idx[j].date()),j-i,capital,float(value),float(ret)];rows.append(row);allrows.append([a['name'],a['code']]+row)
 assert rows[-1][0]=='2021-10-29'
 a['samples']=rows;a['prices']=[None if pd.isna(v) else float(v) for v in a['prices'].reindex(dates).ffill()];a['trading']=[bool(v) for v in a['trading'].reindex(dates).fillna(False)]
 print(a['name'],len(rows),rows[0][0],rows[-1][0],rows[-1][1],round(rows[-1][5]*100,2))
 # Verify the prior four assets' existing samples are numerically unchanged.
 if a['code']!='159920':
  prior=next(x for x in old['assets'] if x['code']==a['code']);lookup={r[0]:r for r in rows}
  for r in prior['samples']:assert np.allclose(lookup[r[0]][2:],r[2:],atol=1e-6)
 for scope in ['all','common5']:
  rs=[r for r in rows if scope=='all' or r[0]>='2013-07-29'];x=np.array([r[5] for r in rs]);qs=np.quantile(x,[.05,.25,.5,.75,.95]);summaries.append(dict(scope=scope,asset=a['name'],code=a['code'],n=len(x),mean=x.mean(),median=qs[2],sd=x.std(),p5=qs[0],p25=qs[1],p50=qs[2],p75=qs[3],p95=qs[4],min=x.min(),max=x.max(),positive=(x>0).mean(),loss=(x<0).mean(),zero=(x==0).mean(),tail=np.sort(x)[:math.ceil(len(x)*.05)].mean()))
d={'dates':dates,'assets':assets,'metadata':{'startCutoff':CUTOFF,'valuationCutoff':END,'lastTradingDate':dates[-1],'downloadDate':'2026-11-25','contribution':50,'years':5,'bondDividends2026':bond_divs,'hangSengDividends':{'2018-06-22':.076}}}
(q/'data.json').write_text(json.dumps(d,ensure_ascii=False,separators=(',',':'),default=lambda x:x.item()),encoding='utf8')
pd.DataFrame(allrows,columns=['资产','代码','起投日','估值日','投入次数','总投入_元','期末市值_元','累计收益率']).to_csv(o/'五资产全部滚动样本.csv',index=False,encoding='utf-8-sig')
pd.DataFrame(summaries).to_csv(o/'五资产统计汇总.csv',index=False,encoding='utf-8-sig');(q/'expected_stats.json').write_text(json.dumps(summaries,ensure_ascii=False),encoding='utf8')
pd.DataFrame(all_prices).to_csv(o/'五资产全收益日度序列.csv',encoding='utf-8-sig')
print('Verified old samples unchanged; all five assets complete through the requested start cutoff.')

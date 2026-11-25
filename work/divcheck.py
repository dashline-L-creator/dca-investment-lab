import json,re,pandas as pd
s=open('work/nav_511010.js',encoding='utf8').read();a=json.loads(re.search(r'var Data_netWorthTrend\s*=\s*(\[.*?\]);',s).group(1))
for i,x in enumerate(a):
 if x['unitMoney']:print(pd.to_datetime(x['x'],unit='ms')+pd.Timedelta(hours=8),x,a[max(0,i-1)])
for y in [2013,2018]:
 a=json.load(open(f'work/bond_{y}.json',encoding='utf8'))['data']['sh511010']['day'];print(y,a[:2],a[-2:])

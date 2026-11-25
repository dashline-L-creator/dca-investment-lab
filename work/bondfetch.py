import requests,json,re,concurrent.futures
s=requests.Session();s.trust_env=False
def fetch(y):
 u=f'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh511010,day,{y}-01-01,{y}-12-31,640,'
 r=s.get(u,timeout=40);j=r.json();open(f'work/bond_{y}.json','w',encoding='utf8').write(r.text);return (y,len(j['data']['sh511010'].get('day',[])))
with concurrent.futures.ThreadPoolExecutor(4) as ex:print(list(ex.map(fetch,range(2013,2026))))
for code in ['511010','518880']:
 r=s.get(f'https://fund.eastmoney.com/pingzhongdata/{code}.js',timeout=30);r.encoding='utf8';open(f'work/nav_{code}.js','w',encoding='utf8').write(r.text)
 a=json.loads(re.search(r'var Data_netWorthTrend\s*=\s*(\[.*?\]);',r.text).group(1));print(code,[(x['x'],x['unitMoney']) for x in a if x['unitMoney']])

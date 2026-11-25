import json,re
j=json.load(open('work/csi.txt',encoding='utf8'));d=j['data']; print(len(d));print(d[:2]);print(d[-2:])
j=json.load(open('work/em.txt',encoding='utf8'));k=j['data']['klines'];print(len(k), k[:2],k[-2:])
s=open('work/fund.txt',encoding='utf8').read()
for key in ['Data_netWorthTrend','Data_ACWorthTrend']:
 m=re.search(r'var '+key+r'\s*=\s*(\[.*?\]);',s); a=json.loads(m.group(1));print(key,len(a),a[:2],a[-2:])

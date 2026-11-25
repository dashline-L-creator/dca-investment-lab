import requests,json
s=requests.Session();s.trust_env=False
for a in ['hfq','qfq','']:
 u=f'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh511010,day,2013-01-01,2015-12-31,640,{a}'
 r=s.get(u,timeout=20);open('work/qt_'+a+'.json','w',encoding='utf8').write(r.text);print(a,len(r.content),r.text[:150])

import requests,json
s=requests.Session();s.trust_env=False
# Cross-check gold through an independent source, including all adjustment factors.
u='https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh518880,day,2013-01-01,2013-12-31,640,'
r=s.get(u,timeout=30);open('work/gold_check.json','w',encoding='utf8').write(r.text)
print(r.text[:180])

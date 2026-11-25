exec(open('work/download.py',encoding='utf-8-sig').read().split('with concurrent')[0])
import time
for c,a in [('511010',2),('511010',0),('518880',0)]:
 for host in ['push2his.eastmoney.com','push2his.eastmoney.com','push2his.eastmoney.com']:
  try:fetch((f'{c}_{a}',base.format(code=c,adj=a)));break
  except Exception as e:print(c,a,type(e).__name__)

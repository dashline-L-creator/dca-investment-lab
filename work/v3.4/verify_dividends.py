from pathlib import Path
import json,math
q=Path('work/v3.4');data=json.loads((q/'data.json').read_text(encoding='utf8'))
dividends={'159920':{'2018-06-22':.076},'511010':{'2013-06-03':.28,'2015-10-09':1.,'2025-09-23':1.45,'2025-12-26':.6542,'2026-03-25':.5715,'2026-06-25':.8144,'2026-09-18':.6204}}
checks=0
for code in dividends:
 a=next(a for a in data['assets'] if a['code']==code);market=('sz' if code=='159920' else 'sh')+code;raw={}
 for y in range(2012 if code=='159920' else 2013,2027):
  p=q/f'{market}_{y}_raw.json' if code=='159920' or y==2026 else Path(f'work/bond_{y}.json')
  raw.update({r[0]:float(r[2]) for r in json.loads(p.read_text(encoding='utf8'))['data'][market]['day']})
 lookup={r[0]:r for r in a['samples']};targets=[a['samples'][0][0],'2015-01-05','2018-06-21','2018-06-22','2021-10-29']
 for start in targets:
  if start not in lookup:continue
  r=lookup[start];units=0;count=0
  for date,p in sorted(raw.items()):
   if date<start:continue
   if date>r[1]:break
   # Existing units receive the dividend; a close-of-day contribution does not.
   units*=1+dividends[code].get(date,0)/p
   if date<r[1]:units+=50/p;count+=1
  value=units*raw[r[1]]
  assert count==r[2] and math.isclose(value,r[4],rel_tol=1e-10), (code,start,value,r[4])
  checks+=1
print('PASS:',checks,'independent cash-unit ledgers match total-return calculations, including ex-date starts and 2026 bond dividends.')

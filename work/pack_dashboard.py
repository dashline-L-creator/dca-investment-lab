import csv,json
from pathlib import Path
p=Path('outputs');names=['沪深300全收益','黄金ETF','5年国债ETF'];raw=list(csv.DictReader((p/'清洗后日度数据.csv').open(encoding='utf-8-sig')))
d={'dates':[r[''] for r in raw],'assets':[]}
for name,code in zip(names,['H00300','518880','511010']):
 rs=list(csv.DictReader((p/(name+'_全部滚动样本.csv')).open(encoding='utf-8-sig')))
 d['assets'].append({'name':name,'code':code,'prices':[float(r[name]) if r[name] else None for r in raw],'samples':[[r['起投日'],r['估值日'],int(r['投入次数']),float(r['总投入_元']),float(r['期末市值_元']),float(r['累计收益率'])] for r in rs]})
Path('work/dashboard_data.json').write_text(json.dumps(d,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print(len(raw), [len(x['samples']) for x in d['assets']])

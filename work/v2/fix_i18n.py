import json
from pathlib import Path
p=Path('work/v2/translations.json');d=json.loads(p.read_text(encoding='utf8'));d.update({'样本范围':'Sample window','数据视图':'Data views','五年期间各资产市值与累计投入曲线':'Asset values and contributions over five years','收益率直方图':'Return histogram','三类资产累计收益率分布':'Asset cumulative return distributions','均值':'Mean','5%分位数':'5th percentile','中位数':'Median'})
p.write_text(json.dumps(d,ensure_ascii=False),encoding='utf8')

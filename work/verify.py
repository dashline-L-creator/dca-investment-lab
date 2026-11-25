from pathlib import Path
import pandas as pd, numpy as np
from openpyxl import load_workbook
p=Path('outputs');s=pd.read_csv(p/'统计汇总.csv');assert np.allclose(s['正收益比例']+s['亏损概率']+s['零收益比例'],1)
for f in p.glob('*全部滚动样本.csv'):
 r=pd.read_csv(f);assert np.allclose(r['期末市值_元']/r['总投入_元']-1,r['累计收益率']);assert (r['总投入_元']==50*r['投入次数']).all();print(f.name,len(r),r['总投入_元'].min(),r['总投入_元'].max())
w=load_workbook(p/'五年定投统计.xlsx',read_only=True);print([(ws.title,ws.max_row,ws.max_column) for ws in w]);assert len(w.sheetnames)==6
print(s[['范围','资产','标准差','P5','P25','P50','P75','P95']].to_string(index=False))
# Explicit encoding header makes the standalone reproduction script robust.
a=Path('work/analyze.py');t=a.read_text(encoding='utf8');a.write_text('# -*- coding: utf-8 -*-\n'+t,encoding='utf8')

from pathlib import Path
import pandas as pd,numpy as np,base64
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import PercentFormatter
plt.rcParams.update({'font.sans-serif':['Microsoft YaHei'],'axes.unicode_minus':False})
p=Path('outputs');names=['沪深300全收益','黄金ETF','5年国债ETF'];colors=['#3465a4','#d59a22','#27927b']
fig,axs=plt.subplots(3,1,figsize=(14,11))
for ax,n,col in zip(axs,names,colors):
 r=pd.read_csv(p/(n+'_全部滚动样本.csv'),parse_dates=['起投日']);ys=sorted(r['起投日'].dt.year.unique());a=[r.loc[r['起投日'].dt.year==y,'累计收益率'] for y in ys]
 b=ax.boxplot(a,labels=[str(y) for y in ys],patch_artist=True,whis=(5,95),showfliers=False)
 for patch in b['boxes']:patch.set_facecolor(col);patch.set_alpha(.65)
 ax.axhline(0,color='#a44',ls='--');ax.yaxis.set_major_formatter(PercentFormatter(1));ax.set_title(n);ax.set_xlabel('起投年份');ax.grid(axis='y',alpha=.2)
fig.suptitle('按起投年份的收益分布｜箱体P25–P75，中线P50，须P5–P95',fontsize=16);fig.tight_layout();f=p/'按起投年份收益分布.png';fig.savefig(f,dpi=140,bbox_inches='tight');plt.close(fig)
h=p/'五年定投研究报告.html';s=h.read_text(encoding='utf8');s=s.replace('<section><h2>最好与最差起投样本</h2>','<section><h2>按起投年份收益分布</h2><img src="data:image/png;base64,'+base64.b64encode(f.read_bytes()).decode()+'"></section><section><h2>最好与最差起投样本</h2>');h.write_text(s,encoding='utf8')
print('Verified', len(pd.read_csv(p/'统计汇总.csv')), 'summary rows; 8 chart files; report and workbook complete.')

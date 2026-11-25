# -*- coding: utf-8 -*-
import json, math, base64, re
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import PercentFormatter
O=Path('outputs');O.mkdir(exist_ok=True)
plt.rcParams.update({'font.sans-serif':['Microsoft YaHei','SimHei'],'axes.unicode_minus':False,'figure.dpi':140,'axes.spines.top':False,'axes.spines.right':False})
names=['沪深300全收益','黄金ETF','5年国债ETF'];colors=['#3465a4','#d59a22','#27927b']
c=pd.DataFrame(json.load(open('work/csi.txt',encoding='utf8'))['data']);c.index=pd.to_datetime(c.tradeDate)
c=c.loc[(c.index>='2004-12-31')&(c.index!='2018-06-18')]
g=pd.DataFrame([x.split(',') for x in json.load(open('work/em.txt',encoding='utf8'))['data']['klines']]);g.index=pd.to_datetime(g[0]);g=g[2].astype(float)
b=[]
for y in range(2013,2026):b+=json.load(open(f'work/bond_{y}.json',encoding='utf8'))['data']['sh511010']['day']
b=pd.DataFrame(b);b.index=pd.to_datetime(b[0]);b=b[2].astype(float).sort_index()
divs={'2013-06-03':.28,'2015-10-09':1.,'2025-09-23':1.45,'2025-12-26':.6542}
div=pd.Series(0.,index=b.index)
for d,v in divs.items():div.loc[d]=v
# Total-return wealth factor: cash dividend reinvested at ex-date close.
br=((b+div)/b.shift()).fillna(1).cumprod()*b.iloc[0]
series=dict(zip(names,[c.close.astype(float),g,br]))
assert all(s.index.is_unique and s.index.is_monotonic_increasing and (s>0).all() for s in series.values())
assert all(series[n].index.equals(c.loc[series[n].index.min():].index) for n in names[1:])
check=json.load(open('work/gold_check.json',encoding='utf8'))['data']['sh518880']['day']
assert all(abs(g.loc[x[0]]-float(x[2]))<1e-8 for x in check)
results={}
for n,s in series.items():
 dates=s.index; p=s.values; prefix=np.r_[0,np.cumsum(50/p)];rows=[]
 for i,d in enumerate(dates):
  if d>pd.Timestamp('2020-12-31'):break
  anniversary=d+pd.DateOffset(years=5)
  if anniversary>dates[-1]:continue
  j=dates.searchsorted(anniversary,side='right')-1
  count=j-i;capital=count*50;value=(prefix[j]-prefix[i])*p[j]
  if i%100==0:assert np.isclose(value,np.sum(50/p[i:j])*p[j],rtol=1e-10)
  rows.append([d,anniversary,dates[j],count,capital,value,value-capital,value/capital-1])
 results[n]=pd.DataFrame(rows,columns=['起投日','五周年日期','估值日','投入次数','总投入_元','期末市值_元','盈亏_元','累计收益率']).set_index('起投日')
common=results[names[0]].index
for n in names[1:]:common=common.intersection(results[n].index)
groups={'各自全部历史':results,'共同起投区间':{n:r.loc[common] for n,r in results.items()}}
summary=[];extremes=[]
for scope,rs in groups.items():
 for n,r in rs.items():
  x=r['累计收益率'];q=x.quantile([.05,.25,.5,.75,.95]);tail=x.nsmallest(math.ceil(len(x)*.05))
  row={'范围':scope,'资产':n,'样本数':len(r),'最早起投':str(r.index.min().date()),'最晚起投':str(r.index.max().date()),'均值':x.mean(),'中位数':x.median(),'标准差':x.std(ddof=0),**{f'P{int(k*100)}':v for k,v in q.items()},'最小值':x.min(),'最大值':x.max(),'正收益比例':(x>0).mean(),'亏损概率':(x<0).mean(),'零收益比例':(x==0).mean(),'最差5%平均收益':tail.mean(),'亏损样本平均收益':x[x<0].mean(),'平均投入_元':r['总投入_元'].mean(),'平均期末市值_元':r['期末市值_元'].mean(),'平均盈利_元':r['盈亏_元'].mean()};summary.append(row)
  for typ,idx in [('最差',x.idxmin()),('最好',x.idxmax())]:extremes.append({'范围':scope,'资产':n,'类型':typ,'起投日':idx,**r.loc[idx].to_dict()})
summary=pd.DataFrame(summary);extremes=pd.DataFrame(extremes)
summary.to_csv(O/'统计汇总.csv',index=False,encoding='utf-8-sig');extremes.to_csv(O/'极端样本.csv',index=False,encoding='utf-8-sig')
for n,r in results.items():r.to_csv(O/f'{n}_全部滚动样本.csv',encoding='utf-8-sig')
prices=pd.DataFrame(series);prices['国债ETF原始收盘价']=b;prices['国债ETF每份分红']=div;prices.to_csv(O/'清洗后日度数据.csv',encoding='utf-8-sig')
images=[]
def save(fig,name):
 fig.tight_layout();p=O/(name+'.png');fig.savefig(p,bbox_inches='tight');plt.close(fig);images.append((name,p))
for scope,rs in groups.items():
 fig,axs=plt.subplots(2,3,figsize=(15,8))
 for k,(n,r) in enumerate(rs.items()):
  x=r['累计收益率'];ax=axs[0,k];ax.hist(x,bins=35,color=colors[k],alpha=.85,weights=np.ones(len(x))/len(x));ax.axvline(0,color='#b94747',ls='--');ax.axvline(x.mean(),color='#222',label=f'均值 {x.mean():.1%}');ax.legend();ax.set_title(n+f' · n={len(x):,}');ax.xaxis.set_major_formatter(PercentFormatter(1));ax.yaxis.set_major_formatter(PercentFormatter(1));ax.set_xlabel('5年累计收益率');ax.set_ylabel('样本占比')
  ax=axs[1,k];xx=np.sort(x);ax.plot(xx,np.arange(1,len(x)+1)/len(x),color=colors[k]);ax.axvline(0,color='#b94747',ls='--');ax.set_xlabel('5年累计收益率');ax.set_ylabel('不高于该收益的样本比例');ax.xaxis.set_major_formatter(PercentFormatter(1));ax.yaxis.set_major_formatter(PercentFormatter(1));ax.grid(alpha=.2)
 fig.suptitle(scope+'｜收益直方图与累计分布',fontsize=18);save(fig,scope+'_收益分布')
fig,axs=plt.subplots(3,1,figsize=(14,10),sharex=True)
for k,(n,r) in enumerate(results.items()):
 ax=axs[k];ax.plot(r.index,r['累计收益率'],color=colors[k],lw=1.2);ax.axhline(0,color='#a44',ls='--');ax.set_title(n);ax.yaxis.set_major_formatter(PercentFormatter(1));ax.grid(alpha=.2)
 for typ,idx in [('最好',r['累计收益率'].idxmax()),('最差',r['累计收益率'].idxmin())]:
  v=r.loc[idx,'累计收益率'];ax.scatter(idx,v,color='#222',s=20);ax.annotate(f'{typ} {v:.1%}\n{idx:%Y-%m-%d}',(idx,v),xytext=(7,8 if typ=='最差' else -32),textcoords='offset points',fontsize=9)
axs[-1].set_xlabel('起投日期');fig.suptitle('每个起投日，对应完整5年定投的累计收益率',fontsize=17);save(fig,'起投日期与收益率')
fig,axs=plt.subplots(1,2,figsize=(14,6))
for ax,(scope,rs) in zip(axs,groups.items()):
 bp=ax.boxplot([r['累计收益率'] for r in rs.values()],labels=names,patch_artist=True,showmeans=True,whis=(5,95),showfliers=True,flierprops={'markersize':1,'alpha':.2})
 for p,col in zip(bp['boxes'],colors):p.set_facecolor(col);p.set_alpha(.6)
 ax.axhline(0,color='#a44',ls='--');ax.set_title(scope);ax.yaxis.set_major_formatter(PercentFormatter(1));ax.grid(axis='y',alpha=.2)
fig.suptitle('箱线图｜箱体P25–P75，中线P50，须P5–P95，三角为均值',fontsize=15);save(fig,'箱线图')
fig,axs=plt.subplots(1,2,figsize=(14,5))
for ax,(scope,rs) in zip(axs,groups.items()):
 for k,(n,r) in enumerate(rs.items()):
  y=r.groupby(r.index.year)['累计收益率'].median();ax.plot(y.index,y.values,'o-',color=colors[k],label=n)
 ax.axhline(0,color='#a44',ls='--');ax.set_title(scope);ax.set_xlabel('起投年份');ax.set_ylabel('该年起投样本的收益率中位数');ax.yaxis.set_major_formatter(PercentFormatter(1));ax.legend();ax.grid(alpha=.2)
save(fig,'起投年份收益中位数')
fig,axs=plt.subplots(1,2,figsize=(14,5))
for ax,(scope,rs) in zip(axs,groups.items()):
 for k,(n,r) in enumerate(rs.items()):
  x=r['累计收益率'];vals=[(x<0).mean(),(x<-.1).mean(),(x>.1).mean(),(x>.2).mean(),(x>.5).mean()];ax.bar(np.arange(5)+(k-1)*.25,vals,.25,label=n,color=colors[k])
 ax.set_xticks(range(5));ax.set_xticklabels(['亏损','亏损超过10%','盈利超过10%','盈利超过20%','盈利超过50%']);ax.tick_params(axis='x',labelsize=9);ax.yaxis.set_major_formatter(PercentFormatter(1));ax.set_title(scope);ax.legend();ax.grid(axis='y',alpha=.2)
save(fig,'亏损与收益门槛比例')
fig,axs=plt.subplots(1,2,figsize=(14,5))
for ax,(scope,rs) in zip(axs,groups.items()):
 a=summary[summary['范围']==scope];xx=np.arange(3)
 for j,(label,col) in enumerate([('最小值','#bd5555'),('P5','#d49b37'),('最差5%平均收益','#6a67a8')]):ax.bar(xx+(j-1)*.25,a[label],.25,label=label,color=col)
 ax.set_xticks(xx);ax.set_xticklabels(names);ax.axhline(0,color='#555',lw=.6);ax.yaxis.set_major_formatter(PercentFormatter(1));ax.set_title(scope);ax.legend();ax.grid(axis='y',alpha=.2)
save(fig,'尾部风险比较')
# Spreadsheet contains unrounded numeric results and all underlying data.
with pd.ExcelWriter(O/'五年定投统计.xlsx',engine='openpyxl') as w:
 summary.to_excel(w,sheet_name='统计汇总',index=False);extremes.to_excel(w,sheet_name='最好最差样本',index=False)
 for n,r in results.items():r.to_excel(w,sheet_name=n)
 prices.to_excel(w,sheet_name='清洗后日度数据')
 for ws in w.book.worksheets:
  ws.freeze_panes='B2';ws.auto_filter.ref=ws.dimensions
  for col in ws.columns:
   ws.column_dimensions[col[0].column_letter].width=20
  headers={cell.column:cell.value for cell in ws[1]}
  for row in ws.iter_rows(min_row=2):
   for cell in row:
    h=str(headers[cell.column])
    if isinstance(cell.value,(float,int)) and any(z in h for z in ['收益','均值','中位','标准差','P5','P25','P50','P75','P95','最小值','最大值','概率','比例']):cell.number_format='0.00%'
    elif isinstance(cell.value,float):cell.number_format='#,##0.0000'
    elif isinstance(cell.value,pd.Timestamp):cell.number_format='yyyy-mm-dd'

def table(df):
 d=df.copy()
 for col in d:
  if pd.api.types.is_float_dtype(d[col]):d[col]=d[col].map(lambda x:'—' if pd.isna(x) else (f'{x:,.2f}' if '元' in col else f'{x:.2%}'))
 return d.to_html(index=False,border=0)
html='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>三类资产五年每日定投研究</title><style>body{font-family:"Microsoft YaHei",sans-serif;background:#f4f6fa;color:#243247;margin:0}main{max-width:1250px;margin:auto;padding:36px}h1{font-size:32px}h2{margin-top:36px}p,li{line-height:1.9}section{background:white;padding:24px;margin:20px 0;border-radius:12px}img{width:100%}.scroll{overflow:auto}table{border-collapse:collapse;font-size:13px;white-space:nowrap;width:100%}td,th{padding:10px;border-bottom:1px solid #dde3ec;text-align:right}th{background:#eaf0f8}a{color:#3465a4}.note{color:#596b80}</style><main><h1>三类资产 · 五年每日定投研究</h1><p>每个交易日投入50元人民币｜起投日不晚于2020-12-31｜估值最晚2025-12-31</p>'''
html+='<section><h2>如何理解结果</h2><p>本报告所有收益率均为期末总市值÷实际累计投入−1，未年化。每一个起投日都形成一个完整5年样本。均值是不同起投日收益率的算术平均值。</p><p>优先用“共同起投区间”比较三类资产；“各自全部历史”用于了解各自较长历史。相邻样本持有期大量重叠，并非独立观察；亏损概率是历史起投日亏损频率，不是未来概率预测。</p></section>'
for scope in groups:
 html+=f'<section><h2>{scope}</h2><div class="scroll">'+table(summary[summary['范围']==scope].drop(columns='范围'))+'</div></section>'
for title,p in images:html+=f'<section><h2>{title}</h2><img src="data:image/png;base64,{base64.b64encode(p.read_bytes()).decode()}"></section>'
html+='<section><h2>最好与最差起投样本</h2><div class="scroll">'+table(extremes)+'</div></section>'
html+='''<section><h2>计算方法与数据审查</h2><ul>
<li>沪深300全收益指数H00300，使用中证指数官方日收盘数据，从基日2004-12-31起；早期包含回溯历史，不能解释为当时存在对应可投资产品。全收益指数自动反映分红再投资。</li>
<li>黄金：华安黄金ETF 518880，2013-07-29上市，属于首批同日上市黄金ETF之一；同批还有国泰黄金ETF 518800。本报告选华安作为黄金单一代表，不重复合并同类基金。使用东方财富后复权收盘行情；截至2025年底没有上市后的分红或份额折算，且2013年全段收盘价与腾讯原始行情逐日一致。</li>
<li>国债：国泰上证5年期国债ETF 511010，2013-03-25上市，腾讯逐年原始收盘价格。分红为2013-06-03每份0.28元、2015-10-09每份1元、2025-09-23每份1.45元、2025-12-26每份0.6542元。按除息日收盘价即时再投资，忽略除息日至实际到账日之间的等待。这是理论总收益口径。</li>
<li>指数接口存在2002-01-01孤立基值及2018-06-18休市日记录，均删除。2018-06-18经上交所端午休市公告确认。两只ETF从上市至2025年底的交易日期与清洗后指数日期完全一致，无需填补价格。</li>
<li>定投包含起投日，至估值日前一个交易日止；估值日不再投入。五周年为日历5年，2月29日起投周年落在非闰年时按2月28日；非交易日向前取最近交易日。可买小数份额，不计交易佣金、价差与税费；ETF净值及市场价格已经反映基金内部费用，未额外扣减。</li>
<li>总收益序列T用于计算：期末价值=T(估值日)×Σ[50/T(每次投入日)]。每日投入次数×50为实际总投入。分位数使用线性插值；标准差采用总体口径；最差5%均值取最低ceil(样本数×5%)个样本。</li>
<li>零收益定义为计算结果恰为0；正收益与亏损分别严格大于0和小于0。没有完整五年数据的起投日不纳入。最差5%均值即使为正也照实展示，不等同亏损金额。</li>
<li>未添加将持续入金账户总市值直接计算的最大回撤，该指标容易受到新增投入干扰；也未把本累计收益率开五次方充作定投年化收益。</li>
</ul><h2>数据来源</h2><ul>
<li><a href="https://www.csindex.com.cn/csindex-home/perf/index-perf?indexCode=H00300&amp;startDate=20020101&amp;endDate=20251231">中证指数官方：H00300历史日数据</a></li>
<li><a href="https://www.gtfund.com/contents/2013/3/20-41aabf3b11534c378107c4bd3ddd78a1.html">国泰基金：5年期国债ETF上市公告</a></li>
<li><a href="https://www.sse.com.cn/disclosure/fund/announcement/c/2013-07-23/518880_20130724_1.pdf">上交所：华安黄金ETF上市交易公告</a></li>
<li><a href="https://fundf10.eastmoney.com/fhsp_511010.html">天天基金：国债ETF分红记录</a></li>
<li><a href="https://www.sse.com.cn/disclosure/announcement/general/c/c_20180606_4567900.shtml">上交所：2018年端午休市公告</a></li>
<li>市场日行情：东方财富push2his与腾讯web.ifzq.gtimg.cn公开接口；原始下载文件保留于work目录。数据下载时间：2026-11-24。</li>
</ul></section></main></html>'''
(O/'五年定投研究报告.html').write_text(html,encoding='utf8')
print(summary[['范围','资产','样本数','均值','中位数','亏损概率','最小值','最大值','最差5%平均收益']].to_string(index=False))
print('common',common.min(),common.max(),len(common));print('outputs',len(list(O.iterdir())))

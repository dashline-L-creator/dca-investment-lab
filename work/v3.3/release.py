from pathlib import Path
import re,json,hashlib
o=Path('outputs/v3.3')
a=Path('outputs/v3.2/定投交互实验室_v3.2.html').read_text(encoding='utf8');b=(o/'定投交互实验室_v3.3.html').read_text(encoding='utf8')
pat=r'<script id="dataset" type="application/json">(.*?)</script>'
assert re.search(pat,a,re.S).group(1)==re.search(pat,b,re.S).group(1)
assert '__FIELD_JS__' not in b and '__FAVICON__' not in b
print('PASS: identical financial dataset; all build placeholders replaced.')
p=Path('outputs/版本记录.html');s=p.read_text(encoding='utf8')
if 'v3.3 ·' not in s:
 s=s.replace('v3.2 · 2026-11-25 · CURRENT','v3.2 · 2026-11-25 · ARCHIVED')
 i=s.index('<section>');s=s[:i]+'''<section><div class="tag">v3.3 · 2026-11-25 · CURRENT</div><h2><a href="v3.3/定投交互实验室_v3.3.html">打开A2品牌线场版 →</a></h2><p>采用A2积累之环，外环收细约36%。四档竖线低对比流动，避开文字、控件与图表。支持背景开关、减少动态效果与后台暂停；页首、开场和标签图标同步更新。</p><a href="v3.3/时间的复利_A2收细圆环.svg">独立SVG图标</a></section>'''+s[i:]
 s=s.replace('v3.1 / v3.2。未上传远程服务。','v3.1 / v3.2 / v3.3。')
 p.write_text(s,encoding='utf8')
p=Path('outputs/版本说明.txt');s=p.read_text(encoding='utf8')
if 'v3.3 —' not in s:
 s+='''\n\nv3.3 — 2026-11-25
- 采用用户选定A2积累之环，环宽从0.110收至0.070，约收细36%，内侧保留投入柱与波动轨迹。
- 页首、开场和浏览器标签采用同一新标识，附透明背景独立SVG。
- 背景用Canvas绘制四档竖线（1/2/3/4像素），缓慢流动并响应轻微指针位移。
- 背景保持低对比度，动态遮罩避开文字、控件、面板与图表；装饰层不接收点击。
- 保留动态背景开关；关闭后静止，系统减少动态效果优先于保存的开启设置；切到后台暂停。
- 核验动画暂停/恢复/单循环、背景保护遮罩、JavaScript语法、财务数据逐字一致；桌面浏览器检查中英文、背景开关、开场及分布图。
- 参考：https://www.stylekit.top/zh/styles/quantized-line-field 。本版沿用既有新拟态内容面板，仅将品牌和背景改为量化线场。
- 所有图标、字体、数据与动画离线内置；v3.2冻结保留，Git标签v3.3。
'''
 p.write_text(s,encoding='utf8')
p=Path('README.md');s=p.read_text(encoding='utf8')
if '- **v3.3**' not in s:s=s.replace('- **v3.2**','- **v3.3**：A2收细圆环图标、低对比动态量化线场背景，文字与图表保护遮罩。\n- **v3.2**')
s=s.replace('`v3.1` 与 `v3.2` 对应两次冻结发布','`v3.1`、`v3.2` 与 `v3.3` 对应各次冻结发布')
p.write_text(s,encoding='utf8')
(o/'SHA256.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in o.iterdir() if p.is_file() and p.name!='SHA256.json'},ensure_ascii=False,indent=2),encoding='utf8')

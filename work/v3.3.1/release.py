from pathlib import Path
import re,json,hashlib,shutil
o=Path('outputs/v3.3.1');p=Path('outputs/版本记录.html');s=p.read_text(encoding='utf8')
if 'v3.3.1 ·' not in s:
 s=s.replace('v3.3 · 2026-11-25 · CURRENT','v3.3 · 2026-11-25 · ARCHIVED')
 i=s.index('<section>');s=s[:i]+'''<section><div class="tag">v3.3.1 · 2026-11-25 · CURRENT</div><h2><a href="v3.3.1/定投交互实验室_v3.3.1.html">打开流动线场修正版 →</a></h2><p>按Showcase重做：60×60标记采样、四档竹节线宽随噪声向下流动、鼠标与触控局部弹性散开后回弹，配合实际线场生成的检测框与连线。保留低对比与内容保护。</p></section>'''+s[i:]
 s=s.replace('v3.2 / v3.3。','v3.2 / v3.3 / v3.3.1。');p.write_text(s,encoding='utf8')
p=Path('outputs/版本说明.txt');s=p.read_text(encoding='utf8')
if 'v3.3.1 —' not in s:
 s+='''\n\nv3.3.1 — 2026-11-25
- 按StyleKit Showcase重做背景，替换不易察觉的整体摆动。
- A2几何标记仅初始化采样一次为60×60亮度表，每帧绘制60列×30段竹节竖线，按四档线宽与透明度分组。
- 固定种子噪声向下流动，闲置时线宽持续变化；鼠标或触控触发局部径向位移，阻尼弹簧回到网格，静止指针不持续推开线条。
- 检测框来自实时变形线场的7×7亮度窗口，使用空间抑制、位置弹簧与淡入淡出，配有细连线；不涉及AI推理。
- 保留低对比、内容保护遮罩、开关、减少动态效果和后台暂停；研究口径弹窗打开时暂停。
- 自动检查确认闲置帧变化、指针位移与回弹、单一动画循环、暂停/恢复；浏览器确认闲置背景画面变化且无控制台错误。
- 财务数据逐字一致；旧版v3.3冻结保留，Git标签v3.3.1。
- 参考：https://www.stylekit.top/styles/quantized-line-field/showcase
''';p.write_text(s,encoding='utf8')
p=Path('README.md');s=p.read_text(encoding='utf8')
if '- **v3.3.1**' not in s:s=s.replace('- **v3.3**','- **v3.3.1**：Showcase流动线宽、局部弹性回弹、动态检测框与连线。\n- **v3.3**')
s=s.replace('`v3.2` 与 `v3.3`','`v3.2`、`v3.3` 与 `v3.3.1`');p.write_text(s,encoding='utf8')
a=Path('outputs/v3.3/定投交互实验室_v3.3.html').read_text(encoding='utf8');b=(o/'定投交互实验室_v3.3.1.html').read_text(encoding='utf8');pat=r'<script id="dataset" type="application/json">(.*?)</script>';assert re.search(pat,a,re.S).group(1)==re.search(pat,b,re.S).group(1)
(o/'SHA256.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in o.iterdir() if p.is_file() and p.name!='SHA256.json'},ensure_ascii=False,indent=2),encoding='utf8')
# Retain one authoritative test and release helper in the new version.
shutil.copy2('work/v3.3.1/verify_motion.cjs','work/v3.3.1/verify_linefield.cjs')
print('PASS: financial data unchanged; v3.3.1 archived independently.')

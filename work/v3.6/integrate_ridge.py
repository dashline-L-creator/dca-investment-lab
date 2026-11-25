from pathlib import Path
q=Path('work/v3.6');p=q/'build.py';s=p.read_text(encoding='utf8').replace("(q/'cloud3d.js').read_text(encoding='utf8')","(q/'cloud3d.js').read_text(encoding='utf8')+'\\n'+(q/'ridge.js').read_text(encoding='utf8')");p.write_text(s,encoding='utf8')
p=q/'cloud3d.js';s=p.read_text(encoding='utf8').replace('四资产收益星图','四资产收益山脊').replace('三维同时展示所选四种资产；每点一个真实样本。横轴为5年收益，纵轴为起投日期，深度区分资产。','共享收益横轴，四层山脊展示分布形状；每个粒子仍是一个真实起投样本。山高按各资产峰值归一化，不用于比较样本数量。').replace('点的颜色区分资产；红色参考面为零收益。','颜色区分资产 · 红线为零收益 · 山高各自归一化').replace('四资产三维收益点阵：横轴收益率、纵轴起投日期、深度为资产；方向键旋转，加减键缩放，Home复位','四资产收益山脊：横轴收益率，山高为各资产归一化分布，深度区分资产；方向键旋转，加减键缩放，Home复位');s=s.replace("function cloudSwitch(mode){cloudMode=mode;", "function cloudSwitch(mode){cancelAnimationFrame(morphFrame);morphFrame=0;morphHolding=false;morphAmount=morphVelocity=morphTarget=0;cloudMode=mode;")
p.write_text(s,encoding='utf8')
# Ensure CJK subset includes strings drawn directly on the canvas.
p=q/'fonts.py';s=p.read_text(encoding='utf8').replace("+(p/'translations.json').read_text(encoding='utf8')","+(p/'translations.json').read_text(encoding='utf8')+(p/'ridge.js').read_text(encoding='utf8')+(p/'morph.js').read_text(encoding='utf8')");p.write_text(s,encoding='utf8')
print('Integrated luminous ridges and spring morph')

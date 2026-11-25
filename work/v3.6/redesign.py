from pathlib import Path
import json
q=Path('work/v3.6')
p=q/'template.html';s=p.read_text(encoding='utf8')
s=s.replace('四资产收益星图','四资产收益山脊').replace('三维同时展示所选四种资产；每点一个真实样本。横轴为5年收益，纵轴为起投日期，深度区分资产。','共享收益横轴，四层山脊展示分布形状；每个粒子仍是一个真实起投样本。山高按各资产峰值归一化，不用于比较样本数量。')
s=s.replace('四资产三维收益点阵：横轴收益率、纵轴起投日期、深度为资产；方向键旋转，加减键缩放，Home复位','四资产收益山脊：横轴收益率，山高为各资产归一化分布，深度区分资产；方向键旋转，加减键缩放，Home复位')
s=s.replace('点的颜色区分资产；红色参考面为零收益。','颜色区分资产 · 红线为零收益 · 山高各自归一化')
s=s.replace('<div class="chart swarm-chart">','<div id="morphTools" class="morph-tools"><div><span class="eyebrow">PARTICLE MORPH / HOLD TO EXPLORE</span><p>按住聚合为粒子球，松开回到真实收益分布。</p></div><button id="morphHold" aria-pressed="false">◉ 按住聚合</button><span id="morphState" class="tiny muted" aria-live="polite">真实收益坐标</span></div><div class="chart swarm-chart">',1)
s=s.replace('__CLOUD_JS__','__CLOUD_JS__\n__MORPH_JS__')
start=s.index('cancelAnimationFrame(swarmFrame);if((animate||changed)',s.index('function prepareSwarm'))
end=s.index('\nfunction paintSwarm',start)
s=s[:start]+"cancelAnimationFrame(swarmFrame);startSwarmMorph(animate||changed)}"+s[end:]
start=s.index(' const meanX=X(s.mean);for(');end=s.index('\nfunction drawDistribution',start)
s=s[:start]+''' paintMorphSamples(c);c.progress=morphAmount<.005?1:0}
'''+s[end:]
s=s.replace('installCloudPointer();','installCloudPointer();installMorphControls();')
s=s.replace('</style>','''
/* A recessed observatory, with luminous ridges inside the pale neumorphic shell. */
.is-3d .swarm-chart{background:radial-gradient(ellipse at 48% 15%,#253757 0%,#111d31 55%,#0b1424 100%);border:1px solid #8b9db330;border-radius:24px;box-shadow:inset 0 2px 12px #0005,0 1px 0 #fff9;overflow:hidden}
.is-3d .swarm-chart canvas{border-radius:24px}.morph-tools{display:flex;align-items:center;gap:18px;justify-content:space-between;margin:18px 0;padding:20px;border-radius:20px;box-shadow:var(--inset)}.morph-tools .eyebrow{font-size:10px;margin:0}.morph-tools p{font-size:13px;color:var(--muted);margin:8px 0 0}.morph-tools button{white-space:nowrap;touch-action:none;user-select:none}.morph-tools button[aria-pressed=true]{box-shadow:var(--inset);color:var(--gold)}.is-3d #morphTools{display:none}#morphState{min-width:100px}.cloud-tools{margin-bottom:20px}.is-3d .swarm-chart{height:590px}
@media(max-width:580px){.morph-tools{flex-wrap:wrap;padding:16px;gap:14px}.morph-tools>div{width:100%}.is-3d .swarm-chart{height:440px}}
</style>''')
p.write_text(s,encoding='utf8')
p=q/'build.py';s=p.read_text(encoding='utf8');s=s.replace(".replace('__MOUSE_JS__'", ".replace('__MORPH_JS__',(q/'morph.js').read_text(encoding='utf8')).replace('__MOUSE_JS__'");p.write_text(s,encoding='utf8')
p=q/'translations.json';d=json.loads(p.read_text(encoding='utf8'));d.update({'四资产收益山脊':'Four-asset return ridges','共享收益横轴，四层山脊展示分布形状；每个粒子仍是一个真实起投样本。山高按各资产峰值归一化，不用于比较样本数量。':'Four layered distributions share one return axis. Every particle is a real sample. Heights are normalized to each asset’s peak, not comparable sample counts.','颜色区分资产 · 红线为零收益 · 山高各自归一化':'Asset colours · Red = zero return · Individually normalized heights','按住聚合为粒子球，松开回到真实收益分布。':'Hold to form a particle globe. Release to restore the real return distribution.','◉ 按住聚合':'◉ Hold to morph','真实收益坐标':'Real return coordinates','粒子变形中 · 暂不读取坐标':'Morphing · Coordinate reading paused','四资产收益山脊：横轴收益率，山高为各资产归一化分布，深度区分资产；方向键旋转，加减键缩放，Home复位':'Four-asset return ridges: return on x, individually normalized density on y, asset in depth. Arrow keys rotate, +/- zoom, Home resets.'});p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf8')
print('Updated ridge layout and morph controls')

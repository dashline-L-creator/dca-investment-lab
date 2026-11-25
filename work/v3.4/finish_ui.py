from pathlib import Path
import json,re
q=Path('work/v3.4');p=q/'template.html';s=p.read_text(encoding='utf8')
if 'study-dates' not in s:s=s.replace('选择四种资产一起比较。</p>','选择四种资产一起比较。</p><p class="tiny muted study-dates">起投截止 2021.10.31 · 估值覆盖至 2026.10.31</p>')
s=re.sub(r'(<div class="intro-mark" id="introMark">)<canvas class="identity-mark" aria-hidden="true"></canvas>\s*',r'\1<canvas class="identity-mark mark-ghost" aria-hidden="true"></canvas><canvas class="identity-mark mark-fill" aria-hidden="true"></canvas>',s)
# Pointer type affects the pointer effect only; touch devices still get the loading animation.
s=s.replace('@media(pointer:coarse),(prefers-reduced-motion:reduce){#softAura{display:none}.soft-magnet{translate:none!important}.brand-intro.is-playing .mark-fill{animation:none!important;clip-path:inset(0)}}','@media(pointer:coarse),(prefers-reduced-motion:reduce){#softAura{display:none}.soft-magnet{translate:none!important}}@media(prefers-reduced-motion:reduce){.brand-intro.is-playing .mark-fill{animation:none!important;clip-path:inset(0)}}')
assert s.count('class="identity-mark mark-fill"')==1
p.write_text(s,encoding='utf8')
p=q/'translations.json';d=json.loads(p.read_text(encoding='utf8'));d['起投截止 2021.10.31 · 估值覆盖至 2026.10.31']='Start cutoff 2021.10.31 · Valuation data through 2026.10.31';p.write_text(json.dumps(d,ensure_ascii=False),encoding='utf8')

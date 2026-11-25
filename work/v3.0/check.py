from pathlib import Path
import re,json
s=Path('work/v3.0/app.js').read_text(encoding='utf8');s=s[s.index('const dateIndex='):];print(sorted(set(re.findall(r'#[0-9a-fA-F]{3,8}',s))))
a=Path('outputs/v2.1/定投交互实验室_v2.1.html').read_text(encoding='utf8');b=Path('outputs/v3.0/定投交互实验室_v3.0.html').read_text(encoding='utf8');pat=r'<script id="dataset" type="application/json">(.*?)</script>';assert re.search(pat,a,re.S).group(1)==re.search(pat,b,re.S).group(1);print('Embedded data identical to v2.1.')

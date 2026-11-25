from pathlib import Path
import re,xml.etree.ElementTree as E
p=r'<script id="dataset" type="application/json">(.*?)</script>'
a=Path('outputs/v3.1/定投交互实验室_v3.1.html').read_text(encoding='utf8');b=Path('outputs/v3.2/定投交互实验室_v3.2.html').read_text(encoding='utf8');assert re.search(p,a,re.S).group(1)==re.search(p,b,re.S).group(1);s=E.fromstring(Path('outputs/v3.2/时间的复利_专属图标.svg').read_text(encoding='utf-8-sig'));assert len(s.findall('.//{http://www.w3.org/2000/svg}rect'))==6;print('Original vector valid; financial dataset unchanged.')

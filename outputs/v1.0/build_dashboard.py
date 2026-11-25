from pathlib import Path
import re
s=Path('work/dashboard.html').read_text(encoding='utf8').replace('__DATA__',Path('work/dashboard_data.json').read_text(encoding='utf8'))
Path('outputs/定投交互实验室.html').write_text(s,encoding='utf8')
Path('work/dashboard_check.js').write_text(re.findall(r'<script>(.*?)</script>',s,re.S)[0],encoding='utf8')
print('HTML bytes',len(s.encode()))

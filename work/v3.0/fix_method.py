from pathlib import Path
import re,json
p=Path('work/v3.0');f=p/'template.html';s=f.read_text(encoding='utf8');new='版本v1.0、v2.0及v2.1冻结保存；本版v3.0采用Neumorphism。Git记录源文件、数据和发布文件，并同步至私有GitHub仓库。';s,n=re.subn(r'<li>版本v[^<]*</li>','<li>'+new+'</li>',s);assert n==1;f.write_text(s,encoding='utf8');f=p/'translations.json';d=json.loads(f.read_text(encoding='utf8'));d[new]='Versions 1.0, 2.0 and 2.1 are archived. Version 3.0 introduces Neumorphism. Sources, data and releases are versioned in Git and synced to a private GitHub repository.';f.write_text(json.dumps(d,ensure_ascii=False),encoding='utf8')

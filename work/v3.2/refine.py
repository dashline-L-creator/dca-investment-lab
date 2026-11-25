from pathlib import Path
import json,re
p=Path('work/v3.2');f=p/'intro.js';s=f.read_text(encoding='utf-8-sig').replace('if(!playing||leaving)return;','if(!playing)return;if(leaving){if(immediate)close();return;}');f.write_text(s,encoding='utf8')
f=p/'template.html';s=f.read_text(encoding='utf8');new='旧版冻结保存；本版v3.2增加专属图标和开场过渡，保留全部样本和计算口径。';s=re.sub(r'<li>旧版冻结保存[^<]*</li>','<li>'+new+'</li>',s);f.write_text(s,encoding='utf8');f=p/'translations.json';d=json.loads(f.read_text(encoding='utf8'));d[new]='Earlier releases are archived. Version 3.2 adds an original brand icon and a short opening transition. All data and calculation rules are preserved.';f.write_text(json.dumps(d,ensure_ascii=False),encoding='utf8')

"""Package the current offline build with licenses and usage notes."""
from pathlib import Path
import json,zipfile,hashlib
from build import ROOT,build
build()
version=json.loads((ROOT/'project.json').read_text(encoding='utf8'))['app_version']
target=ROOT/'dist'/f'dca-lab-{version}.zip'
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
    archive.write(ROOT/'dist/index.html','index.html')
    for f in sorted((ROOT/'licenses').glob('*.txt')):archive.write(f,'licenses/'+f.name)
    archive.write(ROOT/'docs/使用与数据说明.txt','使用与数据说明.txt')
print(str(target.relative_to(ROOT)))
print('SHA256 '+hashlib.sha256(target.read_bytes()).hexdigest())

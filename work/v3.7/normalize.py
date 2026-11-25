from pathlib import Path
q=Path('work/v3.7')
for p in q.iterdir():
 if p.is_file() and p.suffix in ['.py','.js','.jsx','.mjs','.json','.html','.txt']:
  s=p.read_text(encoding='utf-8-sig');s='\n'.join(line.rstrip() for line in s.splitlines()).rstrip()+'\n';p.write_text(s,encoding='utf8')
exec(compile((q/'build.py').read_text(encoding='utf8'),'build','exec'))
exec(compile((q/'release.py').read_text(encoding='utf8'),'release','exec'))
print('Normalized release sources')

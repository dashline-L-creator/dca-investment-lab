from pathlib import Path
q=Path('work/v3.8')
p=q/'markets.js';s=p.read_text(encoding='utf8').replace("marketEscape(marketClock(a.quoteTime))","marketEscape(marketClock(a.quoteTime).replace('（北京时间）',LANG==='en'?' (Beijing)':'（北京时间）'))");p.write_text(s,encoding='utf8')
for p in q.iterdir():
 if p.is_file() and p.suffix in ['.py','.js','.jsx','.mjs','.json','.html','.txt']:
  s=p.read_text(encoding='utf-8-sig');p.write_text('\n'.join(line.rstrip() for line in s.splitlines()).rstrip()+'\n',encoding='utf8')
exec(compile((q/'build.py').read_text(encoding='utf8'),'build','exec'))
exec(compile((q/'release.py').read_text(encoding='utf8'),'release','exec'))

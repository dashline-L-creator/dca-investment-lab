from pathlib import Path
p=Path('work/v2/build.py');s=p.read_text(encoding='utf-8-sig');a=s.index('for name,family');b=s.index("s=s.replace('__DATA__'",a)
s=s[:a]+'''for name,family in [('NotoSansSC','Lab Sans'),('SpaceGrotesk','Lab Numbers')]:
 for weight in [400,600]:
  css+='@font-face{font-family:"'+family+'";font-style:normal;font-weight:'+str(weight)+';font-display:swap;src:url(data:font/woff2;base64,'+base64.b64encode((p/(name+'-'+str(weight)+'.woff2')).read_bytes()).decode()+') format("woff2");}'
'''+s[b:];p.write_text(s,encoding='utf8')

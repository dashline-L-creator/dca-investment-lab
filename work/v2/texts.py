from html.parser import HTMLParser
from pathlib import Path
import re
class P(HTMLParser):
 def __init__(self):super().__init__();self.tag=''
 def handle_starttag(self,t,a):self.tag=t
 def handle_data(self,s):
  if self.tag not in ['script','style'] and re.search('[\u4e00-\u9fff]',s):print(s.strip())
P().feed(Path('work/dashboard.html').read_text(encoding='utf8').split('<script')[0])

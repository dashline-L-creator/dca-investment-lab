from pathlib import Path
import math
from urllib.parse import quote
q=Path('work/v3.3.1');o=Path('outputs/v3.3.1')
anchors=[(-.19,.105),(-.145,.088),(-.095,.005),(-.045,.024),(.005,.039),(.065,-.055),(.115,-.08),(.175,-.155)]
curve=[]
for i in range(len(anchors)-1):
 a,b,c,d=anchors[max(0,i-1)],anchors[i],anchors[i+1],anchors[min(len(anchors)-1,i+2)]
 for j in range(12):
  t=j/12
  curve.append(tuple(.5*(2*b[k]+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t) for k in (0,1)))
curve.append(anchors[-1])
def distance(x,y,a,b):
 dx,dy=b[0]-a[0],b[1]-a[1]
 t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)))
 return math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)
def inside(x,y):
 r=math.hypot(x,y);a=math.atan2(y,x)
 if .315<r<.385 and not -.95<a<-.2:return True
 if any(distance(x,y,a,b)<.017 for a,b in zip(curve,curve[1:])):return True
 return any(distance(x,y,(v,t),(v,.17))<.015 for v,t in zip([-.18,-.10,-.02,.06,.14],[.133,.067,.094,0,-.052]))
parts=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><title>时间的复利 — 积累之环 A2</title><g fill="none" stroke="#5147a3" stroke-linecap="round">']
size=268.8;pitch=4;x=-size*.41
while x<=size*.41:
 y=-size*.41
 while y<=size*.41:
  hit=sum(inside(x/size+dx,y/size+dy) for dx,dy in [(0,0),(-.003,0),(.003,0),(0,-.004),(0,.004)])
  if hit:
   weight=[.8,1.4,2.1,2.9][min(3,int(hit/1.3))]
   parts.append(f'<path stroke-width="{weight}" d="M{128+x:.2f} {128+y-pitch*.365:.2f}v{pitch*.73:.2f}"/>')
  y+=pitch
 x+=pitch
svg=''.join(parts)+'</g></svg>'
(o/'时间的复利_A2收细圆环.svg').write_text(svg,encoding='utf8')
(q/'favicon.html').write_text('<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,'+quote(svg,safe='')+'">',encoding='utf8')
print('Exported A2 mark; ring thickness reduced from 0.110 to 0.070 (36%).')

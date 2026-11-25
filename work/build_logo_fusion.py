from pathlib import Path
import re

root = Path('outputs/logo-concepts')
text = (root / '四款Logo候选.html').read_text(encoding='utf-8-sig')
text = text.replace('四款Logo候选', 'Logo融合候选').replace('少一点元素，多一点识别。', '时间之环，加入增长的轨迹。').replace('四个独立方向 · 不绑定资产数量 · 量化竖线构成', 'A方向 × 3.2图标 · 两种融合程度 · 不绑定资产数量')
cards = []
for i, (name, english, desc) in enumerate([
    ('时间轨迹', 'TIME / GROWTH', '保留A的开口圆环，融入3.2的波动曲线。更适合小尺寸与开场过渡。'),
    ('积累之环', 'TIME / ACCUMULATION', '圆环中加入投入柱形与波动轨迹，让“持续投入”更有辨识度。'),
]):
    label = f'A{i+1}'
    cards.append(f'''<article class="card"><div class="meta"><span>{label} / {english}</span><span>0{i+1}</span></div><div class="canvas-wrap"><canvas data-logo="{i}" width="640" height="600" aria-label="{label} {name}"></canvas></div><div class="detail"><h2>{label} · {name}</h2><p>{desc}</p><div class="small"><canvas data-logo="{i}" width="96" height="96" style="width:48px;height:48px"></canvas><span class="wordmark">时间的复利</span><canvas data-logo="{i}" width="64" height="64" style="width:32px;height:32px"></canvas><span>32 PX</span></div></div></article>''')
text = re.sub(r'<section class="grid">.*?</section>', '<section class="grid">' + ''.join(cards) + '</section>', text, flags=re.S)
text = text.replace('.canvas-wrap{height:245px', '.canvas-wrap{height:300px').replace('width:280px;height:245px', 'width:320px;height:300px')
text = text.replace('ONE FORM / FOUR DISCRETE LINE WEIGHTS', 'OPEN RING / COMPOUNDING OVER TIME')
script = '''
function segment(x,y,a,b){let dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)}
// The same rising, fluctuating gesture as 3.2, fitted into the open ring.
const anchors=[[-.19,.105],[-.145,.088],[-.095,.005],[-.045,.024],[.005,.039],[.065,-.055],[.115,-.08],[.175,-.155]];
const curve=[];
for(let i=0;i<anchors.length-1;i++){
 let a=anchors[Math.max(0,i-1)],b=anchors[i],c=anchors[i+1],d=anchors[Math.min(anchors.length-1,i+2)];
 for(let j=0;j<12;j++){let t=j/12,t2=t*t,t3=t2*t;curve.push([0,1].map(k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3)))}
}curve.push(anchors.at(-1));
function inside(k,x,y){
 let r=Math.hypot(x,y),a=Math.atan2(y,x);
 if(r>.275&&r<.385&&!(a>-.95&&a<-.2))return 1;
 if(curve.slice(1).some((b,i)=>segment(x,y,curve[i],b)<(k===0?.022:.017)))return 2;
 if(k===1){let xs=[-.18,-.10,-.02,.06,.14],tops=[.133,.067,.094,.0,-.052];for(let i=0;i<xs.length;i++)if(segment(x,y,[xs[i],tops[i]],[xs[i],.17])<.015)return 3;}
 return 0;
}
function draw(c){let k=+c.dataset.logo,w=c.width/2,h=c.height/2,ctx=c.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,w,h);ctx.strokeStyle=document.body.classList.contains('dark')?'#fafaf8':'#202220';ctx.lineCap='round';let size=Math.min(w,h)*1.05,pitch=w>100?4:1.35,len=pitch*.73,weights=w>100?[.8,1.4,2.1,2.9]:[.35,.5,.7,.95];for(let px=w/2-size*.46;px<w/2+size*.46;px+=pitch)for(let py=h/2-size*.46;py<h/2+size*.46;py+=pitch){let x=(px-w/2)/size,y=(py-h/2)/size,coverage=0;for(let [dx,dy] of [[0,0],[-.003,0],[.003,0],[0,-.004],[0,.004]])if(inside(k,x+dx,y+dy))coverage++;if(!coverage)continue;ctx.lineWidth=weights[Math.min(3,Math.floor(coverage/1.3))];ctx.beginPath();ctx.moveTo(px,py-len/2);ctx.lineTo(px,py+len/2);ctx.stroke()}}
function render(){document.querySelectorAll('canvas').forEach(draw)}document.getElementById('theme').onclick=()=>{let d=document.body.classList.toggle('dark');document.getElementById('theme').textContent=d?'查看浅底效果':'查看反白效果';render()};render();
'''
text = re.sub(r'<script>.*?</script>', '<script>'+script+'</script>', text, flags=re.S)
(root / 'Logo融合候选.html').write_text(text, encoding='utf-8-sig')
print('Created logo fusion comparison.')

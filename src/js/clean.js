// Keep decision-critical facts visible; fold explanations into accessible notes.
(()=>{
 function group(elements){const items=elements.filter(e=>e&&e.isConnected);if(!items.length)return;const details=document.createElement('details');details.className='inline-notes';const summary=document.createElement('summary');summary.dataset.noteLabel='true';summary.textContent=LANG==='en'?'Chart notes':'图表说明';details.append(summary);const body=document.createElement('div');details.append(body);const first=items[0];first.parentNode.insertBefore(details,first);for(const e of items)body.append(e);}
 const growth=$('growthChart').closest('.panel');group([growth.querySelector('.chart-head p'),growth.querySelector(':scope>p.tiny')]);
 const cloud=$('cloudPanel');group([$('cloudCaption'),$('cloudTools').querySelector(':scope>span.tiny'),cloud.querySelector('.hist-bin-control>span.tiny'),$('cloudColorNote')]);
 const scanner=$('thresholdSlider').closest('.panel');group([scanner.querySelector('.chart-head p'),scanner.querySelector('.footnote')]);
 for(const e of [...document.querySelectorAll('.panel>.footnote')])if(!e.closest('details'))group([e]);
 const stats=$('statsTable').closest('.panel');group([stats.querySelector(':scope>p.tiny')]);
 const release=document.createElement('span');release.className='release-badge';release.textContent='v3.11.0';document.querySelector('header .brand').append(release);
 function cardDetails(){for(const card of $('cards').children){let details=card.querySelector('.card-details');if(!details){details=document.createElement('details');details.className='card-details';card.append(details)}const opened=details.open,code=card.querySelector(':scope>.code'),note=card.querySelector(':scope>.tiny');details.innerHTML='<summary>'+(LANG==='en'?'Details':'详情')+'</summary><div>'+(code?.outerHTML||'')+(note?.outerHTML||'')+'</div>';details.open=opened}}
 window.refreshCardDetails=cardDetails;
 new MutationObserver(cardDetails).observe($('cards'),{childList:true});cardDetails();
 new MutationObserver(()=>{document.querySelectorAll('[data-note-label]').forEach(e=>e.textContent=LANG==='en'?'Chart notes':'图表说明');cardDetails()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 // Repaint after fonts resolve: browser fallback metrics must not survive a late font load.
 document.fonts.ready.then(()=>{if(view==='explore')drawGrowth();if(view==='distribution')drawDistribution()});
})();

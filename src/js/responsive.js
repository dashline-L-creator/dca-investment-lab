// Compact controls only; all research results remain available on every width.
(()=>{const picker=$('assetPicker'),toggle=$('assetPickerToggle'),small=matchMedia('(max-width:1199px)');let opened=false;
function render(){toggle.innerHTML='<strong>'+(LANG==='en'?'Compare assets · choose 4 of 7':'对比资产 · 七选四')+'</strong><span>'+(LANG==='en'?'Edit selection':'展开选择资产')+'</span>';toggle.setAttribute('aria-expanded',String(opened));picker.classList.toggle('picker-open',opened);$('assetPickerBody').inert=small.matches&&!opened;}
toggle.addEventListener('click',()=>{opened=!opened;render()});small.addEventListener('change',render);new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});render();})();

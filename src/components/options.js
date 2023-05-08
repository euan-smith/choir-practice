
function parse(s){
  return s && s.slice(1).split('&').map(s=>s.split('=')).reduce((o,d)=>Object.assign(o,{[d[0]]:d[1]}),{});
}

export const search = parse(window.location.search);
export const hash = parse(window.location.hash);

if (hash) window.location.hash='';

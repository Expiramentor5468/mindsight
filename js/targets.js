// Shared geometry for practice and exported offline replays. No user HTML enters SVG.
export function shapeSVG(target){
 const colors={black:'#171717',red:'#e14640',blue:'#3076dc',yellow:'#f4cb38',green:'#359b68'};
 const shape=target.shape||target.answer,color=colors[target.color]||colors.black;
 const geometry={circle:'<circle cx="50" cy="50" r="43"/>',square:'<rect x="8" y="8" width="84" height="84"/>',triangle:'<polygon points="50,7 94,91 6,91"/>',star:'<polygon points="50,5 61,36 94,36 68,56 78,89 50,70 22,89 32,56 6,36 39,36"/>',horizontal:'<path d="M5 50H95"/>',vertical:'<path d="M50 5V95"/>'}[shape]||'';
 const line=['horizontal','vertical'].includes(shape);
 return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" fill="'+(target.style==='outline'||line?'none':color)+'" stroke="'+color+'" stroke-width="'+(line?'8':'5')+'" stroke-linejoin="round">'+geometry+'</svg>';
}

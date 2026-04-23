import{u as A,r as y,j as x,a as F,M as D,T as H,P,b as X,C as Y,L as R,c as G,d as K}from"./index-DE2gkFum.js";function z(t,e){const d=e[0]-t[0],n=e[1]-t[1];return Math.sqrt(d*d+n*n)}function W(t){const e={},d={},r=o=>Math.round(o/5e-4)*5e-4,l=(o,c)=>`${r(o)},${r(c)}`;for(const o of t){if(o.geometry.type!=="LineString"&&o.geometry.type!=="MultiLineString")continue;const c=o.geometry.type==="MultiLineString"?o.geometry.coordinates:[o.geometry.coordinates];for(const s of c)if(!(s.length<2))for(let i=0;i<s.length;i++){const a=l(s[i][1],s[i][0]);if(d[a]||(d[a]=[s[i][1],s[i][0]]),e[a]||(e[a]=[]),i>0){const u=l(s[i-1][1],s[i-1][0]);e[a].includes(u)||e[a].push(u)}if(i<s.length-1){const u=l(s[i+1][1],s[i+1][0]);e[a].includes(u)||e[a].push(u)}}}return{neighbors:e,nodeCoords:d}}function q(t,e,d){let n=null,r=1/0;const l=Object.keys(e.neighbors);for(const o of l){const c=e.nodeCoords[o];if(!c)continue;const s=z(t,c);s<r&&s<d&&(r=s,n=o)}return n}function Q(t,e,d,n,r=5e3){if(e===d)return[];const l=t.nodeCoords[e];if(!l)return[];const o={[e]:0},c={};c[e]=z(l,n);const s={},i=[e],a={};let u=0;for(;i.length>0&&u<r;){i.sort((p,C)=>(c[p]||1/0)-(c[C]||1/0));const h=i.shift();if(u++,h===d){const p=[h];let C=h;for(;s[C];)C=s[C],p.unshift(C);return p.map($=>t.nodeCoords[$]).filter($=>$!==void 0)}a[h]=!0;const w=t.neighbors[h];if(!w)continue;const L=t.nodeCoords[h];for(const p of w){if(a[p])continue;const C=t.nodeCoords[p];if(!C)continue;const $=L?z(L,C):.001,v=(o[h]||0)+$;v<(o[p]||1/0)&&(s[p]=h,o[p]=v,c[p]=v+z(C,n),i.includes(p)||i.push(p))}}return[]}function U(t,e){if(t.length<2||e.length===0)return t.map(l=>[l.lat,l.lng]);const d=W(e),n=[],r=.05;for(let l=0;l<t.length-1;l++){const o=[t[l].lat,t[l].lng],c=[t[l+1].lat,t[l+1].lng],s=q(o,d,r),i=q(c,d,r);if(s&&i&&s!==i){const a=Q(d,s,i,c,15e3);a.length>0?(n.length===0&&n.push(o),n.push(...a),n.push(c)):(n.length===0&&n.push(o),n.push(c))}else n.length===0&&n.push(o),n.push(c)}return n}function V(t,e){if(t.length<2)return t.map(()=>"bottom");const d=[];for(let n=0;n<t.length;n++){const r=t[n],l=[r.lat,r.lng];let o=-1,c=1/0;for(let a=0;a<e.length-1;a++){const u=e[a],h=e[a+1],w=(u[0]+h[0])/2,L=(u[1]+h[1])/2,p=Math.sqrt(Math.pow(l[0]-w,2)+Math.pow(l[1]-L,2));p<c&&(c=p,o=a)}let s="bottom";if(o!==-1&&e.length>=2){const a=e[o],u=e[Math.min(o+1,e.length-1)],h=u[1]-a[1],w=u[0]-a[0],L=Math.abs(h),p=Math.abs(w);L>p?s=w>0?"bottom":"top":s=h>0?"left":"right"}let i=s;if(n>0){const a=t[n-1],u=d[n-1],h=Math.abs(r.lat-a.lat),w=Math.abs(r.lng-a.lng);h<.05&&w<.05&&u===s&&(i={top:"bottom",bottom:"top",left:"right",right:"left"}[s])}d.push(i)}return d}function _(t,e,d="bottom"){let n="#f97316",r=10;t.type==="start"?(n="#22c55e",r=12):t.type==="end"&&(n="#ef4444",r=12);const l=e?"#f3f4f6":"#1f2937",o=e?"rgba(30, 41, 59, 0.85)":"rgba(255, 255, 255, 0.9)",c=e?"rgba(71, 85, 105, 0.5)":"rgba(203, 213, 225, 0.8)",s=e?"0 2px 8px rgba(0, 0, 0, 0.3)":"0 2px 8px rgba(0, 0, 0, 0.1)",i=e?"rgba(30, 41, 59, 0.85)":"rgba(255, 255, 255, 0.9)";let a="",u="";switch(d){case"top":a=`
        bottom: ${r+8}px;
        left: 50%;
        transform: translateX(-50%);
      `,u=`
        position: absolute;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 5px solid ${i};
      `;break;case"left":a=`
        right: ${r+8}px;
        top: 50%;
        transform: translateY(-50%);
      `,u=`
        position: absolute;
        right: -5px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-top: 5px solid transparent;
        border-bottom: 5px solid transparent;
        border-left: 5px solid ${i};
      `;break;case"right":a=`
        left: ${r+8}px;
        top: 50%;
        transform: translateY(-50%);
      `,u=`
        position: absolute;
        left: -5px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-top: 5px solid transparent;
        border-bottom: 5px solid transparent;
        border-right: 5px solid ${i};
      `;break;case"bottom":default:a=`
        top: ${r+8}px;
        left: 50%;
        transform: translateX(-50%);
      `,u=`
        position: absolute;
        top: -5px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-bottom: 5px solid ${i};
      `;break}return R.divIcon({className:"",html:`
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          width: ${r}px;
          height: ${r}px;
          background-color: ${n};
          border: 2px solid ${e?"#1e293b":"#ffffff"};
          border-radius: 50%;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        "></div>
        <div style="
          position: absolute;
          ${a}
          white-space: nowrap;
          padding: 3px 8px;
          background: ${o};
          -webkit-backdrop-filter: blur(12px);
          backdrop-filter: blur(12px);
          border: 1px solid ${c};
          border-radius: 8px;
          font-size: 10px;
          font-weight: 600;
          color: ${l};
          box-shadow: ${s};
          z-index: 1000;
        ">
          <div style="${u}"></div>
          ${t.name}
        </div>
      </div>
    `,iconSize:[r,r],iconAnchor:[r/2,r/2]})}function J(){const t=G(),e=y.useRef(null);return y.useEffect(()=>{const d=t.getContainer();e.current=d;const n=()=>{t.invalidateSize()};setTimeout(n,100),setTimeout(n,300),setTimeout(n,500);const r=new ResizeObserver(()=>{n()});return r.observe(d),()=>{r.disconnect()}},[t]),null}function tt({stations:t,recenterTrigger:e,isProgrammaticRef:d}){const n=G(),r=y.useRef(!1),l=y.useRef(0);return y.useEffect(()=>{if(t.length>0&&!r.current){d.current=!0;const o=R.latLngBounds(t.map(c=>[c.lat,c.lng]));n.fitBounds(o,{padding:[30,30],maxZoom:12}),r.current=!0,setTimeout(()=>{n.invalidateSize()},100)}},[t,n]),y.useEffect(()=>{if(e>0&&e!==l.current&&t.length>0){l.current=e,d.current=!0;const o=R.latLngBounds(t.map(c=>[c.lat,c.lng]));n.fitBounds(o,{padding:[30,30],maxZoom:12,animate:!0})}},[e,t,n]),null}function et({onMoved:t,isProgrammaticRef:e}){return K({dragstart:()=>{t(!0)},zoomstart:()=>{e.current||t(!0)},zoomend:()=>{e.current=!1},moveend:()=>{e.current=!1}}),null}function ot({legs:t,compact:e=!1,embedded:d=!1,intermediateStops:n}){const{theme:r}=A(),l=r==="dark",o=e?"h-[150px]":"h-[200px]",[c,s]=y.useState(!1),[i,a]=y.useState(0),[u,h]=y.useState(!1);y.useRef(null);const w=y.useRef(!0);if(y.useEffect(()=>{const g=setTimeout(()=>{h(!0)},50);return()=>clearTimeout(g)},[]),!t||t.length===0)return x.jsx("div",{className:`${o} rounded-lg border bg-muted/50 flex items-center justify-center text-muted-foreground text-sm`,children:"Geen routegegevens beschikbaar"});const L=()=>{w.current=!0,s(!1),a(g=>g+1)},{data:p,isLoading:C}=F({queryKey:["/api/stations"],queryFn:async()=>{const g=await fetch("/api/stations");if(!g.ok)throw new Error("Failed to fetch stations");return g.json()},staleTime:36e5,gcTime:36e5}),{data:$}=F({queryKey:["/api/spoorkaart"],queryFn:async()=>{const g=await fetch("/api/spoorkaart");if(!g.ok)throw new Error("Failed to fetch railway tracks");return g.json()},staleTime:864e5,gcTime:864e5}),v=y.useMemo(()=>{const g=[],k=(p==null?void 0:p.payload)||[],j=m=>{const f=k.find(M=>{var b,T,N,I,E,B;return((T=(b=M.namen)==null?void 0:b.lang)==null?void 0:T.toLowerCase())===m.toLowerCase()||((I=(N=M.namen)==null?void 0:N.middel)==null?void 0:I.toLowerCase())===m.toLowerCase()||((B=(E=M.namen)==null?void 0:E.kort)==null?void 0:B.toLowerCase())===m.toLowerCase()});return f!=null&&f.lat&&(f!=null&&f.lng)?{lat:f.lat,lng:f.lng}:null};if(n&&n.length>=2){for(let m=0;m<n.length;m++){const f=n[m],M=f.lat&&f.lng?{lat:f.lat,lng:f.lng}:j(f.name);if(M){let b="transfer";m===0?b="start":m===n.length-1&&(b="end"),g.push({name:f.name,lat:M.lat,lng:M.lng,type:b})}}return g}for(let m=0;m<t.length;m++){const f=t[m];if(m===0){const b=f.fromLat&&f.fromLng?{lat:f.fromLat,lng:f.fromLng}:j(f.from);b&&g.push({name:f.from,lat:b.lat,lng:b.lng,type:"start"})}const M=f.toLat&&f.toLng?{lat:f.toLat,lng:f.toLng}:j(f.to);if(M&&!g.some(b=>b.name===f.to)){const b=m===t.length-1;g.push({name:f.to,lat:M.lat,lng:M.lng,type:b?"end":"transfer"})}}return g},[t,p,n]),S=y.useMemo(()=>{var j;const g=((j=$==null?void 0:$.payload)==null?void 0:j.features)||[];if(v.length<2)return[];const k=v.map(m=>({lat:m.lat,lng:m.lng}));return U(k,g)},[v,$]);if(!u||C)return x.jsx("div",{className:`${o} rounded-lg border bg-muted/50 flex items-center justify-center text-muted-foreground text-sm`,children:"Kaart laden..."});if(v.length<2)return x.jsx("div",{className:`${o} rounded-lg border bg-muted/50 flex items-center justify-center text-muted-foreground text-sm`,children:"Geen routegegevens beschikbaar"});const O=l?"https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png":"https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",Z=d?`${o} overflow-hidden relative`:`${o} rounded-lg overflow-hidden border relative`;return x.jsxs("div",{className:Z,style:{zIndex:0,isolation:"isolate"},"data-testid":"map-trip-route","data-vaul-no-drag":!0,children:[x.jsxs(D,{center:[v[0].lat,v[0].lng],zoom:10,className:"h-full w-full",style:{background:l?"#1a1a2e":"#e8e8e8",minHeight:e?"150px":"200px",touchAction:"pan-x pan-y"},zoomControl:!1,attributionControl:!1,dragging:!0,touchZoom:!0,scrollWheelZoom:!1,children:[x.jsx(H,{url:O,maxZoom:19}),x.jsx(J,{}),x.jsx(tt,{stations:v,recenterTrigger:i,isProgrammaticRef:w}),x.jsx(et,{onMoved:s,isProgrammaticRef:w}),S.length>1&&x.jsx(P,{positions:S,pathOptions:{color:l?"#60a5fa":"#2563eb",weight:4,opacity:.9}}),(()=>{const g=V(v,S);return v.map((k,j)=>x.jsx(X,{position:[k.lat,k.lng],icon:_(k,l,g[j]||"bottom"),zIndexOffset:k.type==="start"?100:k.type==="end"?90:80},`${k.name}-${j}`))})()]}),c&&x.jsxs("button",{className:"absolute bottom-3 right-3 z-[1000] rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-2 hover:opacity-90 transition-opacity",style:{backgroundColor:l?"rgba(17, 24, 39, 0.7)":"rgba(255, 255, 255, 0.7)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)"},onClick:L,"data-testid":"button-recenter-route-map",children:[x.jsx(Y,{className:"w-4 h-4 text-primary"}),x.jsx("span",{className:"font-semibold text-sm",children:"Centreren"})]})]})}export{ot as default};

export const PLAYER_CSS = `
:root{--bg:#070A0D;--grid:#0C1116;--glass:rgba(14,19,24,.86);--glass2:rgba(20,27,34,.95);
--line:rgba(120,140,160,.18);--line2:rgba(120,140,160,.34);--text:#D4DCE4;--muted:#7B8996;--rec:#FF4D5E;--lock:#38E1A0;--amber:#F0C368;
--mono:ui-monospace,"JetBrains Mono",Menlo,Consolas,monospace;--ui:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;overflow:hidden;background:var(--bg);color:var(--text);font-family:var(--ui)}
#stage{position:fixed;inset:0;display:grid;grid-template-columns:minmax(280px,1fr) 1fr;grid-template-rows:minmax(200px,40%) 1fr;gap:9px;padding:9px}
.panel{position:relative;background:var(--grid);border:1px solid var(--line2);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;min-width:0;min-height:0;box-shadow:0 10px 30px rgba(0,0,0,.35)}
#p-params{grid-column:1;grid-row:1}#p-video{grid-column:2;grid-row:1}#p-map{grid-column:1 / 3;grid-row:2}
.panel.expanded{position:fixed!important;inset:9px!important;z-index:900!important;grid-column:auto;grid-row:auto}
.panel.floating{position:fixed!important;z-index:800!important;width:360px;height:280px;grid-column:auto;grid-row:auto;box-shadow:0 24px 60px rgba(0,0,0,.6)}
.phead{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:8px 11px;background:var(--glass2);border-bottom:1px solid var(--line);user-select:none}
.phead .pt{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.phead .tag{font-family:var(--mono);font-size:9.5px;color:var(--lock);letter-spacing:.05em}
.pbtns{display:flex;gap:5px;flex:0 0 auto}
.ib{width:24px;height:24px;border:none;border-radius:6px;background:rgba(120,140,160,.12);color:var(--text);cursor:pointer;font-size:12px;line-height:1;display:flex;align-items:center;justify-content:center}
.ib:hover{background:rgba(120,140,160,.26)}.ib.on{background:rgba(56,225,160,.18);color:var(--lock)}
.pbody{flex:1;min-height:0;position:relative;overflow:auto}
.panel.floating .phead{cursor:grab}.panel.floating .phead:active{cursor:grabbing}
.grip{display:none;position:absolute;right:2px;bottom:2px;width:16px;height:16px;cursor:nwse-resize;z-index:6;background:linear-gradient(135deg,transparent 50%,var(--line2) 50%,var(--line2) 60%,transparent 60%,transparent 72%,var(--line2) 72%,var(--line2) 82%,transparent 82%)}
.panel.floating .grip{display:block}
.projmeta{padding:9px 12px;border-bottom:1px solid var(--line);background:rgba(10,14,18,.5)}
.projmeta .mt{font-size:12px;font-weight:600;color:var(--text)}.projmeta .md{font-family:var(--mono);font-size:10px;color:var(--muted);margin-top:3px}
.loaders{display:flex;flex-wrap:wrap;gap:6px;padding:10px 11px;border-bottom:1px solid var(--line)}
.fbtn{position:relative;overflow:hidden;background:var(--glass);border:1px solid var(--line2);border-radius:8px;color:var(--text);font-size:11px;font-weight:500;padding:7px 11px;cursor:pointer;display:flex;align-items:center;gap:6px}
.fbtn.ok{border-color:var(--lock);color:var(--lock)}.fbtn .dm{width:6px;height:6px;border-radius:50%;background:var(--muted)}.fbtn.ok .dm{background:var(--lock);box-shadow:0 0 8px var(--lock)}
.fbtn input{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0}
.tgrid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line)}
.g{background:rgba(10,14,18,.72);padding:9px 12px}.g.wide{grid-column:1/3}
.g .k{font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}.g .v{font-family:var(--mono);font-size:15px;margin-top:3px}.g .v.big{font-size:17px}
.compass{display:flex;align-items:center;gap:14px;background:rgba(10,14,18,.72);padding:12px 13px;border-top:1px solid var(--line)}
.rose{width:48px;height:48px;border-radius:50%;border:1px solid var(--line2);position:relative;flex:0 0 auto;background:radial-gradient(circle,rgba(56,225,160,.07),transparent 70%)}
.rose .n{position:absolute;top:3px;left:50%;transform:translateX(-50%);font-size:8px;color:var(--muted)}
.rose .ar{position:absolute;left:50%;top:50%;width:0;height:0;transform-origin:center;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:21px solid var(--rec);margin:-17px 0 0 -5px;filter:drop-shadow(0 0 4px rgba(255,77,94,.6));transition:transform .2s}
.compass .ci .k{font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}.compass .ci .v{font-family:var(--mono);font-size:17px;margin-top:2px}
#vbody{background:#000}
#vbody video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;touch-action:none;display:block}
.novid{position:absolute;inset:0;display:flex;flex-direction:column;gap:5px;align-items:center;justify-content:center;color:var(--muted);font-size:12px;text-align:center;padding:16px}.novid b{color:var(--text)}
.scrubhint{position:absolute;left:0;right:0;bottom:8px;text-align:center;font-size:10px;color:rgba(255,255,255,.55);pointer-events:none;text-shadow:0 1px 3px #000;transition:opacity .4s}
.vfoot{flex:0 0 auto;display:flex;align-items:center;gap:9px;padding:8px 11px;background:var(--glass2);border-top:1px solid var(--line)}
.play{width:32px;height:32px;border:none;border-radius:50%;background:var(--rec);color:#fff;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 14px rgba(255,77,94,.4);flex:0 0 auto}
.rng{flex:1;accent-color:var(--rec);cursor:pointer}.tc{font-family:var(--mono);font-size:10.5px;color:var(--muted);white-space:nowrap}
#map{position:absolute;inset:0;background:#070A0D}
.leaflet-container{background:#070A0D;font-family:var(--ui)}
.leaflet-control-attribution{background:rgba(7,10,13,.6)!important;color:#5a6670!important}.leaflet-control-attribution a{color:#7B8996!important}
.transport{position:absolute;left:12px;right:12px;bottom:12px;z-index:500;display:flex;align-items:center;gap:12px;background:var(--glass2);border:1px solid var(--line);border-radius:12px;padding:9px 13px;backdrop-filter:blur(10px)}
.transport .bp{width:38px;height:38px;border:none;border-radius:50%;background:var(--rec);color:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 18px rgba(255,77,94,.45);flex:0 0 auto}
.transport .tw{flex:1;display:flex;flex-direction:column;gap:4px}.transport .tw .rng{width:100%;height:20px}
.transport .tw .lb{display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px;color:var(--muted)}
.basemap-sel{background:var(--glass);border:1px solid var(--line2);color:var(--text);border-radius:7px;padding:5px 8px;font-size:11px;cursor:pointer}
.banner{position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:950;background:var(--glass2);border:1px solid var(--amber);color:var(--amber);font-size:12px;padding:8px 15px;border-radius:10px;display:none;backdrop-filter:blur(10px);box-shadow:0 8px 30px rgba(0,0,0,.5)}
@media(max-width:640px){#stage{grid-template-columns:1fr;grid-template-rows:auto auto 1fr}#p-params{grid-column:1;grid-row:1}#p-video{grid-column:1;grid-row:2}#p-map{grid-column:1;grid-row:3}}
`;

export const PLAYER_BODY = `
<div id="stage">
  <section class="panel" id="p-params">
    <div class="phead" data-drag><span class="pt">Parameters</span><span class="tag" id="rIdx">&mdash;</span>
      <div class="pbtns"><button class="ib" data-float title="Float">&#9635;</button><button class="ib" data-expand title="Expand">&#9974;</button></div></div>
    <div class="pbody">
      <div class="projmeta" id="projmeta" style="display:none"><div class="mt" id="pmTitle"></div><div class="md" id="pmMeta"></div></div>
      <div class="loaders" id="loaders">
        <label class="fbtn" id="lbVid"><span class="dm"></span>Video<input type="file" id="fVid" accept="video/*"></label>
        <label class="fbtn" id="lbTrk"><span class="dm"></span>.json<input type="file" id="fTrk" accept=".json,application/json"></label>
        <label class="fbtn" id="lbGpx"><span class="dm"></span>.gpx<input type="file" id="fGpx" accept=".gpx,application/gpx+xml,text/xml"></label>
      </div>
      <div class="tgrid">
        <div class="g wide"><div class="k">Latitude</div><div class="v big" id="rLat">&mdash;</div></div>
        <div class="g wide"><div class="k">Longitude</div><div class="v big" id="rLon">&mdash;</div></div>
        <div class="g"><div class="k">Accuracy</div><div class="v" id="rAcc">&mdash;</div></div>
        <div class="g"><div class="k">Altitude</div><div class="v" id="rAlt">&mdash;</div></div>
        <div class="g"><div class="k">Speed</div><div class="v" id="rSpd">&mdash;</div></div>
        <div class="g"><div class="k">Elapsed</div><div class="v" id="rEl">&mdash;</div></div>
      </div>
      <div class="compass"><div class="rose"><span class="n">N</span><div class="ar" id="rose"></div></div>
        <div class="ci"><div class="k">Heading</div><div class="v" id="rHead">&mdash;</div></div></div>
    </div><div class="grip" data-grip></div>
  </section>
  <section class="panel" id="p-video">
    <div class="phead" data-drag><span class="pt" id="vttl">Video</span><span class="tag" id="vlive" style="display:none">SYNC</span>
      <div class="pbtns"><button class="ib" data-opacity title="Opacity">&#9686;</button><button class="ib" data-float title="Float">&#9635;</button><button class="ib" data-expand title="Expand">&#9974;</button></div></div>
    <div class="pbody" id="vbody"><video id="vid" playsinline></video>
      <div class="novid" id="novid"><div>No video</div></div>
      <div class="scrubhint" id="scrubhint" style="display:none">drag across video to scrub</div></div>
    <div class="vfoot"><button class="play" id="miniPlay">&#9654;</button>
      <input type="range" class="rng" id="miniSeek" min="0" max="1000" value="0"><span class="tc" id="miniTc">0.0/0.0</span></div>
    <div class="grip" data-grip></div>
  </section>
  <section class="panel" id="p-map">
    <div class="phead" data-drag><span class="pt">Satellite</span>
      <div class="pbtns"><select class="basemap-sel" id="base"><option value="sat">Satellite</option><option value="topo">Topographic</option><option value="street">Street</option></select>
        <button class="ib" data-float title="Float">&#9635;</button><button class="ib" data-expand title="Expand">&#9974;</button></div></div>
    <div class="pbody"><div id="map"></div>
      <div class="transport"><button class="bp" id="bigPlay">&#9654;</button>
        <div class="tw"><input type="range" class="rng" id="seek" min="0" max="1000" value="0">
          <div class="lb"><span id="tCur">0.0 s</span><span id="tStatus" style="color:var(--lock)">no track</span><span id="tTot">0.0 s</span></div></div></div></div>
    <div class="grip" data-grip></div>
  </section>
</div>
<div class="banner" id="banner"></div>
`;

export const PLAYER_JS = `
(function(){"use strict";
var $=function(id){return document.getElementById(id);};var vid=$("vid");
var pts=[],meta=null,map,layers={},trackLine,doneLine,marker,hasVid=false;var CFG=window.VIDEOGIS_PROJECT||null;
function toast(m){var e=$("banner");e.textContent=m;e.style.display="block";clearTimeout(e._t);e._t=setTimeout(function(){e.style.display="none";},3600);}
var bases={sat:{url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",attr:"Esri World Imagery"},topo:{url:"https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",attr:"OpenTopoMap"},street:{url:"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",attr:"OpenStreetMap"}};
function initMap(){map=L.map("map",{zoomControl:true,attributionControl:true}).setView([19.69,80.46],13);setBase("sat");$("base").onchange=function(e){setBase(e.target.value);};$("base").addEventListener("click",function(e){e.stopPropagation();});}
function setBase(k){if(layers.base)map.removeLayer(layers.base);layers.base=L.tileLayer(bases[k].url,{maxZoom:19,attribution:bases[k].attr}).addTo(map);if(layers.base.bringToBack)layers.base.bringToBack();}
function useJson(t){var p=(t.points||[]).slice().sort(function(a,b){return a.t-b.t;});if(!p.length){toast("No points in JSON.");return;}pts=p;meta=t;if($("lbTrk"))$("lbTrk").classList.add("ok");$("tStatus").textContent="JSON \\\\u00b7 "+p.length+" fixes";drawTrack();}
function useGpx(text){var p=parseGpx(text);if(!p.length){toast("No trkpt points in GPX.");return;}if($("lbGpx"))$("lbGpx").classList.add("ok");if(pts.length&&meta&&meta.points){toast("JSON drives sync; GPX kept as reference.");return;}pts=p;meta={durationSec:p[p.length-1].t};$("tStatus").textContent="GPX \\\\u00b7 "+p.length+" fixes";drawTrack();}
function parseGpx(text){var doc;try{doc=new DOMParser().parseFromString(text,"application/xml");}catch(e){return[];}if(doc.querySelector("parsererror")){toast("GPX parse error.");return[];}var nodes=Array.prototype.slice.call(doc.getElementsByTagName("trkpt")),raw=[];for(var i=0;i<nodes.length;i++){var n=nodes[i],lat=parseFloat(n.getAttribute("lat")),lon=parseFloat(n.getAttribute("lon"));if(isNaN(lat)||isNaN(lon))continue;var e=n.getElementsByTagName("ele")[0],tm=n.getElementsByTagName("time")[0];raw.push({lat:lat,lon:lon,alt:e?parseFloat(e.textContent):null,ms:tm?Date.parse(tm.textContent):null});}if(!raw.length)return[];var have=raw[0].ms!=null&&!isNaN(raw[0].ms),t0=have?raw[0].ms:0;return raw.map(function(p,i){return{t:(have&&p.ms!=null)?+(((p.ms-t0)/1000).toFixed(3)):i,lat:p.lat,lon:p.lon,alt:p.alt,acc:null,spd:null,head:null};});}
function drawTrack(){if(trackLine)map.removeLayer(trackLine);if(doneLine)map.removeLayer(doneLine);if(marker)map.removeLayer(marker);var ll=pts.map(function(p){return[p.lat,p.lon];});trackLine=L.polyline(ll,{color:"#FF4D5E",weight:3.5,opacity:.75}).addTo(map);doneLine=L.polyline([],{color:"#38E1A0",weight:5,opacity:.95}).addTo(map);marker=L.marker(ll[0],{icon:L.divIcon({className:"",html:'<div style="width:16px;height:16px;border-radius:50%;background:#FF4D5E;border:2px solid #fff;box-shadow:0 0 0 5px rgba(255,77,94,.28),0 0 14px rgba(255,77,94,.6)"></div>',iconSize:[16,16],iconAnchor:[8,8]})}).addTo(map);map.fitBounds(trackLine.getBounds(),{padding:[50,50]});trackLine.on("click",function(e){seekToLatLng(e.latlng);});map.on("click",function(e){seekToLatLng(e.latlng);});updateAt(0);drive(0);}
function wireLoaders(){$("fTrk").onchange=function(ev){var f=ev.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(){var t;try{t=JSON.parse(r.result);}catch(e){toast("Bad JSON");return;}useJson(t);};r.readAsText(f);};$("fGpx").onchange=function(ev){var f=ev.target.files[0];if(!f)return;var r=new FileReader();r.onload=function(){useGpx(r.result);};r.readAsText(f);};$("fVid").onchange=function(ev){var f=ev.target.files[0];if(!f)return;loadVideo(URL.createObjectURL(f),f.name);};}
function loadVideo(url,name){vid.src=url;$("novid").style.display="none";$("scrubhint").style.display="block";if($("lbVid"))$("lbVid").classList.add("ok");$("vlive").style.display="inline";$("vttl").textContent=name||"Video";hasVid=true;setTimeout(function(){$("scrubhint").style.opacity="0";},3000);}
function autoLoad(){if($("loaders"))$("loaders").style.display="none";if(CFG.title||CFG.date||CFG.time){$("projmeta").style.display="block";$("pmTitle").textContent=CFG.title||"";var md=[];if(CFG.date)md.push(CFG.date);if(CFG.time)md.push(CFG.time);$("pmMeta").textContent=md.join("  \\\\u00b7  ");}if(CFG.video)loadVideo(CFG.video,CFG.title||"Video");if(CFG.jsonData)useJson(CFG.jsonData);else if(CFG.json)fetch(CFG.json).then(function(r){return r.json();}).then(useJson).catch(function(){toast("Could not load JSON.");});if(!CFG.jsonData){if(CFG.gpxData)useGpx(CFG.gpxData);else if(CFG.gpx)fetch(CFG.gpx).then(function(r){return r.text();}).then(useGpx).catch(function(){});}}
function total(){if(hasVid&&vid.duration&&isFinite(vid.duration))return vid.duration;if(meta&&meta.durationSec)return meta.durationSec;return pts.length?pts[pts.length-1].t:1;}
function lower(t){var lo=0,hi=pts.length-1,a=0;while(lo<=hi){var m=(lo+hi)>>1;if(pts[m].t<=t){a=m;lo=m+1;}else hi=m-1;}return a;}
function interp(t){if(!pts.length)return null;if(t<=pts[0].t)return mix(pts[0],0);var L2=pts[pts.length-1];if(t>=L2.t)return mix(L2,pts.length-1);var i=lower(t),a=pts[i],b=pts[Math.min(i+1,pts.length-1)],sp=(b.t-a.t)||1,f=(t-a.t)/sp;return{lat:a.lat+(b.lat-a.lat)*f,lon:a.lon+(b.lon-a.lon)*f,acc:a.acc,alt:a.alt,spd:a.spd,head:a.head,idx:i};}
function mix(p,i){return{lat:p.lat,lon:p.lon,acc:p.acc,alt:p.alt,spd:p.spd,head:p.head,idx:i};}
function updateAt(t){if(!pts.length)return;var p=interp(t);if(!p)return;marker.setLatLng([p.lat,p.lon]);var up=[];for(var i=0;i<=p.idx;i++)up.push([pts[i].lat,pts[i].lon]);up.push([p.lat,p.lon]);doneLine.setLatLngs(up);$("rLat").textContent=p.lat.toFixed(6);$("rLon").textContent=p.lon.toFixed(6);$("rAcc").textContent=(p.acc!=null?p.acc.toFixed(1)+" m":"\\\\u2014");$("rAlt").textContent=(p.alt!=null?p.alt.toFixed(0)+" m":"\\\\u2014");$("rSpd").textContent=(p.spd!=null?(p.spd*3.6).toFixed(1)+" km/h":"\\\\u2014");$("rEl").textContent=t.toFixed(1)+" s";$("rHead").textContent=(p.head!=null?p.head.toFixed(0)+"\\\\u00b0":"\\\\u2014");if(p.head!=null)$("rose").style.transform="rotate("+p.head+"deg)";$("rIdx").textContent="#"+(p.idx+1)+"/"+pts.length;}
function seekToLatLng(ll){if(!pts.length)return;var best=0,bd=1e18;for(var i=0;i<pts.length;i++){var dy=pts[i].lat-ll.lat,dx=pts[i].lon-ll.lng,d=dy*dy+dx*dx;if(d<bd){bd=d;best=i;}}var t=pts[best].t;if(hasVid){vid.currentTime=Math.min(t,vid.duration||t);}else drive(t);}
vid.addEventListener("timeupdate",function(){if(hasVid)drive(vid.currentTime);});vid.addEventListener("play",function(){ic(true);});vid.addEventListener("pause",function(){ic(false);});vid.addEventListener("ended",function(){ic(false);});
function drive(t){updateAt(t);var T=total(),pos=Math.round((t/T)*1000);$("seek").value=pos;$("miniSeek").value=pos;$("tCur").textContent=t.toFixed(1)+" s";$("tTot").textContent=T.toFixed(1)+" s";$("miniTc").textContent=t.toFixed(1)+"/"+T.toFixed(1);}
function seekFromRange(v){var t=(v/1000)*total();if(hasVid){vid.currentTime=t;}else drive(t);}
$("seek").oninput=function(){seekFromRange(this.value);};$("miniSeek").oninput=function(){seekFromRange(this.value);};
function togglePlay(){if(!hasVid){toast("No video for this project.");return;}if(vid.paused)vid.play();else vid.pause();}
function ic(playing){var s=playing?"\\\\u275a\\\\u275a":"\\\\u25b6";$("bigPlay").innerHTML=s;$("miniPlay").innerHTML=s;}
$("bigPlay").onclick=togglePlay;$("miniPlay").onclick=togglePlay;
(function(){var body=$("vbody"),dragging=false,sx=0,st=0,moved=false;body.addEventListener("pointerdown",function(e){if(!hasVid)return;dragging=true;moved=false;sx=e.clientX;st=vid.currentTime||0;body.setPointerCapture(e.pointerId);});body.addEventListener("pointermove",function(e){if(!dragging)return;var dx=e.clientX-sx;if(Math.abs(dx)>4)moved=true;var w=body.clientWidth||1,t=st+(dx/w)*total();t=Math.max(0,Math.min(total(),t));if(hasVid)vid.currentTime=t;else drive(t);});body.addEventListener("pointerup",function(e){if(!dragging)return;dragging=false;try{body.releasePointerCapture(e.pointerId);}catch(err){}if(!moved)togglePlay();});})();
var panels=document.querySelectorAll(".panel");panels.forEach(function(panel){var head=panel.querySelector("[data-drag]");var fBtn=panel.querySelector("[data-float]");var eBtn=panel.querySelector("[data-expand]");var oBtn=panel.querySelector("[data-opacity]");var grip=panel.querySelector("[data-grip]");function unfloat(p){p.classList.remove("floating");p.style.left=p.style.top=p.style.width=p.style.height=p.style.opacity="";if(fBtn)fBtn.classList.remove("on");}if(eBtn)eBtn.onclick=function(){if(panel.classList.contains("floating"))unfloat(panel);panel.classList.toggle("expanded");eBtn.classList.toggle("on",panel.classList.contains("expanded"));afterResize();};if(fBtn)fBtn.onclick=function(){if(panel.classList.contains("expanded")){panel.classList.remove("expanded");eBtn.classList.remove("on");}if(panel.classList.contains("floating"))unfloat(panel);else{var r=panel.getBoundingClientRect();panel.classList.add("floating");panel.style.left=r.left+"px";panel.style.top=r.top+"px";panel.style.width=Math.max(300,r.width)+"px";panel.style.height=Math.max(220,r.height)+"px";fBtn.classList.add("on");}afterResize();};if(oBtn)oBtn.onclick=function(){var cur=parseFloat(panel.style.opacity||"1");var next=cur>=1?0.7:(cur>=0.7?0.45:1);panel.style.opacity=next;oBtn.classList.toggle("on",next<1);if(next<1&&!panel.classList.contains("floating"))fBtn.onclick();};var dx=0,dy=0,drag=false;head.addEventListener("pointerdown",function(e){if(!panel.classList.contains("floating"))return;if(e.target.closest(".ib")||e.target.closest("select"))return;drag=true;var r=panel.getBoundingClientRect();dx=e.clientX-r.left;dy=e.clientY-r.top;head.setPointerCapture(e.pointerId);});head.addEventListener("pointermove",function(e){if(!drag)return;var x=Math.max(2,Math.min(window.innerWidth-60,e.clientX-dx));var y=Math.max(2,Math.min(window.innerHeight-40,e.clientY-dy));panel.style.left=x+"px";panel.style.top=y+"px";});head.addEventListener("pointerup",function(e){drag=false;try{head.releasePointerCapture(e.pointerId);}catch(err){}});var rz=false,rw=0,rh=0,rx=0,ry=0;if(grip){grip.addEventListener("pointerdown",function(e){rz=true;var r=panel.getBoundingClientRect();rw=r.width;rh=r.height;rx=e.clientX;ry=e.clientY;grip.setPointerCapture(e.pointerId);e.stopPropagation();});grip.addEventListener("pointermove",function(e){if(!rz)return;panel.style.width=Math.max(200,rw+(e.clientX-rx))+"px";panel.style.height=Math.max(150,rh+(e.clientY-ry))+"px";if(panel.id==="p-map")afterResize();});grip.addEventListener("pointerup",function(e){rz=false;try{grip.releasePointerCapture(e.pointerId);}catch(err){}afterResize();});}});
function afterResize(){if(map){setTimeout(function(){map.invalidateSize();},80);}}
window.addEventListener("keydown",function(e){if(e.code==="Space"){e.preventDefault();togglePlay();}});window.addEventListener("resize",afterResize);
initMap();if(CFG)autoLoad();else wireLoaders();
})();
`;

export const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
export const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
export const SCRIPT_CLOSE = '<' + '/script>';

(function(){
var D=window.DATA,H=D.home,cars=D.cars,EV=(D.ev&&D.ev.listings)||[],MAN=((D.manuals&&D.manuals.listings)||[]);
var TC={'Top pick':'top','Worth a look':'maybe','Pass':'pass'};
var COL={top:'#0f9d58',maybe:'#e8a317',pass:'#9aa3ad',ev:'#5b4fcf',man1:'#c45c26',man2:'#6b4c9a',mansl:'#c9a227'};
var $=function(id){return document.getElementById(id)};
var fmt=function(n){return n.toLocaleString('en-US')};
var money=function(n){return '$'+fmt(n)};
var hm=function(m){return m<60?m+' min':Math.floor(m/60)+' h '+(m%60)+' min'};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var photoEl=function(c,cls){return c.img?'<img'+(cls?' class="'+cls+'"':'')+' loading="lazy" alt="'+esc(c.title)+'" src="'+c.img+'" data-alt="'+(c.photo||'')+'" referrerpolicy="no-referrer" onerror="if(this.dataset.alt&&this.src!=this.dataset.alt){this.src=this.dataset.alt;this.dataset.alt=\'\'}else{this.style.display=\'none\'}">':''};
var isLA=function(c){return c.source==='LA region (200-500 mi)'};
var bayCars=cars.filter(function(c){return !isLA(c)});
var trip=new Set(),selVin=null;

// stats
var mins=bayCars.map(function(c){return c.driveMin});
var laN=cars.filter(isLA).length;
$('stats').innerHTML='<div><b>'+cars.length+'</b>gas listings</div><div><b>'+cars.filter(function(c){return c.tier=='Top pick'}).length+'</b>top picks</div><div><b>'+EV.length+'</b>EV side-look</div><div><b>'+MAN.length+'</b>manual side-look</div><div><b>'+hm(Math.min.apply(0,mins))+' - '+hm(Math.max.apply(0,mins))+'</b>Bay Area drive, no traffic</div>';
// body options
Array.from(new Set(cars.map(function(c){return c.body}))).sort().forEach(function(b){var o=document.createElement('option');o.value=b;o.textContent=b;$('fBody').appendChild(o)});

// map
var map=L.map('map',{zoomControl:true,scrollWheelZoom:true}).setView([H.lat,H.lng],9);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
L.marker([H.lat,H.lng],{icon:L.divIcon({className:'',html:'<div style="width:16px;height:16px;background:#101418;border:2px solid #fff;transform:rotate(45deg);box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',iconSize:[16,16],iconAnchor:[8,8]}),zIndexOffset:1000}).addTo(map).bindPopup('<b>Fremont city center</b><br>Drive times start here');
var markers={};
var evLayer=L.layerGroup();
var evMarkers={};
// offset pins sharing an address so all are clickable
var seen={};
function placeOffset(lat,lng){
  var k=lat.toFixed(4)+','+lng.toFixed(4),n=seen[k]=(seen[k]||0)+1;
  return [lat+(n-1)*0.0016,lng+(n-1)*0.0016];
}
cars.slice().reverse().forEach(function(c){
  var ll=placeOffset(c.lat,c.lng);
  var t=TC[c.tier];
  var m=L.circleMarker(ll,{radius:t=='pass'?7:9,color:'#fff',weight:2,fillColor:COL[t],fillOpacity:.95});
  m.bindPopup('<div class="pop">'+photoEl(c,'pop-img')+'<b>#'+c.rank+' '+esc(c.title)+'</b><br>'+money(c.price)+' &middot; '+fmt(c.miles)+' mi &middot; '+c.trans+(c.color?' &middot; '+esc(c.color):'')+'<br>'+esc(c.dealer)+', '+esc(c.city)+(c.locNote?'<br><i>'+esc(c.locNote)+'</i>':'')+'<br>'+(c.locNote?'About ':'')+hm(c.driveMin)+', '+c.driveMi+' mi from Fremont'+(isLA(c)&&c.trip?'<br>About '+money(c.trip.gas_oneway)+' in fuel to drive this car home one way':'')+(c.hybrid?'<br>Hybrid battery: '+c.hybrid.age_yr+' yr old, 3-yr risk '+c.hybrid.risk+', reserve '+money(c.hybrid.reserve)+', 3-yr with reserve '+money(c.hybrid.three_year_with_reserve):'')+'<br><a href="'+c.url+'" target="_blank" rel="noopener">View listing</a></div>');
  m.on('click',function(){select(c.vin,true)});
  m.addTo(map);markers[c.vin]=m;
});
EV.forEach(function(c){
  var ll=placeOffset(c.lat,c.lng);
  var m=L.circleMarker(ll,{radius:8,color:'#fff',weight:2,fillColor:COL.ev,fillOpacity:.95});
  m.bindPopup('<div class="pop">'+photoEl(c,'pop-img')+'<b>'+esc(c.title)+'</b><br><i>EV side-look, not in the verdict</i><br>'+money(c.price)+' &middot; '+fmt(c.miles)+' mi &middot; '+c.range_mi+' mi EPA range<br>'+esc(c.dealer)+', '+esc(c.city)+'<br>'+(c.locNote?'About ':'')+hm(c.driveMin)+', '+c.driveMi+' mi from Fremont<br>Running '+money(c.cost.total_yr)+'/yr &middot; 3-yr '+money(c.cost.three_year_total)+' &middot; 4-yr '+money(c.cost.four_year_total)+'<br><a href="'+c.url+'" target="_blank" rel="noopener">View listing</a></div>');
  m.on('click',function(){jumpEv(c.vin,true)});
  evLayer.addLayer(m);evMarkers[c.vin]=m;
});

var manT1=L.layerGroup(),manT2=L.layerGroup(),manMarkers={};
function manCol(c){return c.interest==='shortlist'?COL.mansl:(c.tier_manual===1?COL.man1:COL.man2)}
function manPop(c){
  return '<div class="pop">'+photoEl(c,'pop-img')+'<b>'+esc(c.title)+'</b><br><i>Manual side-look, not in the verdict'+(c.era==='pre-2016'?' &middot; pre-2016':'')+(c.interest==='shortlist'?' &middot; shortlist':'')+'</i><br>'+
    money(c.price)+(c.over_budget?' (over $10k)':'')+' &middot; '+fmt(c.miles)+' mi &middot; Manual<br>'+
    esc(c.dealer)+', '+esc(c.city)+'<br>'+(c.locNote?'About ':'')+hm(c.driveMin)+', '+c.driveMi+' mi from Fremont<br>'+
    'Running '+money(c.cost.total_yr)+'/yr &middot; 3-yr '+money(c.cost.three_year_total)+(c.hybrid?'<br>Hybrid battery reserve '+money(c.hybrid.reserve)+', 3-yr with reserve '+money(c.hybrid.three_year_with_reserve):'')+
    '<br><a href="'+c.url+'" target="_blank" rel="noopener">View listing</a></div>';
}
MAN.forEach(function(c){
  var ll=placeOffset(c.lat,c.lng);
  var sl=c.interest==='shortlist';
  var m=L.circleMarker(ll,{radius:sl?10:7,color:sl?'#6a4f00':'#fff',weight:sl?3:2,fillColor:manCol(c),fillOpacity:c.interest==='not_of_interest'?0.4:0.95});
  m.bindPopup(manPop(c));
  m.on('click',function(){jumpMan(c.vin,true)});
  manMarkers[c.vin]=m;
});
function manShow(c){return c.interest!=='not_of_interest' || ($('fManNoi')&&$('fManNoi').checked)}
function refreshManLayers(){
  manT1.clearLayers();manT2.clearLayers();
  MAN.forEach(function(c){
    if(!manShow(c))return;
    (c.tier_manual===1?manT1:manT2).addLayer(manMarkers[c.vin]);
  });
  if($('fMan1')&&$('fMan1').checked){if(!map.hasLayer(manT1))manT1.addTo(map)}
  else if(map.hasLayer(manT1))map.removeLayer(manT1);
  if($('fMan2')&&$('fMan2').checked){if(!map.hasLayer(manT2))manT2.addTo(map)}
  else if(map.hasLayer(manT2))map.removeLayer(manT2);
}
function fitTo(list,pad){
  if(!list.length)return;
  map.fitBounds(L.latLngBounds(list.map(function(c){return [c.lat,c.lng]}).concat([[H.lat,H.lng]])),{padding:[24,24]});
}
fitTo(bayCars);

function passes(c){
  if($('fAuto').checked&&c.trans!='Auto')return false;
  if($('fOwner').checked&&c.owners!='1')return false;
  if($('fDmg').checked&&c.damage!='None')return false;
  if($('fPass').checked&&c.tier=='Pass')return false;
  if(c.driveMin>+$('fDrive').value)return false;
  if(c.price>+$('fPrice').value)return false;
  if(+$('fCost').value<99999&&(!c.cost||c.cost.total_yr>+$('fCost').value))return false;
  if($('fSrc').value&&c.source!=$('fSrc').value)return false;
  if($('fBody').value&&c.body!=$('fBody').value)return false;
  return true;
}
function dmgCls(d){return d=='None'?'good':(d.indexOf('Minor')>=0?'warn':'bad')}
function ownCls(o){return o=='1'?'good':(o=='2'?'warn':'bad')}
function card(c){
  var t=TC[c.tier];
  var tripLine='';
  if(c.trip){
    tripLine='<div class="tripcost">Trip to buy: about '+money(c.trip.gas_oneway)+' in fuel to drive this car home one way ('+c.driveMi+' mi). A one-way flight is often $60-$80 advance off-peak, or Amtrak about $68-$82; both are estimates, not reserved fares.</div>';
  }
  return '<article class="card" id="c-'+c.vin+'" data-vin="'+c.vin+'">'+
  (c.img?'<div class="ph"><span class="ph-fallback">'+esc(c.title.split(' ').slice(1,3).join(' '))+'</span>'+photoEl(c)+'<span class="rank">#'+c.rank+'</span></div>':
   '<div class="ph ph-none mk-'+c.title.split(' ')[1].toLowerCase().replace(/[^a-z]/g,'')+'"><span class="ph-model"><small>'+c.year+'</small>'+esc(c.title.split(' ').slice(1).join(' '))+'<em>No photo on listing</em></span><span class="rank">#'+c.rank+'</span></div>')+
  '<div><div class="h"><div class="title">'+esc(c.title)+'</div><div class="price">'+money(c.price)+'</div></div>'+
  '<div class="badges"><span class="tier '+t+'">'+c.tier+'</span><span class="b '+(c.trans=='Auto'?'auto':'man')+'">'+(c.trans=='Auto'?'Automatic':'Manual')+'</span><span class="b">'+fmt(c.miles)+' mi</span><span class="b '+ownCls(c.owners)+'">'+c.owners+' owner'+(c.owners=='1'?'':'s')+'</span><span class="b '+dmgCls(c.damage)+'">'+(c.damage=='None'?'No damage':c.damage)+'</span><span class="b">'+(c.service==null?'&mdash;':c.service)+' service records</span><span class="b">'+c.body+'</span><span class="b seller'+(c.seller=='Private'?' priv':'')+'">'+c.seller+'</span>'+(c.deal?'<span class="b deal">CARFAX: '+c.deal+(/Value/.test(c.deal)?'':' deal')+'</span>':'')+'<span class="b src">'+c.source+'</span>'+(c.hybrid?'<span class="b hyb-b">Hybrid battery</span>':'')+'</div>'+
  '<div class="meta">'+esc(c.dealer)+' &middot; '+esc(c.city)+(c.phone?' &middot; <a href="tel:'+c.phone.replace(/[^0-9]/g,'')+'">'+c.phone+'</a>':'')+'<br>'+(c.locNote?'About ':'')+hm(c.driveMin)+' &middot; '+c.driveMi+' mi from Fremont (no traffic)'+(c.locNote?'<br><span class="locnote">'+esc(c.locNote)+'</span>':'')+'</div>'+
  (c.color?'<div class="meta">Color: '+esc(c.color)+'</div>':'')+costHtml(c)+hybridHtml(c)+tripLine+'<div class="why">'+esc(c.why)+'</div>'+
  '<div class="act"><a class="btn primary" href="'+c.url+'" target="_blank" rel="noopener">View listing</a><label class="addtrip"><input type="checkbox" class="tripchk" data-vin="'+c.vin+'"'+(trip.has(c.vin)?' checked':'')+'> Test-drive trip</label><span class="score">Score <b>'+c.score+'</b></span></div>'+
  '</div></article>';
}

function hybridHtml(c){
  var h=c.hybrid; if(!h||!c.cost)return '';
  var rc=h.risk==='High'?'bad':(h.risk==='Med'?'warn':'good');
  return '<div class="hyb"><div class="hyb-h">Hybrid battery</div>'+
    esc(h.gen)+' &middot; '+h.age_yr+' years old &middot; '+fmt(h.miles)+' mi. 3-year replacement risk: <b class="'+rc+'">'+h.risk+'</b>.'+
    '<div>Reserve: '+Math.round(h.risk_p*100)+'% &times; '+money(h.aftermarket_installed)+' aftermarket installed = <b>'+money(h.reserve)+'</b>. 3-yr total with battery reserve <b>'+money(h.three_year_with_reserve)+'</b> <span style="color:var(--mute)">(base 3-yr '+money(c.cost.three_year_total)+' unchanged)</span>.</div>'+
    (h.issues?'<div class="hyb-iss">'+esc(h.issues)+'</div>':'')+
    '<div class="hyb-v">'+esc(h.verdict)+'</div></div>';
}
function cv(c,k){return c.cost?c.cost[k]:1e9}
var costed=cars.filter(function(c){return c.cost});
var MAXYR=Math.max.apply(0,costed.map(function(c){return c.cost.total_yr}).concat(EV.map(function(e){return e.cost.total_yr})));
function costHtml(c){
  var t=c.tire,k=c.cost;
  var tl='Tires '+(t?esc(t.size)+' &middot; set '+money(t.lo)+(t.hi?'-'+money(t.hi):' (budget; no premium pick in this size)')+' + '+money(t.install)+' install':'&mdash;');
  if(!k)return '<div class="cost">'+tl+'<br>Running <b>&mdash;</b> &middot; 3-yr total <b>&mdash;</b></div>';
  var parts=[['f','Fuel',k.fuel_yr],['i','Insurance (est.)',k.insurance_yr],['t','Tires',k.tires_yr],['m','Maintenance',k.maint_yr],['r','Registration',k.reg_yr]];
  var tip=parts.map(function(p){return p[1]+' '+money(p[2])}).join(', ');
  var four=k.four_year_total?(' &middot; 4-yr total <b>'+money(k.four_year_total)+'</b>'):'';
  return '<div class="cost">'+tl+'<br>Running <b>'+money(k.total_yr)+'/yr</b> &middot; 3-yr total <b>'+money(k.three_year_total)+'</b>'+four+' <span style="color:var(--mute)">(no resale)</span>'+
   '<div class="cbar" title="'+tip+'" aria-label="'+tip+'">'+parts.map(function(p){return '<i class="'+p[0]+'" style="width:'+(p[2]/MAXYR*100).toFixed(1)+'%"></i>'}).join('')+'</div>'+
   '<div style="font-size:11px;color:var(--mute);margin-top:2px">Fuel '+money(k.fuel_yr)+' ('+k.mpg+' mpg) &middot; Ins. est. '+money(k.insurance_yr)+' &middot; Tires '+money(k.tires_yr)+' &middot; Maint. '+money(k.maint_yr)+' &middot; Reg. '+money(k.reg_yr)+'</div></div>';
}
function render(){
  var s=$('sort').value,list=cars.filter(passes);
  list.sort(function(a,b){return s=='price'?a.price-b.price:s=='miles'?a.miles-b.miles:s=='dist'?a.driveMin-b.driveMin:s=='yr'?cv(a,'total_yr')-cv(b,'total_yr'):s=='three'?cv(a,'three_year_total')-cv(b,'three_year_total'):s=='four'?cv(a,'four_year_total')-cv(b,'four_year_total'):a.rank-b.rank});
  $('list').innerHTML=list.length?list.map(card).join(''):'<div class="empty">No cars match these filters.</div>';
  var vis=new Set(list.map(function(c){return c.vin}));
  cars.slice().reverse().forEach(function(c){var m=markers[c.vin];if(vis.has(c.vin)){if(!map.hasLayer(m))m.addTo(map)}else if(map.hasLayer(m))map.removeLayer(m)});
  if(selVin)highlight(selVin);
}
function highlight(vin){
  document.querySelectorAll('.card.sel,.ev tr.sel').forEach(function(e){e.classList.remove('sel')});
  var el=$('c-'+vin);if(el)el.classList.add('sel');
  var evRow=document.querySelector('tr[data-vin="'+vin+'"]');if(evRow)evRow.classList.add('sel');
  cars.forEach(function(c){if(markers[c.vin]){markers[c.vin].setStyle({weight:c.vin==vin?4:2,color:c.vin==vin?'#1f5eff':'#fff'});if(c.vin==vin)markers[c.vin].bringToFront()}});
  EV.forEach(function(c){if(evMarkers[c.vin]){evMarkers[c.vin].setStyle({weight:c.vin==vin?4:2,color:c.vin==vin?'#1f5eff':'#fff'});if(c.vin==vin)evMarkers[c.vin].bringToFront()}});
  return el;
}
function select(vin,fromMap){
  selVin=vin;var el=highlight(vin),m=markers[vin];
  if(fromMap){if(el)el.scrollIntoView({behavior:'smooth',block:window.innerWidth<=860?'nearest':'center'})}
  else if(m&&map.hasLayer(m)){map.setView(m.getLatLng(),Math.max(map.getZoom(),11),{animate:true});m.openPopup()}
}
$('list').addEventListener('click',function(e){
  if(e.target.closest('a,input,label'))return;
  var c=e.target.closest('.card');if(c)select(c.dataset.vin,false);
});
$('list').addEventListener('change',function(e){
  if(!e.target.classList.contains('tripchk'))return;
  var v=e.target.dataset.vin;e.target.checked?trip.add(v):trip.delete(v);updTrip();
});
['fAuto','fOwner','fDmg','fPass','fDrive','fPrice','fCost','fBody','fSrc','sort'].forEach(function(id){$(id).addEventListener('change',function(){
  render();
  if(id==='fSrc'){
    if($('fSrc').value==='LA region (200-500 mi)')fitTo(cars.filter(isLA));
    else if(!$('fSrc').value)fitTo(bayCars);
  }
})});

// trip planner: nearest-neighbor from home
function dist(a,b){var R=3958.8,r=Math.PI/180,dl=(b.lat-a.lat)*r,dn=(b.lng-a.lng)*r,x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dn/2)*Math.sin(dn/2);return 2*R*Math.asin(Math.sqrt(x))}
function clean(a){return a.replace(/\s+(Ste|STE|Suite)\s+[^,]+/,'')}
function updTrip(){
  var sel=cars.filter(function(c){return trip.has(c.vin)});
  $('trip').hidden=!sel.length;if(!sel.length)return;
  var stops={};sel.forEach(function(c){(stops[c.address]=stops[c.address]||{lat:c.lat,lng:c.lng,address:c.address,cars:[]}).cars.push(c)});
  var rem=Object.keys(stops).map(function(k){return stops[k]}),cur=H,route=[],tot=0;
  while(rem.length){var bi=0,bd=1e9;rem.forEach(function(s,i){var d=dist(cur,s);if(d<bd){bd=d;bi=i}});tot+=bd;cur=rem.splice(bi,1)[0];route.push(cur)}
  var url='https://www.google.com/maps/dir/'+['Fremont, CA'].concat(route.map(function(s){return clean(s.address)})).map(encodeURIComponent).join('/');
  $('tripLink').href=url;
  $('tripCount').textContent=sel.length+' car'+(sel.length>1?'s':'')+', '+route.length+' stop'+(route.length>1?'s':'');
  var ct=[];route.forEach(function(s){var c=s.cars[0].city;if(ct[ct.length-1]!=c)ct.push(c)});$('tripMeta').textContent='Order: '+ct.join(' > ')+'. Nearest-next order from Fremont; Google Maps shows the real times.';
}
$('tripClear').addEventListener('click',function(){trip.clear();document.querySelectorAll('.tripchk').forEach(function(e){e.checked=false});updTrip()});

// clusters: Bay Area vs LA
var bay={};var soCal={};
cars.forEach(function(c){(isLA(c)?soCal:bay)[c.city]=(isLA(c)?soCal:bay)[c.city]||[];(isLA(c)?soCal:bay)[c.city].push(c)});
function clusterList(g){
  return Object.keys(g).filter(function(k){return g[k].length>1}).sort(function(a,b){return g[b].length-g[a].length||g[a][0].driveMin-g[b][0].driveMin}).map(function(k){
    var l=g[k],dl=new Set(l.map(function(c){return c.dealer})).size;
    return '<li><strong>'+esc(k)+'</strong>: '+l.length+' cars at '+dl+' dealer'+(dl>1?'s':'')+', about '+hm(Math.min.apply(0,l.map(function(c){return c.driveMin})))+' away. '+l.sort(function(a,b){return a.rank-b.rank}).map(function(c){return '#'+c.rank+' '+esc(c.title)}).join(', ')+'.</li>'}).join('');
}
$('clusters').innerHTML='<li style="list-style:none;margin:0 0 6px;color:#5b6470"><strong>Bay Area / 200-mile cars</strong></li>'+clusterList(bay)+
  '<li style="list-style:none;margin:12px 0 6px;color:#5b6470"><strong>LA region (200-500 mi)</strong></li>'+clusterList(soCal);

var nf=cars.filter(function(c){return c.source=='Search: 100 mi'}).sort(function(a,b){return a.rank-b.rank}).slice(0,5);
var laTop=cars.filter(isLA).sort(function(a,b){return a.rank-b.rank}).slice(0,5);
$('newfinds').innerHTML='<div class="nf-h"><strong>New finds</strong><span>Best 5 from the 100-mile CARFAX search (automatic, 1 owner, no damage, personal use)</span></div><div class="nf-row">'+nf.map(function(c){return '<button class="nf" data-vin="'+c.vin+'"><span class="nf-r">#'+c.rank+'</span><b>'+esc(c.title)+'</b><span>'+money(c.price)+' &middot; '+fmt(c.miles)+' mi &middot; '+(c.locNote?'about ':'')+hm(c.driveMin)+'</span><span>'+esc(c.city)+' &middot; '+c.seller+(c.cost?' &middot; '+money(c.cost.total_yr)+'/yr':'')+'</span></button>'}).join('')+'</div>'+
  '<div class="laf" style="margin-top:12px"><strong>LA region (200-500 mi)</strong><span>Best 5 by the same score. None beat the elite shortlist. Pins start hidden in the default Bay Area view; use the LA region button or the source filter.</span></div><div class="nf-row">'+laTop.map(function(c){return '<button class="nf" data-vin="'+c.vin+'" style="border-left-color:#5b6470"><span class="nf-r">#'+c.rank+'</span><b>'+esc(c.title)+'</b><span>'+money(c.price)+' &middot; '+fmt(c.miles)+' mi &middot; '+hm(c.driveMin)+'</span><span>'+esc(c.city)+' &middot; '+(c.cost?money(c.cost.total_yr)+'/yr &middot; 4-yr '+money(c.cost.four_year_total):'')+'</span></button>'}).join('')+'</div>';
function jump(v){if(!$('c-'+v)){['fAuto','fOwner','fDmg','fPass'].forEach(function(i){$(i).checked=false});['fDrive','fPrice','fCost'].forEach(function(i){$(i).value=$(i).options[0].value});$('fBody').value='';$('fSrc').value='';render()}select(v,false);var el=$('c-'+v);if(el)el.scrollIntoView({behavior:'smooth',block:'center'})}
$('newfinds').addEventListener('click',function(e){var b=e.target.closest('.nf');if(b)jump(b.dataset.vin)});
var byVin={};cars.forEach(function(c){byVin[c.vin]=c});
var EL=D.elite.map(function(e){var c=byVin[e.vin];return {c:c,risk:e.risk,inspect:e.inspect}});
var COLS=[['rank','#',function(r){return r.c.rank}],['car','Car',function(r){return r.c.title}],['price','Price',function(r){return r.c.price}],['otd','Out the door',function(r){return r.c.otd}],['miles','Miles',function(r){return r.c.miles}],['year','Year',function(r){return r.c.year}],['mpg','MPG',function(r){return r.c.cost.mpg}],['yr','Running /yr',function(r){return r.c.cost.total_yr}],['three','3-yr total',function(r){return r.c.cost.three_year_total}],['four','4-yr total',function(r){return r.c.cost.four_year_total||(r.c.cost.three_year_total+r.c.cost.total_yr)}],['tires','Tire set',function(r){return r.c.tire.lo+r.c.tire.install}],['drive','Drive',function(r){return r.c.driveMin}],['seller','Seller',function(r){return r.c.seller}],['risk','Key risk',function(r){return r.risk}],['insp','Inspection to ask for',function(r){return r.inspect}]];
var esort={k:'rank',dir:1};
function cell(k,r){var c=r.c;switch(k){case 'rank':return '#'+c.rank;case 'car':return '<b>'+esc(c.title)+'</b><br><span class="mute">'+esc(c.dealer)+', '+esc(c.city)+'</span>';case 'price':return money(c.price);case 'otd':return money(c.otd);case 'miles':return fmt(c.miles);case 'year':return c.year;case 'mpg':return c.cost.mpg+(c.cost.grade=='premium'?' (prem)':'');case 'yr':return money(c.cost.total_yr);case 'three':return money(c.cost.three_year_total);case 'four':return money(c.cost.four_year_total||(c.cost.three_year_total+c.cost.total_yr));case 'tires':return money(c.tire.lo+c.tire.install);case 'drive':return (c.locNote?'~':'')+hm(c.driveMin);case 'seller':return c.seller;case 'risk':return esc(r.risk);case 'insp':return esc(r.inspect)}}
function renderElite(){var col=COLS.filter(function(x){return x[0]==esort.k})[0];var rows=EL.slice().sort(function(a,b){var x=col[2](a),y=col[2](b);return (x>y?1:x<y?-1:0)*esort.dir});
 var g={};EL.forEach(function(r){var k=r.c.seller=='Private'?null:r.c.dealer+', '+r.c.city;if(k)(g[k]=g[k]||[]).push(r.c)});var cityG={};EL.forEach(function(r){(cityG[r.c.city]=cityG[r.c.city]||[]).push(r.c)});
 var notes=Object.keys(g).filter(function(k){return g[k].length>1}).map(function(k){return '<b>'+esc(k)+'</b> has '+g[k].length+' elite cars ('+g[k].map(function(c){return c.title.replace(/^\d+ /,'')}).join(', ')+')'});
 Object.keys(cityG).forEach(function(k){var L=cityG[k],ds={};L.forEach(function(c){ds[c.dealer]=1});if(L.length>1&&Object.keys(ds).length>1)notes.push('<b>'+esc(k)+'</b>: '+L.length+' elite cars in one trip ('+L.map(function(c){return c.title.replace(/^\d+ /,'')+' at '+esc(c.dealer)}).join('; ')+')')});
 if(D.elite_note)notes.push(esc(D.elite_note));
 $('elite').innerHTML='<div class="el-h"><strong>Elite shortlist</strong><span>Best 8 gas cars of the original local set, kept as the verdict shortlist. The 74 LA-region cars are ranked with the same score but stay off this list unless they clearly beat it; none did. EV listings and the manual-unicorns side-look are not in this table. Tap a column to sort, tap a row to see the car. Out the door = price + 10.25% tax + DMV fees + dealer doc fee; the inspection ($225) is extra.</span></div>'+
 '<div class="el-wrap"><table class="el"><thead><tr>'+COLS.map(function(x){return '<th data-k="'+x[0]+'"'+(x[0]==esort.k?' class="on"':'')+'>'+x[1]+(x[0]==esort.k?(esort.dir>0?' &#9650;':' &#9660;'):'')+'</th>'}).join('')+'</tr></thead><tbody>'+
 rows.map(function(r){return '<tr data-vin="'+r.c.vin+'">'+COLS.map(function(x){return '<td class="c-'+x[0]+'">'+cell(x[0],r)+'</td>'}).join('')+'</tr>'}).join('')+'</tbody></table></div>'+
 (notes.length?'<div class="el-n">'+notes.join('<br>')+'</div>':'')}
$('elite').addEventListener('click',function(e){var th=e.target.closest('th');if(th){var k=th.dataset.k;esort.dir=(esort.k==k)?-esort.dir:1;esort.k=k;renderElite();return}var tr=e.target.closest('tr[data-vin]');if(tr)jump(tr.dataset.vin)});
renderElite();
render();

// map controls
$('fitBay').addEventListener('click',function(){fitTo(bayCars)});
$('fitLA').addEventListener('click',function(){fitTo(cars.filter(isLA));$('fSrc').value='LA region (200-500 mi)';render()});
$('fEvMap').addEventListener('change',function(){
  if(this.checked){
    evLayer.addTo(map);
    var evPts=EV.map(function(c){return [c.lat,c.lng]});
    var vis=bayCars.map(function(c){return [c.lat,c.lng]}).concat([[H.lat,H.lng]]).concat(evPts);
    map.fitBounds(L.latLngBounds(vis),{padding:[24,24]});
  }else if(map.hasLayer(evLayer))map.removeLayer(evLayer);
});

function fitManuals(){
  var vis=MAN.filter(function(c){return manShow(c)&&((c.tier_manual===1&&$('fMan1').checked)||(c.tier_manual===2&&$('fMan2').checked))});
  if(!vis.length){
    if(!$('fMan1').checked){$('fMan1').checked=true}
    if(!$('fMan2').checked){$('fMan2').checked=true}
    refreshManLayers();
    vis=MAN.filter(manShow);
  }
  if(vis.length)map.fitBounds(L.latLngBounds(vis.map(function(c){return [c.lat,c.lng]}).concat([[H.lat,H.lng]])),{padding:[24,24]});
}
['fMan1','fMan2'].forEach(function(id){$(id).addEventListener('change',function(){refreshManLayers()})});
$('fitMan').addEventListener('click',fitManuals);

// ----- EV subsection -----
function evCostBar(k){
  var parts=[['f','Energy (home)',k.energy_yr],['i','Insurance (est.)',k.insurance_yr],['t','Tires',k.tires_yr],['m','Maintenance',k.maint_yr],['r','Registration',k.reg_yr]];
  var tip=parts.map(function(p){return p[1]+' '+money(p[2])}).join(', ');
  return '<div class="cbar" title="'+tip+'" aria-label="'+tip+'">'+parts.map(function(p){return '<i class="'+p[0]+'" style="width:'+(p[2]/MAXYR*100).toFixed(1)+'%"></i>'}).join('')+'</div>';
}
function flagHtml(flags){
  return '<div class="flags">'+flags.map(function(f){
    var warn=/recall|warranty|Branded|Short-range|1-owner|100,000|chew|full-coverage/i.test(f);
    return '<span class="b '+(warn?'warnf':'evf')+'">'+esc(f)+'</span>';
  }).join('')+'</div>';
}
var gasEl=D.ev.gas_elite||[];
var m3s=EV.filter(function(e){return /Model 3/.test(e.title)}).slice().sort(function(a,b){return a.cost.four_year_total-b.cost.four_year_total});
var bestM3=m3s[0];
var evTop=EV.slice().sort(function(a,b){return a.cost.four_year_total-b.cost.four_year_total}).slice(0,5);
var evSort={k:'four',dir:1};
var EVCOLS=[
  ['photo','Photo',function(e){return 0}],
  ['car','Car',function(e){return e.title}],
  ['price','Price',function(e){return e.price}],
  ['otd','Out the door',function(e){return e.otd}],
  ['miles','Miles',function(e){return e.miles}],
  ['range','EPA range',function(e){return e.range_mi}],
  ['energy','Energy /yr',function(e){return e.cost.energy_yr}],
  ['tires','Tires /yr',function(e){return e.cost.tires_yr}],
  ['ins','Ins. /yr',function(e){return e.cost.insurance_yr}],
  ['yr','Running /yr',function(e){return e.cost.total_yr}],
  ['three','3-yr total',function(e){return e.cost.three_year_total}],
  ['four','4-yr total',function(e){return e.cost.four_year_total}],
  ['drive','Drive',function(e){return e.driveMin}],
  ['seller','Seller',function(e){return e.dealer}]
];
function evCell(k,e){
  if(k==='photo')return e.img?'<img class="thumb" loading="lazy" alt="'+esc(e.title)+'" src="'+e.img+'" data-alt="'+(e.photo||'')+'" referrerpolicy="no-referrer" onerror="if(this.dataset.alt&&this.src!=this.dataset.alt){this.src=this.dataset.alt;this.dataset.alt=\'\'}else{this.style.display=\'none\'}">':'<div class="thumb-none">No photo</div>';
  if(k==='car')return '<b>'+esc(e.title)+'</b><br><span class="mute">'+esc(e.dealer)+', '+esc(e.city)+'</span>'+flagHtml(e.flags)+'<div class="mute" style="margin-top:3px">EPA range '+e.range_mi+' mi &middot; '+e.kwh_per_100mi+' kWh/100 mi</div>';
  if(k==='price')return money(e.price);
  if(k==='otd')return money(e.otd);
  if(k==='miles')return fmt(e.miles);
  if(k==='range')return e.range_mi+' mi';
  if(k==='energy')return money(e.cost.energy_yr);
  if(k==='tires')return money(e.cost.tires_yr)+(e.cost.tires_yr_30k?'<br><span class="mute">30k mi: '+money(e.cost.tires_yr_30k)+'</span>':'');
  if(k==='ins')return money(e.cost.insurance_yr)+(e.cost.insurance_full?'<br><span class="mute">full-cov. avg. '+money(e.cost.insurance_full)+'</span>':'');
  if(k==='yr')return money(e.cost.total_yr)+evCostBar(e.cost);
  if(k==='three')return money(e.cost.three_year_total);
  if(k==='four')return '<b>'+money(e.cost.four_year_total)+'</b>';
  if(k==='drive')return (e.locNote?'~':'')+hm(e.driveMin);
  if(k==='seller')return esc(e.dealer)+'<br><a href="'+e.url+'" target="_blank" rel="noopener">Listing</a>';
  return '';
}
function renderEvTable(){
  var col=EVCOLS.filter(function(x){return x[0]==evSort.k})[0];
  var rows=EV.slice().sort(function(a,b){var x=col[2](a),y=col[2](b);return (x>y?1:x<y?-1:0)*evSort.dir});
  return '<div class="el-wrap ev-cmp"><table class="ev"><thead><tr>'+EVCOLS.map(function(x){return '<th data-k="'+x[0]+'"'+(x[0]==evSort.k?' class="on"':'')+'>'+x[1]+(x[0]==evSort.k?(evSort.dir>0?' &#9650;':' &#9660;'):'')+'</th>'}).join('')+'</tr></thead><tbody>'+
    rows.map(function(e){return '<tr data-vin="'+e.vin+'" id="ev-'+e.vin+'">'+EVCOLS.map(function(x){return '<td class="'+(x[0]==='car'?'':'num')+'">'+evCell(x[0],e)+'</td>'}).join('')+'</tr>'}).join('')+'</tbody></table></div>';
}
function cmpRows(){
  var rows=[];
  evTop.forEach(function(e,i){rows.push({kind:'ev',label:(i===0?'Lowest 4-year EV: ':'EV: ')+e.title,city:e.city,price:e.price,range:e.range_mi+' mi',yr:e.cost.total_yr,three:e.cost.three_year_total,four:e.cost.four_year_total,note:e.flags[1]||e.flags[0]})});
  if(bestM3){
    var k=bestM3.cost;
    rows.push({kind:'m3',label:'Best Model 3 on 4-year total: '+bestM3.title,city:bestM3.city,price:bestM3.price,range:bestM3.range_mi+' mi',yr:k.total_yr,three:k.three_year_total,four:k.four_year_total,note:'Headline method (same insurance and warranty-life tires as the gas cars)'});
    rows.push({kind:'m3s',label:'Same Model 3, tires at ~30k miles',city:bestM3.city,price:bestM3.price,range:bestM3.range_mi+' mi',yr:k.total_yr_30k,three:k.three_year_30k,four:k.four_year_30k,note:'Tire wear sensitivity only; insurance still the headline estimate'});
    rows.push({kind:'m3s',label:'Same Model 3, Insurance.com full-coverage average',city:bestM3.city,price:bestM3.price,range:bestM3.range_mi+' mi',yr:k.total_yr_fullins,three:k.three_year_fullins,four:k.four_year_fullins,note:'Insurance $4,532/yr instead of $976; not a personal quote'});
  }
  gasEl.forEach(function(g){rows.push({kind:'gas',label:'Gas elite: '+g.title,city:g.city,price:g.price,range:g.fuel_yr?('fuel '+money(g.fuel_yr)+'/yr'):'',yr:g.total_yr,three:g.three_year_total,four:g.four_year_total,note:'Cheapest-to-run cars from the elite shortlist'})});
  return rows;
}
function renderEv(){
  var ev=D.ev;
  var cmp=cmpRows();
  var cmpTable='<div class="el-wrap ev-cmp"><table class="ev" style="min-width:900px"><thead><tr><th>Comparison</th><th>Price</th><th>Range / fuel</th><th>Running /yr</th><th>3-yr total</th><th>4-yr total</th><th>Note</th></tr></thead><tbody>'+
    cmp.map(function(r){return '<tr><td><b>'+esc(r.label)+'</b><br><span class="mute">'+esc(r.city||'')+'</span></td><td class="num">'+money(r.price)+'</td><td class="num">'+esc(r.range||'')+'</td><td class="num">'+money(r.yr)+'</td><td class="num">'+money(r.three)+'</td><td class="num"><b>'+money(r.four)+'</b></td><td>'+esc(r.note||'')+'</td></tr>'}).join('')+'</tbody></table></div>';
  var m3table='';
  if(m3s.length){
    m3table='<h3 class="ev-sub">Model 3 listings</h3><p class="ev-note">Headline totals use the same insurance method as the gas cars ($976/year) and warranty-life tires ($135/year). The 30k-mile and full-coverage columns are sensitivities, not the headline verdict.</p><div class="el-wrap ev-cmp"><table class="ev" style="min-width:1100px"><thead><tr><th>Car</th><th>Price</th><th>Miles</th><th>EPA range</th><th>Energy /yr</th><th>Tires /yr</th><th>Tires if 30k</th><th>Ins. /yr (headline)</th><th>Ins. full-cov. avg.</th><th>3-yr headline</th><th>4-yr headline</th><th>4-yr at 30k tires</th><th>4-yr at full-cov. ins.</th><th>Drive</th></tr></thead><tbody>'+
      m3s.map(function(e){var k=e.cost;return '<tr data-vin="'+e.vin+'"><td><b>'+esc(e.title)+'</b><br><span class="mute">'+esc(e.city)+' &middot; <a href="'+e.url+'" target="_blank" rel="noopener">Listing</a></span></td><td class="num">'+money(e.price)+'</td><td class="num">'+fmt(e.miles)+'</td><td class="num">'+e.range_mi+' mi</td><td class="num">'+money(k.energy_yr)+'</td><td class="num">'+money(k.tires_yr)+'</td><td class="num">'+money(k.tires_yr_30k)+'</td><td class="num">'+money(k.insurance_yr)+'</td><td class="num">'+money(k.insurance_full)+'</td><td class="num">'+money(k.three_year_total)+'</td><td class="num"><b>'+money(k.four_year_total)+'</b></td><td class="num">'+money(k.four_year_30k)+'</td><td class="num">'+money(k.four_year_fullins)+'</td><td class="num">'+hm(e.driveMin)+'</td></tr>'}).join('')+'</tbody></table></div>';
  }
  var sens=ev.model3_sensitivity||{};
  $('evside').innerHTML='<div class="ev-h"><strong>EV side-look (not in the verdict)</strong><span>'+EV.length+' CARFAX listings within 150 miles of Fremont. Model 3 under $20k; other EVs under $18k. They do not enter the main ranking, elite shortlist, or main tiers.</span></div>'+
    '<div class="ev-warn">'+esc(ev.note)+'</div>'+
    '<p>'+esc(ev.assumption)+' Energy rate used: '+esc(ev.energy_source)+'</p>'+
    '<p>'+esc(ev.credit)+' '+(ev.soul_ev_note?esc(ev.soul_ev_note):'')+' '+esc(ev.searched)+'</p>'+
    '<h3 class="ev-sub">3-year and 4-year comparison</h3>'+
    '<p class="ev-note">The lowest 4-year EVs are mostly short-range cars (2015-16 e-Golf at 83 miles, i3, Ioniq). They beat a cheap gas Corolla on paper because the purchase price is low and home electricity is cheaper than gas, but they are a different kind of car, several are out of battery warranty, and some did not have a confirmed 1-owner history. A practical-range used EV (Bolt, Leaf, ID.4, Kona) usually lands close to, or above, the best gas elite once you count the higher purchase price. The best Model 3 is cheaper to run each year than the Civic, but not cheap enough to catch the Civic or the $5,999 Corolla over 3 or 4 years. Resale is not subtracted.</p>'+
    cmpTable+
    '<div class="sens"><div><b>Model 3 tire sensitivity.</b> '+esc(sens.tires_note||'')+'</div><div><b>Model 3 insurance sensitivity.</b> '+esc(sens.insurance_note||'')+(sens.insurance_source?' <a href="'+sens.insurance_source+'" target="_blank" rel="noopener">Insurance.com source</a>.':'')+'</div></div>'+
    m3table+
    '<h3 class="ev-sub">All EV listings, by 4-year total</h3>'+
    '<p class="ev-note">Out the door = price + 10.25% Fremont tax + DMV fees (including the $121 Road Improvement Fee on model-year 2020 and newer) + $85 doc fee. The $225 inspection is in the 3-year and 4-year totals but not in out-the-door. Energy assumes 100% home charging on PG&amp;E EV2-A off-peak. Tap a column to sort; tap a row to see the pin (turns the EV layer on).</p>'+
    renderEvTable();
}
function jumpEv(vin,fromMap){
  if(!$('fEvMap').checked){$('fEvMap').checked=true;$('fEvMap').dispatchEvent(new Event('change'))}
  selVin=vin;highlight(vin);
  var m=evMarkers[vin];
  if(!fromMap&&m){map.setView(m.getLatLng(),Math.max(map.getZoom(),10),{animate:true});m.openPopup()}
  var row=$('ev-'+vin);if(row){row.scrollIntoView({behavior:'smooth',block:'center'});row.classList.add('sel')}
}
renderEv();
$('evside').addEventListener('click',function(e){
  var a=e.target.closest('a');if(a)return;
  var th=e.target.closest('th[data-k]');
  if(th){var k=th.dataset.k;evSort.dir=(evSort.k==k)?-evSort.dir:1;evSort.k=k;renderEv();return;}
  var tr=e.target.closest('tr[data-vin]');if(tr)jumpEv(tr.dataset.vin,false);
});

// ----- Manual unicorns subsection -----
var manSort={k:'three',dir:1};
function manBadges(c){
  var b='';
  if(c.interest==='shortlist')b+='<span class="b sl">Manual shortlist</span>';
  if(c.interest==='not_of_interest')b+='<span class="b">Not of interest</span>';
  if(c.interest==='unreviewed')b+='<span class="b">Unreviewed</span>';
  if(c.era==='pre-2016')b+='<span class="b pre">pre-2016</span>';
  if(c.card_status)b+='<span class="b unv">'+esc(c.card_status)+'</span>';
  if(c.over_budget)b+='<span class="b over">Over $10k</span>';
  if(c.family_space==='sedan - limited family space')b+='<span class="b lim">Sedan — limited family space</span>';
  else if(c.family_space==='family space')b+='<span class="b fam">Family space</span>';
  if(c.severity_unspecified)b+='<span class="b lim">Damage severity not shown</span>';
  if(c.tier_manual===1)b+='<span class="b">Tier 1, no damage</span>';
  else b+='<span class="b">Tier 2</span>';
  return b;
}
function manRow(c){
  var cls=(c.interest==='shortlist'?' shortlist':'')+(c.interest==='not_of_interest'?' noi':'');
  var ph=c.img?'<img class="thumb" alt="" src="'+c.img+'" loading="lazy" referrerpolicy="no-referrer">':'<div class="thumb-none">No photo</div>';
  return '<tr class="'+cls+'" data-vin="'+c.vin+'" id="man-'+c.vin+'"><td>'+ph+'</td><td><b>'+esc(c.title)+'</b><br><span class="mute">'+esc(c.dealer)+', '+esc(c.city)+'</span><div class="flags">'+manBadges(c)+'</div></td>'+
    '<td class="num">'+money(c.price)+'</td><td class="num">'+fmt(c.miles)+'</td><td class="num">'+(c.locNote?'~':'')+hm(c.driveMin)+'</td>'+
    '<td class="num">'+money(c.cost.total_yr)+'</td><td class="num">'+money(c.cost.three_year_total)+'</td><td class="num">'+money(c.cost.four_year_total)+'</td>'+
    '<td>'+esc(c.body||'')+'</td><td>'+c.cost.mpg+' mpg '+(c.cost.grade==='premium'?'prem':'reg')+'</td><td class="num">'+c.score+'</td></tr>';
}
function manVisibleList(list){
  return list.filter(function(c){return manShow(c)});
}
function renderManTable(list, key){
  var rows=manVisibleList(list).slice().sort(function(a,b){
    var cols={price:function(c){return c.price},miles:function(c){return c.miles},drive:function(c){return c.driveMin},yr:function(c){return c.cost.total_yr},three:function(c){return c.cost.three_year_total},four:function(c){return c.cost.four_year_total},year:function(c){return c.year},score:function(c){return c.score}};
    var fn=cols[manSort.k]||cols.three;
    var x=fn(a),y=fn(b);return (x>y?1:x<y?-1:0)*manSort.dir;
  });
  var heads=[['year','Year'],['price','Price'],['miles','Miles'],['drive','Drive'],['yr','Yearly'],['three','3-year'],['four','4-year'],['score','Score (ref)']];
  var thead='<tr><th></th><th>Car</th>'+heads.map(function(h){return '<th data-k="'+h[0]+'"'+(manSort.k==h[0]?' class="on"':'')+'>'+h[1]+(manSort.k==h[0]?(manSort.dir>0?' ▲':' ▼'):'')+'</th>'}).join('')+'<th>Body</th><th>Fuel</th><th data-k="score"'+(manSort.k=='score'?' class="on"':'')+'></th></tr>';
  // fix: I already have score in heads. Simplify header to match cells.
  return '<div class="man-cmp"><table class="man" data-tier="'+key+'"><thead><tr><th></th><th>Car</th><th data-k="price"'+(manSort.k=='price'?' class="on"':'')+'>Price</th><th data-k="miles"'+(manSort.k=='miles'?' class="on"':'')+'>Miles</th><th data-k="drive"'+(manSort.k=='drive'?' class="on"':'')+'>Drive</th><th data-k="yr"'+(manSort.k=='yr'?' class="on"':'')+'>Yearly</th><th data-k="three"'+(manSort.k=='three'?' class="on"':'')+'>3-year</th><th data-k="four"'+(manSort.k=='four'?' class="on"':'')+'>4-year</th><th>Body</th><th>Fuel</th><th data-k="score"'+(manSort.k=='score'?' class="on"':'')+'>Score (ref)</th></tr></thead><tbody>'+
    (rows.length?rows.map(manRow).join(''):'<tr><td colspan="11">No cars in this group with the current toggle.</td></tr>')+'</tbody></table></div>';
}
function manCard(c){
  var ph=c.img?'<img src="'+c.img+'" alt="'+esc(c.title)+'" loading="lazy" referrerpolicy="no-referrer">':'<div class="thumb-none">No photo</div>';
  return '<button type="button" class="man-sl" data-vin="'+c.vin+'">'+ph+'<div><b>'+esc(c.title)+'</b><span>'+money(c.price)+(c.over_budget?' · over $10k':'')+' · '+fmt(c.miles)+' mi · '+esc(c.city)+' · '+(c.locNote?'about ':'')+hm(c.driveMin)+'</span><span>Running '+money(c.cost.total_yr)+'/yr · 3-yr '+money(c.cost.three_year_total)+' · '+(c.cost.grade==='premium'?'premium fuel':'regular')+(c.tier_manual===2?' · Tier 2, '+esc(c.damage).toLowerCase():'')+'</span><div class="flags">'+manBadges(c)+'</div></div></button>';
}
function renderMan(){
  var meta=D.manuals||{};
  var t1=MAN.filter(function(c){return c.tier_manual===1});
  var t2=MAN.filter(function(c){return c.tier_manual===2});
  var sl=MAN.filter(function(c){return c.interest==='shortlist'});
  var noiN=MAN.filter(function(c){return c.interest==='not_of_interest'}).length;
  var preN=MAN.filter(function(c){return c.era==='pre-2016'}).length;
  var newN=MAN.length-preN;
  var noiChk=$('fManNoi');
  var checked=noiChk?noiChk.checked:false;
  $('manside').innerHTML='<div class="ev-h"><strong>Manual unicorns (not in the verdict)</strong><span>'+MAN.length+' one-owner manuals within 500 miles: '+newN+' from 2016 or newer, '+preN+' pre-2016. The family needs an automatic, so these stay off the elite shortlist and main ranking. The score is for reference only.</span></div>'+
    '<p class="man-note">'+esc(meta.note||'')+' Focus ST and WRX are costed on premium fuel; so is the Mini Cooper S. RepairPal rates the Jeep Renegade and Compass 4.0 out of 5 (about $498 and $526 a year); that is not a weak RepairPal score. The Fiat 500X has no RepairPal reliability rating and Consumer Reports lists reliability as NA.</p>'+
    '<h3 class="man-sub">Manual shortlist</h3>'+
    '<p class="man-note">Two 2016-or-newer cars were picked out: the Mini Cooper S in Davis (Tier 1, clean history, F56 B48, not the older N18 timing-chain engine) and the WRX in Norco (Tier 2, minor-to-moderate damage, date not shown). Both are over the $10,000 budget.</p>'+
    '<div class="man-short">'+sl.map(manCard).join('')+'</div>'+
    '<div class="man-tools"><label class="chk"><input type="checkbox" id="fManNoi"'+(checked?' checked':'')+'> Show not-of-interest ('+noiN+' cars)</label></div>'+
    '<h3 class="man-sub">Tier 1 — no damage on record ('+t1.length+')</h3>'+
    '<p class="man-note">Must-see on history: one owner, no accident or damage on the card. Includes 2016-or-newer cars and pre-2016 cars, in the same layer. Pre-2016 rows are labeled and were not opened as detail pages.</p>'+
    renderManTable(t1,'t1')+
    '<h3 class="man-sub">Tier 2 — minor or moderate damage ('+t2.length+')</h3>'+
    '<p class="man-note">Worth a look if the report is not severe. Damage dates are often not on the card. On the 2016-or-newer set, the Elantra, the 2016 Veloster, and the 2018 Focus ST do not show damage severity — check the free CARFAX report.</p>'+
    renderManTable(t2,'t2');
  var t=$('fManNoi');
  if(t)t.addEventListener('change',function(){refreshManLayers();renderMan()});
}
function jumpMan(vin,fromMap){
  var c=MAN.filter(function(x){return x.vin===vin})[0];
  if(!c)return;
  if(c.interest==='not_of_interest'&&$('fManNoi')&&!$('fManNoi').checked){$('fManNoi').checked=true;refreshManLayers();renderMan()}
  var box=c.tier_manual===1?'fMan1':'fMan2';
  if($(box)&&!$(box).checked){$(box).checked=true;refreshManLayers()}
  selVin=vin;
  document.querySelectorAll('.card.sel,.ev tr.sel,.man tr.sel').forEach(function(e){e.classList.remove('sel')});
  var m=manMarkers[vin];
  if(!fromMap&&m){map.setView(m.getLatLng(),Math.max(map.getZoom(),10),{animate:true});m.openPopup()}
  var row=$('man-'+vin);
  if(row){row.scrollIntoView({behavior:'smooth',block:'center'});row.classList.add('sel')}
  else {$('manside').scrollIntoView({behavior:'smooth',block:'start'})}
}
if($('manside')){
  renderMan();
  $('manside').addEventListener('click',function(e){
    var a=e.target.closest('a');if(a)return;
    var th=e.target.closest('th[data-k]');
    if(th){var k=th.dataset.k;manSort.dir=(manSort.k==k)?-manSort.dir:1;manSort.k=k;renderMan();return;}
    var hit=e.target.closest('[data-vin]');
    if(hit)jumpMan(hit.dataset.vin,false);
  });
}

})();

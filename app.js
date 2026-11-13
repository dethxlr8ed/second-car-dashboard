(function(){
var D=window.DATA,H=D.home,cars=D.cars;
var TC={'Top pick':'top','Worth a look':'maybe','Pass':'pass'};
var COL={top:'#0f9d58',maybe:'#e8a317',pass:'#9aa3ad'};
var $=function(id){return document.getElementById(id)};
var fmt=function(n){return n.toLocaleString('en-US')};
var money=function(n){return '$'+fmt(n)};
var hm=function(m){return m<60?m+' min':Math.floor(m/60)+' h '+(m%60)+' min'};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var trip=new Set(),selVin=null;

// stats
var mins=cars.map(function(c){return c.driveMin});
$('stats').innerHTML='<div><b>'+cars.length+'</b>listings</div><div><b>'+cars.filter(function(c){return c.tier=='Top pick'}).length+'</b>top picks</div><div><b>'+hm(Math.min.apply(0,mins))+' - '+hm(Math.max.apply(0,mins))+'</b>drive, no traffic</div>';
// body options
Array.from(new Set(cars.map(function(c){return c.body}))).sort().forEach(function(b){var o=document.createElement('option');o.value=b;o.textContent=b;$('fBody').appendChild(o)});

// map
var map=L.map('map',{zoomControl:true,scrollWheelZoom:true}).setView([H.lat,H.lng],9);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
L.marker([H.lat,H.lng],{icon:L.divIcon({className:'',html:'<div style="width:16px;height:16px;background:#101418;border:2px solid #fff;transform:rotate(45deg);box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',iconSize:[16,16],iconAnchor:[8,8]}),zIndexOffset:1000}).addTo(map).bindPopup('<b>Fremont city center</b><br>Drive times start here');
var markers={};
// offset pins sharing an address so all are clickable
var seen={};
cars.slice().reverse().forEach(function(c){
  var k=c.lat.toFixed(4)+','+c.lng.toFixed(4),n=seen[k]=(seen[k]||0)+1;
  var lat=c.lat+(n-1)*0.0016,lng=c.lng+(n-1)*0.0016;
  var t=TC[c.tier];
  var m=L.circleMarker([lat,lng],{radius:t=='pass'?7:9,color:'#fff',weight:2,fillColor:COL[t],fillOpacity:.95});
  m.bindPopup('<div class="pop"><b>#'+c.rank+' '+esc(c.title)+'</b><br>'+money(c.price)+' &middot; '+fmt(c.miles)+' mi &middot; '+c.trans+'<br>'+esc(c.dealer)+', '+esc(c.city)+'<br>'+hm(c.driveMin)+', '+c.driveMi+' mi from Fremont<br><a href="'+c.url+'" target="_blank" rel="noopener">View listing</a></div>');
  m.on('click',function(){select(c.vin,true)});
  m.addTo(map);markers[c.vin]=m;
});
map.fitBounds(L.latLngBounds(cars.map(function(c){return [c.lat,c.lng]}).concat([[H.lat,H.lng]])),{padding:[24,24]});

function passes(c){
  if($('fAuto').checked&&c.trans!='Auto')return false;
  if($('fOwner').checked&&c.owners!='1')return false;
  if($('fDmg').checked&&c.damage!='None')return false;
  if($('fPass').checked&&c.tier=='Pass')return false;
  if(c.driveMin>+$('fDrive').value)return false;
  if(c.price>+$('fPrice').value)return false;
  if(+$('fCost').value<99999&&(!c.cost||c.cost.total_yr>+$('fCost').value))return false;
  if($('fBody').value&&c.body!=$('fBody').value)return false;
  return true;
}
function dmgCls(d){return d=='None'?'good':(d.indexOf('Minor')>=0?'warn':'bad')}
function ownCls(o){return o=='1'?'good':(o=='2'?'warn':'bad')}
function card(c){
  var t=TC[c.tier];
  return '<article class="card" id="c-'+c.vin+'" data-vin="'+c.vin+'">'+
  '<div class="ph"><span class="ph-fallback">No photo</span><img loading="lazy" alt="'+esc(c.title)+'" src="'+c.img+'" data-alt="'+c.photo+'" onerror="if(this.dataset.alt&&this.src!=this.dataset.alt){this.src=this.dataset.alt;this.dataset.alt=\'\'}else{this.style.display=\'none\'}"><span class="rank">#'+c.rank+'</span></div>'+
  '<div><div class="h"><div class="title">'+esc(c.title)+'</div><div class="price">'+money(c.price)+'</div></div>'+
  '<div class="badges"><span class="tier '+t+'">'+c.tier+'</span><span class="b '+(c.trans=='Auto'?'auto':'man')+'">'+(c.trans=='Auto'?'Automatic':'Manual')+'</span><span class="b">'+fmt(c.miles)+' mi</span><span class="b '+ownCls(c.owners)+'">'+c.owners+' owner'+(c.owners=='1'?'':'s')+'</span><span class="b '+dmgCls(c.damage)+'">'+(c.damage=='None'?'No damage':c.damage)+'</span><span class="b">'+c.service+' service records</span><span class="b">'+c.body+'</span><span class="b seller">'+c.seller+'</span></div>'+
  '<div class="meta">'+esc(c.dealer)+' &middot; '+esc(c.city)+' &middot; <a href="tel:'+c.phone.replace(/[^0-9]/g,'')+'">'+c.phone+'</a><br>'+hm(c.driveMin)+' &middot; '+c.driveMi+' mi from Fremont (no traffic)</div>'+
  costHtml(c)+'<div class="why">'+esc(c.why)+'</div>'+
  '<div class="act"><a class="btn primary" href="'+c.url+'" target="_blank" rel="noopener">View listing</a><label class="addtrip"><input type="checkbox" class="tripchk" data-vin="'+c.vin+'"'+(trip.has(c.vin)?' checked':'')+'> Test-drive trip</label><span class="score">Score <b>'+c.score+'</b></span></div>'+
  '</div></article>';
}
function cv(c,k){return c.cost?c.cost[k]:1e9}
var MAXYR=Math.max.apply(0,cars.filter(function(c){return c.cost}).map(function(c){return c.cost.total_yr}));
function costHtml(c){
  var t=c.tire,k=c.cost;
  var tl='Tires '+(t?esc(t.size)+' &middot; set '+money(t.lo)+'-'+money(t.hi)+' + '+money(t.install)+' install':'&mdash;');
  if(!k)return '<div class="cost">'+tl+'<br>Running <b>&mdash;</b> &middot; 3-yr total <b>&mdash;</b></div>';
  var parts=[['f','Fuel',k.fuel_yr],['i','Insurance (est.)',k.insurance_yr],['t','Tires',k.tires_yr],['m','Maintenance',k.maint_yr],['r','Registration',k.reg_yr]];
  var tip=parts.map(function(p){return p[1]+' '+money(p[2])}).join(', ');
  return '<div class="cost">'+tl+'<br>Running <b>'+money(k.total_yr)+'/yr</b> &middot; 3-yr total <b>'+money(k.three_year_total)+'</b> <span style="color:var(--mute)">(no resale)</span>'+
   '<div class="cbar" title="'+tip+'" aria-label="'+tip+'">'+parts.map(function(p){return '<i class="'+p[0]+'" style="width:'+(p[2]/MAXYR*100).toFixed(1)+'%"></i>'}).join('')+'</div>'+
   '<div style="font-size:11px;color:var(--mute);margin-top:2px">Fuel '+money(k.fuel_yr)+' ('+k.mpg+' mpg) &middot; Ins. est. '+money(k.insurance_yr)+' &middot; Tires '+money(k.tires_yr)+' &middot; Maint. '+money(k.maint_yr)+' &middot; Reg. '+money(k.reg_yr)+'</div></div>';
}
function render(){
  var s=$('sort').value,list=cars.filter(passes);
  list.sort(function(a,b){return s=='price'?a.price-b.price:s=='miles'?a.miles-b.miles:s=='dist'?a.driveMin-b.driveMin:s=='yr'?cv(a,'total_yr')-cv(b,'total_yr'):s=='three'?cv(a,'three_year_total')-cv(b,'three_year_total'):a.rank-b.rank});
  $('list').innerHTML=list.length?list.map(card).join(''):'<div class="empty">No cars match these filters.</div>';
  var vis=new Set(list.map(function(c){return c.vin}));
  cars.slice().reverse().forEach(function(c){var m=markers[c.vin];if(vis.has(c.vin)){if(!map.hasLayer(m))m.addTo(map)}else if(map.hasLayer(m))map.removeLayer(m)});
  if(selVin)highlight(selVin);
}
function highlight(vin){
  document.querySelectorAll('.card.sel').forEach(function(e){e.classList.remove('sel')});
  var el=$('c-'+vin);if(el)el.classList.add('sel');
  cars.forEach(function(c){markers[c.vin].setStyle({weight:c.vin==vin?4:2,color:c.vin==vin?'#1f5eff':'#fff'});if(c.vin==vin)markers[c.vin].bringToFront()});
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
['fAuto','fOwner','fDmg','fPass','fDrive','fPrice','fCost','fBody','sort'].forEach(function(id){$(id).addEventListener('change',render)});

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

// clusters
var by={};cars.forEach(function(c){(by[c.city]=by[c.city]||[]).push(c)});
$('clusters').innerHTML=Object.keys(by).filter(function(k){return by[k].length>1}).sort(function(a,b){return by[b].length-by[a].length||by[a][0].driveMin-by[b][0].driveMin}).map(function(k){
  var l=by[k],dl=new Set(l.map(function(c){return c.dealer})).size;
  return '<li><strong>'+k+'</strong>: '+l.length+' cars at '+dl+' dealer'+(dl>1?'s':'')+', about '+hm(Math.min.apply(0,l.map(function(c){return c.driveMin})))+' away. '+l.sort(function(a,b){return a.rank-b.rank}).map(function(c){return '#'+c.rank+' '+esc(c.title)}).join(', ')+'.</li>'}).join('');
render();
})();

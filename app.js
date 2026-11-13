(function(){
var D=window.DATA,H=D.home,cars=D.cars;
var TC={'Top pick':'top','Worth a look':'maybe','Pass':'pass'};
var COL={top:'#0f9d58',maybe:'#e8a317',pass:'#9aa3ad'};
var $=function(id){return document.getElementById(id)};
var fmt=function(n){return n.toLocaleString('en-US')};
var money=function(n){return '$'+fmt(n)};
var hm=function(m){return m<60?m+' min':Math.floor(m/60)+' h '+(m%60)+' min'};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var photoEl=function(c,cls){return c.img?'<img'+(cls?' class="'+cls+'"':'')+' loading="lazy" alt="'+esc(c.title)+'" src="'+c.img+'" data-alt="'+(c.photo||'')+'" referrerpolicy="no-referrer" onerror="if(this.dataset.alt&&this.src!=this.dataset.alt){this.src=this.dataset.alt;this.dataset.alt=\'\'}else{this.style.display=\'none\'}">':''};
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
  m.bindPopup('<div class="pop">'+photoEl(c,'pop-img')+'<b>#'+c.rank+' '+esc(c.title)+'</b><br>'+money(c.price)+' &middot; '+fmt(c.miles)+' mi &middot; '+c.trans+(c.color?' &middot; '+esc(c.color):'')+'<br>'+esc(c.dealer)+', '+esc(c.city)+(c.locNote?'<br><i>'+esc(c.locNote)+'</i>':'')+'<br>'+(c.locNote?'About ':'')+hm(c.driveMin)+', '+c.driveMi+' mi from Fremont<br><a href="'+c.url+'" target="_blank" rel="noopener">View listing</a></div>');
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
  if($('fSrc').value&&c.source!=$('fSrc').value)return false;
  if($('fBody').value&&c.body!=$('fBody').value)return false;
  return true;
}
function dmgCls(d){return d=='None'?'good':(d.indexOf('Minor')>=0?'warn':'bad')}
function ownCls(o){return o=='1'?'good':(o=='2'?'warn':'bad')}
function card(c){
  var t=TC[c.tier];
  return '<article class="card" id="c-'+c.vin+'" data-vin="'+c.vin+'">'+
  (c.img?'<div class="ph"><span class="ph-fallback">'+esc(c.title.split(' ').slice(1,3).join(' '))+'</span>'+photoEl(c)+'<span class="rank">#'+c.rank+'</span></div>':
   '<div class="ph ph-none mk-'+c.title.split(' ')[1].toLowerCase().replace(/[^a-z]/g,'')+'"><span class="ph-model"><small>'+c.year+'</small>'+esc(c.title.split(' ').slice(1).join(' '))+'<em>No photo on listing</em></span><span class="rank">#'+c.rank+'</span></div>')+
  '<div><div class="h"><div class="title">'+esc(c.title)+'</div><div class="price">'+money(c.price)+'</div></div>'+
  '<div class="badges"><span class="tier '+t+'">'+c.tier+'</span><span class="b '+(c.trans=='Auto'?'auto':'man')+'">'+(c.trans=='Auto'?'Automatic':'Manual')+'</span><span class="b">'+fmt(c.miles)+' mi</span><span class="b '+ownCls(c.owners)+'">'+c.owners+' owner'+(c.owners=='1'?'':'s')+'</span><span class="b '+dmgCls(c.damage)+'">'+(c.damage=='None'?'No damage':c.damage)+'</span><span class="b">'+(c.service==null?'&mdash;':c.service)+' service records</span><span class="b">'+c.body+'</span><span class="b seller'+(c.seller=='Private'?' priv':'')+'">'+c.seller+'</span>'+(c.deal?'<span class="b deal">CARFAX: '+c.deal+(/Value/.test(c.deal)?'':' deal')+'</span>':'')+'<span class="b src">'+c.source+'</span></div>'+
  '<div class="meta">'+esc(c.dealer)+' &middot; '+esc(c.city)+(c.phone?' &middot; <a href="tel:'+c.phone.replace(/[^0-9]/g,'')+'">'+c.phone+'</a>':'')+'<br>'+(c.locNote?'About ':'')+hm(c.driveMin)+' &middot; '+c.driveMi+' mi from Fremont (no traffic)'+(c.locNote?'<br><span class="locnote">'+esc(c.locNote)+'</span>':'')+'</div>'+
  (c.color?'<div class="meta">Color: '+esc(c.color)+'</div>':'')+costHtml(c)+'<div class="why">'+esc(c.why)+'</div>'+
  '<div class="act"><a class="btn primary" href="'+c.url+'" target="_blank" rel="noopener">View listing</a><label class="addtrip"><input type="checkbox" class="tripchk" data-vin="'+c.vin+'"'+(trip.has(c.vin)?' checked':'')+'> Test-drive trip</label><span class="score">Score <b>'+c.score+'</b></span></div>'+
  '</div></article>';
}
function cv(c,k){return c.cost?c.cost[k]:1e9}
var MAXYR=Math.max.apply(0,cars.filter(function(c){return c.cost}).map(function(c){return c.cost.total_yr}));
function costHtml(c){
  var t=c.tire,k=c.cost;
  var tl='Tires '+(t?esc(t.size)+' &middot; set '+money(t.lo)+(t.hi?'-'+money(t.hi):' (budget; no premium pick in this size)')+' + '+money(t.install)+' install':'&mdash;');
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
['fAuto','fOwner','fDmg','fPass','fDrive','fPrice','fCost','fBody','fSrc','sort'].forEach(function(id){$(id).addEventListener('change',render)});

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
var nf=cars.filter(function(c){return c.source=='Search: 100 mi'}).sort(function(a,b){return a.rank-b.rank}).slice(0,5);
$('newfinds').innerHTML='<div class="nf-h"><strong>New finds</strong><span>Best 5 from the 100-mile CARFAX search (automatic, 1 owner, no damage, personal use)</span></div><div class="nf-row">'+nf.map(function(c){return '<button class="nf" data-vin="'+c.vin+'"><span class="nf-r">#'+c.rank+'</span><b>'+esc(c.title)+'</b><span>'+money(c.price)+' &middot; '+fmt(c.miles)+' mi &middot; '+(c.locNote?'about ':'')+hm(c.driveMin)+'</span><span>'+esc(c.city)+' &middot; '+c.seller+(c.cost?' &middot; '+money(c.cost.total_yr)+'/yr':'')+'</span></button>'}).join('')+'</div>';
function jump(v){if(!$('c-'+v)){['fAuto','fOwner','fDmg','fPass'].forEach(function(i){$(i).checked=false});['fDrive','fPrice','fCost'].forEach(function(i){$(i).value=$(i).options[0].value});$('fBody').value='';$('fSrc').value='';render()}select(v,false);var el=$('c-'+v);if(el)el.scrollIntoView({behavior:'smooth',block:'center'})}
$('newfinds').addEventListener('click',function(e){var b=e.target.closest('.nf');if(b)jump(b.dataset.vin)});
var byVin={};cars.forEach(function(c){byVin[c.vin]=c});
var EL=D.elite.map(function(e){var c=byVin[e.vin];return {c:c,risk:e.risk,inspect:e.inspect}});
var COLS=[['rank','#',function(r){return r.c.rank}],['car','Car',function(r){return r.c.title}],['price','Price',function(r){return r.c.price}],['otd','Out the door',function(r){return r.c.otd}],['miles','Miles',function(r){return r.c.miles}],['year','Year',function(r){return r.c.year}],['mpg','MPG',function(r){return r.c.cost.mpg}],['yr','Running /yr',function(r){return r.c.cost.total_yr}],['three','3-yr total',function(r){return r.c.cost.three_year_total}],['tires','Tire set',function(r){return r.c.tire.lo+r.c.tire.install}],['drive','Drive',function(r){return r.c.driveMin}],['seller','Seller',function(r){return r.c.seller}],['risk','Key risk',function(r){return r.risk}],['insp','Inspection to ask for',function(r){return r.inspect}]];
var esort={k:'rank',dir:1};
function cell(k,r){var c=r.c;switch(k){case 'rank':return '#'+c.rank;case 'car':return '<b>'+esc(c.title)+'</b><br><span class="mute">'+esc(c.dealer)+', '+esc(c.city)+'</span>';case 'price':return money(c.price);case 'otd':return money(c.otd);case 'miles':return fmt(c.miles);case 'year':return c.year;case 'mpg':return c.cost.mpg+(c.cost.grade=='premium'?' (prem)':'');case 'yr':return money(c.cost.total_yr);case 'three':return money(c.cost.three_year_total);case 'tires':return money(c.tire.lo+c.tire.install);case 'drive':return (c.locNote?'~':'')+hm(c.driveMin);case 'seller':return c.seller;case 'risk':return esc(r.risk);case 'insp':return esc(r.inspect)}}
function renderElite(){var col=COLS.filter(function(x){return x[0]==esort.k})[0];var rows=EL.slice().sort(function(a,b){var x=col[2](a),y=col[2](b);return (x>y?1:x<y?-1:0)*esort.dir});
 var g={};EL.forEach(function(r){var k=r.c.seller=='Private'?null:r.c.dealer+', '+r.c.city;if(k)(g[k]=g[k]||[]).push(r.c)});var cityG={};EL.forEach(function(r){(cityG[r.c.city]=cityG[r.c.city]||[]).push(r.c)});
 var notes=Object.keys(g).filter(function(k){return g[k].length>1}).map(function(k){return '<b>'+esc(k)+'</b> has '+g[k].length+' elite cars ('+g[k].map(function(c){return c.title.replace(/^\d+ /,'')}).join(', ')+')'});
 Object.keys(cityG).forEach(function(k){var L=cityG[k],ds={};L.forEach(function(c){ds[c.dealer]=1});if(L.length>1&&Object.keys(ds).length>1)notes.push('<b>'+esc(k)+'</b>: '+L.length+' elite cars in one trip ('+L.map(function(c){return c.title.replace(/^\d+ /,'')+' at '+esc(c.dealer)}).join('; ')+')')});
 $('elite').innerHTML='<div class="el-h"><strong>Elite shortlist</strong><span>Best '+EL.length+' of '+cars.length+' by score. Tap a column to sort, tap a row to see the car. Out the door = price + 10.25% tax + DMV fees + dealer doc fee; the inspection ($225) is extra.</span></div>'+
 '<div class="el-wrap"><table class="el"><thead><tr>'+COLS.map(function(x){return '<th data-k="'+x[0]+'"'+(x[0]==esort.k?' class="on"':'')+'>'+x[1]+(x[0]==esort.k?(esort.dir>0?' &#9650;':' &#9660;'):'')+'</th>'}).join('')+'</tr></thead><tbody>'+
 rows.map(function(r){return '<tr data-vin="'+r.c.vin+'">'+COLS.map(function(x){return '<td class="c-'+x[0]+'">'+cell(x[0],r)+'</td>'}).join('')+'</tr>'}).join('')+'</tbody></table></div>'+
 (notes.length?'<div class="el-n">'+notes.join('<br>')+'</div>':'')}
$('elite').addEventListener('click',function(e){var th=e.target.closest('th');if(th){var k=th.dataset.k;esort.dir=(esort.k==k)?-esort.dir:1;esort.k=k;renderElite();return}var tr=e.target.closest('tr[data-vin]');if(tr)jump(tr.dataset.vin)});
renderElite();
render();
})();

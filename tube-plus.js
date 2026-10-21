import {getApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,collection,addDoc,doc,getDoc,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const app=getApp(),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id),MAX=35*60,MAXB=100*1024*1024;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- video editor (applied with Cloudinary, no heavy work on the phone) ---------- */
const FIL={none:'',bw:'e_grayscale',sepia:'e_sepia',vivid:'e_saturation:50/e_contrast:15',bright:'e_brightness:25',cartoon:'e_cartoonify'};
const PRE={none:'',bw:'grayscale(1)',sepia:'sepia(1)',vivid:'saturate(1.5) contrast(1.15)',bright:'brightness(1.25)',cartoon:'contrast(1.4) saturate(1.7)'};
const ASP={orig:'',v:'ar_9:16,c_fill,w_720',sq:'ar_1:1,c_fill,w_720',h:'ar_16:9,c_fill,w_1280'};
const AR={orig:'16/9',v:'9/16',sq:'1/1',h:'16/9'};
const S='width:100%;padding:10px;border:1px solid #ccc;border-radius:10px;margin:4px 0 10px;font:inherit;box-sizing:border-box';

function ring(p){
  $('rn').textContent=p+'%';$('rc').style.strokeDashoffset=339.3*(1-p/100);
  $('rl').textContent=p>=100?'Saving your video…':'Uploading…';
}
function editor(f,dur){
  const o=document.createElement('div');
  o.style.cssText='position:fixed;inset:0;background:#fff;z-index:99;overflow:auto;max-width:560px;margin:auto;padding:14px;box-sizing:border-box;font-family:system-ui,sans-serif';
  const def=f.name.replace(/\.[^.]+$/,'');
  o.innerHTML='<h3 style="margin:0 0 8px">Edit video</h3>'
   +'<video id="ev" controls playsinline style="width:100%;max-height:300px;background:#000;object-fit:cover"></video>'
   +'<p class="s" style="font-size:12px;color:#606060">Preview is approximate. The final video is made after upload.</p>'
   +'<label>Title</label><input id="et" maxlength="100" style="'+S+'" value="'+esc(def)+'">'
   +'<label>Cut: start (seconds)</label><input id="es" type="number" min="0" step="0.5" value="0" style="'+S+'">'
   +'<label>Cut: end (seconds, total '+Math.floor(dur)+')</label><input id="ee" type="number" min="1" step="0.5" value="'+Math.floor(dur)+'" style="'+S+'">'
   +'<label>Picture size</label><select id="ea" style="'+S+'"><option value="orig">Original</option><option value="v">Tall 9:16 (phone)</option><option value="sq">Square 1:1</option><option value="h">Wide 16:9</option></select>'
   +'<label>Colour / look</label><select id="ef" style="'+S+'"><option value="none">None</option><option value="bw">Black and white</option><option value="sepia">Old film (sepia)</option><option value="vivid">Vivid colours</option><option value="bright">Brighter</option><option value="cartoon">Cartoon</option></select>'
   +'<div id="ep" style="display:none;position:fixed;inset:0;background:rgba(255,255,255,.95);z-index:100;flex-direction:column;align-items:center;justify-content:center"><div style="position:relative;width:140px;height:140px"><svg width="140" height="140" viewBox="0 0 120 120" style="transform:rotate(-90deg)"><circle cx="60" cy="60" r="54" fill="none" stroke="#eee" stroke-width="10"/><circle id="rc" cx="60" cy="60" r="54" fill="none" stroke="#e5322d" stroke-width="10" stroke-linecap="round" stroke-dasharray="339.3" stroke-dashoffset="339.3" style="transition:stroke-dashoffset .3s"/></svg><div id="rn" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 30px system-ui,sans-serif">0%</div></div><p id="rl" style="margin-top:16px;font:16px system-ui,sans-serif;color:#606060">Uploading…</p></div>'
   +'<div style="display:flex;gap:8px"><button id="eu" style="flex:1;padding:12px;border:0;border-radius:18px;background:#0f0f0f;color:#fff;font:inherit">Upload</button><button id="ec" style="padding:12px;border:0;border-radius:18px;background:#f2f2f2;font:inherit">Cancel</button></div>';
  document.body.appendChild(o);
  const v=$('ev');v.src=URL.createObjectURL(f);
  const look=()=>{v.style.filter=PRE[$('ef').value];v.style.aspectRatio=AR[$('ea').value]};
  $('ef').onchange=look;$('ea').onchange=look;look();
  $('es').onchange=()=>{v.currentTime=+$('es').value||0};
  $('ec').onclick=()=>o.remove();
  $('eu').onclick=()=>{
    const s=Math.max(0,+$('es').value||0),e=Math.min(dur,+$('ee').value||dur);
    if(e-s<1){alert('The cut must be at least 1 second.');return}
    if(e-s>MAX){alert('The cut is longer than 35 minutes.');return}
    const title=($('et').value.trim()||def).slice(0,100);
    const parts=[(s>0||e<Math.floor(dur))?'so_'+s+',eo_'+e:'',ASP[$('ea').value],FIL[$('ef').value]].filter(Boolean).join('/');
    $('eu').disabled=true;ring(0);$('ep').style.display='flex';
    const x=new XMLHttpRequest(),d=new FormData();
    d.append('file',f);d.append('upload_preset','tube_videos');
    x.open('POST','https://api.cloudinary.com/v1_1/qpaa2pyv/video/upload');
    x.upload.onprogress=ev=>{if(ev.lengthComputable)ring(Math.round(ev.loaded/ev.total*100))};
    x.onerror=()=>{alert('Upload failed. Check your internet.');$('eu').disabled=false;$('ep').style.display='none'};
    x.onload=async()=>{
      let r={};try{r=JSON.parse(x.responseText)}catch(_){}
      if(!r.secure_url){alert('Upload failed: '+((r.error&&r.error.message)||x.status));$('eu').disabled=false;$('ep').style.display='none';return}
      const url=parts?r.secure_url.replace('/upload/','/upload/'+parts+'/'):r.secure_url;
      const u=auth.currentUser;let name=(u.displayName||(u.email||'User').split('@')[0]);
      try{const m=await getDoc(doc(db,'users',u.uid));if(m.exists()&&m.data().name)name=m.data().name}catch(_){}
      try{await addDoc(collection(db,'videos'),{title,url,orig:r.secure_url,uid:u.uid,name,createdAt:serverTimestamp()})}
      catch(err){alert('Could not save: '+(err.code||err));$('eu').disabled=false;$('ep').style.display='none';return}
      o.remove();window.go('home');
    };
    x.send(d);
  };
}
const fi=$('file');
fi.onchange=e=>{
  const f=e.target.files[0];e.target.value='';if(!f)return;
  const v=document.createElement('video');v.preload='metadata';
  v.onloadedmetadata=()=>{
    if(f.size>MAXB)return alert('Video is bigger than 100 MB. Choose a smaller one.');
    if(v.duration>MAX)return alert('Video is longer than 35 minutes. Cut it in the editor to 35 minutes or less.');
    if(confirm('Upload only your own video. No copied, adult, violent or misleading content. Tap OK to agree to the Tube rules.'))editor(f,v.duration);
  };
  v.src=URL.createObjectURL(f);
};

/* ---------- ad codes saved from the owner panel ---------- */
let ads=null,loading=null;
function loadAds(){
  if(ads)return Promise.resolve(ads);
  if(!auth.currentUser)return Promise.resolve(null);
  return loading||(loading=getDoc(doc(db,'config','ads')).then(s=>(ads=s.exists()?s.data():{})).catch(()=>(ads={})));
}
async function inject(){
  const slots=[...document.querySelectorAll('#app .ad:not([data-done])')];
  if(!slots.length)return;
  const a=await loadAds();if(!a)return;
  const code=document.querySelector('#app .chips')?a.movies:a.feed;
  if(!code||!code.trim())return;
  slots.forEach(s=>{s.dataset.done='1';s.innerHTML='';s.style.background='none';s.appendChild(document.createRange().createContextualFragment(code))});
}
new MutationObserver(()=>setTimeout(inject,200)).observe($('app'),{childList:true,subtree:true});
inject();

/* ---------- app name: TUBE8 ---------- */
const NAME='TUBE8';
function rename(){
  document.title=NAME;
  const h=document.querySelector('header');
  if(h)h.childNodes.forEach(t=>{if(t.nodeType===3&&t.textContent.trim()==='Tube')t.textContent=NAME});
  const w=document.createTreeWalker($('app'),NodeFilter.SHOW_TEXT);let n;
  while((n=w.nextNode()))if(/\bTube\b/.test(n.textContent))n.textContent=n.textContent.replace(/\bTube\b/g,NAME);
}
new MutationObserver(rename).observe($('app'),{childList:true,subtree:true});
rename();

/* ---------- round loading spinner instead of plain "Loading…" text ---------- */
const st=document.createElement('style');
st.textContent='@keyframes tspin{to{transform:rotate(360deg)}}.sp{width:44px;height:44px;margin:40px auto;border:5px solid #eee;border-top-color:#e5322d;border-radius:50%;animation:tspin .8s linear infinite}';
document.head.appendChild(st);
function spin(){document.querySelectorAll('#app p.m.s').forEach(p=>{if(p.textContent.trim()==='Loading…'){p.className='';p.innerHTML='<div class="sp"></div>'}})}
new MutationObserver(spin).observe($('app'),{childList:true,subtree:true});
spin();

/* ---------- direct "Install app" button in the header ---------- */
let ip=null;
const ib=document.createElement('button');
ib.textContent='Install app';
ib.style.cssText='float:right;background:#e5322d;color:#fff;padding:6px 14px;font-size:13px;display:none';
document.querySelector('header').appendChild(ib);
window.addEventListener('beforeinstallprompt',e=>{ip=e;if(!matchMedia('(display-mode: standalone)').matches)ib.style.display='inline-block'});
ib.onclick=async()=>{if(!ip)return;ip.prompt();try{await ip.userChoice}catch(_){}ip=null;ib.style.display='none'};
window.addEventListener('appinstalled',()=>{ib.style.display='none'});

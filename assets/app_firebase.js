
const qs = (s)=>document.querySelector(s);

auth && auth.onAuthStateChanged(user=>{
  const badge = qs('#authStatus');
  if (badge) badge.textContent = user ? `Logged in: ${user.email}` : 'Not logged in';
});

(function initLogin(){
  const form = qs('#loginForm'); if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = qs('#loginEmail').value.trim();
    const pass = qs('#loginPassword').value;
    const out = qs('#loginOut');
    try{
      await auth.signInWithEmailAndPassword(email, pass);
      out.textContent = 'Login successful.'; out.className='success';
    }catch(err){
      out.textContent = err.message; out.className='error';
    }
  });
  const lo = qs('#btnLogout');
  if (lo) lo.addEventListener('click', ()=>auth.signOut());
})();

(function initContact(){
  const form = qs('#contactForm'); if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const btn = qs('#cSubmit'); btn.disabled = true;
    try{
      await db.collection('messages').add({
        name: qs('#cName').value.trim(),
        email: qs('#cEmail').value.trim(),
        message: qs('#cMessage').value.trim(),
        created_at: firebase.firestore.FieldValue.serverTimestamp()
      });
      alert('Message submitted.'); form.reset();
    }catch(err){ alert(err.message); } finally{ btn.disabled=false; }
  });
})();

(function initAdmin(){
  const form = qs('#uploadForm'); if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const out = qs('#uploadOut');
    if (!auth.currentUser){ out.textContent='Please login first.'; out.className='error'; return; }
    const file = qs('#fileInput').files[0];
    const title = qs('#docTitle').value.trim();
    const category = qs('#docCategory').value;
    const access = qs('#docAccess').value;
    if(!file || !title){ out.textContent='Title and file required.'; out.className='error'; return; }
    try{
      out.textContent='Uploading...'; out.className='note';
      const path = `documents/${Date.now()}_${file.name}`;
      const snap = await storage.ref(path).put(file);
      const url = await snap.ref.getDownloadURL();
      await db.collection('documents').add({
        title, category, access, filename:file.name, size:file.size, file_url:url,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
        uploaded_by: auth.currentUser.uid
      });
      out.textContent='Uploaded successfully.'; out.className='success'; form.reset();
    }catch(err){ out.textContent=err.message; out.className='error'; }
  });
})();

(function initRepo(){
  const tbody = qs('#docsTbody'); if(!tbody) return;
  const status = qs('#repoStatus');
  const catSel = qs('#repoCategoryFilter');
  const accSel = qs('#repoAccessFilter');
  const search = qs('#repoSearch');
  let ALL = [];
  function fmtDate(ts){ if(!ts) return ''; const d = ts.seconds ? new Date(ts.seconds*1000) : new Date(ts); return d.toLocaleDateString(); }
  function fmtSize(b){ if(b==null) return ''; const u=['B','KB','MB','GB']; let i=0; let n=b; while(n>=1024 && i<u.length-1){n/=1024;i++;} return n.toFixed(1)+' '+u[i]; }
  function draw(arr){
    tbody.innerHTML='';
    if(!arr.length){ tbody.innerHTML='<tr><td colspan="6">No documents found.</td></tr>'; return; }
    arr.forEach(d=>{
      const tr=document.createElement('tr');
      tr.innerHTML=`<td>${d.category||'-'}</td>
        <td>${d.title||'Untitled'}</td>
        <td>${fmtDate(d.created_at)}</td>
        <td><span class="badge ${d.access==='restricted'?'restricted':'public'}">${d.access||'public'}</span></td>
        <td>${fmtSize(d.size)}</td>
        <td><a href="${d.file_url}" target="_blank" rel="noopener">Download</a></td>`;
      tbody.appendChild(tr);
    });
  }
  function apply(){
    let list=[...ALL];
    const q=(search?.value||'').toLowerCase().trim();
    const cat=(catSel?.value)||'';
    const acc=(accSel?.value)||'';
    if(cat) list=list.filter(d=>(d.category||'')===cat);
    if(acc) list=list.filter(d=>(d.access||'public')===acc);
    if(q) list=list.filter(d=> (d.title||'').toLowerCase().includes(q) || (d.category||'').toLowerCase().includes(q));
    draw(list);
  }
  function fillCats(docs){
    if(!catSel) return;
    const set=new Set(docs.map(d=>d.category).filter(Boolean));
    catSel.innerHTML='<option value="">All categories</option>';
    [...set].sort().forEach(c=>{ const o=document.createElement('option'); o.value=c;o.textContent=c; catSel.appendChild(o); });
  }
  status.textContent='Loading...';
  db.collection('documents').orderBy('created_at','desc').onSnapshot(snap=>{
    ALL = snap.docs.map(x=>({id:x.id, ...x.data()}));
    fillCats(ALL); apply(); status.textContent='';
  }, err=> status.textContent=err.message );
  catSel && catSel.addEventListener('change', apply);
  accSel && accSel.addEventListener('change', apply);
  search && search.addEventListener('input', apply);
})();

// Bollywood Buff: simple static frontend. Edit the two settings below.
const SUPABASE_URL = 'https://qqaammrqrndlvmrklped.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_tlSzefedZyL2qsD3m8BAFw_M8GkJqBV';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const hostMode = new URLSearchParams(location.search).has('host');
const app = document.getElementById('app');
const tag = document.getElementById('tag');
let quiz=null, questions=[], participants=[], answers=[], participant=null, user=null;
let busy=false, remaining=10, notice='', tickTimer=null, pollTimer=null;
try { participant=JSON.parse(sessionStorage.getItem('buff_participant')||'null'); } catch { participant=null; }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s ?? '').toLocaleLowerCase('en').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}]/gu,'');
function btn(label,action,cls=''){return `<button class="${cls}" data-action="${action}" ${busy?'disabled':''}>${label}</button>`}
function currentQuestion(){return questions.find(q=>q.question_number===quiz?.current_question_number)}
function sortedPlayers(){return [...participants].sort((a,b)=>b.score-a.score||new Date(a.created_at)-new Date(b.created_at))}
function leaderboard(){let ps=sortedPlayers();return `<div class="leaderboard"><div class="panelTop"><span>LIVE LEADERBOARD</span><span>${ps.length} PLAYERS</span></div>${ps.length?`<ol>${ps.map((p,i)=>`<li><span class="rank">${String(i+1).padStart(2,'0')}</span><span class="playerName">${esc(p.name)}</span><strong>${p.score}</strong></li>`).join('')}</ol>`:'<p class="muted">Waiting for participants…</p>'}</div>`}
function statusLine(){return `<div class="statusline"><span class="pill">${esc(quiz?.status?.toUpperCase())}</span><span>${hostMode?`Participants: ${participants.length}/30`:`Player: ${esc(participant?.name)}`}</span>${!hostMode?`<span>Score: ${participants.find(p=>p.id===participant?.id)?.score??0}</span>`:''}</div>`}
function render(){
 tag.textContent=hostMode?'MASTER SCREEN':'PICTURE ABHI BAAKI HAI MERE DOST';
 if(hostMode){
  if(!user){app.innerHTML=`<div class="panelTop"><span>HOST CONTROL</span><span>CODE: BUFF</span></div><form id="login" class="stack"><h2>Host access</h2><p>Sign in with the host account created in Supabase Authentication.</p><label>Email<input name="email" type="email" required></label><label>Password<input name="password" type="password" required></label><button ${busy?'disabled':''}>Sign in</button></form>${message()}`;return}
  const q=currentQuestion();
  app.innerHTML=`<div class="panelTop"><span>HOST CONTROL</span><span>CODE: BUFF</span></div>${statusLine()}<div class="hostQuestion"><p class="eyebrow">QUESTION ${quiz?.current_question_number||0} / ${questions.length}</p><h1>${esc(q?.prompt|| (quiz?.status==='finished'?'Quiz complete!':'Ready to begin?'))}</h1>${quiz?.status==='question'?`<div class="timer">${remaining}</div>`:''}${quiz?.status==='revealed'?`<div class="answerReveal"><small>OFFICIAL ANSWER</small><h2>${esc(quiz.revealed_answer||'')}</h2></div>`:''}${quiz?.status==='finished'?'<p>All questions are complete.</p>':''}</div><div class="actions">${btn('Start quiz','start')}${btn('Reveal answer','reveal')}${btn('Next question','next')}${btn('Reset quiz','reset','danger')}${btn('Sign out','signout','secondary')}</div>${leaderboard()}${message()}`;
 }else if(!participant){
  app.innerHTML=`<form id="join" class="stack"><div class="panelTop"><span>JOIN THE QUIZ</span><span>CODE: BUFF</span></div><h1>Ready for the spotlight?</h1><p>Enter your full name. No short forms. One answer per question.</p><label>Your full name<input name="name" maxlength="80" required placeholder="Enter your full name"></label><button ${busy?'disabled':''}>Join Bollywood Buff</button></form>${message()}${leaderboard()}`;
 }else{
  const q=currentQuestion();
  let content='';
  if(quiz?.status==='lobby')content='<div class="hostQuestion"><h1>You are in!</h1><p>Wait for the host to start the quiz.</p></div>';
  if(quiz?.status==='question'&&q){
    const already=answers.some(a=>a.participant_id===participant.id&&a.question_id===q.id);
    content=already?'<div class="hostQuestion"><h1>Answer submitted!</h1><p>Wait for the answer reveal.</p></div>':`<form id="answerForm" class="stack"><p class="eyebrow">QUESTION ${q.question_number} / ${questions.length}</p><h1>${esc(q.prompt)}</h1><div class="timer small">${remaining}</div><label>Your answer<input name="answer" maxlength="180" autocomplete="off" required placeholder="Type your answer" ${remaining===0?'disabled':''}></label><p class="hint">Answer within 10 seconds. Case and punctuation do not matter.</p><button ${busy||remaining===0?'disabled':''}>Submit answer</button></form>`;
  }
  if(quiz?.status==='revealed')content=`<div class="answerReveal"><small>ANSWER REVEALED</small><h2>${esc(quiz.revealed_answer||'')}</h2><p>Wait for the host to continue.</p></div>`;
  if(quiz?.status==='finished')content='<div class="hostQuestion"><h1>Quiz complete!</h1><p>Thanks for playing Bollywood Buff.</p></div>';
  app.innerHTML=`${statusLine()}${content}${leaderboard()}${message()}`;
 }
}
function message(){return notice?`<p class="notice">${esc(notice)}</p>`:''}
async function loadState(){
 const {data:q,error}=await db.from('quizzes').select('*').eq('join_code','BUFF').maybeSingle();
 if(error){notice=error.message;app.innerHTML=`<h2>Connection error</h2><p>${esc(notice)}</p><p>Check the Supabase settings and run schema.sql.</p>`;return}
 if(!q){app.innerHTML='<h2>Quiz not found</h2><p>Run schema.sql in the Supabase SQL Editor.</p>';return}
 quiz=q;
 const [{data:qs,error:qe},{data:ps,error:pe}]=await Promise.all([
  db.from('questions').select('id,question_number,prompt,points').eq('quiz_id',q.id).order('question_number'),
  db.from('participants').select('id,name,score,created_at').eq('quiz_id',q.id).order('score',{ascending:false}).order('created_at')
 ]);
 if(qe||pe){notice=qe?.message||pe?.message;render();return}
 questions=qs||[];participants=ps||[];
 if(q.current_question_number>0){const {data:as}=await db.from('answers').select('participant_id,question_id,is_correct,points_awarded,submitted_at').eq('quiz_id',q.id);answers=as||[]}
 if(quiz.status==='question'&&quiz.question_started_at){
  const elapsed=(Date.now()-new Date(quiz.question_started_at).getTime())/1000;
  remaining=Math.max(0,Math.ceil(10-elapsed));
 }else remaining=10;
 render();
}
async function join(name){
 busy=true;notice='';render();
 const {data,error}=await db.rpc('join_quiz',{p_name:name.trim(),p_join_code:'BUFF'});
 busy=false;
 if(error)notice=error.message;else{participant=data;sessionStorage.setItem('buff_participant',JSON.stringify(data));notice='You have joined the quiz. Keep this tab open.'}
 await loadState();
}
async function submitAnswer(answer){
 busy=true;notice='';render();
 const {data,error}=await db.rpc('submit_quiz_answer',{p_participant_id:participant.id,p_token:participant.token,p_question_id:currentQuestion().id,p_answer:answer.trim()});
 busy=false;notice=error?error.message:(data?.message||'Answer submitted.');
 await loadState();
}
async function hostAction(action){
 if(action==='reset'&&!confirm('Reset the quiz and delete all submissions and scores?'))return;
 if(action==='signout'){await db.auth.signOut();return}
 busy=true;notice='';render();
 const {data,error}=await db.rpc('host_quiz_action',{p_action:action});
 busy=false;notice=error?error.message:(data?.message||'Action completed.');
 await loadState();
}
app.addEventListener('submit',async e=>{
 e.preventDefault();const f=e.target;
 if(f.id==='join')return join(new FormData(f).get('name'));
 if(f.id==='answerForm')return submitAnswer(new FormData(f).get('answer'));
 if(f.id==='login'){
  busy=true;notice='';render();
  const {error}=await db.auth.signInWithPassword({email:new FormData(f).get('email'),password:new FormData(f).get('password')});
  busy=false;notice=error?error.message:'Host signed in.';await loadState();
 }
});
app.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b)hostAction(b.dataset.action)});
db.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;render()});
db.auth.getSession().then(({data})=>{user=data.session?.user||null;loadState()});
db.channel('bollywood-buff-live')
 .on('postgres_changes',{event:'*',schema:'public',table:'quizzes'},loadState)
 .on('postgres_changes',{event:'*',schema:'public',table:'participants'},loadState)
 .on('postgres_changes',{event:'*',schema:'public',table:'answers'},loadState)
 .subscribe();
pollTimer=setInterval(loadState,2500);
tickTimer=setInterval(async()=>{
 if(quiz?.status==='question'&&quiz.question_started_at){
  const elapsed=(Date.now()-new Date(quiz.question_started_at).getTime())/1000;
  remaining=Math.max(0,Math.ceil(10-elapsed));
  if(remaining===0&&hostMode&&user){await hostAction('reveal');return}
  render();
 }
},250);

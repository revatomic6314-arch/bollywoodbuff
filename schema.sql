-- Bollywood Buff Live Quiz: run once in Supabase SQL Editor.
-- Uses Supabase Auth for host access and random participant tokens for anonymous players.
create extension if not exists pgcrypto;

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Bollywood Buff',
  join_code text not null unique default 'BUFF',
  status text not null default 'lobby' check (status in ('lobby','question','revealed','finished')),
  current_question_number integer not null default 0,
  question_started_at timestamptz,
  revealed_answer text,
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_number integer not null,
  prompt text not null,
  answer text not null,
  points integer not null default 100 check(points >= 0),
  unique(quiz_id, question_number)
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  name text not null check(length(trim(name)) between 2 and 80),
  token_hash text not null,
  score integer not null default 0 check(score >= 0),
  created_at timestamptz not null default now(),
  unique(quiz_id, name)
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  submitted_answer text not null,
  is_correct boolean not null default false,
  points_awarded integer not null default 0,
  submitted_at timestamptz not null default now(),
  unique(participant_id, question_id)
);

create table if not exists public.host_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists participants_quiz_score_idx on public.participants(quiz_id, score desc);
create index if not exists answers_quiz_question_idx on public.answers(quiz_id, question_id);

insert into public.quizzes(title, join_code)
values ('Bollywood Buff', 'BUFF')
on conflict (join_code) do nothing;

-- Seed the supplied 50 questions only when the quiz has no questions.
do $$
declare qid uuid;
begin
  select id into qid from public.quizzes where join_code='BUFF';
  if not exists(select 1 from public.questions where quiz_id=qid) then
    insert into public.questions(quiz_id,question_number,prompt,answer,points) values
    (qid,1,'What is Rancho’s real name in 3 Idiots?','Phunsukh Wangdu',100),
    (qid,2,'What is Veer Pratap Singh’s prisoner number in Veer-Zaara?','786',100),
    (qid,3,'What is the name of the village where Mohan works in Swades?','Charanpur',100),
    (qid,4,'Which Bollywood film features the dialogue, “Tension lene ka nahi, sirf dene ka”?','Munna Bhai M.B.B.S.',100),
    (qid,5,'What is Samar Anand’s profession in Jab Tak Hai Jaan?','Bomb disposal expert in the Indian Army',100),
    (qid,6,'What is Salman Khan’s character’s name in Bajrangi Bhaijaan?','Pawan Kumar Chaturvedi',100),
    (qid,7,'Which flavour of ice cream does Ambar want at 2 a.m. in Salaam Namaste?','Ben & Jerry’s Dark Belgian Chocolate Ice Cream',100),
    (qid,8,'What is the name of the village Munni belongs to in Bajrangi Bhaijaan?','Sultanpur',100),
    (qid,9,'Where is Phool Kumari’s husband from in Lapataa Ladies?','Soorajmukhi',100),
    (qid,10,'What message does Shah Rukh Khan’s character repeatedly share in My Name Is Khan?','My name is Khan, and I am not a terrorist',100),
    (qid,11,'What is Ranbir Kapoor’s character’s name in Tamasha?','Ved Vardhan Sahni',100),
    (qid,12,'What is Paresh Rawal’s character’s full name in Phir Hera Pheri?','Baburao Ganpatrao Apte',100),
    (qid,13,'What business does Sridevi’s character run in English Vinglish?','A homemade ladoo business',100),
    (qid,14,'Which activity does Farhan take his friends to in Zindagi Na Milegi Dobara?','Skydiving',100),
    (qid,15,'What is the name of the family dog in Dil Dhadakne Do?','Pluto',100),
    (qid,16,'Which word does Chatur mispronounce during his Teacher’s Day speech in 3 Idiots?','Chamatkaar Balatkar',100),
    (qid,17,'In which country was Dilwale Dulhania Le Jayenge primarily filmed?','Switzerland',100),
    (qid,18,'Which film features two men who pretend to be wealthy businessmen to impress a woman, leading to a series of comic misunderstandings?','Andaz Apna Apna',100),
    (qid,19,'What was the first feature-length film made in Indian cinema?','Raja Harishchandra',100),
    (qid,20,'Which song is performed during the major New York street sequence in Kal Ho Naa Ho?','Pretty Woman',100),
    (qid,21,'Which film marked Hrithik Roshan’s acting debut?','Kaho Naa Pyaar Hai',100),
    (qid,22,'Whose baby does Rancho help deliver in 3 Idiots?','Mona Sahastrabuddhe’s baby',100),
    (qid,23,'Which classical dance form plays a central role in Manjulika’s backstory in Bhool Bhulaiyaa?','Kathak',100),
    (qid,24,'What career does Aisha pursue after moving to Mumbai in Wake Up Sid?','Writer',100),
    (qid,25,'Which island do Ved and Tara visit together in Tamasha?','Corsica',100),
    (qid,26,'What milestone occasion does the family celebrate during their cruise in Dil Dhadakne Do?','Kamal and Neelam Mehra’s 30th wedding anniversary',100),
    (qid,27,'What is the name of the kidnapper in Hera Pheri?','Kabira',100),
    (qid,28,'Which subject does Anand Kumar teach in Super 30?','Mathematics',100),
    (qid,29,'Which two actors play the half-brothers Ranveer and Rajeev in Race?','Saif Ali Khan and Akshaye Khanna',100),
    (qid,30,'In which city is Barfi’s story set in Barfi!?','Darjeeling',100),
    (qid,31,'What is Kaira’s profession in Dear Zindagi?','Cinematographer',100),
    (qid,32,'What product does Harpreet Singh Bedi sell in Rocket Singh: Salesman of the Year?','Computers',100),
    (qid,33,'What name do the men give the little girl in Heyy Babyy?','Angel',100),
    (qid,34,'What is the name of the cursed deity associated with the hidden treasure in Tumbbad?','Hastar',100),
    (qid,35,'What is the name of the humanoid robot in Robot (Enthiran)?','Chitti',100),
    (qid,36,'Which foreign city do the theatre group members travel to in Bhagam Bhag?','London',100),
    (qid,37,'Which Bollywood film follows a man with short-term memory loss who tries to find the person responsible for a tragedy in his life?','Ghajini',100),
    (qid,38,'What event do Vijay and his family attend in Panaji in Drishyam?','Swami Chinmayanand Ji’s Satsang',100),
    (qid,39,'What name do the children give the stray dog in Chillar Party?','Bhidu',100),
    (qid,40,'Which actor plays the investigating officer in the double-murder case in Ittefaq?','Akshaye Khanna',100),
    (qid,41,'In which film does Alia Bhatt play an Indian woman who marries a Pakistani army officer to gather intelligence for India during the 1971 war?','Raazi',100),
    (qid,42,'Which film features two men who pretend to be a couple to stay in a luxurious house, only for both to fall for the owner’s niece?','Dostana',100),
    (qid,43,'What number is tattooed on Vijay’s arm in Deewaar?','786',100),
    (qid,44,'Who is Rehman’s rival in Dhurandhar?','Arshad Pappu',100),
    (qid,45,'Which Bollywood film features the dialogue, “Babu Moshai, zindagi badi honi chahiye, lambi nahi”?','Anand',100),
    (qid,46,'Which film follows a secret agent who falls in love with a woman during a mission, only to discover that they belong to opposing sides?','Ek Tha Tiger',100),
    (qid,47,'Which Bollywood film features the dialogue, “Dosti ka ek usool hai, madam: no sorry, no thank you”?','Maine Pyar Kiya',100),
    (qid,48,'Which film features the dialogue, “Kab tak meri maut ka tamasha dekhoge”?','Krantiveer',100),
    (qid,49,'Which Bollywood film features the dialogue, “Thappad se darr nahi lagta sahab, pyaar se lagta hai”?','Dabangg',100),
    (qid,50,'Which film features the dialogue, “Keh diya na, bas keh diya”?','Kabhi Khushi Kabhie Gham',100);
  end if;
end $$;

create extension if not exists unaccent;
create or replace function public.normalise_answer(input text)
returns text language sql immutable as $$
  select regexp_replace(lower(unaccent(coalesce(input,''))), '[^[:alnum:]]', '', 'g')
$$;

alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.participants enable row level security;
alter table public.answers enable row level security;
alter table public.host_users enable row level security;

-- Public clients may read non-secret quiz state, question prompts, and scores only.
drop policy if exists "public read quiz state" on public.quizzes;
create policy "public read quiz state" on public.quizzes for select to anon, authenticated using (true);
drop policy if exists "public read question prompts" on public.questions;
create policy "public read question prompts" on public.questions for select to anon, authenticated using (true);
drop policy if exists "public read leaderboard" on public.participants;
create policy "public read leaderboard" on public.participants for select to anon, authenticated using (true);
-- No direct client reads or writes to answers, and no direct participant inserts/updates.
revoke all on public.answers from anon, authenticated;
revoke insert, update, delete on public.participants from anon, authenticated;
revoke insert, update, delete on public.questions from anon, authenticated;
revoke insert, update, delete on public.quizzes from anon, authenticated;
revoke all on public.host_users from anon, authenticated;
grant select on public.quizzes, public.participants to anon, authenticated;
revoke select on public.questions from anon, authenticated;
grant select (id, quiz_id, question_number, prompt, points) on public.questions to anon, authenticated;

create or replace function public.join_quiz(p_name text, p_join_code text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare q public.quizzes; p public.participants; raw_token text;
begin
  select * into q from public.quizzes where join_code=upper(trim(p_join_code));
  if q.id is null then raise exception 'Quiz code not found.'; end if;
  if q.status <> 'lobby' then raise exception 'This quiz has already started.'; end if;
  if (select count(*) from public.participants where quiz_id=q.id) >= 30 then raise exception 'This quiz is full.'; end if;
  if length(trim(p_name)) < 2 or length(trim(p_name)) > 80 then raise exception 'Enter your full name.'; end if;
  raw_token := encode(gen_random_bytes(32),'hex');
  insert into public.participants(quiz_id,name,token_hash) values(q.id,trim(p_name),encode(digest(raw_token,'sha256'),'hex')) returning * into p;
  return jsonb_build_object('id',p.id,'name',p.name,'token',raw_token,'score',p.score);
exception when unique_violation then raise exception 'That name has already joined. Add your surname or another identifying detail.';
end $$;

create or replace function public.submit_quiz_answer(p_participant_id uuid,p_token text,p_question_id uuid,p_answer text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare p public.participants; qz public.quizzes; qu public.questions; correct boolean; pts integer;
begin
  select * into p from public.participants where id=p_participant_id and token_hash=encode(digest(p_token,'sha256'),'hex');
  if p.id is null then raise exception 'Participant session is invalid. Rejoin the quiz.'; end if;
  select * into qz from public.quizzes where id=p.quiz_id;
  if qz.status <> 'question' then raise exception 'Answers are not being accepted right now.'; end if;
  if qz.question_started_at is null or now() > qz.question_started_at + interval '10 seconds' then raise exception 'Time is up.';
  select * into qu from public.questions where id=p_question_id and quiz_id=p.quiz_id and question_number=qz.current_question_number;
  if qu.id is null then raise exception 'This is not the active question.'; end if;
  if length(trim(coalesce(p_answer,'')))=0 or length(p_answer)>180 then raise exception 'Enter one answer.'; end if;
  correct := public.normalise_answer(p_answer)=public.normalise_answer(qu.answer);
  pts := case when correct then qu.points else 0 end;
  insert into public.answers(quiz_id,participant_id,question_id,submitted_answer,is_correct,points_awarded)
  values(p.quiz_id,p.id,qu.id,trim(p_answer),correct,pts);
  update public.participants set score=score+pts where id=p.id;
  return jsonb_build_object('is_correct',correct,'points_awarded',pts,'message',case when correct then 'Correct! +'||pts||' points.' else 'Answer submitted.' end);
exception when unique_violation then raise exception 'You have already answered this question.';
end $$;

create or replace function public.host_quiz_action(p_action text)
returns jsonb language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare q public.quizzes; qu public.questions; ans text; host_id uuid;
begin
  host_id := auth.uid();
  if host_id is null or not exists(select 1 from public.host_users where user_id=host_id) then
    raise exception 'Host access denied. Add your authenticated user ID to public.host_users.';
  end if;
  select * into q from public.quizzes where join_code='BUFF' for update;
  if p_action='start' then
    if q.current_question_number=0 then update public.quizzes set current_question_number=1,status='question',question_started_at=now(),revealed_answer=null,updated_at=now() where id=q.id;
    else update public.quizzes set status='question',question_started_at=now(),revealed_answer=null,updated_at=now() where id=q.id; end if;
  elsif p_action='reveal' then
    select * into qu from public.questions where quiz_id=q.id and question_number=q.current_question_number;
    if qu.id is null then raise exception 'No active question to reveal.'; end if;
    update public.quizzes set status='revealed',revealed_answer=qu.answer,updated_at=now() where id=q.id;
  elsif p_action='next' then
    if q.current_question_number >= (select count(*) from public.questions where quiz_id=q.id) then
      update public.quizzes set status='finished',updated_at=now() where id=q.id;
    else
      update public.quizzes set current_question_number=q.current_question_number+1,status='question',question_started_at=now(),revealed_answer=null,updated_at=now() where id=q.id;
    end if;
  elsif p_action='reset' then
    -- Explicitly scope deletions to this quiz. Cascading foreign keys are not relied on for clarity.
    delete from public.answers where quiz_id=q.id;
    update public.participants set score=0 where quiz_id=q.id;
    delete from public.participants where quiz_id=q.id;
    update public.quizzes set status='lobby',current_question_number=0,question_started_at=null,revealed_answer=null,updated_at=now() where id=q.id;
  else raise exception 'Unknown host action.';
  end if;
  return jsonb_build_object('message','Action completed.','action',p_action);
end $$;

revoke all on function public.join_quiz(text,text) from public;
revoke all on function public.submit_quiz_answer(uuid,text,uuid,text) from public;
revoke all on function public.host_quiz_action(text) from public;
grant execute on function public.join_quiz(text,text) to anon, authenticated;
grant execute on function public.submit_quiz_answer(uuid,text,uuid,text) to anon, authenticated;
grant execute on function public.host_quiz_action(text) to authenticated;

-- Enable Realtime publication membership without failing on reruns.
do $$ declare t text; begin
  foreach t in array array['quizzes','participants','answers'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=t
    ) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;


/* ==========================================
   BOLLYWOOD BUFF
   Main application
   ========================================== */

const SUPABASE_URL =
  'https://qqaammrqrndlvmrklped.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_tlSzefedZyL2qsD3m8BAFw_M8GkJqBV';

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const hostMode =
  new URLSearchParams(window.location.search).has('host');

const app = document.getElementById('app');
const tag = document.getElementById('tag');

let quiz = null;
let questions = [];
let participants = [];
let answers = [];
let participant = null;
let user = null;
let busy = false;
let remaining = 10;
let notice = '';

let tickTimer = null;
let pollTimer = null;
let lastQuestionId = null;

try {
  participant = JSON.parse(
    sessionStorage.getItem('buff_participant') || 'null'
  );
} catch {
  participant = null;
}

/* ==========================================
   HELPER FUNCTIONS
   ========================================== */

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function currentQuestion() {
  return questions.find(
    question =>
      question.question_number ===
      quiz?.current_question_number
  );
}

function sortedPlayers() {
  return [...participants].sort(
    (a, b) =>
      b.score - a.score ||
      new Date(a.created_at) - new Date(b.created_at)
  );
}

function message() {
  return notice
    ? `<p class="notice">${esc(notice)}</p>`
    : '';
}

function btn(label, action, cls = '') {
  return `
    <button
      type="button"
      class="${cls}"
      data-action="${action}"
      ${busy ? 'disabled' : ''}
    >${label}</button>
  `;
}

/*
 * Check whether this participant has submitted an answer
 * for the current question.
 */
function hasAnswered(questionId) {
  if (!participant || !questionId) return false;

  return answers.some(answer =>
    answer.participant_id === participant.id &&
    answer.question_id === questionId
  );
}

/* ==========================================
   LEADERBOARD
   ========================================== */

function leaderboard() {
  const players = sortedPlayers();

  return `
    <div class="leaderboard">
      <div class="panelTop">
        <span>LIVE LEADERBOARD</span>
        <span>${players.length} PLAYERS</span>
      </div>

      ${
        players.length
          ? `
            <ol>
              ${players.map((player, index) => `
                <li>
                  <span class="rank">
                    ${String(index + 1).padStart(2, '0')}
                  </span>

                  <span class="playerName">
                    ${esc(player.name)}
                  </span>

                  <strong>${player.score}</strong>
                </li>
              `).join('')}
            </ol>
          `
          : '<p class="muted">Waiting for participants…</p>'
      }
    </div>
  `;
}

function statusLine() {
  const myPlayer = participants.find(
    player => player.id === participant?.id
  );

  return `
    <div class="statusline">
      <span class="pill">
        ${esc(quiz?.status?.toUpperCase())}
      </span>

      <span>
        ${
          hostMode
            ? `Participants: ${participants.length}/30`
            : `Player: ${esc(participant?.name)}`
        }
      </span>

      ${
        !hostMode
          ? `<span>Score: ${myPlayer?.score ?? 0}</span>`
          : ''
      }
    </div>
  `;
}

/* ==========================================
   PAGE RENDERING
   ========================================== */

/*
 * Do not replace the page while a participant is
 * typing. This prevents their text from disappearing.
 */
function render(force = false) {
  const focused = document.activeElement;

  if (
    !force &&
    focused &&
    app.contains(focused) &&
    focused.matches('input, textarea')
  ) {
    return;
  }

  tag.textContent = hostMode
    ? 'MASTER SCREEN'
    : 'PICTURE ABHI BAAKI HAI MERE DOST';

  /* HOST LOGIN AND DASHBOARD */

  if (hostMode) {
    if (!user) {
      app.innerHTML = `
        <div class="panelTop">
          <span>HOST CONTROL</span>
          <span>CODE: BUFF</span>
        </div>

        <form id="login" class="stack">
          <h2>Host access</h2>

          <p>
            Sign in with the host account created
            in Supabase Authentication.
          </p>

          <label>
            Email
            <input
              name="email"
              type="email"
              autocomplete="username"
              required
            >
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              autocomplete="current-password"
              required
            >
          </label>

          <button type="submit" ${busy ? 'disabled' : ''}>
            Sign in
          </button>
        </form>

        ${message()}
      `;

      return;
    }

    const question = currentQuestion();

    app.innerHTML = `
      <div class="panelTop">
        <span>HOST CONTROL</span>
        <span>CODE: BUFF</span>
      </div>

      ${statusLine()}

      <div class="hostQuestion">
        <p class="eyebrow">
          QUESTION
          ${quiz?.current_question_number || 0}
          / ${questions.length}
        </p>

        <h1>
          ${esc(
            question?.prompt ||
            (
              quiz?.status === 'finished'
                ? 'Quiz complete!'
                : 'Ready to begin?'
            )
          )}
        </h1>

        ${
          quiz?.status === 'question'
            ? `<div class="timer">${remaining}</div>`
            : ''
        }

        ${
          quiz?.status === 'revealed'
            ? `
              <div class="answerReveal">
                <small>OFFICIAL ANSWER</small>
                <h2>${esc(quiz.revealed_answer || '')}</h2>
              </div>
            `
            : ''
        }

        ${
          quiz?.status === 'finished'
            ? '<p>All questions are complete.</p>'
            : ''
        }
      </div>

      <div class="actions">
        ${btn('Start quiz', 'start')}
        ${btn('Reveal answer', 'reveal')}
        ${btn('Next question', 'next')}
        ${btn('Reset quiz', 'reset', 'danger')}
        ${btn('Sign out', 'signout', 'secondary')}
      </div>

      ${leaderboard()}
      ${message()}
    `;

    return;
  }

  /* PARTICIPANT JOIN PAGE */

  if (!participant) {
    app.innerHTML = `
      <form id="join" class="stack">
        <div class="panelTop">
          <span>JOIN THE QUIZ</span>
          <span>CODE: BUFF</span>
        </div>

        <h1>Ready for the spotlight?</h1>

        <p>
          Enter your full name. Use one answer per question.
        </p>

        <label>
          Your full name
          <input
            name="name"
            maxlength="80"
            autocomplete="name"
            required
            placeholder="Enter your full name"
          >
        </label>

        <button type="submit" ${busy ? 'disabled' : ''}>
          Join Bollywood Buff
        </button>
      </form>

      ${message()}
      ${leaderboard()}
    `;

    return;
  }

  /* PARTICIPANT QUIZ PAGE */

  const question = currentQuestion();
  let content = '';

  if (quiz?.status === 'lobby') {
    content = `
      <div class="hostQuestion">
        <h1>You are in!</h1>
        <p>Wait for the host to start the quiz.</p>
      </div>
    `;
  }

  /*
   * KEY FEATURE:
   * If the participant has answered this question,
   * do not render the answer form.
   */
  if (quiz?.status === 'question' && question) {
    const already = hasAnswered(question.id);

    if (already) {
      content = `
        <div class="hostQuestion answerSubmitted">
          <h1>Answer submitted!</h1>

          <p>
            Your answer has been recorded.
            You cannot change it.
          </p>

          <p>
            Wait for the host to reveal the answer
            or start the next question.
          </p>
        </div>
      `;
    } else {
      content = `
        <form id="answerForm" class="stack">
          <p class="eyebrow">
            QUESTION ${question.question_number}
            / ${questions.length}
          </p>

          <h1>${esc(question.prompt)}</h1>

          <div class="timer small">${remaining}</div>

          <label>
            Your answer

            <input
              name="answer"
              maxlength="180"
              autocomplete="off"
              required
              placeholder="Type your answer"
              ${remaining === 0 ? 'disabled' : ''}
            >
          </label>

          <p class="hint">
            Answer within 10 seconds.
            Case and punctuation do not matter.
          </p>

          <button
            type="submit"
            ${busy || remaining === 0 ? 'disabled' : ''}
          >
            Submit answer
          </button>
        </form>
      `;
    }
  }

  if (quiz?.status === 'revealed') {
    content = `
      <div class="answerReveal">
        <small>ANSWER REVEALED</small>

        <h2>${esc(quiz.revealed_answer || '')}</h2>

        <p>Wait for the host to continue.</p>
      </div>
    `;
  }

  if (quiz?.status === 'finished') {
    content = `
      <div class="hostQuestion">
        <h1>Quiz complete!</h1>
        <p>Thanks for playing Bollywood Buff.</p>
      </div>
    `;
  }

  app.innerHTML = `
    ${statusLine()}
    ${content}
    ${leaderboard()}
    ${message()}
  `;
}

/* ==========================================
   LOAD QUIZ DATA
   ========================================== */

async function loadState(force = false) {
  const { data: quizData, error: quizError } = await db
    .from('quizzes')
    .select('*')
    .eq('join_code', 'BUFF')
    .maybeSingle();

  if (quizError) {
    notice = quizError.message;
    render(force);
    return;
  }

  if (!quizData) {
    notice = 'Quiz not found. Run schema.sql in Supabase.';
    render(force);
    return;
  }

  const previousQuestionId = lastQuestionId;

  quiz = quizData;

  const [
    { data: questionData, error: questionError },
    { data: participantData, error: participantError }
  ] = await Promise.all([
    db
      .from('questions')
      .select('id,question_number,prompt,points')
      .eq('quiz_id', quizData.id)
      .order('question_number'),

    db
      .from('participants')
      .select('id,name,score,created_at')
      .eq('quiz_id', quizData.id)
      .order('score', { ascending: false })
      .order('created_at')
  ]);

  if (questionError || participantError) {
    notice =
      questionError?.message ||
      participantError?.message;

    render(force);
    return;
  }

  questions = questionData || [];
  participants = participantData || [];

  const question = currentQuestion();
  lastQuestionId = question?.id || null;

  /*
   * When the question changes, the old answer must not
   * count as an answer to the new question.
   */
  if (previousQuestionId !== lastQuestionId) {
    answers = [];
  }

  /*
   * Load answer records for the current question.
   * This lets participants see the confirmation even
   * if they reload the page after submitting.
   */
  if (question) {
    const { data: answerData, error: answerError } = await db
      .from('answers')
      .select(
        'participant_id,question_id,is_correct,points_awarded,submitted_at'
      )
      .eq('quiz_id', quizData.id)
      .eq('question_id', question.id);

    if (!answerError) {
      answers = answerData || [];
    }
  } else {
    answers = [];
  }

  if (
    quiz.status === 'question' &&
    quiz.question_started_at
  ) {
    const elapsed =
      (
        Date.now() -
        new Date(quiz.question_started_at).getTime()
      ) / 1000;

    remaining = Math.max(0, Math.ceil(10 - elapsed));
  } else {
    remaining = 10;
  }

  render(force);
}

/* ==========================================
   PARTICIPANT ACTIONS
   ========================================== */

async function join(name) {
  if (busy) return;

  busy = true;
  notice = 'Joining quiz…';
  render(true);

  const { data, error } = await db.rpc('join_quiz', {
    p_name: name.trim(),
    p_join_code: 'BUFF'
  });

  busy = false;

  if (error) {
    notice = error.message;
  } else {
    participant = data;

    sessionStorage.setItem(
      'buff_participant',
      JSON.stringify(data)
    );

    notice = 'You have joined the quiz.';
  }

  await loadState(true);
}

async function submitAnswer(answer) {
  if (busy || !participant) return;

  const question = currentQuestion();

  if (!question) return;

  if (hasAnswered(question.id)) {
    notice = 'You have already answered this question.';
    render(true);
    return;
  }

  if (remaining <= 0) {
    notice = 'Time is up.';
    render(true);
    return;
  }

  busy = true;
  notice = 'Submitting answer…';

  /*
   * Disable the submit button immediately.
   * Do not render the page before capturing the answer.
   */
  render(true);

  const { data, error } = await db.rpc(
    'submit_quiz_answer',
    {
      p_participant_id: participant.id,
      p_token: participant.token,
      p_question_id: question.id,
      p_answer: answer.trim()
    }
  );

  busy = false;

  if (error) {
    notice = error.message;
  } else {
    /*
     * Add a local answer record immediately.
     * This removes the answer form without waiting
     * for the next background database update.
     */
    const record = {
      participant_id: participant.id,
      question_id: question.id,
      is_correct: data?.is_correct ?? false,
      points_awarded: data?.points_awarded ?? 0,
      submitted_at: new Date().toISOString()
    };

    const exists = answers.some(
      item =>
        item.participant_id === record.participant_id &&
        item.question_id === record.question_id
    );

    if (!exists) {
      answers = [...answers, record];
    }

    notice = 'Your answer has been recorded.';
  }

  /*
   * Force the updated interface.
   * If successful, the answer box disappears now.
   */
  await loadState(true);
}

/* ==========================================
   HOST ACTIONS
   ========================================== */

async function hostAction(action) {
  if (busy) return;

  if (
    action === 'reset' &&
    !confirm(
      'Reset the quiz and delete all submissions and scores?'
    )
  ) {
    return;
  }

  if (action === 'signout') {
    await db.auth.signOut();

    user = null;
    notice = 'Signed out.';

    render(true);
    return;
  }

  busy = true;
  notice = 'Processing…';
  render(true);

  const { data, error } = await db.rpc(
    'host_quiz_action',
    {
      p_action: action
    }
  );

  busy = false;

  notice = error
    ? error.message
    : (data?.message || 'Action completed.');

  await loadState(true);
}

/* ==========================================
   FORM SUBMISSION
   ========================================== */

app.addEventListener('submit', async event => {
  event.preventDefault();

  const form = event.target;

  /*
   * Read form data before changing the interface.
   */
  const formData = new FormData(form);

  if (form.id === 'login') {
    const email = String(
      formData.get('email') || ''
    ).trim();

    const password = String(
      formData.get('password') || ''
    );

    if (!email || !password || busy) return;

    busy = true;

    const submitButton = form.querySelector(
      'button[type="submit"]'
    );

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Signing in…';
    }

    const { data, error } =
      await db.auth.signInWithPassword({
        email,
        password
      });

    busy = false;

    if (error) {
      notice = error.message;
      render(true);
      return;
    }

    user = data.user;
    notice = 'Host signed in.';

    await loadState(true);
    return;
  }

  if (form.id === 'join') {
    const name = String(
      formData.get('name') || ''
    ).trim();

    if (!name) {
      notice = 'Enter your full name.';
      return;
    }

    await join(name);
    return;
  }

  if (form.id === 'answerForm') {
    const answer = String(
      formData.get('answer') || ''
    ).trim();

    if (!answer) {
      notice = 'Enter your answer.';
      return;
    }

    await submitAnswer(answer);
  }
});

/* ==========================================
   BUTTON ACTIONS
   ========================================== */

app.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');

  if (!button) return;

  hostAction(button.dataset.action);
});

/* ==========================================
   AUTHENTICATION
   ========================================== */

db.auth.onAuthStateChange((_event, session) => {
  user = session?.user || null;
  render();
});

db.auth.getSession().then(({ data, error }) => {
  if (error) {
    notice = error.message;
  }

  user = data?.session?.user || null;

  loadState(true);
});

/* ==========================================
   LIVE DATABASE UPDATES
   ========================================== */

db.channel('bollywood-buff-live')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'quizzes'
    },
    () => loadState()
  )
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'participants'
    },
    () => loadState()
  )
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'answers'
    },
    () => loadState()
  )
  .subscribe();

/*
 * Periodic refresh:
 * render() protects active text fields from replacement.
 */
pollTimer = setInterval(() => {
  loadState();
}, 2500);

/* ==========================================
   COUNTDOWN TIMER
   ========================================== */

tickTimer = setInterval(async () => {
  if (
    quiz?.status !== 'question' ||
    !quiz.question_started_at
  ) {
    return;
  }

  const elapsed =
    (
      Date.now() -
      new Date(quiz.question_started_at).getTime()
    ) / 1000;

  remaining = Math.max(0, Math.ceil(10 - elapsed));

  /*
   * Update the visible countdown without rebuilding
   * the form while someone is typing.
   */
  app.querySelectorAll('.timer').forEach(element => {
    element.textContent = remaining;
  });

  const active = document.activeElement;

  const typing =
    active &&
    app.contains(active) &&
    active.matches('input, textarea');

  if (!typing) {
    render();
  }

  if (
    remaining === 0 &&
    hostMode &&
    user &&
    !busy
  ) {
    await hostAction('reveal');
  }
}, 250);

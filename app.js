class QuestionBank {
  constructor() {
    this.questions = [];
  }

  async loadGeneralQuestions() {
    try {
      const response = await fetch('questions.json');
      const data = await response.json();
      this.questions = data;
      assignUnitToQuestions(this.questions);
      console.log(`Cargadas ${this.questions.length} preguntas generales.`);
    } catch (error) {
      console.error('Error cargando questions.json:', error);
    }
  }

  async loadOfficialExam(number) {
    try {
      const response = await fetch(`Official-Exams/${number}.json`);
      if (!response.ok) throw new Error('Archivo no encontrado');
      const data = await response.json();
      return data;
    } catch (error) {
      alert(`No se pudo cargar el examen ${number}. Asegúrate de que el archivo Official-Exams/${number}.json exista.`);
      return null;
    }
  }
}

// --- KEYWORDS POR MÓDULO ---
const agentforce_units_keywords = {
  'Prompt Engineering': ['Prompt Engineering'],
  'AI Agents': ['AI Agents'],
  'Data Cloud for Agentforce': ['Data Cloud for Agentforce'],
  'Deployment Lifecycle': ['Deployment Lifecycle'],
  'Multi-Agent Interoperability': ['Multi-Agent Interoperability']
};

function assignUnitToQuestions(questions) {
  questions.forEach(q => {
    if (agentforce_units_keywords[q.module]) {
      q.unit = q.module;
    } else {
      q.unit = 'Miscellaneous';
    }
  });
}

// --- ESTADO GLOBAL ---
const app = new QuestionBank();
let currentQuestions = [];
let currentIndex = 0;
let userAnswers = [];
let examHistory = JSON.parse(localStorage.getItem('examHistory')) || [];
let failedQuestionsMap = JSON.parse(localStorage.getItem('failedQuestionsMap')) || {};

function saveActiveExam(titleContext) {
  if (currentQuestions.length === 0) return;
  const state = { currentQuestions, currentIndex, userAnswers, timerSeconds, titleContext };
  localStorage.setItem('activeExamState', JSON.stringify(state));
}
function clearActiveExam() {
  localStorage.removeItem('activeExamState');
}

// Dark mode y Atajos de teclado
window.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('theme-toggle');
  if(toggle) {
    toggle.onclick = () => {
      document.body.classList.toggle('dark-mode');
      localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    };
    if(localStorage.getItem('darkMode') === 'true') document.body.classList.add('dark-mode');
  }

  document.addEventListener('keydown', (e) => {
    if(e.target.tagName === 'INPUT' || document.getElementById('app').innerHTML === '') return;
    const num = parseInt(e.key);
    if (!isNaN(num) && num > 0) {
      const inputs = document.querySelectorAll('input[name="option"]');
      if (inputs[num - 1]) inputs[num - 1].click();
    }
    if (e.key === 'ArrowRight') {
      const btn = document.querySelector('.next-btn') || Array.from(document.querySelectorAll('.nav-arrow-btn')).find(b => b.textContent && b.textContent.includes('Siguiente'));
      if (btn) btn.click();
    }
    if (e.key === 'ArrowLeft') {
      const btn = Array.from(document.querySelectorAll('.nav-arrow-btn')).find(b => b.textContent && b.textContent.includes('Anterior'));
      if (btn) btn.click();
    }
  });
});

// --- TEMPORIZADOR ---
let timerInterval = null;
let timerSeconds = 0;
let extraTime = false; // si el usuario activó +30 min por idioma

const EXAM_BASE_MINUTES = 105;
const EXAM_EXTRA_MINUTES = 30; // extra por idioma no nativo

function getTotalExamSeconds() {
  return (EXAM_BASE_MINUTES + (extraTime ? EXAM_EXTRA_MINUTES : 0)) * 60;
}

function startTimer(totalSeconds) {
  stopTimer();
  timerSeconds = totalSeconds;
  renderTimerDisplay();
  timerInterval = setInterval(() => {
    timerSeconds--;
    renderTimerDisplay();
    if (timerSeconds <= 0) {
      stopTimer();
      forceFinishExam();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function renderTimerDisplay() {
  const el = document.getElementById('exam-timer');
  if (!el) return;
  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  el.textContent = `⏱ ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Color de aviso cuando quedan menos de 10 minutos
  if (timerSeconds <= 600) {
    el.style.color = timerSeconds <= 300 ? '#e53e3e' : '#dd6b20';
  } else {
    el.style.color = '#38a169';
  }

  // Autosave
  if (document.querySelector('.finish-exam-btn')) {
    userAnswers[currentIndex].selected = getSelectedOptions();
    saveActiveExam(document.querySelector('.question-info')?.textContent.split(':')[0] || 'Examen');
  }
}

function forceFinishExam() {
  // Guardar la pregunta actual si no respondió
  if (currentIndex < currentQuestions.length) {
    userAnswers[currentIndex].selected = getSelectedOptions();
  }
  showExamResults('Examen (Tiempo agotado)');
}

// --- INICIALIZACIÓN ---
window.addEventListener('DOMContentLoaded', async () => {
  await app.loadGeneralQuestions();
  showMainMenu();
});

// --- MENÚ PRINCIPAL ---
function showMainMenu() {
  stopTimer();
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';

  const title = document.createElement('h1');
  title.textContent = 'Práctica Salesforce Agentforce';
  appDiv.appendChild(title);

  // Toggle extra time
  const timeToggleDiv = document.createElement('div');
  timeToggleDiv.className = 'time-toggle-container';

  const toggleLabel = document.createElement('label');
  toggleLabel.className = 'time-toggle-label';
  toggleLabel.htmlFor = 'extra-time-toggle';

  const toggleInput = document.createElement('input');
  toggleInput.type = 'checkbox';
  toggleInput.id = 'extra-time-toggle';
  toggleInput.checked = extraTime;
  toggleInput.onchange = (e) => {
    extraTime = e.target.checked;
    timeInfoSpan.textContent = extraTime
      ? `⏱ Tiempo: ${EXAM_BASE_MINUTES + EXAM_EXTRA_MINUTES} min (${EXAM_BASE_MINUTES} + ${EXAM_EXTRA_MINUTES} extra por idioma)`
      : `⏱ Tiempo: ${EXAM_BASE_MINUTES} min`;
  };

  const toggleText = document.createElement('span');
  toggleText.textContent = ' +30 min por idioma no nativo (ESL)';

  toggleLabel.appendChild(toggleInput);
  toggleLabel.appendChild(toggleText);
  timeToggleDiv.appendChild(toggleLabel);

  const timeInfoSpan = document.createElement('p');
  timeInfoSpan.className = 'time-info';
  timeInfoSpan.textContent = extraTime
    ? `⏱ Tiempo: ${EXAM_BASE_MINUTES + EXAM_EXTRA_MINUTES} min (${EXAM_BASE_MINUTES} + ${EXAM_EXTRA_MINUTES} extra por idioma)`
    : `⏱ Tiempo: ${EXAM_BASE_MINUTES} min`;
  timeToggleDiv.appendChild(timeInfoSpan);

  appDiv.appendChild(timeToggleDiv);

  const activeState = JSON.parse(localStorage.getItem('activeExamState'));
  if (activeState && activeState.currentQuestions && activeState.currentQuestions.length > 0) {
    const resumeBtn = createButton(appDiv, ' ⏳ CONTINUAR EXAMEN EN CURSO', () => {
      currentQuestions = activeState.currentQuestions;
      currentIndex = activeState.currentIndex;
      userAnswers = activeState.userAnswers;
      startTimer(activeState.timerSeconds);
      renderClassicExamQuestion(currentQuestions[currentIndex], activeState.titleContext);
    });
    resumeBtn.style.background = 'linear-gradient(92deg, #d69e2e 0%, #b7791f 100%)';
  }

  createButton(appDiv, ' UNITS (por módulo)', () => showUnitsMenu());
  createButton(appDiv, ' MODO EXAMEN (Aleatorio)', () => startGeneralExamMode());
  createButton(appDiv, ' EXÁMENES OFICIALES', () => showOfficialExamsMenu());
  createButton(appDiv, ' MI PROGRESO Y ESTADÍSTICAS', () => showStatsPanel());
  createButton(appDiv, ' REPASAR MIS ERRORES', () => startErrorReviewMode());
}

function showStatsPanel() {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';
  createBackButton(appDiv, showMainMenu);
  
  const title = document.createElement('h2');
  title.textContent = 'Panel de Estadísticas';
  appDiv.appendChild(title);
  
  if (examHistory.length === 0) {
    const p = document.createElement('p');
    p.style.textAlign = 'center';
    p.textContent = 'Aún no has completado ningún examen.';
    appDiv.appendChild(p);
    return;
  }
  
  const avg = Math.round(examHistory.reduce((acc, curr) => acc + curr.score, 0) / examHistory.length);
  
  const statsContent = document.createElement('div');
  statsContent.innerHTML = `<div class="score-display score-passed"><div class="score-percent">${avg}%</div><div class="score-detail">Nota Media Histórica</div></div>` + 
    `<h3>Últimos exámenes:</h3><ul style="text-align:left; line-height:1.8;">` + examHistory.slice(-10).map(e => `<li>${e.date}: <strong>${e.score}%</strong> (${e.title})</li>`).join('') + `</ul>`;
  
  appDiv.appendChild(statsContent);
}

function startErrorReviewMode() {
  const failedIds = Object.keys(failedQuestionsMap);
  if (failedIds.length === 0) {
    alert('¡Genial! No tienes errores registrados.');
    return;
  }
  const questionsToReview = app.questions.filter(q => failedIds.includes(q.id.toString()));
  if (questionsToReview.length > 0) {
    startBlockingStudyMode(mezclarArray(questionsToReview), 'Repaso de Errores', null);
  }
}

// --- MENÚ UNITS ---
function showUnitsMenu() {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';
  createBackButton(appDiv, showMainMenu);

  const title = document.createElement('h2');
  title.textContent = 'Estudiar por Módulo';
  appDiv.appendChild(title);

  const units = [...new Set(app.questions.map(q => q.unit))].sort();

  units.forEach(unit => {
    const count = app.questions.filter(q => q.unit === unit).length;
    createButton(appDiv, `${unit} (${count} preguntas)`, () => startUnitQuiz(unit));
  });
}

// --- MENÚ EXÁMENES OFICIALES ---
function showOfficialExamsMenu() {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';
  createBackButton(appDiv, showMainMenu);

  const title = document.createElement('h2');
  title.textContent = 'Selecciona un Examen Oficial';
  appDiv.appendChild(title);

  const grid = document.createElement('div');
  grid.className = 'exam-grid';
  appDiv.appendChild(grid);

  for (let i = 1; i <= 14; i++) {
    const btn = document.createElement('button');
    btn.textContent = `Examen ${i}`;
    btn.onclick = () => selectOfficialModeType(i);
    grid.appendChild(btn);
  }
}

function selectOfficialModeType(examIdentifier) {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';
  createBackButton(appDiv, showOfficialExamsMenu);

  const titleText = `Examen Oficial ${examIdentifier}`;
  const title = document.createElement('h2');
  title.textContent = titleText;
  appDiv.appendChild(title);

  const subtitle = document.createElement('h3');
  subtitle.textContent = 'Elige el modo de realización:';
  appDiv.appendChild(subtitle);

  const loadQuestions = async () => await app.loadOfficialExam(examIdentifier);

  createButton(appDiv, ' Modo Examen (Nota al final + Temporizador)', async () => {
    let questions = await loadQuestions();
    if (questions) {
      questions = mezclarArray(questions);
      startClassicExam(questions, titleText);
    }
  });

  createButton(appDiv, ' Modo Estudio (Corregir al momento)', async () => {
    let questions = await loadQuestions();
    if (questions) {
      questions = mezclarArray(questions);
      startBlockingStudyMode(questions, titleText, examIdentifier);
    }
  });
}

// --- LÓGICA DE MODOS ---

// MODO UNITS: baraja las preguntas del módulo, feedback inmediato
function startUnitQuiz(unit) {
  // ✅ NUEVO: barajar preguntas del módulo
  const unitQuestions = app.questions.filter(q => q.unit === unit);
  currentQuestions = mezclarArray([...unitQuestions]);
  currentIndex = 0;
  renderQuestionWithFeedback(currentQuestions[currentIndex], unit);
}

// MODO EXAMEN GENERAL: 60 preguntas aleatorias con temporizador
function startGeneralExamMode() {
  const shuffled = mezclarArray([...app.questions]);
  // Filtrar preguntas con correctAnswers vacío para evitar bugs
  const valid = shuffled.filter(q => q.correctAnswers && q.correctAnswers.length > 0);
  currentQuestions = valid.slice(0, 60);
  currentIndex = 0;
  userAnswers = currentQuestions.map(q => ({ question: q, selected: [], marked: false }));
  startTimer(getTotalExamSeconds());
  renderClassicExamQuestion(currentQuestions[currentIndex], 'Examen Aleatorio');
}

// MODO EXAMEN OFICIAL con temporizador
function startClassicExam(questions, title) {
  // Filtrar preguntas sin respuesta válida
  currentQuestions = questions.filter(q => q.correctAnswers && q.correctAnswers.length > 0);
  currentIndex = 0;
  userAnswers = currentQuestions.map(q => ({ question: q, selected: [], marked: false }));
  startTimer(getTotalExamSeconds());
  renderClassicExamQuestion(currentQuestions[currentIndex], title);
}

// MODO ESTUDIO OFICIAL (bloqueante, sin temporizador)
function startBlockingStudyMode(questions, title, examId) {
  currentQuestions = questions.filter(q => q.correctAnswers && q.correctAnswers.length > 0);
  currentIndex = 0;
  renderBlockingQuestion(currentQuestions[currentIndex], title, examId);
}

// --- RENDERS ---

// Renderizador A: Units (feedback inmediato, explicación, flechas)
function renderQuestionWithFeedback(question, titleContext) {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';
  createBackButton(appDiv, showUnitsMenu);

  const info = document.createElement('p');
  info.className = 'question-info';
  info.textContent = `${titleContext}: Pregunta ${currentIndex + 1} de ${currentQuestions.length}`;
  appDiv.appendChild(info);

  // Barra de progreso
  const progressBar = createProgressBar(currentIndex + 1, currentQuestions.length);
  appDiv.appendChild(progressBar);

  renderQuestionTextAndOptions(appDiv, question);

  const submitBtn = document.createElement('button');
  submitBtn.textContent = 'Comprobar';
  submitBtn.onclick = () => {
    const selected = getSelectedOptions();
    if (selected.length === 0) return;

    submitBtn.disabled = true;
    disableOptions();

    const isCorrect = validateAnswer(question, selected);

    // Marcar opciones en verde/rojo
    markOptions(question, selected);
    showFeedbackMessage(appDiv, isCorrect, question.explanation || 'Sin explicación adicional.');

    createNextButton(appDiv, () => {
      currentIndex++;
      if (currentIndex < currentQuestions.length) {
        renderQuestionWithFeedback(currentQuestions[currentIndex], titleContext);
      } else {
        showEndScreen(titleContext, false);
      }
    });
  };
  appDiv.appendChild(submitBtn);

  // Flechas de navegación
  const navDiv = document.createElement('div');
  navDiv.className = 'question-nav-buttons';

  if (currentIndex > 0) {
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&#8592;';
    prevBtn.className = 'nav-arrow-btn';
    prevBtn.onclick = () => {
      currentIndex--;
      renderQuestionWithFeedback(currentQuestions[currentIndex], titleContext);
    };
    navDiv.appendChild(prevBtn);
  }

  if (currentIndex < currentQuestions.length - 1) {
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '&#8594;';
    nextBtn.className = 'nav-arrow-btn';
    nextBtn.onclick = () => {
      currentIndex++;
      renderQuestionWithFeedback(currentQuestions[currentIndex], titleContext);
    };
    navDiv.appendChild(nextBtn);
  } else {
    const finishBtn = document.createElement('button');
    finishBtn.textContent = 'Finalizar';
    finishBtn.className = 'nav-arrow-btn';
    finishBtn.onclick = () => showEndScreen(titleContext, false);
    navDiv.appendChild(finishBtn);
  }

  appDiv.appendChild(navDiv);
}

// Renderizador B: Examen clásico (con temporizador, nota al final)
function renderClassicExamQuestion(question, titleContext) {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';

  // Barra superior con salir y temporizador
  const topBar = document.createElement('div');
  topBar.className = 'exam-top-bar';

  const exitBtn = document.createElement('button');
  exitBtn.textContent = '✕ Salir';
  exitBtn.className = 'exit-btn';
  exitBtn.onclick = () => {
    if (confirm('¿Seguro que quieres salir? Perderás el progreso del examen.')) {
      stopTimer();
      showMainMenu();
    }
  };
  topBar.appendChild(exitBtn);

  const timerDisplay = document.createElement('div');
  timerDisplay.id = 'exam-timer';
  timerDisplay.className = 'exam-timer';
  timerDisplay.textContent = '⏱ --:--';
  topBar.appendChild(timerDisplay);

  // Indicador de tiempo extra
  if (extraTime) {
    const extraBadge = document.createElement('span');
    extraBadge.className = 'extra-time-badge';
    extraBadge.textContent = '+30 min ESL';
    topBar.appendChild(extraBadge);
  }

  appDiv.appendChild(topBar);

  // Renderizar inmediatamente el tiempo actual
  renderTimerDisplay();

  const info = document.createElement('p');
  info.className = 'question-info';
  info.textContent = `${titleContext}: Pregunta ${currentIndex + 1} de ${currentQuestions.length}`;
  appDiv.appendChild(info);

  // Barra de progreso
  const progressBar = createProgressBar(currentIndex + 1, currentQuestions.length);
  appDiv.appendChild(progressBar);

  // Checkbox para marcar para revisar
  const markLabel = document.createElement('label');
  markLabel.className = 'mark-review-label';
  const markCheckbox = document.createElement('input');
  markCheckbox.type = 'checkbox';
  markCheckbox.checked = userAnswers[currentIndex].marked;
  markCheckbox.onchange = (e) => {
    userAnswers[currentIndex].marked = e.target.checked;
  };
  markLabel.appendChild(markCheckbox);
  markLabel.appendChild(document.createTextNode(' Marcar para revisar más tarde'));
  appDiv.appendChild(markLabel);

  renderQuestionTextAndOptions(appDiv, question);

  // Restaurar selecciones previas
  const inputs = document.querySelectorAll('input[name="option"]');
  inputs.forEach(input => {
    if (userAnswers[currentIndex].selected.includes(parseInt(input.value))) {
      input.checked = true;
    }
  });

  const navDiv = document.createElement('div');
  navDiv.className = 'question-nav-buttons';

  if (currentIndex > 0) {
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&#8592;';
    prevBtn.className = 'nav-arrow-btn';
    prevBtn.onclick = () => {
      userAnswers[currentIndex].selected = getSelectedOptions();
      currentIndex--;
      renderClassicExamQuestion(currentQuestions[currentIndex], titleContext);
    };
    navDiv.appendChild(prevBtn);
  }

  if (currentIndex < currentQuestions.length - 1) {
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '&#8594;';
    nextBtn.className = 'nav-arrow-btn';
    nextBtn.onclick = () => {
      userAnswers[currentIndex].selected = getSelectedOptions();
      currentIndex++;
      renderClassicExamQuestion(currentQuestions[currentIndex], titleContext);
    };
    navDiv.appendChild(nextBtn);
  }

  const finishBtn = document.createElement('button');
  finishBtn.textContent = 'Revisar y Entregar';
  finishBtn.className = 'finish-exam-btn';
  finishBtn.style.marginLeft = 'auto';
  finishBtn.onclick = () => {
    userAnswers[currentIndex].selected = getSelectedOptions();
    showReviewScreen(titleContext);
  };
  navDiv.appendChild(finishBtn);

  appDiv.appendChild(navDiv);
}

function showReviewScreen(titleContext) {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '<h2>Revisión del Examen</h2><p style="text-align:center; margin-bottom: 20px;">Haz clic en cualquier pregunta para volver a ella, o finaliza el examen definitivamente.</p>';
  
  const gridContainer = document.createElement('div');
  gridContainer.className = 'exam-nav-grid';
  currentQuestions.forEach((_, idx) => {
    const btn = document.createElement('button');
    btn.className = 'exam-nav-btn';
    btn.textContent = idx + 1;
    if (userAnswers[idx].marked) btn.classList.add('marked');
    else if (userAnswers[idx].selected.length > 0) btn.classList.add('answered');
    
    btn.onclick = () => {
      currentIndex = idx;
      renderClassicExamQuestion(currentQuestions[currentIndex], titleContext);
    };
    gridContainer.appendChild(btn);
  });
  appDiv.appendChild(gridContainer);
  
  const submitBtn = document.createElement('button');
  submitBtn.textContent = 'ENTREGAR EXAMEN DEFINITIVO';
  submitBtn.className = 'finish-exam-btn';
  submitBtn.style.display = 'block';
  submitBtn.style.marginTop = '20px';
  submitBtn.style.width = '100%';
  submitBtn.onclick = () => {
    const unanswered = userAnswers.filter(a => a.selected.length === 0).length;
    let msg = '¿Estás seguro de que deseas entregar el examen ahora?';
    if (unanswered > 0) {
      msg = `Tienes ${unanswered} preguntas sin responder.\n\n` + msg;
    }
    if (confirm(msg)) {
      stopTimer();
      showExamResults(titleContext);
    }
  };
  appDiv.appendChild(submitBtn);

  createBackButton(appDiv, () => {
    renderClassicExamQuestion(currentQuestions[currentIndex], titleContext);
  });
}

// Renderizador C: Modo estudio bloqueante
function renderBlockingQuestion(question, titleContext, examId) {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';

  createBackButton(appDiv, () => {
    if (examId !== null) {
      selectOfficialModeType(examId);
    } else {
      showMainMenu();
    }
  });

  const info = document.createElement('p');
  info.className = 'question-info';
  info.textContent = `${titleContext} — Estudio: Pregunta ${currentIndex + 1} de ${currentQuestions.length}`;
  appDiv.appendChild(info);

  // Barra de progreso
  const progressBar = createProgressBar(currentIndex + 1, currentQuestions.length);
  appDiv.appendChild(progressBar);

  renderQuestionTextAndOptions(appDiv, question);

  const feedbackDiv = document.createElement('div');
  feedbackDiv.id = 'blocking-feedback';
  appDiv.appendChild(feedbackDiv);

  const actionBtn = document.createElement('button');
  actionBtn.textContent = 'Comprobar';
  appDiv.appendChild(actionBtn);

  actionBtn.onclick = () => {
    if (actionBtn.textContent === 'Siguiente →') {
      currentIndex++;
      if (currentIndex < currentQuestions.length) {
        renderBlockingQuestion(currentQuestions[currentIndex], titleContext, examId);
      } else {
        showEndScreen(titleContext, false);
      }
      return;
    }

    const selected = getSelectedOptions();
    if (selected.length === 0) return;

    const isCorrect = validateAnswer(question, selected);

    if (isCorrect) {
      disableOptions();
      markOptions(question, selected);
      feedbackDiv.className = 'feedback-msg feedback-correct';
      feedbackDiv.innerHTML = `<strong>✅ ¡Correcto!</strong><br/>${question.explanation || ''}`;
      actionBtn.textContent = 'Siguiente →';
    } else {
      feedbackDiv.className = 'feedback-msg feedback-incorrect';
      feedbackDiv.textContent = '❌ Incorrecto. Inténtalo de nuevo.';
    }
  };
}

// --- FUNCIONES AUXILIARES ---

function mezclarArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function createButton(parent, text, onClick) {
  const btn = document.createElement('button');
  btn.textContent = text;
  btn.onclick = onClick;
  parent.appendChild(btn);
  return btn;
}

function createBackButton(parent, onClick) {
  const btn = document.createElement('button');
  btn.textContent = '← Volver';
  btn.className = 'back-btn';
  btn.onclick = onClick;
  parent.appendChild(btn);
}

function createProgressBar(current, total) {
  const container = document.createElement('div');
  container.className = 'progress-container';

  const bar = document.createElement('div');
  bar.className = 'progress-bar';
  bar.style.width = `${(current / total) * 100}%`;

  const label = document.createElement('span');
  label.className = 'progress-label';
  label.textContent = `${current} / ${total}`;

  container.appendChild(bar);
  container.appendChild(label);
  return container;
}

function renderQuestionTextAndOptions(parent, question) {
  const qTitle = document.createElement('h2');
  qTitle.className = 'question-title';
  qTitle.textContent = question.question;
  parent.appendChild(qTitle);

  const isMultiple = question.correctAnswers && question.correctAnswers.length > 1;

  if (isMultiple) {
    const hint = document.createElement('p');
    hint.className = 'multi-hint';
    hint.textContent = `(Selecciona ${question.correctAnswers.length} respuestas)`;
    parent.appendChild(hint);
  }

  question.options.forEach((opt, idx) => {
    const label = document.createElement('label');
    label.className = 'option-label';
    label.dataset.idx = idx;

    const input = document.createElement('input');
    input.type = isMultiple ? 'checkbox' : 'radio';
    input.name = 'option';
    input.value = idx;

    label.appendChild(input);
    label.appendChild(document.createTextNode(' ' + opt));
    parent.appendChild(label);
  });
}

// ✅ NUEVO: marcar opciones en verde/rojo tras comprobar
function markOptions(question, selected) {
  const labels = document.querySelectorAll('.option-label');
  labels.forEach(label => {
    const idx = parseInt(label.dataset.idx);
    const isCorrectOption = question.correctAnswers.includes(idx);
    const isSelected = selected.includes(idx);

    if (isCorrectOption) {
      label.style.backgroundColor = '#c6f6d5';
      label.style.borderColor = '#38a169';
      label.style.color = '#276749';
    } else if (isSelected && !isCorrectOption) {
      label.style.backgroundColor = '#fed7d7';
      label.style.borderColor = '#e53e3e';
      label.style.color = '#742a2a';
    }
  });
}

function getSelectedOptions() {
  const inputs = document.querySelectorAll('input[name="option"]:checked');
  return Array.from(inputs).map(i => parseInt(i.value));
}

function disableOptions() {
  const inputs = document.querySelectorAll('input[name="option"]');
  inputs.forEach(i => i.disabled = true);
}

function validateAnswer(question, selected) {
  if (!question.correctAnswers || question.correctAnswers.length === 0) return false;
  if (selected.length !== question.correctAnswers.length) return false;
  return selected.sort().toString() === [...question.correctAnswers].sort().toString();
}

function showFeedbackMessage(parent, isCorrect, explanation) {
  const div = document.createElement('div');
  div.className = isCorrect ? 'feedback-msg feedback-correct' : 'feedback-msg feedback-incorrect';
  div.innerHTML = `<strong>${isCorrect ? ' ¡Correcto!' : '❌ Incorrecto'}</strong><br/>${explanation}`;
  parent.appendChild(div);
}

function createNextButton(parent, onClick) {
  const btn = document.createElement('button');
  btn.textContent = 'Siguiente Pregunta →';
  btn.className = 'next-btn';
  btn.style.marginTop = '10px';
  btn.onclick = onClick;
  parent.appendChild(btn);
}

// --- PANTALLAS FINALES ---

function showEndScreen(title, showScore) {
  stopTimer();
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';

  const h2 = document.createElement('h2');
  h2.textContent = ` ${title} — ¡Completado!`;
  appDiv.appendChild(h2);

  createButton(appDiv, ' Volver al Menú Principal', showMainMenu);
}

function showExamResults(title) {
  stopTimer();
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';

  let correct = 0;
  userAnswers.forEach(ans => {
    if (validateAnswer(ans.question, ans.selected)) correct++;
  });

  const total = userAnswers.length;
  const score = Math.round((correct / total) * 100) || 0;
  const passed = score >= 73;

  // Persistir resultados
  examHistory.push({ date: new Date().toLocaleDateString(), score, title });
  localStorage.setItem('examHistory', JSON.stringify(examHistory));
  clearActiveExam();

  userAnswers.forEach(ans => {
    if (!validateAnswer(ans.question, ans.selected)) {
      failedQuestionsMap[ans.question.id] = (failedQuestionsMap[ans.question.id] || 0) + 1;
    } else {
      delete failedQuestionsMap[ans.question.id];
    }
  });
  localStorage.setItem('failedQuestionsMap', JSON.stringify(failedQuestionsMap));

  const h2 = document.createElement('h2');
  h2.textContent = 'Resultados del Examen';
  appDiv.appendChild(h2);

  // Puntuación grande
  const scoreDiv = document.createElement('div');
  scoreDiv.className = `score-display ${passed ? 'score-passed' : 'score-failed'}`;
  scoreDiv.innerHTML = `
    <div class="score-percent">${score}%</div>
    <div class="score-detail">${correct} / ${total} correctas</div>
    <div class="score-status">${passed ? ' ¡APROBADO!' : '❌ SUSPENSO'}</div>
    <div class="score-threshold">Umbral de aprobado: 73%</div>
  `;
  appDiv.appendChild(scoreDiv);

  // Desglose por módulo
  const moduleStats = {};
  userAnswers.forEach(ans => {
    const mod = ans.question.module || 'Otros';
    if (!moduleStats[mod]) moduleStats[mod] = { correct: 0, total: 0 };
    moduleStats[mod].total++;
    if (validateAnswer(ans.question, ans.selected)) moduleStats[mod].correct++;
  });

  const statsDiv = document.createElement('div');
  statsDiv.className = 'module-stats';

  const statsTitle = document.createElement('h3');
  statsTitle.textContent = ' Resultado por módulo';
  statsDiv.appendChild(statsTitle);

  Object.entries(moduleStats).forEach(([mod, stats]) => {
    const pct = Math.round((stats.correct / stats.total) * 100);
    const row = document.createElement('div');
    row.className = 'module-stat-row';
    row.innerHTML = `
      <span class="module-stat-name">${mod}</span>
      <div class="module-stat-bar-container">
        <div class="module-stat-bar" style="width:${pct}%; background:${pct >= 73 ? '#38a169' : '#e53e3e'}"></div>
      </div>
      <span class="module-stat-pct" style="color:${pct >= 73 ? '#38a169' : '#e53e3e'}">${pct}% (${stats.correct}/${stats.total})</span>
    `;
    statsDiv.appendChild(row);
  });

  appDiv.appendChild(statsDiv);

  // Revisión de fallos
  const failed = userAnswers.filter(ans => !validateAnswer(ans.question, ans.selected));
  if (failed.length > 0) {
    const h3 = document.createElement('h3');
    h3.textContent = `Revisión de Fallos (${failed.length})`;
    h3.style.marginTop = '30px';
    appDiv.appendChild(h3);

    failed.forEach((item) => {
      const block = document.createElement('div');
      block.className = 'incorrect-review-block';
      block.innerHTML = `
        <p class="review-module-tag">${item.question.module || ''}</p>
        <p><strong>${item.question.question}</strong></p>
        <p class="review-wrong">❌ Tu respuesta: ${item.selected.length > 0 ? item.selected.map(idx => item.question.options[idx]).join(', ') : 'Sin responder'}</p>
        <p class="review-correct">✅ Correcta: ${item.question.correctAnswers.map(idx => item.question.options[idx]).join(', ')}</p>
        <p class="review-explanation"><em>${item.question.explanation || ''}</em></p>
      `;
      appDiv.appendChild(block);
    });
  }

  createButton(appDiv, 'Volver al Menú Principal', showMainMenu);
}
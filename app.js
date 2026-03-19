class QuestionBank {
  constructor() {
    this.questions = [];
  }

  // Carga el banco general (questions.json) para Units y Random
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

  // Carga un examen oficial específico (Official-Exams/X.json)
  async loadOfficialExam(number) {
    try {
      // Asegúrate de que la carpeta en tu proyecto se llama exactamente "Official-Exams"
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
    // Mapeo de palabras clave a unidades
    const units_keywords = {
    'Configuration and Setup': ['Configuration and Setup'],
    'Object Manager and Lightning App Builder': ['Object Manager and Lightning App Builder'],
    'Sales and Marketing Applications': ['Sales and Marketing Applications'],
    'Service and Support Applications': ['Service and Support Applications'],
    'Productivity and Collaboration': ['Productivity and Collaboration'],
    'Data and Analytics Management': ['Data and Analytics Management'],
    'Workflow/Process Automation': ['Workflow/Process Automation']
};
    const appbuilder_units_keywords = {
    'Salesforce Fundamentals': ['Salesforce Fundamentals'],
    'Business Logic and Process Automation': ['Business Logic and Process Automation'],
    'User Interface': ['User Interface'],
    'App Deployment': ['App Deployment'],
    'Data Modeling and Management': ['Data Modeling and Management']
};
    const agentforce_units_keywords = {
    'Prompt Engineering': ['Prompt Engineering'],
    'Agentforce Concepts': ['Agentforce Concepts'],
    'Agentforce and Data Cloud': ['Agentforce and Data Cloud'],
    'Agentforce and Service Cloud': ['Agentforce and Service Cloud'],
    'Agentforce and Sales Cloud': ['Agentforce and Sales Cloud']
};
function assignUnitToQuestions(questions) {
  questions.forEach(q => {
    if (appbuilder_units_keywords[q.module]) {
      q.unit = q.module; // La unidad ahora es el mismo nombre del módulo
    } else {
      q.unit = 'Miscellaneous'; // Por si alguna pregunta queda sin categoría válida
    }
  });
}
const app = new QuestionBank();
let currentQuestions = [];
let currentIndex = 0;
let userAnswers = []; // Para guardar respuestas en modos con puntuación

// Inicialización
window.addEventListener('DOMContentLoaded', async () => {
  await app.loadGeneralQuestions();
  showMainMenu();
});

// --- VISTAS DEL MENÚ ---

function showMainMenu() {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';

  const title = document.createElement('h1');
  title.textContent = 'Práctica Salesforce Agentforce';
  appDiv.appendChild(title);

  // Botón 1: UNITS
  createButton(appDiv, 'UNITS', () => showUnitsMenu());

  // Botón 2: EXAM MODE (Random del general)
  createButton(appDiv, 'MODO EXAMEN (Aleatorio)', () => startGeneralExamMode());

  // Botón 3: EXÁMENES OFICIALES
  createButton(appDiv, 'EXÁMENES OFICIALES', () => showOfficialExamsMenu());
}

function showUnitsMenu() {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';
  createBackButton(appDiv, showMainMenu);

  const title = document.createElement('h2');
  title.textContent = 'Estudiar por Unidad';
  appDiv.appendChild(title);

  // Obtener unidades únicas
  const units = [...new Set(app.questions.map(q => q.unit))].sort();

  units.forEach(unit => {
    const count = app.questions.filter(q => q.unit === unit).length;
    createButton(appDiv, `${unit} (${count})`, () => startUnitQuiz(unit));
  });
}

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

  // Generar botones del 1 al 11
  for (let i = 1; i <= 3; i++) {
    const btn = document.createElement('button');
    btn.textContent = `Examen ${i}`;
    btn.onclick = () => selectOfficialModeType(i);
    grid.appendChild(btn);
  }
}

// examIdentifier puede ser un número (1-3)
function selectOfficialModeType(examIdentifier) {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';
  createBackButton(appDiv, showOfficialExamsMenu);

  const isUnicas = examIdentifier === 'unicas';
  const isAppExterna = examIdentifier === 'app-externa';
  
  let titleText = '';
  titleText = `Examen Oficial ${examIdentifier}`;

  const title = document.createElement('h2');
  title.textContent = titleText;
  appDiv.appendChild(title);

  const subtitle = document.createElement('h3');
  subtitle.textContent = 'Elige el modo de realización:';
  appDiv.appendChild(subtitle);

  // Helper para cargar las preguntas correctas según el ID
  const loadQuestions = async () => {
    if (isUnicas) return await app.loadUnicas();
    if (isAppExterna) return await app.loadAppExterna();
    return await app.loadOfficialExam(examIdentifier);
  };

  // Opción A: Modo Examen (Sin feedback hasta el final)
  createButton(appDiv, 'Modo Examen (Nota al final)', async () => {
    let questions = await loadQuestions();
    if (questions) {
        questions = mezclarArray(questions);
        startClassicExam(questions, titleText);
    }
  });

  // Opción B: Modo Estudio (Bloqueante)
  createButton(appDiv, 'Modo Estudio (Corregir al momento)', async () => {
    let questions = await loadQuestions();
    if (questions) {
        questions = mezclarArray(questions);
        // Pasamos examIdentifier explícitamente para gestionar el botón "Volver"
        startBlockingStudyMode(questions, titleText, examIdentifier);
    }
  });
}

// --- LÓGICA DE MODOS DE JUEGO ---

// 1. MODO UNITS (Feedback inmediato, no bloqueante, explicación visible)
function startUnitQuiz(unit) {
  currentQuestions = app.questions.filter(q => q.unit === unit);
  currentIndex = 0;
  renderQuestionWithFeedback(currentQuestions[currentIndex], unit);
}

// 2. MODO EXAMEN GENERAL (Aleatorio 60 preguntas, nota al final)
function startGeneralExamMode() {
  const shuffled = [...app.questions].sort(() => 0.5 - Math.random());
  currentQuestions = shuffled.slice(0, 60);
  currentIndex = 0;
  userAnswers = [];
  renderClassicExamQuestion(currentQuestions[currentIndex], 'Examen Aleatorio');
}

// 3. MODO EXAMEN OFICIAL CLÁSICO (Nota al final)
function startClassicExam(questions, title) {
  currentQuestions = questions;
  currentIndex = 0;
  userAnswers = [];
  renderClassicExamQuestion(currentQuestions[currentIndex], title);
}

// 4. MODO ESTUDIO OFICIAL (Bloqueante, sin explicación, solo Correcto/Incorrecto)
function startBlockingStudyMode(questions, title, examId) {
  currentQuestions = questions;
  currentIndex = 0;
  renderBlockingQuestion(currentQuestions[currentIndex], title, examId);
}

// --- RENDERS DE PREGUNTAS ---

// Renderizador A: Para Units (Muestra explicación y botón siguiente)
function renderQuestionWithFeedback(question, titleContext) {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';
  createBackButton(appDiv, showMainMenu);

  const info = document.createElement('p');
  info.textContent = `${titleContext}: Pregunta ${currentIndex + 1} de ${currentQuestions.length}`;
  appDiv.appendChild(info);

  renderQuestionTextAndOptions(appDiv, question);

  const submitBtn = document.createElement('button');
  submitBtn.textContent = 'Comprobar';
  submitBtn.onclick = () => {
    const selected = getSelectedOptions();
    if (selected.length === 0) return;

    submitBtn.disabled = true;
    disableOptions();

    const isCorrect = validateAnswer(question, selected);
    showFeedbackMessage(appDiv, isCorrect, question.explanation || "Sin explicación adicional.");
    
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
  
  // ---- Flechas de navegación al fondo a la derecha ----
  const navDiv = document.createElement('div');
  navDiv.className = 'question-nav-buttons';

  // Botón flecha izquierda (←)
  if (currentIndex > 0) {
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&#8592;';
    prevBtn.className = 'nav-arrow-btn';
    prevBtn.onclick = function () {
      currentIndex -= 1;
      renderQuestionWithFeedback(currentQuestions[currentIndex], titleContext);
    };
    navDiv.appendChild(prevBtn);
  }
  // Botón flecha derecha (→)
  if (currentIndex < currentQuestions.length - 1) {
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '&#8594;';
    nextBtn.className = 'nav-arrow-btn';
    nextBtn.onclick = function () {
      currentIndex += 1;
      renderQuestionWithFeedback(currentQuestions[currentIndex], titleContext);
    };
    navDiv.appendChild(nextBtn);
  } else {
    // Si es la última pregunta, botón finalizar
    const finishBtn = document.createElement('button');
    finishBtn.textContent = 'Finalizar';
    finishBtn.onclick = () => showEndScreen(titleContext, false);
    finishBtn.className = 'nav-arrow-btn';
    navDiv.appendChild(finishBtn);
  }

  appDiv.appendChild(navDiv);
}
// Renderizador B: Para Exámenes (Clásico - Guarda respuesta y pasa)
function renderClassicExamQuestion(question, titleContext) {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';
  
  const topBar = document.createElement('div');
  topBar.style.display = 'flex';
  topBar.style.justifyContent = 'space-between';
  
  const exitBtn = document.createElement('button');
  exitBtn.textContent = 'Salir';
  exitBtn.style.backgroundColor = '#666';
  exitBtn.style.padding = '5px 10px';
  exitBtn.onclick = showMainMenu;
  topBar.appendChild(exitBtn);

  appDiv.appendChild(topBar);

  const info = document.createElement('p');
  info.textContent = `${titleContext}: Pregunta ${currentIndex + 1} de ${currentQuestions.length}`;
  appDiv.appendChild(info);

  renderQuestionTextAndOptions(appDiv, question);

  const nextBtn = document.createElement('button');
  nextBtn.textContent = (currentIndex < currentQuestions.length - 1) ? 'Siguiente' : 'Finalizar Examen';
  nextBtn.onclick = () => {
    const selected = getSelectedOptions();
    // Guardamos la respuesta del usuario
    userAnswers.push({ question, selected });
    
    currentIndex++;
    if (currentIndex < currentQuestions.length) {
      renderClassicExamQuestion(currentQuestions[currentIndex], titleContext);
    } else {
      showExamResults(titleContext);
    }
  };
  appDiv.appendChild(nextBtn);
}

// Renderizador C: Para Modo Estudio Oficial (Bloqueante)
function renderBlockingQuestion(question, titleContext, examId) {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';
  
  // Botón volver que sabe regresar a la selección de modos usando examId
  createBackButton(appDiv, () => selectOfficialModeType(examId));

  const info = document.createElement('p');
  info.textContent = `${titleContext} (Estudio): Pregunta ${currentIndex + 1} de ${currentQuestions.length}`;
  appDiv.appendChild(info);

  renderQuestionTextAndOptions(appDiv, question);

  const feedbackDiv = document.createElement('div');
  feedbackDiv.id = 'blocking-feedback';
  appDiv.appendChild(feedbackDiv);

  const actionBtn = document.createElement('button');
  actionBtn.textContent = 'Comprobar';
  appDiv.appendChild(actionBtn);

  actionBtn.onclick = () => {
    // Si el botón ya cambió a "Siguiente", avanzamos
    if (actionBtn.textContent === 'Siguiente') {
        currentIndex++;
        if (currentIndex < currentQuestions.length) {
            renderBlockingQuestion(currentQuestions[currentIndex], titleContext, examId);
        } else {
            showEndScreen(titleContext, false);
        }
        return;
    }

    // Lógica de Comprobar
    const selected = getSelectedOptions();
    if (selected.length === 0) return;

    const isCorrect = validateAnswer(question, selected);

    if (isCorrect) {
        // Correcto: Bloquear, mostrar verde y cambiar botón
        disableOptions();
        feedbackDiv.className = 'feedback-msg feedback-correct';
        // Mostramos explicación si existe, si no, solo Correcto
        feedbackDiv.innerHTML = `<strong>¡Correcto!</strong><br/>${question.explanation || ''}`;
        actionBtn.textContent = 'Siguiente';
    } else {
        // Incorrecto: Solo mensaje rojo, NO bloquear, permitir reintentar
        feedbackDiv.className = 'feedback-msg feedback-incorrect';
        feedbackDiv.textContent = 'Incorrecto. Inténtalo de nuevo.';
        // No cambiamos el botón, el usuario debe cambiar su selección
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
  btn.style.marginBottom = '10px';
  btn.style.backgroundColor = '#6c757d';
  btn.onclick = onClick;
  parent.appendChild(btn);
}

function renderQuestionTextAndOptions(parent, question) {
  const qTitle = document.createElement('h2');
  qTitle.textContent = question.question;
  parent.appendChild(qTitle);

  if (question.correctAnswers && question.correctAnswers.length > 1) {
    const hint = document.createElement('p');
    hint.textContent = '(Selecciona todas las correctas)';
    hint.style.color = '#666';
    hint.style.fontSize = '0.9rem';
    parent.appendChild(hint);
  }

  question.options.forEach((opt, idx) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    // Checkbox si hay múltiples respuestas, radio si es única
    input.type = (question.correctAnswers && question.correctAnswers.length > 1) ? 'checkbox' : 'radio';
    input.name = 'option';
    input.value = idx;
    
    label.appendChild(input);
    label.appendChild(document.createTextNode(' ' + opt));
    parent.appendChild(label);
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
  if (!question.correctAnswers) return false;
  if (selected.length !== question.correctAnswers.length) return false;
  const sortedSelected = selected.sort().toString();
  const sortedCorrect = [...question.correctAnswers].sort().toString();
  return sortedSelected === sortedCorrect;
}

function showFeedbackMessage(parent, isCorrect, explanation) {
  const div = document.createElement('div');
  div.className = isCorrect ? 'feedback-msg feedback-correct' : 'feedback-msg feedback-incorrect';
  div.innerHTML = `<strong>${isCorrect ? '¡Correcto!' : 'Incorrecto'}</strong><br/>${explanation}`;
  parent.appendChild(div);
}

function createNextButton(parent, onClick) {
  const btn = document.createElement('button');
  btn.textContent = 'Siguiente Pregunta';
  btn.style.marginTop = '10px';
  btn.onclick = onClick;
  parent.appendChild(btn);
}

// --- PANTALLAS FINALES ---

function showEndScreen(title, showScore) {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';

  const h2 = document.createElement('h2');
  h2.textContent = `¡${title} Completado!`;
  appDiv.appendChild(h2);

  createButton(appDiv, 'Volver al Menú Principal', showMainMenu);
}

function showExamResults(title) {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = '';

  let correct = 0;
  userAnswers.forEach(ans => {
    if (validateAnswer(ans.question, ans.selected)) correct++;
  });

  const score = Math.round((correct / userAnswers.length) * 100) || 0;
  const passed = score >= 65; // Criterio Salesforce estándar

  const h2 = document.createElement('h2');
  h2.textContent = 'Resultados del Examen';
  appDiv.appendChild(h2);

  const pScore = document.createElement('p');
  pScore.style.fontSize = '1.5rem';
  pScore.innerHTML = `Puntuación: <strong>${score}%</strong> (${correct}/${userAnswers.length})`;
  pScore.style.color = passed ? 'green' : 'red';
  appDiv.appendChild(pScore);

  const pStatus = document.createElement('p');
  pStatus.textContent = passed ? '¡APROBADO!' : 'SUSPENSO';
  pStatus.style.fontWeight = 'bold';
  appDiv.appendChild(pStatus);

  // Revisión de fallos
  const failed = userAnswers.filter(ans => !validateAnswer(ans.question, ans.selected));
  if (failed.length > 0) {
    const h3 = document.createElement('h3');
    h3.textContent = 'Revisión de Fallos';
    h3.style.marginTop = '30px';
    appDiv.appendChild(h3);

    failed.forEach((item, i) => {
       const block = document.createElement('div');
       block.className = 'incorrect-review-block'; // Asegúrate de tener esta clase en styles.css
       block.innerHTML = `
         <p><strong>Pregunta:</strong> ${item.question.question}</p>
         <p style="color:red">Tu respuesta: ${item.selected.map(idx => item.question.options[idx]).join(', ') || 'Ninguna'}</p>
         <p style="color:green">Correcta: ${item.question.correctAnswers.map(idx => item.question.options[idx]).join(', ')}</p>
         <p><em>${item.question.explanation || ''}</em></p>
       `;
       appDiv.appendChild(block);
    });
  }

  createButton(appDiv, 'Volver al Menú Principal', showMainMenu);
}
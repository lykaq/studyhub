
// ==========================================
// STUDYHUB - SCRIPT.JS
// ==========================================

// STORAGE
const STORAGE_KEY = "studyHubData";
const EVENTS_KEY = "studyHubEvents";
const TODOS_KEY = "studyHubTodos";
const HISTORY_KEY = "studyHubQuizHistory";
const REVIEWED_KEY = "studyHubReviewed";
const BEST_KEY = "studyHubBestScore";
const THEME_KEY = "studyHubTheme";
const TIMER_SETTINGS_KEY = "studyHubTimerSettings";

function loadArray(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

let studySets = loadArray(STORAGE_KEY).map(set => ({
  ...set,
  id: set.id || Date.now() + Math.random(),
  title: set.title || "Untitled Set",
  subject: set.subject || "General",
  notes: set.notes || "",
  cards: Array.isArray(set.cards) ? set.cards.map(card => ({
    ...card,
    id: card.id || Date.now() + Math.random(),
    front: card.front || card.question || "",
    back: card.back || card.answer || ""
  })) : [],
  quizzes: Array.isArray(set.quizzes) ? set.quizzes : [],
  bestScore: Number(set.bestScore) || 0
}));

let events = loadArray(EVENTS_KEY);
let todos = loadArray(TODOS_KEY);
let quizHistory = loadArray(HISTORY_KEY);
let reviewedCards = Number(localStorage.getItem(REVIEWED_KEY)) || 0;
let bestScore = Number(localStorage.getItem(BEST_KEY)) || 0;

let currentSetId = null;
let currentCardIndex = 0;
let currentQuiz = [];
let currentQuestionIndex = 0;
let quizScore = 0;
let selectedAnswer = null;
let quizQuestionToDelete = null;

// TIMER SETTINGS
let timerInterval = null;
let timerMode = "focus";
let timerSettings = { focus: 25, short: 5, long: 15 };
let timerSeconds = 25 * 60;
let completedSessions = 0;
let buddyIndex = 0;

const buddies = ["🐱", "🐰", "🐻", "🐼", "🐸", "🦊", "🐹", "🐥"];
const encouragements = [
  "You're doing amazing! Keep going! 💗",
  "One step at a time, bestie! 🌷",
  "Your hard work will pay off! ✨",
  "I'm proud of you for showing up! 🥹",
  "Take a deep breath. You got this! 🎀"
];

// STORAGE HELPERS
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(studySets));
}
function saveEvents() {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}
function saveTodos() {
  localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
}
function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(quizHistory));
}
function getCurrentSet() {
  return studySets.find(set => set.id === currentSetId);
}
function countPoints(set) {
  if (!set || !set.notes) return 0;
  return set.notes.split("\n").filter(line => line.trim()).length;
}
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
function validDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(date + "T00:00:00");
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date;
}

// NAVIGATION
function showPage(pageId) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });
  const page = document.getElementById(pageId);
  if (page) page.classList.add("active");
}
function showHome() {
  updateStats();
  showPage("home");
}
function showSets() {
  displaySets();
  showPage("sets");
}
function showCreate() {
  document.getElementById("setTitle").value = "";
  document.getElementById("setSubject").value = "";
  document.getElementById("setNotes").value = "";
  showPage("create");
}
function showStudy() {
  if (getCurrentSet()) showPage("study");
  else showSets();
}
function showCalendar() {
  displayCalendar();
  displayEvents();
  showPage("calendar");
}
function showTodo() {
  displayTodos();
  showPage("todo");
}
function showTimer() {
  updateTimerDisplay();
  showPage("timer");
}
function showProgress() {
  renderProgress();
  showPage("progress");
}
function showFlashcardCreator() {
  displayFlashcardList();
  showPage("flashcardCreator");
}

// STUDY SETS
function saveSet() {
  const titleInput = document.getElementById("setTitle");
  const title = titleInput.value.trim();
  const subject = document.getElementById("setSubject").value.trim();
  const notes = document.getElementById("setNotes").value.trim();

  if (!title) {
    alert("Please enter a study set title.");
    titleInput.focus();
    return;
  }

  const set = {
    id: Date.now() + Math.random(),
    title,
    subject: subject || "General",
    notes,
    cards: [],
    quizzes: [],
    bestScore: 0
  };

  studySets.push(set);
  currentSetId = set.id;
  saveData();
  updateStats();
  displaySets();
  showStudySet(set);
}

function showStudySet(set) {
  currentSetId = set.id;
  document.getElementById("studyTitle").textContent = set.title;
  document.getElementById("studySubject").textContent = set.subject;
  document.getElementById("studyLines").textContent = countPoints(set);
  showPage("study");
}

function editSet(id) {
  const set = studySets.find(item => item.id === id);
  if (!set) return;

  const title = prompt("Edit study set title:", set.title);
  if (title === null) return;
  if (!title.trim()) {
    alert("The title cannot be empty.");
    return;
  }

  const subject = prompt("Edit subject:", set.subject);
  if (subject === null) return;
  const notes = prompt("Edit study notes:", set.notes);
  if (notes === null) return;

  set.title = title.trim();
  set.subject = subject.trim() || "General";
  set.notes = notes.trim();
  saveData();
  displaySets();
  updateStats();
  if (currentSetId === id) showStudySet(set);
}

function deleteSet(id) {
  if (!confirm("Are you sure you want to delete this study set?")) return;

  studySets = studySets.filter(set => set.id !== id);
  if (currentSetId === id) currentSetId = null;
  saveData();
  updateStats();
  displaySets();
  showPage("sets");
}

function displaySets() {
  const list = document.getElementById("setList");
  if (!list) return;
  list.innerHTML = "";

  if (!studySets.length) {
    list.textContent = "No study sets yet. Create your first one! 💗";
    return;
  }

  studySets.forEach(set => {
    const card = document.createElement("div");
    card.className = "set-item";

    const title = document.createElement("h3");
    title.textContent = set.title;

    const subject = document.createElement("p");
    subject.textContent = set.subject;

    const points = document.createElement("p");
    points.textContent = countPoints(set) + " study points";

    const cards = document.createElement("p");
    cards.textContent = set.cards.length + " flashcards";

    const quizzes = document.createElement("p");
    quizzes.textContent = set.quizzes.length + " quiz questions";

    const buttons = document.createElement("div");
    buttons.className = "set-buttons";

    const open = document.createElement("button");
    open.className = "primary";
    open.textContent = "Open Set";
    open.addEventListener("click", () => showStudySet(set));

    const edit = document.createElement("button");
    edit.className = "secondary";
    edit.textContent = "✏️ Edit";
    edit.addEventListener("click", () => editSet(set.id));

    const remove = document.createElement("button");
    remove.className = "secondary";
    remove.textContent = "🗑️ Delete";
    remove.addEventListener("click", () => deleteSet(set.id));

    buttons.append(open, edit, remove);
    card.append(title, subject, points, cards, quizzes, buttons);
    list.appendChild(card);
  });
}

// HOME STATISTICS
function updateStats() {
  const totalPoints = studySets.reduce((total, set) => total + countPoints(set), 0);
  document.getElementById("setCount").textContent = studySets.length;
  document.getElementById("noteCount").textContent = totalPoints;
  document.getElementById("bestScore").textContent = bestScore + "%";
}

// NOTES
function openNotes() {
  const set = getCurrentSet();
  if (!set) return;

  document.getElementById("notesTitle").textContent = set.title + " — Notes";
  document.getElementById("notesContent").textContent =
    set.notes.trim() ? set.notes : "No notes have been added to this set yet.";
  showPage("notes");
}

// FLASHCARD CREATOR
function openFlashcardCreator() {
  displayFlashcardList();
  showPage("flashcardCreator");
}

function addFlashcard() {
  const set = getCurrentSet();
  if (!set) return;

  const frontInput = document.getElementById("flashFront");
  const backInput = document.getElementById("flashBack");
  const front = frontInput.value.trim();
  const back = backInput.value.trim();

  if (!front || !back) {
    alert("Please fill in both the question and answer.");
    return;
  }

  set.cards.push({ id: Date.now() + Math.random(), front, back });
  saveData();
  frontInput.value = "";
  backInput.value = "";
  displayFlashcardList();
  displaySets();
  updateStats();
}

function displayFlashcardList() {
  const list = document.getElementById("flashcardList");
  const set = getCurrentSet();
  if (!list || !set) return;
  list.innerHTML = "";

  if (!set.cards.length) {
    list.textContent = "No flashcards yet. Create your first one! 💗";
    return;
  }

  set.cards.forEach(card => {
    const item = document.createElement("div");
    item.className = "set-card";

    const front = document.createElement("p");
    front.textContent = "Front: " + card.front;

    const back = document.createElement("p");
    back.textContent = "Back: " + card.back;

    const edit = document.createElement("button");
    edit.className = "secondary";
    edit.textContent = "✏️ Edit";
    edit.addEventListener("click", () => editFlashcard(card.id));

    const remove = document.createElement("button");
    remove.className = "secondary";
    remove.textContent = "🗑️ Delete";
    remove.addEventListener("click", () => deleteFlashcard(card.id));

    item.append(front, back, edit, remove);
    list.appendChild(item);
  });
}

function editFlashcard(id) {
  const set = getCurrentSet();
  const card = set?.cards.find(item => item.id === id);
  if (!card) return;

  const front = prompt("Edit the front of the flashcard:", card.front);
  if (front === null) return;
  const back = prompt("Edit the answer:", card.back);
  if (back === null) return;

  if (!front.trim() || !back.trim()) {
    alert("Both sides of the flashcard are required.");
    return;
  }

  card.front = front.trim();
  card.back = back.trim();
  saveData();
  displayFlashcardList();
  displayCurrentCard();
}

function deleteFlashcard(id) {
  const set = getCurrentSet();
  if (!set || !confirm("Delete this flashcard?")) return;

  set.cards = set.cards.filter(card => card.id !== id);
  currentCardIndex = Math.min(currentCardIndex, Math.max(0, set.cards.length - 1));
  saveData();
  displayFlashcardList();
  displayCurrentCard();
  displaySets();
  updateStats();
}

// FLASHCARD REVIEW
function openFlashcards() {
  const set = getCurrentSet();
  if (!set) return;

  if (!set.cards.length) {
    alert("Create some flashcards first! 💗");
    return;
  }

  currentCardIndex = 0;
  displayCurrentCard();
  showPage("flashcards");
}

function displayCurrentCard() {
  const set = getCurrentSet();
  if (!set) return;

  const flashcard = document.getElementById("flashcard");
  const front = document.getElementById("cardFront");
  const back = document.getElementById("cardBack");
  const progress = document.getElementById("cardProgress");

  flashcard.classList.remove("flipped");

  if (!set.cards.length) {
    front.textContent = "No flashcards available.";
    back.textContent = "Create a flashcard to begin.";
    progress.textContent = "0 / 0";
    return;
  }

  currentCardIndex = Math.min(currentCardIndex, set.cards.length - 1);
  const card = set.cards[currentCardIndex];
  front.textContent = card.front;
  back.textContent = card.back;
  progress.textContent = (currentCardIndex + 1) + " / " + set.cards.length;
}

function flipCard() {
  document.getElementById("flashcard").classList.toggle("flipped");
}

function nextCard() {
  const set = getCurrentSet();
  if (!set || !set.cards.length) return;
  currentCardIndex = (currentCardIndex + 1) % set.cards.length;
  displayCurrentCard();
}

function prevCard() {
  const set = getCurrentSet();
  if (!set || !set.cards.length) return;
  currentCardIndex = (currentCardIndex - 1 + set.cards.length) % set.cards.length;
  displayCurrentCard();
}

function shuffleFlashcards() {
  const set = getCurrentSet();
  if (!set || set.cards.length < 2) return;
  set.cards = shuffleArray(set.cards);
  currentCardIndex = 0;
  saveData();
  displayCurrentCard();
  displayFlashcardList();
}

function markCardReviewed() {
  const set = getCurrentSet();
  if (!set || !set.cards.length) return;

  reviewedCards++;
  localStorage.setItem(REVIEWED_KEY, String(reviewedCards));
  currentCardIndex = (currentCardIndex + 1) % set.cards.length;
  displayCurrentCard();
  renderProgress();
}

// QUIZ CREATOR
function openQuiz() {
  if (!getCurrentSet()) {
    alert("Please open a Study Set first.");
    return;
  }

  document.getElementById("quizCreator").classList.remove("hidden");
  document.getElementById("quizBox").classList.add("hidden");
  document.getElementById("quizResult").classList.add("hidden");
  displayQuizQuestions();
  showPage("quiz");
}

function addQuizQuestion() {
  const set = getCurrentSet();
  if (!set) return;

  const questionInput = document.getElementById("quizQuestionInput");
  const choiceInputs = [1, 2, 3, 4].map(i =>
    document.getElementById("quizChoice" + i)
  );
  const question = questionInput.value.trim();
  const choices = choiceInputs.map(input => input.value.trim());
  const correctAnswer = Number(document.getElementById("correctChoice").value);

  if (!question || choices.some(choice => !choice)) {
    alert("Please enter a question and fill in all four choices.");
    return;
  }

  if (new Set(choices.map(choice => choice.toLowerCase())).size !== 4) {
    alert("Please enter four different answer choices.");
    return;
  }

  set.quizzes.push({
    id: Date.now() + Math.random(),
    question,
    choices,
    correctAnswer
  });

  saveData();
  questionInput.value = "";
  choiceInputs.forEach(input => input.value = "");
  document.getElementById("correctChoice").value = "0";
  displayQuizQuestions();
  displaySets();
}

function displayQuizQuestions() {
  const set = getCurrentSet();
  const list = document.getElementById("quizQuestionList");
  if (!list || !set) return;
  list.innerHTML = "";

  if (!set.quizzes.length) {
    list.textContent = "No quiz questions yet. Add your first question! 💗";
    return;
  }

  set.quizzes.forEach((question, index) => {
    const item = document.createElement("div");
    item.className = "set-card";

    const title = document.createElement("h4");
    title.textContent = (index + 1) + ". " + question.question;

    const choices = document.createElement("p");
    choices.textContent = question.choices.map((choice, i) =>
      String.fromCharCode(65 + i) + ". " + choice +
      (i === question.correctAnswer ? " ✓" : "")
    ).join(" | ");

    const edit = document.createElement("button");
    edit.className = "secondary";
    edit.textContent = "✏️ Edit Question";
    edit.addEventListener("click", () => editQuizQuestion(question.id));

    const remove = document.createElement("button");
    remove.className = "secondary";
    remove.textContent = "🗑️ Delete Question";
    remove.addEventListener("click", () => deleteQuizQuestion(question.id));

    item.append(title, choices, edit, remove);
    list.appendChild(item);
  });
}

function editQuizQuestion(id) {
  const set = getCurrentSet();
  const question = set?.quizzes.find(item => item.id === id);
  if (!question) return;

  const newQuestion = prompt("Edit question:", question.question);
  if (newQuestion === null) return;
  if (!newQuestion.trim()) {
    alert("The question cannot be empty.");
    return;
  }

  const newChoices = [];
  for (let i = 0; i < 4; i++) {
    const answer = prompt(
      "Edit choice " + String.fromCharCode(65 + i) + ":",
      question.choices[i] || ""
    );
    if (answer === null) return;
    if (!answer.trim()) {
      alert("Answer choices cannot be empty.");
      return;
    }
    newChoices.push(answer.trim());
  }

  if (new Set(newChoices.map(choice => choice.toLowerCase())).size !== 4) {
    alert("Please enter four different answer choices.");
    return;
  }

  const correct = prompt(
    "Enter the correct choice letter (A, B, C, or D):",
    String.fromCharCode(65 + question.correctAnswer)
  );
  if (correct === null) return;

  const correctIndex = ["A", "B", "C", "D"].indexOf(correct.trim().toUpperCase());
  if (correctIndex === -1) {
    alert("Please enter A, B, C, or D.");
    return;
  }

  question.question = newQuestion.trim();
  question.choices = newChoices;
  question.correctAnswer = correctIndex;
  saveData();
  displayQuizQuestions();
}

function deleteQuizQuestion(id) {
  if (!getCurrentSet()) return;
  quizQuestionToDelete = id;
  document.getElementById("deleteModalText").textContent =
    "Do you want to delete this quiz question?";
  document.getElementById("deleteQuizModal").classList.remove("hidden");
}

function closeDeleteModal() {
  quizQuestionToDelete = null;
  document.getElementById("deleteQuizModal").classList.add("hidden");
}

function confirmDeleteQuiz() {
  const set = getCurrentSet();
  if (!set || quizQuestionToDelete === null) {
    closeDeleteModal();
    return;
  }

  set.quizzes = set.quizzes.filter(question => question.id !== quizQuestionToDelete);
  saveData();
  displayQuizQuestions();
  closeDeleteModal();
}

function shuffleQuizQuestions() {
  const set = getCurrentSet();
  if (!set || set.quizzes.length < 2) return;
  set.quizzes = shuffleArray(set.quizzes);
  saveData();
  displayQuizQuestions();
}

// TAKE QUIZ
function startQuiz() {
  const set = getCurrentSet();
  if (!set || !set.quizzes.length) {
    alert("Please add at least one quiz question first! 💗");
    return;
  }

  currentQuiz = shuffleArray(set.quizzes).map(question => {
    const shuffledChoices = shuffleArray(
      question.choices.map((text, originalIndex) => ({ text, originalIndex }))
    );
    return {
      question: question.question,
      choices: shuffledChoices.map(choice => choice.text),
      correctAnswer: shuffledChoices.findIndex(
        choice => choice.originalIndex === question.correctAnswer
      )
    };
  });

  currentQuestionIndex = 0;
  quizScore = 0;
  selectedAnswer = null;
  document.getElementById("quizCreator").classList.add("hidden");
  document.getElementById("quizBox").classList.remove("hidden");
  document.getElementById("quizResult").classList.add("hidden");
  showPage("quiz");
  displayQuestion();
}

function displayQuestion() {
  if (currentQuestionIndex >= currentQuiz.length) {
    showQuizResult();
    return;
  }

  selectedAnswer = null;
  const question = currentQuiz[currentQuestionIndex];
  const nextButton = document.getElementById("nextQuestion");

  document.getElementById("questionNumber").textContent =
    "QUESTION " + (currentQuestionIndex + 1);
  document.getElementById("quizProgress").textContent =
    (currentQuestionIndex + 1) + " / " + currentQuiz.length;
  document.getElementById("questionText").textContent = question.question;

  const options = document.getElementById("options");
  options.innerHTML = "";
  nextButton.disabled = true;
  nextButton.textContent = currentQuestionIndex === currentQuiz.length - 1
    ? "See Results →" : "Next Question →";

  document.getElementById("progressBar").style.width =
    (currentQuestionIndex / currentQuiz.length * 100) + "%";

  question.choices.forEach((choice, index) => {
    const option = document.createElement("button");
    option.className = "option";
    option.textContent = String.fromCharCode(65 + index) + ". " + choice;
    option.addEventListener("click", () => selectOption(option, index));
    options.appendChild(option);
  });
}

function selectOption(button, answerIndex) {
  if (selectedAnswer !== null) return;

  selectedAnswer = answerIndex;
  const question = currentQuiz[currentQuestionIndex];
  const options = document.querySelectorAll("#options button");
  const nextButton = document.getElementById("nextQuestion");

  options.forEach((option, index) => {
    option.disabled = true;
    if (index === question.correctAnswer) option.classList.add("correct");
  });

  if (answerIndex === question.correctAnswer) {
    quizScore++;
  } else {
    button.classList.add("wrong");
  }
  nextButton.disabled = false;
}

function nextQuestion() {
  if (selectedAnswer === null) return;
  currentQuestionIndex++;
  if (currentQuestionIndex < currentQuiz.length) displayQuestion();
  else showQuizResult();
}

function showQuizResult() {
  if (!currentQuiz.length) return;

  const percentage = Math.round((quizScore / currentQuiz.length) * 100);
  document.getElementById("quizBox").classList.add("hidden");
  document.getElementById("quizCreator").classList.add("hidden");
  document.getElementById("quizResult").classList.remove("hidden");
  document.getElementById("finalScore").textContent = percentage + "%";

  let message = "Keep studying. You can do this! 💪";
  if (percentage === 100) message = "Perfect score! Amazing work! 💗";
  else if (percentage >= 75) message = "Great job! Keep it up! 🎀";
  else if (percentage >= 50) message = "Good effort! Keep practicing! 🌸";

  document.getElementById("resultText").textContent = message;
  document.getElementById("progressBar").style.width = "100%";

  if (percentage > bestScore) {
    bestScore = percentage;
    localStorage.setItem(BEST_KEY, String(bestScore));
  }

  const set = getCurrentSet();
  if (set) {
    set.bestScore = Math.max(set.bestScore || 0, percentage);
    quizHistory.unshift({
      id: Date.now(),
      setTitle: set.title,
      score: percentage,
      correct: quizScore,
      total: currentQuiz.length,
      date: new Date().toLocaleDateString()
    });
    saveData();
    saveHistory();
  }

  updateStats();
  renderProgress();
}

// CALENDAR
let calendarDate = new Date();
let selectedCalendarDate = toDateKey(new Date());

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function changeMonth(amount) {
  calendarDate = new Date(
    calendarDate.getFullYear(),
    calendarDate.getMonth() + amount,
    1
  );
  displayCalendar();
}

function displayCalendar() {
  const heading = document.getElementById("calendarMonthYear");
  const grid = document.getElementById("calendarGrid");
  if (!heading || !grid) return;

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  heading.textContent = calendarDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });

  grid.innerHTML = "";
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date());

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "calendar-day empty";
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayEvents = events.filter(event => event.date === dateKey);

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-day";
    if (dateKey === todayKey) cell.classList.add("today");
    if (dateKey === selectedCalendarDate) cell.classList.add("selected");
    if (dayEvents.length) cell.classList.add("has-event");
    cell.setAttribute("aria-label", `${dateKey}${dayEvents.length ? ", " + dayEvents.length + " event(s)" : ""}`);

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = day;
    cell.appendChild(number);

    if (dayEvents.length) {
      const label = document.createElement("span");
      label.className = "day-event-label";
      label.textContent = dayEvents.length === 1 ? dayEvents[0].title : `${dayEvents.length} events`;
      cell.appendChild(label);
    }

    cell.addEventListener("click", () => {
      selectedCalendarDate = dateKey;
      displayCalendar();
      displayEvents(dateKey);
    });
    grid.appendChild(cell);
  }
  displayEvents(selectedCalendarDate);
}

function addEvent() {
  const titleInput = document.getElementById("eventTitle");
  const dateInput = document.getElementById("eventDate");
  const title = titleInput.value.trim();
  const date = dateInput.value;

  if (!title || !date) {
    alert("Please enter an event name and date.");
    return;
  }
  if (!validDate(date)) {
    alert("Please select a valid date.");
    return;
  }

  events.push({ id: Date.now() + Math.random(), title, date });
  events.sort((a, b) => a.date.localeCompare(b.date));
  saveEvents();
  titleInput.value = "";
  dateInput.value = "";
  selectedCalendarDate = date;
  calendarDate = new Date(date + "T00:00:00");
  displayCalendar();
}

function displayEvents(filterDate = null) {
  const container = document.getElementById("calendarEvents");
  if (!container) return;
  container.innerHTML = "";

  let shownEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));
  if (filterDate) shownEvents = shownEvents.filter(event => event.date === filterDate);

  const heading = document.createElement("h3");
  heading.textContent = filterDate
    ? "Events on " + new Date(filterDate + "T00:00:00").toLocaleDateString(undefined, {
      month: "long", day: "numeric", year: "numeric"
    })
    : "Upcoming Events";
  container.appendChild(heading);

  if (!shownEvents.length) {
    const empty = document.createElement("p");
    empty.textContent = filterDate
      ? "No events for this date. Enjoy your free time! 🌸"
      : "No events yet. Add an exam or deadline! 💗";
    container.appendChild(empty);
    return;
  }

  shownEvents.forEach(event => {
    const item = document.createElement("div");
    item.className = "set-card";

    const title = document.createElement("h3");
    title.textContent = event.title;

    const date = document.createElement("p");
    date.textContent = new Date(event.date + "T00:00:00").toLocaleDateString(
      undefined, { year: "numeric", month: "long", day: "numeric" }
    );

    const edit = document.createElement("button");
    edit.className = "secondary";
    edit.textContent = "✏️ Edit";
    edit.addEventListener("click", () => editEvent(event.id));

    const remove = document.createElement("button");
    remove.className = "secondary";
    remove.textContent = "🗑️ Delete";
    remove.addEventListener("click", () => deleteEvent(event.id));

    item.append(title, date, edit, remove);
    container.appendChild(item);
  });
}

function editEvent(id) {
  const event = events.find(item => item.id === id);
  if (!event) return;

  const title = prompt("Edit event name:", event.title);
  if (title === null) return;
  const date = prompt("Edit date (YYYY-MM-DD):", event.date);
  if (date === null) return;

  if (!title.trim() || !validDate(date.trim())) {
    alert("Please enter a valid event name and date in YYYY-MM-DD format.");
    return;
  }

  event.title = title.trim();
  event.date = date.trim();
  saveEvents();
  displayCalendar();
}

function deleteEvent(id) {
  if (!confirm("Delete this calendar event?")) return;
  events = events.filter(event => event.id !== id);
  saveEvents();
  displayCalendar();
}

// TO-DO LIST
function addTodo() {
  const titleInput = document.getElementById("todoTitle");
  const dateInput = document.getElementById("todoDate");
  const priorityInput = document.getElementById("todoPriority");
  const title = titleInput.value.trim();

  if (!title) {
    alert("Please enter a task.");
    return;
  }
  if (dateInput.value && !validDate(dateInput.value)) {
    alert("Please enter a valid due date.");
    return;
  }

  todos.push({
    id: Date.now() + Math.random(),
    title,
    date: dateInput.value,
    priority: priorityInput.value,
    completed: false
  });

  saveTodos();
  titleInput.value = "";
  dateInput.value = "";
  displayTodos();
}

function displayTodos() {
  const list = document.getElementById("todoList");
  if (!list) return;
  list.innerHTML = "";

  if (!todos.length) {
    list.textContent = "No tasks yet. Add something you need to do! 💗";
    return;
  }

  const sorted = [...todos].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    return (a.date || "9999-12-31").localeCompare(b.date || "9999-12-31");
  });

  sorted.forEach(todo => {
    const item = document.createElement("div");
    item.className = "set-card";

    const title = document.createElement("h3");
    title.textContent = todo.title;
    if (todo.completed) {
      title.style.textDecoration = "line-through";
      title.style.opacity = "0.6";
    }

    const details = document.createElement("p");
    details.textContent = "Priority: " + todo.priority +
      (todo.date ? " | Due: " + todo.date : "");

    const label = document.createElement("label");
    label.style.display = "inline-flex";
    label.style.alignItems = "center";
    label.style.gap = "8px";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.style.width = "auto";
    checkbox.style.margin = "0";
    checkbox.addEventListener("change", () => toggleTodo(todo.id));

    label.append(checkbox, document.createTextNode("Completed"));

    const edit = document.createElement("button");
    edit.className = "secondary";
    edit.textContent = "✏️ Edit";
    edit.addEventListener("click", () => editTodo(todo.id));

    const remove = document.createElement("button");
    remove.className = "secondary";
    remove.textContent = "🗑️ Delete";
    remove.addEventListener("click", () => deleteTodo(todo.id));

    item.append(title, details, label, edit, remove);
    list.appendChild(item);
  });
}

function toggleTodo(id) {
  const todo = todos.find(item => item.id === id);
  if (!todo) return;
  todo.completed = !todo.completed;
  saveTodos();
  displayTodos();
  renderProgress();
}

function editTodo(id) {
  const todo = todos.find(item => item.id === id);
  if (!todo) return;

  const title = prompt("Edit task:", todo.title);
  if (title === null) return;
  const date = prompt("Edit due date (YYYY-MM-DD, leave blank for none):", todo.date || "");
  if (date === null) return;
  const priority = prompt("Priority (Low, Medium, High):", todo.priority);
  if (priority === null) return;

  const normalizedPriority = priority.trim().toLowerCase();
  if (!["low", "medium", "high"].includes(normalizedPriority)) {
    alert("Priority must be Low, Medium, or High.");
    return;
  }
  if (date.trim() && !validDate(date.trim())) {
    alert("Please enter the date in YYYY-MM-DD format.");
    return;
  }
  if (!title.trim()) {
    alert("Task name cannot be empty.");
    return;
  }

  todo.title = title.trim();
  todo.date = date.trim();
  todo.priority = normalizedPriority[0].toUpperCase() + normalizedPriority.slice(1);
  saveTodos();
  displayTodos();
}

function deleteTodo(id) {
  if (!confirm("Delete this task?")) return;
  todos = todos.filter(todo => todo.id !== id);
  saveTodos();
  displayTodos();
  renderProgress();
}

// POMODORO TIMER
function getTimerLength(mode) {
  return (timerSettings[mode] || 25) * 60;
}

function setTimerMode(mode) {
  if (!["focus", "short", "long"].includes(mode)) return;
  pauseTimer();
  timerMode = mode;
  timerSeconds = getTimerLength(mode);
  updateTimerDisplay();
  updateBuddyForMode();
}

function updateModeButtons() {
  const modes = {
    focus: "focusModeBtn",
    short: "shortModeBtn",
    long: "longModeBtn"
  };

  Object.entries(modes).forEach(([mode, id]) => {
    const button = document.getElementById(id);
    if (button) button.classList.toggle("active", timerMode === mode);
  });
}

function updateTimerDisplay() {
  const display = document.getElementById("timerDisplay");
  const modeLabel = document.getElementById("timerMode");
  const sessionsLabel = document.getElementById("timerSessions");
  if (!display) return;

  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  display.textContent = String(minutes).padStart(2, "0") + ":" +
    String(seconds).padStart(2, "0");

  if (modeLabel) {
    modeLabel.textContent = timerMode === "focus" ? "Focus Time" :
      timerMode === "short" ? "Short Break" : "Long Break";
  }
  if (sessionsLabel) {
    sessionsLabel.textContent = "Completed sessions: " + completedSessions;
  }
  updateModeButtons();
}

function readTimerSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(TIMER_SETTINGS_KEY));
    if (saved && typeof saved === "object") {
      ["focus", "short", "long"].forEach(mode => {
        const value = Number(saved[mode]);
        if (Number.isInteger(value) && value >= 1 && value <= 180) {
          timerSettings[mode] = value;
        }
      });
    }
  } catch {
    // Use default timer durations.
  }

  document.getElementById("focusMinutes").value = timerSettings.focus;
  document.getElementById("shortMinutes").value = timerSettings.short;
  document.getElementById("longMinutes").value = timerSettings.long;
}

function applyCustomTimes() {
  const focus = Number(document.getElementById("focusMinutes").value);
  const short = Number(document.getElementById("shortMinutes").value);
  const long = Number(document.getElementById("longMinutes").value);

  if (
    !Number.isInteger(focus) || focus < 1 || focus > 180 ||
    !Number.isInteger(short) || short < 1 || short > 60 ||
    !Number.isInteger(long) || long < 1 || long > 90
  ) {
    alert("Please enter whole minutes within the allowed ranges: focus 1–180, short break 1–60, long break 1–90.");
    return;
  }

  timerSettings = { focus, short, long };
  localStorage.setItem(TIMER_SETTINGS_KEY, JSON.stringify(timerSettings));
  pauseTimer();
  timerSeconds = getTimerLength(timerMode);
  updateTimerDisplay();
  setBuddyMessage("Your timer is ready! Let's do this! 💗", "♡ ready to go ♡");
}

function startTimer() {
  if (timerInterval !== null) return;

  setBuddyMessage(
    timerMode === "focus" ? "Focus time! I'll cheer you on! 📚" : "Enjoy your break, bestie! 🌷",
    timerMode === "focus" ? "♡ focusing together ♡" : "♡ taking a little rest ♡"
  );

  timerInterval = setInterval(() => {
    if (timerSeconds > 0) {
      timerSeconds--;
      updateTimerDisplay();
      return;
    }

    pauseTimer();
    timerComplete();
  }, 1000);
}

function timerComplete() {
  if (timerMode === "focus") {
    completedSessions++;
    updateTimerDisplay();
    celebrateBuddy();

    if (completedSessions % 4 === 0) {
      alert("Focus session complete! Time for your long break. 🎀");
      setTimerMode("long");
    } else {
      alert("Focus session complete! Time for a short break. 💗");
      setTimerMode("short");
    }
  } else {
    celebrateBuddy();
    alert("Break time is over! Ready to focus again? ✨");
    setTimerMode("focus");
  }
}

function pauseTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function resetTimer() {
  pauseTimer();
  timerSeconds = getTimerLength(timerMode);
  updateTimerDisplay();
  setBuddyMessage("Fresh start! You can do it! 💗", "♡ ready when you are ♡");
}

// STUDY BUDDY
function setBuddyMessage(message, mood) {
  const messageBox = document.getElementById("buddyMessage");
  const moodBox = document.getElementById("buddyMood");
  if (messageBox) messageBox.textContent = message;
  if (moodBox) moodBox.textContent = mood;
}

function updateBuddyForMode() {
  if (timerMode === "focus") {
    setBuddyMessage("Let's focus together, bestie! 📚", "♡ study mode ♡");
  } else {
    setBuddyMessage("You've earned a little rest! 🌸", "♡ break time ♡");
  }
}

function petBuddy() {
  const buddy = document.getElementById("studyBuddy");
  if (!buddy) return;
  buddy.classList.remove("happy");
  void buddy.offsetWidth;
  buddy.classList.add("happy");
  setBuddyMessage("Hehe! That tickles! Thank you! 💕", "♡ feeling loved ♡");
  setTimeout(() => buddy.classList.remove("happy"), 1800);
}

function changeBuddy() {
  const buddy = document.getElementById("studyBuddy");
  if (!buddy) return;
  let nextIndex = buddyIndex;
  while (buddies.length > 1 && nextIndex === buddyIndex) {
    nextIndex = Math.floor(Math.random() * buddies.length);
  }
  buddyIndex = nextIndex;
  buddy.textContent = buddies[buddyIndex];
  setBuddyMessage("Hello! I'm your new study buddy! 🎀", "♡ new friend ♡");
  buddy.classList.remove("happy");
  void buddy.offsetWidth;
  buddy.classList.add("happy");
}

function celebrateBuddy() {
  const buddy = document.getElementById("studyBuddy");
  if (buddy) {
    buddy.classList.remove("happy");
    void buddy.offsetWidth;
    buddy.classList.add("happy");
  }
  const message = timerMode === "focus"
    ? "You did it! I'm so proud of you! 🎉💗"
    : "Break complete! You're doing great! ✨";
  setBuddyMessage(message, "♡ amazing work ♡");
  if (buddy) setTimeout(() => buddy.classList.remove("happy"), 2000);
}

// PROGRESS TRACKING
function renderProgress() {
  document.getElementById("progressSets").textContent = studySets.length;
  document.getElementById("progressCards").textContent = reviewedCards;
  document.getElementById("progressQuizzes").textContent = quizHistory.length;

  const history = document.getElementById("quizHistory");
  if (!history) return;
  history.innerHTML = "";

  if (!quizHistory.length) {
    history.textContent = "No quiz attempts yet. Take a quiz to see your progress! 💗";
    return;
  }

  quizHistory.forEach(entry => {
    const item = document.createElement("div");
    item.className = "set-card";

    const title = document.createElement("h3");
    title.textContent = entry.setTitle || "Study Set";

    const score = document.createElement("p");
    score.textContent = "Score: " + entry.score + "% (" +
      entry.correct + "/" + entry.total + ")";

    const date = document.createElement("p");
    date.textContent = "Date: " + entry.date;

    item.append(title, score, date);
    history.appendChild(item);
  });
}

// THEME
function toggleTheme() {
  document.body.classList.toggle("soft-mode");
  const soft = document.body.classList.contains("soft-mode");
  localStorage.setItem(THEME_KEY, soft ? "soft" : "default");
}

function loadTheme() {
  if (localStorage.getItem(THEME_KEY) === "soft") {
    document.body.classList.add("soft-mode");
  }
}

// INITIALIZE
document.addEventListener("DOMContentLoaded", () => {
  updateStats();
  displaySets();
  renderProgress();
  displayCalendar();
  displayEvents();
  displayTodos();
  readTimerSettings();
  timerSeconds = getTimerLength(timerMode);
  updateTimerDisplay();
  loadTheme();

  const themeButton = document.getElementById("themeBtn");
  if (themeButton) themeButton.addEventListener("click", toggleTheme);

  const confirmButton = document.getElementById("confirmDelete");
  if (confirmButton) confirmButton.addEventListener("click", confirmDeleteQuiz);

  const buddy = document.getElementById("studyBuddy");
  if (buddy) buddy.textContent = buddies[buddyIndex];
});
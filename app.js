// ===== 工具函数 =====
const $ = (id) => document.getElementById(id);
const STORAGE_KEYS = {
  TODOS: 'workbench_todos',
  NOTES: 'workbench_notes',
  BOOKMARKS: 'workbench_bookmarks',
  GOAL: 'workbench_goal',
  POMO_COUNT: 'workbench_pomo_count',
  POMO_DATE: 'workbench_pomo_date',
};

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('保存失败:', e);
  }
}

// ===== 时钟 & 问候 =====
function updateClock() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  $('clock').textContent = `${hh}:${mm}`;
  $('seconds').textContent = ss;

  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  $('date').textContent = `${y}年${mo}月${d}日 · ${weekdays[now.getDay()]}`;

  // 问候
  let greeting = '你好 👋';
  const h = now.getHours();
  if (h < 6) greeting = '夜深了 🌙';
  else if (h < 11) greeting = '早上好 ☀️';
  else if (h < 14) greeting = '中午好 🍱';
  else if (h < 18) greeting = '下午好 🌤️';
  else greeting = '晚上好 🌃';
  $('greeting').textContent = greeting;
}

// ===== 今日目标 =====
function initGoal() {
  const goal = load(STORAGE_KEYS.GOAL, '今天也要元气满满！');
  $('goalText').textContent = goal;

  $('goalEditBtn').addEventListener('click', () => {
    const actions = $('goalActions');
    const text = $('goalText');
    actions.style.display = actions.style.display === 'none' ? 'flex' : 'none';
    if (actions.style.display === 'flex') {
      $('goalInput').value = text.textContent;
      $('goalInput').focus();
    }
  });

  $('goalSaveBtn').addEventListener('click', () => {
    const v = $('goalInput').value.trim();
    if (v) {
      $('goalText').textContent = v;
      save(STORAGE_KEYS.GOAL, v);
    }
    $('goalActions').style.display = 'none';
  });

  $('goalInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('goalSaveBtn').click();
  });
}

// ===== 待办事项 =====
let todos = load(STORAGE_KEYS.TODOS, []);

function renderTodos() {
  const list = $('todoList');
  list.innerHTML = '';

  if (todos.length === 0) {
    list.innerHTML = '<li class="todo-empty">还没有任务，添加一个吧 ✨</li>';
    $('todoCount').textContent = '0';
    return;
  }

  const pending = todos.filter(t => !t.done).length;
  $('todoCount').textContent = pending;

  // 排序：未完成在前，然后按优先级
  const priorityOrder = { high: 0, normal: 1, low: 2 };
  const sorted = [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  sorted.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item${todo.done ? ' done' : ''}`;
    li.dataset.id = todo.id;

    const checkbox = document.createElement('div');
    checkbox.className = 'todo-checkbox';
    checkbox.addEventListener('click', () => toggleTodo(todo.id));

    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text;

    const tag = document.createElement('span');
    tag.className = `priority-tag priority-${todo.priority}`;
    const labels = { high: '重要', normal: '普通', low: '轻松' };
    tag.textContent = labels[todo.priority] || '普通';

    const del = document.createElement('button');
    del.className = 'todo-delete';
    del.textContent = '✕';
    del.title = '删除';
    del.addEventListener('click', () => deleteTodo(todo.id));

    li.append(checkbox, text, tag, del);
    list.appendChild(li);
  });
}

function addTodo() {
  const input = $('todoInput');
  const text = input.value.trim();
  if (!text) return;

  todos.unshift({
    id: Date.now(),
    text,
    priority: $('todoPriority').value,
    done: false,
    createdAt: new Date().toISOString(),
  });
  save(STORAGE_KEYS.TODOS, todos);
  input.value = '';
  renderTodos();
}

function toggleTodo(id) {
  todos = todos.map(t => t.id === id ? { ...t, done: !t.done } : t);
  save(STORAGE_KEYS.TODOS, todos);
  renderTodos();
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  save(STORAGE_KEYS.TODOS, todos);
  renderTodos();
}

function initTodos() {
  $('todoAddBtn').addEventListener('click', addTodo);
  $('todoInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTodo();
  });
  renderTodos();
}

// ===== 番茄钟 =====
const POMO_MODES = {
  work: { duration: 25 * 60, label: '专注' },
  short: { duration: 5 * 60, label: '短休' },
  long: { duration: 15 * 60, label: '长休' },
};

let pomo = {
  mode: 'work',
  remaining: POMO_MODES.work.duration,
  running: false,
  intervalId: null,
};

let pomoCount = getTodayPomoCount();

function getTodayPomoCount() {
  const saved = load(STORAGE_KEYS.POMO_DATE, null);
  const today = new Date().toDateString();
  if (saved !== today) {
    save(STORAGE_KEYS.POMO_DATE, today);
    save(STORAGE_KEYS.POMO_COUNT, 0);
    return 0;
  }
  return load(STORAGE_KEYS.POMO_COUNT, 0);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderPomo() {
  $('timerText').textContent = formatTime(pomo.remaining);

  // 进度环
  const bar = $('progressBar');
  const total = POMO_MODES[pomo.mode].duration;
  const circumference = 2 * Math.PI * 54;
  const progress = pomo.remaining / total;
  bar.style.strokeDasharray = circumference;
  bar.style.strokeDashoffset = circumference * (1 - progress);

  // 颜色
  const colors = {
    work: '#6c5ce7',
    short: '#00cec9',
    long: '#fd79a8',
  };
  bar.style.stroke = colors[pomo.mode];

  // 统计
  $('pomoCount').textContent = pomoCount;
}

function startPomo() {
  if (pomo.running) {
    pausePomo();
    return;
  }
  pomo.running = true;
  $('pomoStartBtn').textContent = '暂停';

  pomo.intervalId = setInterval(() => {
    pomo.remaining--;
    renderPomo();

    if (pomo.remaining <= 0) {
      finishPomo();
    }
  }, 1000);
}

function pausePomo() {
  pomo.running = false;
  $('pomoStartBtn').textContent = '继续';
  clearInterval(pomo.intervalId);
}

function finishPomo() {
  clearInterval(pomo.intervalId);
  pomo.running = false;
  $('pomoStartBtn').textContent = '开始';

  if (pomo.mode === 'work') {
    pomoCount++;
    save(STORAGE_KEYS.POMO_COUNT, pomoCount);
  }

  // 提示音
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
    osc.start();
    osc.stop(ctx.currentTime + 1);
  } catch (e) {}

  // 浏览器通知
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('番茄钟完成！', {
      body: POMO_MODES[pomo.mode].label + '结束了，休息一下吧 🍅',
    });
  }

  resetPomo();
}

function resetPomo() {
  clearInterval(pomo.intervalId);
  pomo.running = false;
  pomo.remaining = POMO_MODES[pomo.mode].duration;
  $('pomoStartBtn').textContent = '开始';
  renderPomo();
}

function setPomoMode(mode) {
  pomo.mode = mode;
  resetPomo();

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

function initPomo() {
  // 请求通知权限
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  $('pomoStartBtn').addEventListener('click', startPomo);
  $('pomoResetBtn').addEventListener('click', resetPomo);

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setPomoMode(btn.dataset.mode));
  });

  renderPomo();
}

// ===== 笔记 =====
function initNotes() {
  const saved = load(STORAGE_KEYS.NOTES, '');
  $('noteArea').value = saved;

  let saveTimer;
  $('noteArea').addEventListener('input', () => {
    clearTimeout(saveTimer);
    $('noteSaved').textContent = '保存中...';
    saveTimer = setTimeout(() => {
      save(STORAGE_KEYS.NOTES, $('noteArea').value);
      $('noteSaved').textContent = '已自动保存 ✓';
    }, 500);
  });

  $('noteClearBtn').addEventListener('click', () => {
    if ($('noteArea').value.trim() && confirm('确定要清空笔记吗？')) {
      $('noteArea').value = '';
      save(STORAGE_KEYS.NOTES, '');
      $('noteSaved').textContent = '已自动保存 ✓';
    }
  });
}

// ===== 书签 =====
let bookmarks = load(STORAGE_KEYS.BOOKMARKS, [
  { name: 'GitHub', url: 'https://github.com' },
  { name: 'Google', url: 'https://google.com' },
  { name: 'YouTube', url: 'https://youtube.com' },
  { name: '知乎', url: 'https://zhihu.com' },
  { name: 'Bilibili', url: 'https://bilibili.com' },
  { name: 'Trae', url: 'https://trae.cn' },
]);

function renderBookmarks() {
  const grid = $('bookmarkGrid');
  grid.innerHTML = '';

  if (bookmarks.length === 0) {
    grid.innerHTML = '<div class="todo-empty" style="grid-column:1/-1;">还没有书签</div>';
    return;
  }

  bookmarks.forEach((bm, i) => {
    const el = document.createElement('div');
    el.className = 'bookmark-item';

    const favicon = document.createElement('div');
    favicon.className = 'favicon';
    favicon.textContent = bm.name.charAt(0).toUpperCase();
    favicon.style.background = `hsl(${i * 60 % 360}, 60%, 55%)`;

    const name = document.createElement('span');
    name.className = 'bm-name';
    name.textContent = bm.name;

    const link = document.createElement('a');
    link.href = bm.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.style.cssText = 'position:absolute;inset:0;z-index:1;border-radius:inherit;';

    const del = document.createElement('button');
    del.className = 'bm-delete';
    del.textContent = '✕';
    del.title = '删除';
    del.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteBookmark(i);
    });

    el.append(link, favicon, name, del);
    grid.appendChild(el);
  });
}

function addBookmark() {
  const name = $('bookmarkName').value.trim();
  let url = $('bookmarkUrl').value.trim();

  if (!name || !url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  bookmarks.push({ name, url });
  save(STORAGE_KEYS.BOOKMARKS, bookmarks);

  $('bookmarkName').value = '';
  $('bookmarkUrl').value = '';
  $('bookmarkForm').style.display = 'none';

  renderBookmarks();
}

function deleteBookmark(i) {
  bookmarks.splice(i, 1);
  save(STORAGE_KEYS.BOOKMARKS, bookmarks);
  renderBookmarks();
}

function initBookmarks() {
  $('bookmarkAddBtn').addEventListener('click', () => {
    const form = $('bookmarkForm');
    form.style.display = form.style.display === 'none' ? 'flex' : 'none';
    if (form.style.display === 'flex') $('bookmarkName').focus();
  });

  $('bookmarkSaveBtn').addEventListener('click', addBookmark);
  $('bookmarkCancelBtn').addEventListener('click', () => {
    $('bookmarkForm').style.display = 'none';
  });

  ['bookmarkName', 'bookmarkUrl'].forEach(id => {
    $(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addBookmark();
    });
  });

  renderBookmarks();
}

// ===== 每日一句 =====
const QUOTES = [
  '千里之行，始于足下。 —— 老子',
  '不积跬步，无以至千里。 —— 荀子',
  '今天最好的表现是明天最低的要求。',
  '行动是治愈恐惧的良药。',
  '种一棵树最好的时间是十年前，其次是现在。',
  '保持专注，万事皆可。',
  '自律是最高级的自由。',
  '你所浪费的今天，是昨天死去的人奢望的明天。',
  ' Stay hungry, stay foolish. —— Steve Jobs',
  '简单的事情重复做，你就是赢家。',
  '凡事预则立，不预则废。',
  '身体是革命的本钱，记得好好休息 🌿',
];

function initQuote() {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const quote = QUOTES[seed % QUOTES.length];
  $('quote').textContent = '💡 ' + quote;
}

// ===== 启动 =====
document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 1000);

  initGoal();
  initTodos();
  initPomo();
  initNotes();
  initBookmarks();
  initQuote();
});

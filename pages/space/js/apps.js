/* ═══════════════════════════════════════
   Internal Space — Built-in Apps
   ═══════════════════════════════════════ */

/* ══════════════════════════
   Terminal
   ══════════════════════════ */
function openTerminal() {
  const win = wm.createWindow({
    title: 'Terminal',
    app: 'terminal',
    width: 680,
    height: 420,
    buildContent: (container, w) => {
      buildTerminal(container, w);
    }
  });
}

function buildTerminal(container, win) {
  container.innerHTML = `<div class="terminal-content"></div>`;
  const term = container.querySelector('.terminal-content');
  let cwd = '';
  let history = [];
  let histIdx = -1;

  function getPrompt() {
    const user = currentUser ? currentUser.email.split('@')[0] : 'user';
    const dir = cwd ? '/' + cwd.replace(/\/$/, '') : '~';
    return `<span class="terminal-prompt">${user}@internal-space ${dir} $</span> `;
  }

  function appendLine(html) {
    const line = document.createElement('div');
    line.className = 'terminal-line';
    line.innerHTML = html;
    term.appendChild(line);
  }

  function showPrompt() {
    const line = document.createElement('div');
    line.className = 'terminal-line terminal-input-line';
    line.innerHTML = `${getPrompt()}<input class="terminal-input" type="text" autofocus>`;
    term.appendChild(line);
    const input = line.querySelector('.terminal-input');
    input.focus();

    input.addEventListener('keydown', async (e) => {
      e.stopPropagation(); // Don't let global shortcuts fire
      if (e.key === 'Enter') {
        const cmd = input.value.trim();
        input.disabled = true;
        // Replace input with static text
        line.innerHTML = `${getPrompt()}${escapeHtml(cmd)}`;
        if (cmd) {
          history.push(cmd);
          histIdx = history.length;
          await execCommand(cmd);
        }
        showPrompt();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (histIdx > 0) { histIdx--; input.value = history[histIdx]; }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (histIdx < history.length - 1) { histIdx++; input.value = history[histIdx]; }
        else { histIdx = history.length; input.value = ''; }
      }
    });

    term.scrollTop = term.scrollHeight;
  }

  async function execCommand(cmd) {
    const parts = cmd.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case 'ls': {
        try {
          const r = await fetch(`${FB_STORAGE}/o?prefix=${cwd}&delimiter=/`);
          const data = await r.json();
          const folders = (data.prefixes || []).map(p => p.replace(cwd, '').replace(/\/$/, '') + '/');
          const files = (data.items || []).filter(i => i.name !== cwd).map(i => i.name.replace(cwd, ''));
          const all = [...folders, ...files];
          if (all.length === 0) appendLine('<span style="color:rgba(255,255,255,0.4);">(empty directory)</span>');
          else {
            const colored = all.map(n => {
              if (n.endsWith('/')) return `<span style="color:#4a90d9;font-weight:600;">${n}</span>`;
              return n;
            });
            appendLine(colored.join('  '));
          }
        } catch (e) {
          appendLine(`<span style="color:#ff6b6b;">Error: ${e.message}</span>`);
        }
        break;
      }
      case 'cd': {
        const target = args[0] || '';
        if (target === '..' || target === '../') {
          if (cwd) {
            const p = cwd.replace(/\/$/, '').split('/');
            p.pop();
            cwd = p.length ? p.join('/') + '/' : '';
          }
        } else if (target === '/' || target === '~') {
          cwd = '';
        } else {
          const newPath = (target.endsWith('/') ? target : target + '/');
          cwd = cwd + newPath;
        }
        break;
      }
      case 'pwd':
        appendLine('/' + (cwd || ''));
        break;
      case 'clear':
        term.innerHTML = '';
        break;
      case 'whoami':
        appendLine(currentUser ? currentUser.email : 'anonymous');
        break;
      case 'date':
        appendLine(new Date().toString());
        break;
      case 'echo':
        appendLine(escapeHtml(args.join(' ')));
        break;
      case 'cat': {
        if (!args[0]) { appendLine('Usage: cat <filename>'); break; }
        const filePath = cwd + args[0];
        try {
          const url = `${FB_STORAGE}/o/${encodeURIComponent(filePath)}?alt=media`;
          const resp = await fetch(url);
          if (!resp.ok) throw new Error('File not found');
          const text = await resp.text();
          appendLine(`<pre style="white-space:pre-wrap;">${escapeHtml(text)}</pre>`);
        } catch (e) {
          appendLine(`<span style="color:#ff6b6b;">cat: ${args[0]}: ${e.message}</span>`);
        }
        break;
      }
      case 'mkdir': {
        if (!args[0]) { appendLine('Usage: mkdir <dirname>'); break; }
        const folderPath = cwd + args[0] + '/.placeholder';
        try {
          await fetch(`${FB_STORAGE}/o?uploadType=media&name=${encodeURIComponent(folderPath)}`, {
            method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '',
          });
          appendLine(`Created directory: ${args[0]}`);
        } catch (e) {
          appendLine(`<span style="color:#ff6b6b;">mkdir failed: ${e.message}</span>`);
        }
        break;
      }
      case 'rm': {
        if (!args[0]) { appendLine('Usage: rm <filename>'); break; }
        const rmPath = cwd + args[0];
        try {
          await fetch(`${FB_STORAGE}/o/${encodeURIComponent(rmPath)}`, { method: 'DELETE' });
          appendLine(`Deleted: ${args[0]}`);
        } catch (e) {
          appendLine(`<span style="color:#ff6b6b;">rm failed: ${e.message}</span>`);
        }
        break;
      }
      case 'help':
        appendLine(`Available commands:
  ls          List files in current directory
  cd <dir>    Change directory (.. to go up, / to go to root)
  pwd         Print working directory
  cat <file>  Show file contents
  mkdir <dir> Create a directory
  rm <file>   Delete a file
  whoami      Show current user
  date        Show current date
  echo <msg>  Print message
  clear       Clear terminal
  help        Show this help`);
        break;
      default:
        appendLine(`<span style="color:#ff6b6b;">command not found: ${command}</span>`);
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Welcome message
  appendLine('<span style="color:rgba(255,255,255,0.4);">Internal Space Terminal v1.0</span>');
  appendLine('<span style="color:rgba(255,255,255,0.3);">Type "help" for available commands.</span>');
  appendLine('');
  showPrompt();

  // Click to focus input
  term.addEventListener('click', () => {
    const input = term.querySelector('.terminal-input:not([disabled])');
    if (input) input.focus();
  });
}

/* ══════════════════════════
   Activity Monitor
   ══════════════════════════ */
function openActivityMonitor() {
  const win = wm.createWindow({
    title: 'Activity Monitor',
    app: 'activity',
    width: 600,
    height: 400,
    buildContent: (container, w) => {
      buildActivityMonitor(container, w);
    }
  });
}

function buildActivityMonitor(container, win) {
  container.innerHTML = `<div class="activity-content"><div class="activity-section"><h3>Loading...</h3></div></div>`;
  const content = container.querySelector('.activity-content');

  async function refresh() {
    try {
      // Get storage stats
      const r = await fetch(`${FB_STORAGE}/o?maxResults=200`);
      const data = await r.json();
      const items = data.items || [];

      // Count by folder
      const folderCounts = {};
      let totalSize = 0;
      items.forEach(item => {
        const parts = item.name.split('/');
        const folder = parts.length > 1 ? parts[0] : '(root)';
        folderCounts[folder] = (folderCounts[folder] || 0) + 1;
        totalSize += parseInt(item.size || 0);
      });

      // Format size
      function fmtSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      }

      content.innerHTML = `
        <div class="activity-section">
          <h3>System Overview</h3>
          <table class="activity-table">
            <tr><th>Property</th><th>Value</th></tr>
            <tr><td>Authenticated User</td><td>${currentUser ? currentUser.email : 'N/A'}</td></tr>
            <tr><td>Auth Status</td><td style="color:#28c840;">Connected</td></tr>
            <tr><td>Total Files</td><td>${items.length}</td></tr>
            <tr><td>Total Storage Used</td><td>${fmtSize(totalSize)}</td></tr>
            <tr><td>Open Windows</td><td>${wm.getAllWindows().length}</td></tr>
          </table>
        </div>
        <div class="activity-section">
          <h3>Storage by Folder</h3>
          <table class="activity-table">
            <tr><th>Folder</th><th>Files</th></tr>
            ${Object.entries(folderCounts).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
          </table>
        </div>
      `;
    } catch (e) {
      content.innerHTML = `<div class="activity-section"><h3 style="color:#ff6b6b;">Error loading stats: ${e.message}</h3></div>`;
    }
  }

  refresh();
  // Auto-refresh every 10s
  const interval = setInterval(refresh, 10000);
  win.onClose = () => clearInterval(interval);
}

/* ══════════════════════════
   System Preferences
   ══════════════════════════ */
function openSystemPreferences() {
  const win = wm.createWindow({
    title: 'System Preferences',
    app: 'preferences',
    width: 560,
    height: 420,
    buildContent: (container, w) => {
      buildSystemPreferences(container, w);
    }
  });
}

function buildSystemPreferences(container, win) {
  const content = document.createElement('div');
  content.className = 'prefs-content';
  container.appendChild(content);

  function showMainGrid() {
    content.innerHTML = `
      <div class="prefs-grid">
        <div class="prefs-pane" data-pane="wallpaper">
          <div class="prefs-pane-icon"><i class="fas fa-image" style="color:#3478f6;"></i></div>
          <div class="prefs-pane-label">Wallpaper</div>
        </div>
        <div class="prefs-pane" data-pane="general">
          <div class="prefs-pane-icon"><i class="fas fa-sliders-h" style="color:#6c757d;"></i></div>
          <div class="prefs-pane-label">General</div>
        </div>
        <div class="prefs-pane" data-pane="about">
          <div class="prefs-pane-icon"><i class="fas fa-info-circle" style="color:#adb5bd;"></i></div>
          <div class="prefs-pane-label">About</div>
        </div>
      </div>
    `;

    content.querySelectorAll('.prefs-pane').forEach(pane => {
      pane.addEventListener('click', () => showPane(pane.dataset.pane));
    });
  }

  function showPane(name) {
    switch (name) {
      case 'wallpaper': showWallpaperPane(); break;
      case 'general': showGeneralPane(); break;
      case 'about': showAboutPane(); break;
    }
  }

  function showWallpaperPane() {
    content.innerHTML = `
      <div class="prefs-panel">
        <button class="prefs-back"><i class="fas fa-chevron-left"></i> Back</button>
        <h3>Wallpaper</h3>
        <div class="wallpaper-grid">
          ${wallpapers.map((wp, i) => `<div class="wallpaper-option ${i === wallIdx ? 'active' : ''}" data-idx="${i}" style="background:${wp};"></div>`).join('')}
        </div>
      </div>
    `;
    content.querySelector('.prefs-back').addEventListener('click', showMainGrid);
    content.querySelectorAll('.wallpaper-option').forEach(opt => {
      opt.addEventListener('click', () => {
        wallIdx = parseInt(opt.dataset.idx);
        document.getElementById('desktop').style.background = wallpapers[wallIdx];
        content.querySelectorAll('.wallpaper-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
      });
    });
  }

  function showGeneralPane() {
    const fontSize = localStorage.getItem('space-font-size') || '14';
    content.innerHTML = `
      <div class="prefs-panel">
        <button class="prefs-back"><i class="fas fa-chevron-left"></i> Back</button>
        <h3>General</h3>
        <div class="prefs-control">
          <label>Font Size</label>
          <input type="range" min="10" max="20" value="${fontSize}" id="fontSizeSlider">
          <span id="fontSizeLabel">${fontSize}px</span>
        </div>
      </div>
    `;
    content.querySelector('.prefs-back').addEventListener('click', showMainGrid);
    const slider = content.querySelector('#fontSizeSlider');
    const label = content.querySelector('#fontSizeLabel');
    slider.addEventListener('input', () => {
      const val = slider.value;
      label.textContent = val + 'px';
      document.body.style.fontSize = val + 'px';
      localStorage.setItem('space-font-size', val);
    });
  }

  function showAboutPane() {
    content.innerHTML = `
      <div class="prefs-panel">
        <button class="prefs-back"><i class="fas fa-chevron-left"></i> Back</button>
        <h3>About This Mac</h3>
        <div style="font-size:0.75rem;color:rgba(255,255,255,0.7);line-height:1.8;">
          <p><strong>Internal Space</strong> v2.0</p>
          <p>A macOS-style desktop environment for managing Firebase Storage.</p>
          <p>Built with vanilla JavaScript.</p>
          <br>
          <p><strong>User:</strong> ${currentUser ? currentUser.email : 'N/A'}</p>
          <p><strong>Storage:</strong> Firebase Storage (${FB_BUCKET})</p>
          <p><strong>Database:</strong> Firebase Realtime Database</p>
          <p><strong>Auth:</strong> Firebase Auth with Google Sign-In</p>
        </div>
      </div>
    `;
    content.querySelector('.prefs-back').addEventListener('click', showMainGrid);
  }

  showMainGrid();
}

/* ══════════════════════════
   Chat App
   ══════════════════════════ */
function openChat() {
  const win = wm.createWindow({
    title: 'Chat',
    app: 'chat',
    width: 500,
    height: 450,
    buildContent: (container, w) => {
      buildChat(container, w);
    }
  });
}

function buildChat(container, win) {
  container.innerHTML = `
    <div class="chat-content">
      <div class="chat-messages" id="chatMessages-${win.id}"></div>
      <div class="chat-input-bar">
        <input class="chat-input" id="chatInput-${win.id}" placeholder="Type a message..." autocomplete="off">
        <button class="chat-send" id="chatSend-${win.id}">Send</button>
      </div>
    </div>
  `;

  const messagesEl = container.querySelector('.chat-messages');
  const inputEl = container.querySelector('.chat-input');
  const sendBtn = container.querySelector('.chat-send');
  let lastKey = '';

  async function loadMessages() {
    try {
      const r = await fetch(`${FB_DB}/chat.json?orderBy="$key"&limitToLast=50`);
      const data = await r.json();
      if (!data) return;

      messagesEl.innerHTML = '';
      Object.entries(data).forEach(([key, msg]) => {
        const div = document.createElement('div');
        div.className = 'chat-msg';
        const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
        div.innerHTML = `
          <div class="chat-msg-header">
            <span class="chat-msg-user">${escapeHtml(msg.user || 'Anonymous')}</span>
            <span class="chat-msg-time">${time}</span>
          </div>
          <div class="chat-msg-text">${escapeHtml(msg.text || '')}</div>
        `;
        messagesEl.appendChild(div);
        lastKey = key;
      });
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } catch {}
  }

  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';

    const msg = {
      user: currentUser ? currentUser.email.split('@')[0] : 'Anonymous',
      text,
      timestamp: Date.now(),
    };

    try {
      await fetch(`${FB_DB}/chat.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      });
      loadMessages();
    } catch {}
  }

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') sendMessage();
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  loadMessages();
  // Poll every 3 seconds
  const interval = setInterval(loadMessages, 3000);
  win.onClose = () => clearInterval(interval);
}

/* ══════════════════════════
   Code Editor
   ══════════════════════════ */
function openCodeEditor(filePath, fileContent) {
  const win = wm.createWindow({
    title: 'Code Editor',
    app: 'editor',
    width: 700,
    height: 500,
    buildContent: (container, w) => {
      buildCodeEditor(container, w, filePath, fileContent);
    }
  });
}

function buildCodeEditor(container, win, filePath, initialContent) {
  let currentFilePath = filePath || '';
  let modified = false;

  container.innerHTML = `
    <div class="editor-toolbar">
      <button class="editor-open"><i class="fas fa-folder-open"></i> Open</button>
      <button class="editor-save"><i class="fas fa-save"></i> Save</button>
      <span class="editor-filename">${currentFilePath || 'Untitled'}</span>
    </div>
    <textarea class="editor-textarea" placeholder="// Start typing or open a file...">${initialContent ? escapeHtml(initialContent) : ''}</textarea>
  `;

  const textarea = container.querySelector('.editor-textarea');
  const filenameEl = container.querySelector('.editor-filename');
  const openBtn = container.querySelector('.editor-open');
  const saveBtn = container.querySelector('.editor-save');

  textarea.addEventListener('input', () => {
    modified = true;
    filenameEl.textContent = (currentFilePath || 'Untitled') + (modified ? ' *' : '');
  });

  // Prevent global shortcuts when typing
  textarea.addEventListener('keydown', (e) => { e.stopPropagation(); });

  // Tab key inserts spaces
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
    }
  });

  openBtn.addEventListener('click', async () => {
    const path = prompt('File path in Firebase Storage (e.g., notes/readme.txt):');
    if (!path) return;
    currentFilePath = path;
    filenameEl.textContent = path + ' (loading...)';
    try {
      const url = `${FB_STORAGE}/o/${encodeURIComponent(path)}?alt=media`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('File not found');
      textarea.value = await resp.text();
      modified = false;
      filenameEl.textContent = path;
      win.title = path.split('/').pop();
      win.element.querySelector('.window-title').textContent = win.title;
    } catch (e) {
      filenameEl.textContent = `Error: ${e.message}`;
    }
  });

  saveBtn.addEventListener('click', async () => {
    if (!currentFilePath) {
      const path = prompt('Save as (path in Firebase Storage):');
      if (!path) return;
      currentFilePath = path;
    }
    filenameEl.textContent = currentFilePath + ' (saving...)';
    try {
      await fetch(`${FB_STORAGE}/o?uploadType=media&name=${encodeURIComponent(currentFilePath)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: textarea.value,
      });
      modified = false;
      filenameEl.textContent = currentFilePath;
    } catch (e) {
      filenameEl.textContent = `Save failed: ${e.message}`;
    }
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

/* ══════════════════════════
   Notes App
   ══════════════════════════ */
function openNotes() {
  const win = wm.createWindow({
    title: 'Notes',
    app: 'notes',
    width: 600,
    height: 450,
    buildContent: (container, w) => {
      buildNotes(container, w);
    }
  });
}

function buildNotes(container, win) {
  // Notes stored in localStorage
  let notes = JSON.parse(localStorage.getItem('space-notes') || '[]');
  if (notes.length === 0) {
    notes = [{ id: Date.now(), title: 'Welcome', body: 'Welcome to Notes!\n\nCreate and edit notes here. They are saved in your browser.' }];
    saveNotes();
  }
  let activeNote = 0;

  container.innerHTML = `
    <div class="notes-content">
      <div class="notes-sidebar"></div>
      <div class="notes-editor">
        <div class="notes-toolbar">
          <button class="notes-new"><i class="fas fa-plus"></i> New</button>
          <button class="notes-delete"><i class="fas fa-trash"></i> Delete</button>
        </div>
        <textarea placeholder="Start typing..."></textarea>
      </div>
    </div>
  `;

  const sidebar = container.querySelector('.notes-sidebar');
  const textarea = container.querySelector('.notes-editor textarea');
  const newBtn = container.querySelector('.notes-new');
  const deleteBtn = container.querySelector('.notes-delete');

  textarea.addEventListener('keydown', (e) => { e.stopPropagation(); });

  function renderList() {
    sidebar.innerHTML = '';
    notes.forEach((note, i) => {
      const el = document.createElement('div');
      el.className = 'notes-list-item' + (i === activeNote ? ' active' : '');
      const title = note.title || note.body.split('\n')[0].substring(0, 30) || 'Untitled';
      const preview = note.body.substring(0, 50).replace(/\n/g, ' ');
      el.innerHTML = `<div class="note-title">${escapeHtml(title)}</div><div class="note-preview">${escapeHtml(preview)}</div>`;
      el.addEventListener('click', () => {
        saveCurrentNote();
        activeNote = i;
        renderList();
        loadNote();
      });
      sidebar.appendChild(el);
    });
  }

  function loadNote() {
    if (notes[activeNote]) {
      textarea.value = notes[activeNote].body || '';
    }
  }

  function saveCurrentNote() {
    if (notes[activeNote]) {
      notes[activeNote].body = textarea.value;
      notes[activeNote].title = textarea.value.split('\n')[0].substring(0, 50) || 'Untitled';
      saveNotes();
    }
  }

  function saveNotes() {
    localStorage.setItem('space-notes', JSON.stringify(notes));
  }

  textarea.addEventListener('input', () => {
    saveCurrentNote();
    renderList();
  });

  newBtn.addEventListener('click', () => {
    saveCurrentNote();
    notes.unshift({ id: Date.now(), title: 'New Note', body: '' });
    activeNote = 0;
    saveNotes();
    renderList();
    loadNote();
    textarea.focus();
  });

  deleteBtn.addEventListener('click', () => {
    if (notes.length <= 1) return;
    notes.splice(activeNote, 1);
    if (activeNote >= notes.length) activeNote = notes.length - 1;
    saveNotes();
    renderList();
    loadNote();
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  renderList();
  loadNote();
}

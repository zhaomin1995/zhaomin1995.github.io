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
  container.innerHTML = `<div class="activity-content"><div class="app-loading-spinner"><i class="fas fa-spinner fa-spin"></i></div></div>`;
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
        <div class="prefs-pane" data-pane="users">
          <div class="prefs-pane-icon"><i class="fas fa-users-cog" style="color:#e67e22;"></i></div>
          <div class="prefs-pane-label">Users</div>
        </div>
        <div class="prefs-pane" data-pane="backup">
          <div class="prefs-pane-icon"><i class="fas fa-hdd" style="color:#28a745;"></i></div>
          <div class="prefs-pane-label">Backup & Restore</div>
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
      case 'users': showUsersPane(); break;
      case 'backup': showBackupPane(); break;
    }
  }

  function showWallpaperPane() {
    content.innerHTML = `
      <div class="prefs-panel">
        <button class="prefs-back"><i class="fas fa-chevron-left"></i> Back</button>
        <h3>Wallpaper</h3>
        <h4 style="font-size:0.7rem;color:rgba(255,255,255,0.5);margin-bottom:0.5rem;">Gradients</h4>
        <div class="wallpaper-grid">
          ${wallpapers.map((wp, i) => `<div class="wallpaper-option ${i === wallIdx && !customWallpaper ? 'active' : ''}" data-idx="${i}" style="background:${wp};"></div>`).join('')}
        </div>
        <h4 style="font-size:0.7rem;color:rgba(255,255,255,0.5);margin:1rem 0 0.5rem;">Dynamic (Time-based)</h4>
        <div class="wallpaper-grid">
          <div class="wallpaper-option wallpaper-dynamic ${!customWallpaper && wallIdx === -1 ? 'active' : ''}" style="background:${getDynamicWallpaper()};position:relative;">
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:0.6rem;color:rgba(255,255,255,0.8);font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,0.5);">Auto</div>
          </div>
        </div>
        <h4 style="font-size:0.7rem;color:rgba(255,255,255,0.5);margin:1rem 0 0.5rem;">From Firebase Storage</h4>
        <div class="wallpaper-grid wallpaper-firebase-grid">
          <div style="grid-column:1/-1;text-align:center;color:rgba(255,255,255,0.3);font-size:0.7rem;padding:0.5rem;"><i class="fas fa-spinner fa-spin"></i> Loading images...</div>
        </div>
      </div>
    `;
    content.querySelector('.prefs-back').addEventListener('click', showMainGrid);

    // Gradient wallpapers
    content.querySelectorAll('.wallpaper-option[data-idx]').forEach(opt => {
      opt.addEventListener('click', () => {
        wallIdx = parseInt(opt.dataset.idx);
        customWallpaper = null;
        const desktop = document.getElementById('desktop');
        desktop.style.background = wallpapers[wallIdx];
        desktop.style.backgroundImage = '';
        content.querySelectorAll('.wallpaper-option, .wallpaper-img-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        saveUserSettings();
      });
    });

    // Dynamic wallpaper option
    content.querySelector('.wallpaper-dynamic').addEventListener('click', () => {
      customWallpaper = null;
      wallIdx = -1; // special value for dynamic
      applyDynamicWallpaper();
      content.querySelectorAll('.wallpaper-option, .wallpaper-img-option').forEach(o => o.classList.remove('active'));
      content.querySelector('.wallpaper-dynamic').classList.add('active');
      saveUserSettings();
    });

    // #12 Load Firebase wallpaper images
    const fbGrid = content.querySelector('.wallpaper-firebase-grid');
    loadFirebaseWallpapers().then(images => {
      if (images.length === 0) {
        fbGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:rgba(255,255,255,0.3);font-size:0.7rem;padding:0.5rem;">No images found in Firebase Storage</div>';
        return;
      }
      fbGrid.innerHTML = '';
      images.slice(0, 12).forEach(img => {
        const imgEl = document.createElement('img');
        imgEl.className = 'wallpaper-img-option' + (customWallpaper === img.url ? ' active' : '');
        imgEl.src = img.url;
        imgEl.alt = img.name;
        imgEl.title = img.name;
        imgEl.addEventListener('click', () => {
          customWallpaper = img.url;
          const desktop = document.getElementById('desktop');
          desktop.style.backgroundImage = `url(${img.url})`;
          desktop.style.backgroundSize = 'cover';
          desktop.style.backgroundPosition = 'center';
          content.querySelectorAll('.wallpaper-option, .wallpaper-img-option').forEach(o => o.classList.remove('active'));
          imgEl.classList.add('active');
          saveUserSettings();
        });
        fbGrid.appendChild(imgEl);
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
      saveUserSettings(); // #13 sync to Firebase
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

  async function showUsersPane() {
    content.innerHTML = `
      <div class="prefs-panel">
        <button class="prefs-back"><i class="fas fa-chevron-left"></i> Back</button>
        <h3>User Management</h3>
        <div class="users-list" style="margin:10px 0;max-height:200px;overflow-y:auto;"></div>
        <div style="display:flex;gap:8px;margin-top:12px;">
          <input type="email" class="users-email-input" placeholder="email@example.com" style="flex:1;padding:6px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;font-size:0.75rem;">
          <button class="users-add-btn" style="padding:6px 14px;border-radius:6px;border:none;background:#28a745;color:#fff;cursor:pointer;font-size:0.75rem;">Add</button>
        </div>
        <div class="users-status" style="margin-top:8px;font-size:0.7rem;color:rgba(255,255,255,0.5);"></div>
      </div>
    `;
    content.querySelector('.prefs-back').addEventListener('click', showMainGrid);

    const listEl = content.querySelector('.users-list');
    const emailInput = content.querySelector('.users-email-input');
    const addBtn = content.querySelector('.users-add-btn');
    const statusEl = content.querySelector('.users-status');

    emailInput.addEventListener('keydown', (e) => { e.stopPropagation(); });

    async function loadUsers() {
      try {
        const r = await fetch(`${FB_DB}/auth/allowed-emails.json`);
        const data = await r.json();
        listEl.innerHTML = '';
        if (!data) { listEl.innerHTML = '<div style="color:rgba(255,255,255,0.4);font-size:0.75rem;">No users found.</div>'; return; }
        Object.entries(data).forEach(([key, val]) => {
          if (val !== true) return;
          const email = key.replace(/_/g, '.').replace(/\.com$/, '.com').replace(/\.\.\./g, '.').replace(/\.gmail\./, '@gmail.').replace(/\.yahoo\./, '@yahoo.').replace(/\.hotmail\./, '@hotmail.');
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:0.75rem;';
          row.innerHTML = `
            <span style="color:rgba(255,255,255,0.8);"><i class="fas fa-user" style="margin-right:8px;opacity:0.5;"></i>${key}</span>
            <button class="user-del-btn" data-key="${key}" style="background:none;border:none;color:#ff6b6b;cursor:pointer;font-size:0.7rem;padding:2px 6px;"><i class="fas fa-times"></i></button>
          `;
          listEl.appendChild(row);
        });
        listEl.querySelectorAll('.user-del-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const key = btn.dataset.key;
            try {
              await fetch(`${FB_DB}/auth/allowed-emails/${key}.json`, { method: 'DELETE' });
              statusEl.textContent = 'Removed ' + key;
              loadUsers();
            } catch (e) {
              statusEl.textContent = 'Error: ' + e.message;
            }
          });
        });
      } catch (e) {
        listEl.innerHTML = `<div style="color:#ff6b6b;font-size:0.75rem;">Error loading users: ${e.message}</div>`;
      }
    }

    addBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (!email) return;
      const key = email.replace(/[.@]/g, '_');
      try {
        await fetch(`${FB_DB}/auth/allowed-emails.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [key]: true }),
        });
        emailInput.value = '';
        statusEl.textContent = 'Added ' + email;
        loadUsers();
      } catch (e) {
        statusEl.textContent = 'Error: ' + e.message;
      }
    });

    loadUsers();
  }

  /* #89 Backup & Restore pane */
  function showBackupPane() {
    content.innerHTML = `
      <div class="prefs-panel">
        <button class="prefs-back"><i class="fas fa-chevron-left"></i> Back</button>
        <h3>Backup & Restore</h3>
        <div style="font-size:0.75rem;color:rgba(255,255,255,0.6);line-height:1.8;margin-bottom:1.5rem;">
          <p>Export your desktop settings (wallpaper, icon positions, font size) as a JSON file, or import a previously saved backup.</p>
        </div>
        <div style="display:flex;gap:0.8rem;flex-wrap:wrap;">
          <button class="prefs-btn" id="prefsExportBtn"><i class="fas fa-download"></i> Export Settings</button>
          <button class="prefs-btn secondary" id="prefsImportBtn"><i class="fas fa-upload"></i> Import Settings</button>
        </div>
        <div id="prefsBackupStatus" style="margin-top:1rem;font-size:0.7rem;color:rgba(255,255,255,0.4);min-height:1.5em;"></div>
      </div>
    `;
    content.querySelector('.prefs-back').addEventListener('click', showMainGrid);
    document.getElementById('prefsExportBtn').addEventListener('click', () => {
      exportSettingsAsFile();
      document.getElementById('prefsBackupStatus').textContent = 'Exporting settings...';
    });
    document.getElementById('prefsImportBtn').addEventListener('click', () => {
      importSettingsFromFile();
      document.getElementById('prefsBackupStatus').textContent = 'Select a JSON file to import...';
    });
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

/* ══════════════════════════
   Calculator
   ══════════════════════════ */
function openCalculator() {
  const win = wm.createWindow({
    title: 'Calculator',
    app: 'calculator',
    width: 260,
    height: 380,
    buildContent: (container, w) => {
      buildCalculator(container, w);
    }
  });
}

function buildCalculator(container, win) {
  let display = '0';
  let firstOperand = null;
  let operator = null;
  let waitingForSecond = false;

  container.innerHTML = `
    <div class="calc-app" style="display:flex;flex-direction:column;height:100%;background:#1c1c1c;padding:8px;box-sizing:border-box;">
      <div class="calc-display" style="text-align:right;font-size:2.2rem;color:#fff;padding:10px 14px;min-height:60px;display:flex;align-items:flex-end;justify-content:flex-end;word-break:break-all;font-weight:300;"></div>
      <div class="calc-buttons" style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;flex:1;"></div>
    </div>
  `;

  const displayEl = container.querySelector('.calc-display');
  const buttonsEl = container.querySelector('.calc-buttons');

  const buttons = [
    { label: 'C', type: 'func' }, { label: '+/-', type: 'func' }, { label: '%', type: 'func' }, { label: '÷', type: 'op' },
    { label: '7', type: 'num' }, { label: '8', type: 'num' }, { label: '9', type: 'num' }, { label: '×', type: 'op' },
    { label: '4', type: 'num' }, { label: '5', type: 'num' }, { label: '6', type: 'num' }, { label: '-', type: 'op' },
    { label: '1', type: 'num' }, { label: '2', type: 'num' }, { label: '3', type: 'num' }, { label: '+', type: 'op' },
    { label: '0', type: 'num', span: 2 }, { label: '.', type: 'num' }, { label: '=', type: 'op' },
  ];

  buttons.forEach(btn => {
    const el = document.createElement('button');
    el.textContent = btn.label;
    let bg = 'rgba(255,255,255,0.08)';
    let color = '#fff';
    if (btn.type === 'func') { bg = 'rgba(255,255,255,0.2)'; color = '#fff'; }
    if (btn.type === 'op') { bg = '#f09a36'; color = '#fff'; }
    el.style.cssText = `background:${bg};color:${color};border:none;border-radius:50%;font-size:1.2rem;cursor:pointer;aspect-ratio:${btn.span ? 'auto' : '1'};display:flex;align-items:center;justify-content:center;font-weight:400;`;
    if (btn.span) {
      el.style.gridColumn = `span ${btn.span}`;
      el.style.borderRadius = '30px';
      el.style.justifyContent = 'flex-start';
      el.style.paddingLeft = '22px';
    }
    el.addEventListener('click', () => handleInput(btn));
    buttonsEl.appendChild(el);
  });

  function updateDisplay() {
    displayEl.textContent = display;
  }

  function handleInput(btn) {
    if (btn.type === 'num') {
      if (btn.label === '.') {
        if (waitingForSecond) { display = '0.'; waitingForSecond = false; }
        else if (!display.includes('.')) { display += '.'; }
      } else {
        if (display === '0' || waitingForSecond) { display = btn.label; waitingForSecond = false; }
        else { display += btn.label; }
      }
    } else if (btn.type === 'func') {
      if (btn.label === 'C') {
        display = '0'; firstOperand = null; operator = null; waitingForSecond = false;
      } else if (btn.label === '+/-') {
        display = String(-parseFloat(display));
      } else if (btn.label === '%') {
        display = String(parseFloat(display) / 100);
      }
    } else if (btn.type === 'op') {
      const current = parseFloat(display);
      if (btn.label === '=') {
        if (operator && firstOperand !== null) {
          display = String(calculate(firstOperand, operator, current));
          firstOperand = null; operator = null; waitingForSecond = false;
        }
      } else {
        if (operator && firstOperand !== null && !waitingForSecond) {
          const result = calculate(firstOperand, operator, current);
          display = String(result);
          firstOperand = result;
        } else {
          firstOperand = current;
        }
        operator = btn.label;
        waitingForSecond = true;
      }
    }
    updateDisplay();
  }

  function calculate(a, op, b) {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 'Error';
      default: return b;
    }
  }

  updateDisplay();
}

/* ══════════════════════════
   Image Gallery (Photos)
   ══════════════════════════ */
function openImageGallery() {
  const win = wm.createWindow({
    title: 'Photos',
    app: 'gallery',
    width: 800,
    height: 550,
    buildContent: (container, w) => {
      buildImageGallery(container, w);
    }
  });
}

function buildImageGallery(container, win) {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:#1a1a1a;">
      <div class="gallery-toolbar" style="padding:8px 12px;display:flex;gap:8px;border-bottom:1px solid rgba(255,255,255,0.08);align-items:center;">
        <span style="font-size:0.75rem;color:rgba(255,255,255,0.5);" class="gallery-status"><i class="fas fa-spinner fa-spin"></i> Loading...</span>
      </div>
      <div class="gallery-app-grid" style="flex:1;overflow-y:auto;padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;align-content:start;"></div>
    </div>
  `;

  const grid = container.querySelector('.gallery-app-grid');
  const statusEl = container.querySelector('.gallery-status');
  let allImages = [];

  async function fetchImages(prefix) {
    try {
      const r = await fetch(`${FB_STORAGE}/o?prefix=${prefix}&maxResults=200`);
      const data = await r.json();
      return (data.items || []).filter(item => {
        const ct = (item.contentType || '').toLowerCase();
        return ct.startsWith('image/');
      });
    } catch { return []; }
  }

  async function loadAll() {
    const [travel, pet] = await Promise.all([
      fetchImages('images/travel/'),
      fetchImages('images/pet/'),
    ]);
    allImages = [...travel, ...pet];
    statusEl.textContent = `${allImages.length} photos`;
    renderGrid();
  }

  function renderGrid() {
    grid.innerHTML = '';
    allImages.forEach((img, idx) => {
      const url = `https://firebasestorage.googleapis.com/v0/b/${FB_BUCKET}/o/${encodeURIComponent(img.name)}?alt=media`;
      const thumb = document.createElement('div');
      thumb.style.cssText = 'border-radius:8px;overflow:hidden;cursor:pointer;aspect-ratio:1;background:#111;position:relative;';
      thumb.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
        <div style="position:absolute;bottom:0;left:0;right:0;padding:4px 6px;background:linear-gradient(transparent,rgba(0,0,0,0.7));font-size:0.6rem;color:rgba(255,255,255,0.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${img.name.split('/').pop()}</div>`;
      thumb.addEventListener('click', () => openViewer(idx));
      grid.appendChild(thumb);
    });
  }

  function openViewer(index) {
    let currentIdx = index;
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);z-index:10000;display:flex;align-items:center;justify-content:center;';

    function render() {
      const img = allImages[currentIdx];
      const url = `https://firebasestorage.googleapis.com/v0/b/${FB_BUCKET}/o/${encodeURIComponent(img.name)}?alt=media`;
      overlay.innerHTML = `
        <button class="gallery-nav gallery-prev" style="position:absolute;left:20px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:1.5rem;width:44px;height:44px;border-radius:50%;cursor:pointer;z-index:2;"><i class="fas fa-chevron-left"></i></button>
        <img src="${url}" style="max-width:90%;max-height:85vh;border-radius:6px;object-fit:contain;">
        <button class="gallery-nav gallery-next" style="position:absolute;right:20px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:1.5rem;width:44px;height:44px;border-radius:50%;cursor:pointer;z-index:2;"><i class="fas fa-chevron-right"></i></button>
        <div style="position:absolute;bottom:20px;color:rgba(255,255,255,0.6);font-size:0.75rem;">${img.name.split('/').pop()} (${currentIdx + 1} / ${allImages.length})</div>
        <button class="gallery-close" style="position:absolute;top:20px;right:20px;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:1.2rem;width:36px;height:36px;border-radius:50%;cursor:pointer;"><i class="fas fa-times"></i></button>
      `;
      overlay.querySelector('.gallery-prev').addEventListener('click', (e) => { e.stopPropagation(); currentIdx = (currentIdx - 1 + allImages.length) % allImages.length; render(); });
      overlay.querySelector('.gallery-next').addEventListener('click', (e) => { e.stopPropagation(); currentIdx = (currentIdx + 1) % allImages.length; render(); });
      overlay.querySelector('.gallery-close').addEventListener('click', () => overlay.remove());
    }

    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    function onKey(e) {
      if (!document.body.contains(overlay)) { document.removeEventListener('keydown', onKey); return; }
      if (e.key === 'ArrowLeft') { currentIdx = (currentIdx - 1 + allImages.length) % allImages.length; render(); }
      else if (e.key === 'ArrowRight') { currentIdx = (currentIdx + 1) % allImages.length; render(); }
      else if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey); }
    }
    document.addEventListener('keydown', onKey);

    render();
    document.body.appendChild(overlay);
  }

  loadAll();
}

/* ══════════════════════════
   Markdown Editor
   ══════════════════════════ */
function openMarkdownEditor() {
  const win = wm.createWindow({
    title: 'Markdown',
    app: 'markdown',
    width: 900,
    height: 600,
    buildContent: (container, w) => {
      buildMarkdownEditor(container, w);
    }
  });
}

function buildMarkdownEditor(container, win) {
  let currentPath = '';

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:#1e1e1e;">
      <div class="md-toolbar" style="padding:6px 10px;display:flex;gap:6px;border-bottom:1px solid rgba(255,255,255,0.08);align-items:center;">
        <button class="md-open-btn" style="padding:4px 10px;border-radius:5px;border:none;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-size:0.7rem;"><i class="fas fa-folder-open"></i> Open</button>
        <button class="md-save-btn" style="padding:4px 10px;border-radius:5px;border:none;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-size:0.7rem;"><i class="fas fa-save"></i> Save</button>
        <span class="md-filename" style="font-size:0.7rem;color:rgba(255,255,255,0.5);margin-left:8px;">Untitled</span>
      </div>
      <div style="display:flex;flex:1;overflow:hidden;">
        <textarea class="md-editor-pane" style="flex:1;resize:none;border:none;background:#1e1e1e;color:#d4d4d4;padding:16px;font-family:'Fira Code',monospace,monospace;font-size:0.8rem;line-height:1.6;outline:none;border-right:1px solid rgba(255,255,255,0.08);" placeholder="Write markdown here..."></textarea>
        <div class="md-preview-pane" style="flex:1;overflow-y:auto;padding:16px;color:#d4d4d4;font-size:0.8rem;line-height:1.7;"></div>
      </div>
    </div>
  `;

  const editor = container.querySelector('.md-editor-pane');
  const preview = container.querySelector('.md-preview-pane');
  const openBtn = container.querySelector('.md-open-btn');
  const saveBtn = container.querySelector('.md-save-btn');
  const filenameEl = container.querySelector('.md-filename');

  editor.addEventListener('keydown', (e) => { e.stopPropagation(); });

  function renderMarkdown(md) {
    let html = md;
    // Code blocks (must be before inline code)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (m, lang, code) => {
      return `<pre style="background:rgba(255,255,255,0.06);padding:12px;border-radius:6px;overflow-x:auto;font-size:0.78rem;"><code>${escapeHtml(code.trim())}</code></pre>`;
    });
    // Headings
    html = html.replace(/^### (.+)$/gm, '<h3 style="color:#fff;margin:12px 0 6px;">$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2 style="color:#fff;margin:14px 0 6px;">$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1 style="color:#fff;margin:16px 0 8px;">$1</h1>');
    // Blockquote
    html = html.replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid rgba(255,255,255,0.2);padding-left:12px;color:rgba(255,255,255,0.6);margin:8px 0;">$1</blockquote>');
    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:6px;margin:8px 0;">');
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#4a90d9;" target="_blank">$1</a>');
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff;">$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:2px 5px;border-radius:3px;font-size:0.78rem;">$1</code>');
    // Unordered list
    html = html.replace(/^- (.+)$/gm, '<li style="margin-left:20px;">$1</li>');
    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.15);margin:16px 0;">');
    // Line breaks (double newline = paragraph)
    html = html.replace(/\n\n/g, '<br><br>');
    return html;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  editor.addEventListener('input', () => {
    preview.innerHTML = renderMarkdown(editor.value);
  });

  openBtn.addEventListener('click', async () => {
    const path = prompt('Firebase Storage path (e.g., notes/readme.md):');
    if (!path) return;
    currentPath = path;
    filenameEl.textContent = path + ' (loading...)';
    try {
      const url = `${FB_STORAGE}/o/${encodeURIComponent(path)}?alt=media`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('File not found');
      editor.value = await resp.text();
      preview.innerHTML = renderMarkdown(editor.value);
      filenameEl.textContent = path;
    } catch (e) {
      filenameEl.textContent = 'Error: ' + e.message;
    }
  });

  saveBtn.addEventListener('click', async () => {
    if (!currentPath) {
      const path = prompt('Save as (Firebase Storage path):');
      if (!path) return;
      currentPath = path;
    }
    filenameEl.textContent = currentPath + ' (saving...)';
    try {
      await fetch(`${FB_STORAGE}/o?uploadType=media&name=${encodeURIComponent(currentPath)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/markdown' },
        body: editor.value,
      });
      filenameEl.textContent = currentPath;
    } catch (e) {
      filenameEl.textContent = 'Save failed: ' + e.message;
    }
  });

  // Default content
  editor.value = '# Hello Markdown\n\nStart writing **markdown** here.\n\n- Item one\n- Item two\n\n> A blockquote\n\n```js\nconsole.log("Hello!");\n```\n';
  preview.innerHTML = renderMarkdown(editor.value);
}

/* ══════════════════════════
   JSON Viewer
   ══════════════════════════ */
function openJsonViewer(path, content) {
  const win = wm.createWindow({
    title: path || 'JSON Viewer',
    app: 'json',
    width: 600,
    height: 500,
    buildContent: (container, w) => {
      buildJsonViewer(container, w, path, content);
    }
  });
}

function buildJsonViewer(container, win, filePath, initialContent) {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:#1e1e1e;">
      <div class="json-toolbar" style="padding:6px 10px;display:flex;gap:6px;border-bottom:1px solid rgba(255,255,255,0.08);align-items:center;">
        <button class="json-open-btn" style="padding:4px 10px;border-radius:5px;border:none;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-size:0.7rem;"><i class="fas fa-folder-open"></i> Open</button>
        <button class="json-copy-btn" style="padding:4px 10px;border-radius:5px;border:none;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-size:0.7rem;"><i class="fas fa-copy"></i> Copy</button>
        <span class="json-filename" style="font-size:0.7rem;color:rgba(255,255,255,0.5);margin-left:8px;">${filePath || ''}</span>
      </div>
      <div class="json-content" style="flex:1;overflow:auto;padding:16px;font-family:'Fira Code',monospace,monospace;font-size:0.78rem;line-height:1.6;"></div>
    </div>
  `;

  const contentEl = container.querySelector('.json-content');
  const openBtn = container.querySelector('.json-open-btn');
  const copyBtn = container.querySelector('.json-copy-btn');
  const filenameEl = container.querySelector('.json-filename');
  let rawJson = '';

  function renderJson(obj, indent) {
    indent = indent || 0;
    const pad = '  '.repeat(indent);

    if (obj === null) return `<span style="color:#808080;">null</span>`;
    if (typeof obj === 'boolean') return `<span style="color:#56b6c2;">${obj}</span>`;
    if (typeof obj === 'number') return `<span style="color:#d19a66;">${obj}</span>`;
    if (typeof obj === 'string') return `<span style="color:#98c379;">"${escapeHtml(obj)}"</span>`;

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      const id = 'jv-' + Math.random().toString(36).substr(2, 6);
      let html = `<span class="json-toggle" data-target="${id}" style="cursor:pointer;color:rgba(255,255,255,0.4);user-select:none;">&#9660;</span> [`;
      html += `<div id="${id}" style="margin-left:18px;">`;
      obj.forEach((item, i) => {
        html += pad + '  ' + renderJson(item, indent + 1);
        if (i < obj.length - 1) html += ',';
        html += '<br>';
      });
      html += `</div>${pad}]`;
      return html;
    }

    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) return '{}';
      const id = 'jv-' + Math.random().toString(36).substr(2, 6);
      let html = `<span class="json-toggle" data-target="${id}" style="cursor:pointer;color:rgba(255,255,255,0.4);user-select:none;">&#9660;</span> {`;
      html += `<div id="${id}" style="margin-left:18px;">`;
      keys.forEach((key, i) => {
        html += pad + '  ' + `<span style="color:#61afef;">"${escapeHtml(key)}"</span>: ` + renderJson(obj[key], indent + 1);
        if (i < keys.length - 1) html += ',';
        html += '<br>';
      });
      html += `</div>${pad}}`;
      return html;
    }

    return String(obj);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function displayJson(jsonStr) {
    rawJson = jsonStr;
    try {
      const parsed = JSON.parse(jsonStr);
      contentEl.innerHTML = renderJson(parsed, 0);
      // Wire toggle buttons
      contentEl.querySelectorAll('.json-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
          const target = document.getElementById(toggle.dataset.target);
          if (target) {
            const hidden = target.style.display === 'none';
            target.style.display = hidden ? '' : 'none';
            toggle.innerHTML = hidden ? '&#9660;' : '&#9654;';
          }
        });
      });
    } catch (e) {
      contentEl.innerHTML = `<span style="color:#ff6b6b;">Invalid JSON: ${e.message}</span><pre style="color:#d4d4d4;margin-top:10px;white-space:pre-wrap;">${escapeHtml(jsonStr)}</pre>`;
    }
  }

  openBtn.addEventListener('click', async () => {
    const path = prompt('Firebase Storage path to JSON file:');
    if (!path) return;
    filenameEl.textContent = path + ' (loading...)';
    try {
      const url = `${FB_STORAGE}/o/${encodeURIComponent(path)}?alt=media`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('File not found');
      const text = await resp.text();
      filenameEl.textContent = path;
      displayJson(text);
    } catch (e) {
      filenameEl.textContent = 'Error: ' + e.message;
    }
  });

  copyBtn.addEventListener('click', () => {
    if (!rawJson) return;
    try {
      const formatted = JSON.stringify(JSON.parse(rawJson), null, 2);
      navigator.clipboard.writeText(formatted);
      copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
      setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy'; }, 1500);
    } catch {
      navigator.clipboard.writeText(rawJson);
    }
  });

  if (initialContent) {
    displayJson(typeof initialContent === 'string' ? initialContent : JSON.stringify(initialContent, null, 2));
  } else if (!filePath) {
    displayJson('{\n  "message": "Open a JSON file or pass content to view",\n  "features": ["syntax highlighting", "collapsible nodes", "copy to clipboard"]\n}');
  } else {
    // Load from path
    (async () => {
      filenameEl.textContent = filePath + ' (loading...)';
      try {
        const url = `${FB_STORAGE}/o/${encodeURIComponent(filePath)}?alt=media`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('File not found');
        displayJson(await resp.text());
        filenameEl.textContent = filePath;
      } catch (e) {
        filenameEl.textContent = 'Error: ' + e.message;
      }
    })();
  }
}

/* ══════════════════════════
   Log Viewer
   ══════════════════════════ */
function openLogViewer() {
  const win = wm.createWindow({
    title: 'Log Viewer',
    app: 'logs',
    width: 700,
    height: 400,
    buildContent: (container, w) => {
      buildLogViewer(container, w);
    }
  });
}

function buildLogViewer(container, win) {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:#0d1117;">
      <div class="log-toolbar" style="padding:6px 10px;display:flex;gap:6px;border-bottom:1px solid rgba(255,255,255,0.08);align-items:center;">
        <button class="log-clear-btn" style="padding:4px 10px;border-radius:5px;border:none;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-size:0.7rem;"><i class="fas fa-ban"></i> Clear</button>
        <button class="log-refresh-btn" style="padding:4px 10px;border-radius:5px;border:none;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-size:0.7rem;"><i class="fas fa-sync-alt"></i> Refresh</button>
        <span class="log-status" style="font-size:0.65rem;color:rgba(255,255,255,0.4);margin-left:auto;">Live</span>
      </div>
      <div class="log-entries" style="flex:1;overflow-y:auto;padding:8px 12px;font-family:'Fira Code',monospace,monospace;font-size:0.72rem;line-height:1.7;"></div>
    </div>
  `;

  const entriesEl = container.querySelector('.log-entries');
  const clearBtn = container.querySelector('.log-clear-btn');
  const refreshBtn = container.querySelector('.log-refresh-btn');
  let logs = [];

  const levelColors = {
    info: '#58a6ff',
    warn: '#d29922',
    error: '#f85149',
    debug: '#8b949e',
  };

  const sampleMessages = [
    { level: 'info', msg: 'System initialized successfully' },
    { level: 'info', msg: 'Firebase connection established' },
    { level: 'info', msg: 'Auth state changed — user signed in' },
    { level: 'debug', msg: 'Storage bucket: ' + FB_BUCKET },
    { level: 'info', msg: 'Window manager ready' },
    { level: 'warn', msg: 'localStorage quota at 80%' },
    { level: 'info', msg: 'Desktop icons rendered' },
    { level: 'info', msg: 'Dock initialized with 8 items' },
    { level: 'debug', msg: 'Spotlight index built (50 items)' },
    { level: 'info', msg: 'Keyboard shortcuts registered' },
    { level: 'warn', msg: 'Fetch retry on timeout — attempt 2' },
    { level: 'error', msg: 'Failed to load resource: net::ERR_FAILED' },
    { level: 'info', msg: 'File upload completed: images/travel/photo.jpg' },
    { level: 'debug', msg: 'Cache hit for /auth/allowed-emails.json' },
    { level: 'info', msg: 'Chat messages polled — 0 new' },
  ];

  function addLog(level, msg) {
    const time = new Date().toISOString().replace('T', ' ').substring(0, 19);
    logs.push({ time, level, msg });
    renderLogs();
  }

  function renderLogs() {
    entriesEl.innerHTML = logs.map(log => {
      const color = levelColors[log.level] || '#d4d4d4';
      const badge = `<span style="color:${color};font-weight:600;text-transform:uppercase;min-width:42px;display:inline-block;">[${log.level}]</span>`;
      return `<div style="color:#d4d4d4;"><span style="color:rgba(255,255,255,0.3);">${log.time}</span> ${badge} ${escapeHtml(log.msg)}</div>`;
    }).join('');
    entriesEl.scrollTop = entriesEl.scrollHeight;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  clearBtn.addEventListener('click', () => {
    logs = [];
    renderLogs();
  });

  refreshBtn.addEventListener('click', async () => {
    addLog('info', 'Manual refresh triggered');
    try {
      const r = await fetch(`${FB_DB}/logs.json?orderBy="$key"&limitToLast=20`);
      const data = await r.json();
      if (data) {
        Object.values(data).forEach(entry => {
          addLog(entry.level || 'info', entry.msg || entry.message || JSON.stringify(entry));
        });
      } else {
        addLog('info', 'No remote logs found at /logs');
      }
    } catch (e) {
      addLog('debug', 'No remote log endpoint — showing local events');
    }
  });

  // Load initial simulated logs
  sampleMessages.forEach(m => {
    const time = new Date(Date.now() - Math.floor(Math.random() * 3600000)).toISOString().replace('T', ' ').substring(0, 19);
    logs.push({ time, level: m.level, msg: m.msg });
  });
  logs.sort((a, b) => a.time.localeCompare(b.time));
  renderLogs();

  // Periodic simulated log
  const interval = setInterval(() => {
    const msgs = ['Heartbeat OK', 'Memory usage: ' + Math.floor(Math.random() * 60 + 20) + 'MB', 'Active windows: ' + wm.getAllWindows().length];
    addLog('debug', msgs[Math.floor(Math.random() * msgs.length)]);
  }, 8000);
  win.onClose = () => clearInterval(interval);
}

/* ══════════════════════════
   Share Dialog
   ══════════════════════════ */
function openShareDialog(file) {
  const win = wm.createWindow({
    title: 'Share',
    app: 'share',
    width: 400,
    height: 200,
    buildContent: (container, w) => {
      buildShareDialog(container, w, file);
    }
  });
}

function buildShareDialog(container, win, file) {
  const fileUrl = file
    ? `https://firebasestorage.googleapis.com/v0/b/${FB_BUCKET}/o/${encodeURIComponent(file)}?alt=media`
    : '';

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;background:#1e1e1e;gap:14px;">
      <div style="font-size:0.8rem;color:rgba(255,255,255,0.7);"><i class="fas fa-share-alt" style="margin-right:6px;"></i>Shareable Link</div>
      <input class="share-url-input" type="text" value="${fileUrl}" readonly style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:#fff;font-size:0.75rem;text-align:center;">
      <button class="share-copy-btn" style="padding:8px 24px;border-radius:6px;border:none;background:#007bff;color:#fff;cursor:pointer;font-size:0.78rem;font-weight:500;"><i class="fas fa-copy"></i> Copy Link</button>
      <div class="share-status" style="font-size:0.7rem;color:rgba(255,255,255,0.4);min-height:16px;"></div>
    </div>
  `;

  const urlInput = container.querySelector('.share-url-input');
  const copyBtn = container.querySelector('.share-copy-btn');
  const statusEl = container.querySelector('.share-status');

  urlInput.addEventListener('keydown', (e) => { e.stopPropagation(); });

  // Select all text on focus
  urlInput.addEventListener('focus', () => urlInput.select());

  if (fileUrl) {
    setTimeout(() => { urlInput.select(); }, 100);
  } else {
    urlInput.placeholder = 'No file specified';
  }

  copyBtn.addEventListener('click', () => {
    const url = urlInput.value;
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      statusEl.textContent = 'Link copied!';
      statusEl.style.color = '#28a745';
      setTimeout(() => { statusEl.textContent = ''; statusEl.style.color = 'rgba(255,255,255,0.4)'; }, 2000);
    }).catch(() => {
      urlInput.select();
      document.execCommand('copy');
      statusEl.textContent = 'Link copied!';
    });
  });
}

/* ══════════════════════════
   Clipboard Manager
   ══════════════════════════ */
const clipboardHistory = [];

function addToClipboard(type, content) {
  clipboardHistory.unshift({ type, content, time: new Date() });
  if (clipboardHistory.length > 20) clipboardHistory.pop();
}

function openClipboardManager() {
  const win = wm.createWindow({
    title: 'Clipboard',
    app: 'clipboard',
    width: 350,
    height: 400,
    buildContent: (container, w) => {
      buildClipboardManager(container, w);
    }
  });
}

function buildClipboardManager(container, win) {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:#1e1e1e;">
      <div class="clip-toolbar" style="padding:6px 10px;display:flex;gap:6px;border-bottom:1px solid rgba(255,255,255,0.08);align-items:center;">
        <span style="font-size:0.7rem;color:rgba(255,255,255,0.5);"><i class="fas fa-clipboard-list"></i> Clipboard History</span>
        <button class="clip-clear-btn" style="margin-left:auto;padding:3px 8px;border-radius:5px;border:none;background:rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-size:0.65rem;">Clear All</button>
      </div>
      <div class="clip-list" style="flex:1;overflow-y:auto;padding:6px;"></div>
    </div>
  `;

  const listEl = container.querySelector('.clip-list');
  const clearBtn = container.querySelector('.clip-clear-btn');

  function render() {
    if (clipboardHistory.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.3);font-size:0.75rem;padding:30px 0;">No clipboard items yet.<br><br>Use addToClipboard(type, content) to add items.</div>';
      return;
    }
    listEl.innerHTML = clipboardHistory.map((item, idx) => {
      const icon = item.type === 'image' ? 'fa-image' : item.type === 'file' ? 'fa-file' : 'fa-font';
      const timeStr = item.time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const preview = typeof item.content === 'string' ? escapeHtml(item.content.substring(0, 80)) : '[Object]';
      return `
        <div class="clip-item" data-idx="${idx}" style="padding:8px 10px;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;display:flex;align-items:flex-start;gap:8px;border-radius:6px;margin-bottom:2px;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='transparent'">
          <i class="fas ${icon}" style="color:rgba(255,255,255,0.3);margin-top:2px;font-size:0.7rem;"></i>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.72rem;color:rgba(255,255,255,0.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${preview}</div>
            <div style="font-size:0.6rem;color:rgba(255,255,255,0.3);margin-top:2px;">${timeStr}</div>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.clip-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx);
        const item = clipboardHistory[idx];
        if (item && typeof item.content === 'string') {
          navigator.clipboard.writeText(item.content).then(() => {
            el.style.background = 'rgba(40,200,64,0.15)';
            setTimeout(() => { el.style.background = ''; }, 600);
          });
        }
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  clearBtn.addEventListener('click', () => {
    clipboardHistory.length = 0;
    render();
  });

  render();
}

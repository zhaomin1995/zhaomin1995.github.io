/* ═══════════════════════════════════════
   Internal Space — Core Desktop System
   ═══════════════════════════════════════ */

/* ── Firebase Config ── */
const FB_DB = 'https://zhaomin-homepage-default-rtdb.firebaseio.com';
const FB_BUCKET = 'zhaomin-homepage.firebasestorage.app';
const FB_STORAGE = `https://firebasestorage.googleapis.com/v0/b/${FB_BUCKET}`;

firebase.initializeApp({
  apiKey: 'AIzaSyCcZ8-SHNef_CIFl2rrZ8tWW0Z6dGb1bL4',
  authDomain: 'zhaomin-homepage.firebaseapp.com',
  databaseURL: FB_DB,
  storageBucket: FB_BUCKET,
});

const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

/* ── Auth helpers ── */
async function isEmailAllowed(email) {
  try {
    const key = email.replace(/[.@]/g, '_');
    const r = await fetch(`${FB_DB}/auth/allowed-emails/${key}.json`);
    const data = await r.json();
    return data === true;
  } catch { return false; }
}

async function initAllowlist() {
  try {
    const r = await fetch(`${FB_DB}/auth/allowed-emails.json`);
    const data = await r.json();
    if (!data || !data['yanglanting2017_gmail_com']) {
      await fetch(`${FB_DB}/auth/allowed-emails.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'xzm01234_gmail_com': true, 'yanglanting2017_gmail_com': true }),
      });
    }
  } catch {}
}
initAllowlist();

let currentUser = null;

auth.onAuthStateChanged(async (user) => {
  if (user) {
    const allowed = await isEmailAllowed(user.email);
    if (allowed) {
      currentUser = user;
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('desktop').classList.add('show');
      document.getElementById('userInfo').textContent = user.email;
      initDesktop();
    } else {
      document.getElementById('loginError').textContent = 'Access denied — your email is not in the allowlist';
      await auth.signOut();
    }
  }
});

document.getElementById('googleLoginBtn').addEventListener('click', async () => {
  try {
    document.getElementById('loginError').textContent = '';
    await auth.signInWithPopup(googleProvider);
  } catch (e) {
    document.getElementById('loginError').textContent = e.message;
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await auth.signOut();
  location.reload();
});

/* ══════════════════════════
   Window Manager
   ══════════════════════════ */
class WindowManager {
  constructor() {
    this.windows = [];
    this.nextZ = 200;
    this.nextId = 1;
    this.container = document.getElementById('desktopArea');
  }

  createWindow(opts) {
    const id = 'win-' + (this.nextId++);
    const w = {
      id,
      title: opts.title || 'Window',
      app: opts.app || '',
      x: opts.x != null ? opts.x : 80 + (this.windows.length * 30) % 200,
      y: opts.y != null ? opts.y : 50 + (this.windows.length * 30) % 150,
      width: opts.width || 850,
      height: opts.height || 550,
      isMaximized: false,
      isMinimized: false,
      element: null,
      contentEl: null,
    };

    // Build DOM
    const el = document.createElement('div');
    el.className = 'window focused';
    el.id = id;
    el.style.cssText = `left:${w.x}px;top:${w.y}px;width:${w.width}px;height:${w.height}px;z-index:${this.nextZ++};`;

    el.innerHTML = `
      <div class="window-titlebar">
        <div class="window-dots">
          <div class="window-dot red" data-action="close"></div>
          <div class="window-dot yellow" data-action="minimize"></div>
          <div class="window-dot green" data-action="maximize"></div>
        </div>
        <div class="window-title">${w.title}</div>
      </div>
      <div class="window-content" style="flex:1;display:flex;flex-direction:column;overflow:hidden;"></div>
    `;

    w.element = el;
    w.contentEl = el.querySelector('.window-content');

    // Build app content
    if (opts.buildContent) {
      opts.buildContent(w.contentEl, w);
    }

    this.container.appendChild(el);
    this.windows.push(w);

    // Wire title bar events
    this._setupTitleBar(w);
    this._setupDrag(w);
    this.focusWindow(id);

    // Update dock dot
    this._updateDockDot(w.app, true);
    this._updateWindowMenu();

    return w;
  }

  _setupTitleBar(w) {
    const el = w.element;
    el.querySelector('.window-dot[data-action="close"]').addEventListener('click', () => this.closeWindow(w.id));
    el.querySelector('.window-dot[data-action="minimize"]').addEventListener('click', () => this.minimizeWindow(w.id));
    el.querySelector('.window-dot[data-action="maximize"]').addEventListener('click', () => this.maximizeWindow(w.id));
    el.addEventListener('mousedown', () => this.focusWindow(w.id));
  }

  _setupDrag(w) {
    const titlebar = w.element.querySelector('.window-titlebar');
    let dragX, dragY, dragging = false;

    titlebar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.window-dots')) return;
      if (w.isMaximized) return;
      dragging = true;
      const rect = w.element.getBoundingClientRect();
      dragX = e.clientX - rect.left;
      dragY = e.clientY - rect.top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      w.element.style.left = (e.clientX - dragX) + 'px';
      w.element.style.top = (e.clientY - dragY) + 'px';
      w.x = e.clientX - dragX;
      w.y = e.clientY - dragY;
    });

    document.addEventListener('mouseup', () => { dragging = false; });
  }

  focusWindow(id) {
    this.windows.forEach(w => w.element.classList.remove('focused'));
    const win = this.getWindow(id);
    if (win) {
      win.element.classList.add('focused');
      win.element.style.zIndex = this.nextZ++;
      // Update menu bar app name
      document.getElementById('menuAppName').textContent = win.title || win.app || 'Finder';
    }
    this._updateWindowMenu();
  }

  closeWindow(id) {
    const idx = this.windows.findIndex(w => w.id === id);
    if (idx === -1) return;
    const w = this.windows[idx];
    // Custom close handler (e.g., finder cleanup)
    if (w.onClose) w.onClose();
    w.element.remove();
    this.windows.splice(idx, 1);

    // Check if any windows of this app remain
    const sameApp = this.windows.filter(x => x.app === w.app);
    if (sameApp.length === 0) {
      this._updateDockDot(w.app, false);
    }

    // Focus next window
    if (this.windows.length > 0) {
      this.focusWindow(this.windows[this.windows.length - 1].id);
    } else {
      document.getElementById('menuAppName').textContent = 'Finder';
    }
    this._updateWindowMenu();
  }

  minimizeWindow(id) {
    const w = this.getWindow(id);
    if (!w || w.isMinimized) return;
    w.isMinimized = true;
    w.element.classList.add('minimizing');
    w.element.addEventListener('animationend', function onEnd() {
      w.element.removeEventListener('animationend', onEnd);
      w.element.classList.remove('minimizing');
      w.element.classList.add('minimized');
    });
    // Focus next visible window
    const visible = this.windows.filter(x => !x.isMinimized && x.id !== id);
    if (visible.length > 0) {
      this.focusWindow(visible[visible.length - 1].id);
    } else {
      document.getElementById('menuAppName').textContent = 'Finder';
    }
    this._updateWindowMenu();
  }

  restoreWindow(id) {
    const w = this.getWindow(id);
    if (!w || !w.isMinimized) return;
    w.isMinimized = false;
    w.element.classList.remove('minimized');
    w.element.classList.add('restoring');
    w.element.addEventListener('animationend', function onEnd() {
      w.element.removeEventListener('animationend', onEnd);
      w.element.classList.remove('restoring');
    });
    this.focusWindow(id);
    this._updateWindowMenu();
  }

  maximizeWindow(id) {
    const w = this.getWindow(id);
    if (!w) return;
    w.isMaximized = !w.isMaximized;
    w.element.classList.toggle('maximized', w.isMaximized);
  }

  getWindow(id) {
    return this.windows.find(w => w.id === id);
  }

  getFocusedWindow() {
    return this.windows.find(w => w.element.classList.contains('focused') && !w.isMinimized);
  }

  getAllWindows() {
    return this.windows;
  }

  getWindowsByApp(app) {
    return this.windows.filter(w => w.app === app);
  }

  _updateDockDot(app, active) {
    const dockItem = document.querySelector(`.dock-item[data-app="${app}"]`);
    if (dockItem) {
      const dot = dockItem.querySelector('.dock-dot');
      if (dot) dot.classList.toggle('active', active);
    }
  }

  _updateWindowMenu() {
    const wl = document.getElementById('windowList');
    if (!wl) return;
    if (this.windows.length === 0) {
      wl.textContent = 'No windows';
      wl.style.color = 'rgba(255,255,255,0.4)';
      wl.style.fontStyle = 'italic';
      wl.onclick = null;
      return;
    }
    // Replace with a list
    const parent = wl.parentElement;
    // Remove old window list items
    parent.querySelectorAll('.win-list-entry').forEach(e => e.remove());
    wl.style.display = 'none';

    this.windows.forEach(w => {
      const item = document.createElement('div');
      item.className = 'menu-drop-item win-list-entry';
      const prefix = w.isMinimized ? '  ' : (w.element.classList.contains('focused') ? '✓ ' : '  ');
      const suffix = w.isMinimized ? ' (minimized)' : '';
      item.textContent = prefix + w.title + suffix;
      item.style.color = w.isMinimized ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.8)';
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (w.isMinimized) this.restoreWindow(w.id);
        else this.focusWindow(w.id);
        // Close menu
        if (openMenu) { openMenu.classList.remove('open'); openMenu = null; }
      });
      parent.appendChild(item);
    });
  }
}

const wm = new WindowManager();

/* ══════════════════════════
   Desktop initialization
   ══════════════════════════ */
let desktopInited = false;

function initDesktop() {
  if (desktopInited) return;
  desktopInited = true;
  initClock();
  initDesktopIcons();
  initDock();
  initMenuBar();
  initSpotlight();
  initLaunchpad();
  initMissionControl();
  initKeyboardShortcuts();
  initDesktopContextMenu();
}

/* ── Clock ── */
function initClock() {
  function tick() {
    const now = new Date();
    // Menu bar clock
    document.getElementById('menuBarClock').textContent =
      now.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' +
      now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    // Desktop clock widget
    document.getElementById('clockTime').textContent =
      now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.getElementById('clockDate').textContent =
      now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  tick();
  setInterval(tick, 1000);
}

/* ── Desktop Icons ── */
function initDesktopIcons() {
  const desktopArea = document.getElementById('desktopArea');

  desktopArea.addEventListener('click', (e) => {
    if (e.target === desktopArea || e.target.classList.contains('desktop-clock') || e.target.closest('.desktop-clock')) {
      document.querySelectorAll('.desktop-icon.selected').forEach(i => i.classList.remove('selected'));
    }
  });

  document.querySelectorAll('.desktop-icon').forEach(icon => {
    // Single click: select
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.desktop-icon.selected').forEach(i => i.classList.remove('selected'));
      icon.classList.add('selected');
    });

    // Double click: open app
    icon.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      openApp(icon.dataset.app);
    });

    // Drag to reposition
    let dragOffX, dragOffY, isDragging = false, startX, startY;
    icon.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isDragging = false;
      startX = e.clientX; startY = e.clientY;
      // Convert right-positioned to left-positioned
      if (icon.style.right && icon.style.left === 'auto') {
        icon.style.left = icon.offsetLeft + 'px';
        icon.style.right = 'auto';
      }
      // Convert bottom-positioned to top-positioned
      if (icon.style.bottom && icon.style.top === 'auto') {
        icon.style.top = icon.offsetTop + 'px';
        icon.style.bottom = 'auto';
      }
      dragOffX = e.clientX - icon.offsetLeft;
      dragOffY = e.clientY - icon.offsetTop;
      const onMove = (ev) => {
        const dist = Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY);
        if (dist < 5) return;
        isDragging = true;
        const areaRect = desktopArea.getBoundingClientRect();
        let x = ev.clientX - dragOffX;
        let y = ev.clientY - dragOffY;
        // Grid snapping (90px grid)
        x = Math.round(x / 90) * 90;
        y = Math.round(y / 90) * 90;
        x = Math.max(0, Math.min(x, areaRect.width - icon.offsetWidth));
        y = Math.max(0, Math.min(y, areaRect.height - icon.offsetHeight));
        icon.style.left = x + 'px';
        icon.style.top = y + 'px';
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

/* ── Dock ── */
function initDock() {
  const dock = document.getElementById('dock');
  const items = dock.querySelectorAll('.dock-item');

  // Double-click to open/focus app
  items.forEach(item => {
    item.addEventListener('dblclick', () => {
      const app = item.dataset.app;
      const existing = wm.getWindowsByApp(app);
      if (existing.length > 0) {
        const minimized = existing.find(w => w.isMinimized);
        if (minimized) wm.restoreWindow(minimized.id);
        else wm.focusWindow(existing[0].id);
      } else {
        openApp(app);
      }
    });

    // Right-click: dock context menu
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const app = item.dataset.app;
      const existing = wm.getWindowsByApp(app);
      const ctx = document.getElementById('desktopCtx');
      ctx.innerHTML = '';

      if (existing.length > 0) {
        const closeItem = document.createElement('div');
        closeItem.className = 'desktop-ctx-item';
        closeItem.innerHTML = '<i class="fas fa-times"></i> Close All Windows';
        closeItem.addEventListener('click', () => {
          [...existing].forEach(w => wm.closeWindow(w.id));
        });
        ctx.appendChild(closeItem);
      } else {
        const openItem = document.createElement('div');
        openItem.className = 'desktop-ctx-item';
        openItem.innerHTML = '<i class="fas fa-external-link-alt"></i> Open';
        openItem.addEventListener('click', () => openApp(app));
        ctx.appendChild(openItem);
      }

      ctx.style.left = e.clientX + 'px';
      ctx.style.top = (e.clientY - ctx.offsetHeight - 10) + 'px';
      ctx.classList.add('show');
      // Reposition above dock
      setTimeout(() => {
        const rect = ctx.getBoundingClientRect();
        if (rect.top < 0) ctx.style.top = '10px';
        ctx.style.top = (e.clientY - rect.height - 10) + 'px';
      }, 0);
    });
  });

  // Dock magnification
  dock.addEventListener('mousemove', (e) => {
    const dockRect = dock.getBoundingClientRect();
    items.forEach(item => {
      if (item.classList.contains('dock-separator')) return;
      const itemRect = item.getBoundingClientRect();
      const itemCenterX = itemRect.left + itemRect.width / 2;
      const dist = Math.abs(e.clientX - itemCenterX);
      const maxDist = 120;
      if (dist < maxDist) {
        const scale = 1 + 0.5 * (1 - dist / maxDist);
        item.style.transform = `scale(${scale}) translateY(-${(scale - 1) * 20}px)`;
      } else {
        item.style.transform = '';
      }
    });
  });

  dock.addEventListener('mouseleave', () => {
    items.forEach(item => { item.style.transform = ''; });
  });
}

/* ── Open App (central dispatcher) ── */
function openApp(appName) {
  switch (appName) {
    case 'finder': openFinderWindow(); break;
    case 'terminal': openTerminal(); break;
    case 'notes': openNotes(); break;
    case 'activity': openActivityMonitor(); break;
    case 'preferences': openSystemPreferences(); break;
    case 'chat': openChat(); break;
    case 'editor': openCodeEditor(); break;
    case 'trash': openTrash(); break;
    default: break;
  }
}

/* ── Menu Bar ── */
let openMenu = null;

function initMenuBar() {
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      if (openMenu === item) {
        item.classList.remove('open');
        openMenu = null;
      } else {
        if (openMenu) openMenu.classList.remove('open');
        item.classList.add('open');
        openMenu = item;
      }
    });
    item.addEventListener('mouseenter', () => {
      if (openMenu && openMenu !== item) {
        openMenu.classList.remove('open');
        item.classList.add('open');
        openMenu = item;
      }
    });
  });

  // Close menus on outside click
  document.addEventListener('click', () => {
    if (openMenu) { openMenu.classList.remove('open'); openMenu = null; }
    document.getElementById('desktopCtx').classList.remove('show');
    document.getElementById('contextMenu').classList.remove('show');
  });

  // Menu actions
  document.querySelectorAll('.menu-drop-item[data-action]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      if (openMenu) { openMenu.classList.remove('open'); openMenu = null; }

      switch (action) {
        case 'new-window': openFinderWindow(); break;
        case 'new-tab': {
          const fw = wm.getFocusedWindow();
          if (fw && fw.app === 'finder' && fw.addTab) fw.addTab();
          break;
        }
        case 'close-window': {
          const fw = wm.getFocusedWindow();
          if (fw) wm.closeWindow(fw.id);
          break;
        }
        case 'minimize': {
          const fw = wm.getFocusedWindow();
          if (fw) wm.minimizeWindow(fw.id);
          break;
        }
        case 'zoom': {
          const fw = wm.getFocusedWindow();
          if (fw) wm.maximizeWindow(fw.id);
          break;
        }
        case 'go-back': {
          const fw = wm.getFocusedWindow();
          if (fw && fw.app === 'finder' && fw.goBack) fw.goBack();
          break;
        }
        case 'go-root': {
          const fw = wm.getFocusedWindow();
          if (fw && fw.app === 'finder' && fw.navigateTo) fw.navigateTo('');
          break;
        }
        case 'go-travel': {
          const fw = wm.getFocusedWindow();
          if (fw && fw.app === 'finder' && fw.navigateTo) fw.navigateTo('images/travel/');
          else { openFinderWindow('images/travel/'); }
          break;
        }
        case 'go-pets': {
          const fw = wm.getFocusedWindow();
          if (fw && fw.app === 'finder' && fw.navigateTo) fw.navigateTo('images/pet/');
          else { openFinderWindow('images/pet/'); }
          break;
        }
        case 'view-icons': {
          const fw = wm.getFocusedWindow();
          if (fw && fw.app === 'finder' && fw.setViewMode) fw.setViewMode('icons');
          break;
        }
        case 'view-list': {
          const fw = wm.getFocusedWindow();
          if (fw && fw.app === 'finder' && fw.setViewMode) fw.setViewMode('list');
          break;
        }
        case 'view-columns': {
          const fw = wm.getFocusedWindow();
          if (fw && fw.app === 'finder' && fw.setViewMode) fw.setViewMode('columns');
          break;
        }
        case 'show-path': {
          const fw = wm.getFocusedWindow();
          if (fw && fw.app === 'finder' && fw.togglePathBar) fw.togglePathBar();
          break;
        }
        case 'copy': {
          const fw = wm.getFocusedWindow();
          if (fw && fw.app === 'finder' && fw.copySelected) fw.copySelected();
          break;
        }
        case 'paste': {
          const fw = wm.getFocusedWindow();
          if (fw && fw.app === 'finder' && fw.pasteFiles) fw.pasteFiles();
          break;
        }
        case 'select-all': {
          const fw = wm.getFocusedWindow();
          if (fw && fw.app === 'finder' && fw.selectAll) fw.selectAll();
          break;
        }
        case 'about':
          alert('Internal Space v2.0\nA macOS-style desktop for managing Firebase Storage.\nBuilt with vanilla JS.');
          break;
        case 'logout':
          auth.signOut().then(() => location.reload());
          break;
        case 'sys-prefs':
          openSystemPreferences();
          break;
      }
    });
  });
}

/* ── Desktop Context Menu ── */
function initDesktopContextMenu() {
  const desktopArea = document.getElementById('desktopArea');
  const desktopCtx = document.getElementById('desktopCtx');

  desktopArea.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.desktop-icon') || e.target.closest('.window')) return;
    e.preventDefault();
    // Restore default context menu items
    desktopCtx.innerHTML = `
      <div class="desktop-ctx-item" id="ctxNewFolder"><i class="fas fa-folder-plus"></i> New Folder</div>
      <div class="desktop-ctx-divider"></div>
      <div class="desktop-ctx-item" id="ctxGetInfo"><i class="fas fa-info-circle"></i> Get Info</div>
      <div class="desktop-ctx-divider"></div>
      <div class="desktop-ctx-item" id="ctxWallpaper"><i class="fas fa-image"></i> Change Wallpaper</div>
    `;
    desktopCtx.style.left = e.clientX + 'px';
    desktopCtx.style.top = e.clientY + 'px';
    desktopCtx.classList.add('show');

    document.getElementById('ctxWallpaper').addEventListener('click', () => {
      wallIdx = (wallIdx + 1) % wallpapers.length;
      document.getElementById('desktop').style.background = wallpapers[wallIdx];
    });
    document.getElementById('ctxNewFolder').addEventListener('click', () => {
      const fw = wm.getFocusedWindow();
      if (fw && fw.app === 'finder' && fw.createFolder) fw.createFolder();
    });
  });
}

/* ── Wallpapers ── */
const wallpapers = [
  'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
  'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
  'linear-gradient(135deg, #000428 0%, #004e92 100%)',
  'linear-gradient(135deg, #141e30 0%, #243b55 100%)',
  'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
];
let wallIdx = 0;

/* ── Spotlight ── */
function initSpotlight() {
  const overlay = document.getElementById('spotlightOverlay');
  const input = document.getElementById('spotlightInput');
  const results = document.getElementById('spotlightResults');
  let spotlightIdx = -1;

  window.openSpotlight = function() {
    overlay.classList.add('show');
    input.value = '';
    results.innerHTML = '';
    spotlightIdx = -1;
    setTimeout(() => input.focus(), 100);
  };

  window.closeSpotlight = function() {
    overlay.classList.remove('show');
    input.value = '';
    results.innerHTML = '';
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSpotlight();
  });

  let searchTimeout;
  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = input.value.trim().toLowerCase();
    if (!q) { results.innerHTML = ''; spotlightIdx = -1; return; }

    searchTimeout = setTimeout(async () => {
      try {
        // Search Firebase Storage for matching files
        const r = await fetch(`${FB_STORAGE}/o?maxResults=50`);
        const data = await r.json();
        const items = (data.items || []).filter(i =>
          i.name.toLowerCase().includes(q)
        ).slice(0, 8);

        // Also include app matches
        const apps = [
          { name: 'Finder', icon: 'fas fa-folder', app: 'finder' },
          { name: 'Terminal', icon: 'fas fa-terminal', app: 'terminal' },
          { name: 'Notes', icon: 'fas fa-sticky-note', app: 'notes' },
          { name: 'Activity Monitor', icon: 'fas fa-chart-bar', app: 'activity' },
          { name: 'System Preferences', icon: 'fas fa-cog', app: 'preferences' },
          { name: 'Chat', icon: 'fas fa-comments', app: 'chat' },
          { name: 'Code Editor', icon: 'fas fa-code', app: 'editor' },
        ].filter(a => a.name.toLowerCase().includes(q));

        results.innerHTML = '';
        spotlightIdx = -1;

        apps.forEach(a => {
          const div = document.createElement('div');
          div.className = 'spotlight-result';
          div.innerHTML = `<i class="${a.icon}"></i><span>${a.name}</span>`;
          div.addEventListener('click', () => { openApp(a.app); closeSpotlight(); });
          results.appendChild(div);
        });

        items.forEach(item => {
          const div = document.createElement('div');
          div.className = 'spotlight-result';
          const isImage = (item.contentType || '').startsWith('image/');
          const icon = isImage ? 'fas fa-image' : (item.contentType || '').includes('pdf') ? 'fas fa-file-pdf' : 'fas fa-file';
          div.innerHTML = `<i class="${icon}"></i><span>${item.name}</span>`;
          div.addEventListener('click', () => {
            // Open in Finder at that path
            const parts = item.name.split('/');
            parts.pop();
            const folder = parts.length ? parts.join('/') + '/' : '';
            openFinderWindow(folder);
            closeSpotlight();
          });
          results.appendChild(div);
        });
      } catch {}
    }, 300);
  });

  // Keyboard navigation in results
  input.addEventListener('keydown', (e) => {
    const items = results.querySelectorAll('.spotlight-result');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      spotlightIdx = Math.min(spotlightIdx + 1, items.length - 1);
      items.forEach((it, i) => it.classList.toggle('selected', i === spotlightIdx));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      spotlightIdx = Math.max(spotlightIdx - 1, 0);
      items.forEach((it, i) => it.classList.toggle('selected', i === spotlightIdx));
    } else if (e.key === 'Enter') {
      if (spotlightIdx >= 0 && items[spotlightIdx]) items[spotlightIdx].click();
    } else if (e.key === 'Escape') {
      closeSpotlight();
    }
  });
}

/* ── Launchpad ── */
function initLaunchpad() {
  const overlay = document.getElementById('launchpadOverlay');
  const grid = document.getElementById('launchpadGrid');

  const apps = [
    { name: 'Finder', icon: 'fas fa-folder', bg: 'linear-gradient(135deg,#4a90d9,#357abd)', app: 'finder' },
    { name: 'Terminal', icon: 'fas fa-terminal', bg: 'linear-gradient(135deg,#1a1a1a,#333)', app: 'terminal' },
    { name: 'Notes', icon: 'fas fa-sticky-note', bg: 'linear-gradient(135deg,#f5d020,#f5d020)', app: 'notes', color: '#333' },
    { name: 'Activity Monitor', icon: 'fas fa-chart-bar', bg: 'linear-gradient(135deg,#28a745,#20c997)', app: 'activity' },
    { name: 'System Preferences', icon: 'fas fa-cog', bg: 'linear-gradient(135deg,#6c757d,#adb5bd)', app: 'preferences' },
    { name: 'Chat', icon: 'fas fa-comments', bg: 'linear-gradient(135deg,#007bff,#6610f2)', app: 'chat' },
    { name: 'Code Editor', icon: 'fas fa-code', bg: 'linear-gradient(135deg,#0078d4,#005a9e)', app: 'editor' },
  ];

  apps.forEach(a => {
    const item = document.createElement('div');
    item.className = 'launchpad-item';
    item.innerHTML = `
      <div class="launchpad-icon" style="background:${a.bg};${a.color ? 'color:' + a.color : ''}"><i class="${a.icon}"></i></div>
      <div class="launchpad-label">${a.name}</div>
    `;
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      openApp(a.app);
      closeLaunchpad();
    });
    grid.appendChild(item);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLaunchpad();
  });

  window.openLaunchpad = function() { overlay.classList.add('show'); };
  window.closeLaunchpad = function() { overlay.classList.remove('show'); };
}

/* ── Mission Control ── */
function initMissionControl() {
  const overlay = document.getElementById('missionControlOverlay');
  const container = document.getElementById('missionControlWindows');

  window.openMissionControl = function() {
    container.innerHTML = '';
    const wins = wm.getAllWindows().filter(w => !w.isMinimized);
    if (wins.length === 0) {
      container.innerHTML = '<div style="color:rgba(255,255,255,0.4);font-size:0.8rem;">No open windows</div>';
    }
    wins.forEach(w => {
      const thumb = document.createElement('div');
      thumb.className = 'mc-window-thumb';
      thumb.innerHTML = `
        <div class="mc-window-thumb-title">${w.title}</div>
        <div class="mc-window-thumb-body"></div>
      `;
      thumb.addEventListener('click', () => {
        wm.focusWindow(w.id);
        closeMissionControl();
      });
      container.appendChild(thumb);
    });
    overlay.classList.add('show');
  };

  window.closeMissionControl = function() { overlay.classList.remove('show'); };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeMissionControl();
  });
}

/* ── Keyboard Shortcuts ── */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Spotlight: Cmd+Space
    if (e.metaKey && e.code === 'Space') {
      e.preventDefault();
      const spotlightOverlay = document.getElementById('spotlightOverlay');
      if (spotlightOverlay.classList.contains('show')) closeSpotlight();
      else openSpotlight();
      return;
    }

    // Cmd+N: new Finder window
    if (e.metaKey && e.key === 'n') { e.preventDefault(); openFinderWindow(); return; }

    // Cmd+W: close focused window
    if (e.metaKey && e.key === 'w') {
      e.preventDefault();
      const fw = wm.getFocusedWindow();
      if (fw) wm.closeWindow(fw.id);
      return;
    }

    // Cmd+M: minimize
    if (e.metaKey && e.key === 'm') {
      e.preventDefault();
      const fw = wm.getFocusedWindow();
      if (fw) wm.minimizeWindow(fw.id);
      return;
    }

    // Cmd+[: back in Finder
    if (e.metaKey && e.key === '[') {
      e.preventDefault();
      const fw = wm.getFocusedWindow();
      if (fw && fw.app === 'finder' && fw.goBack) fw.goBack();
      return;
    }

    // Cmd+T: new tab in Finder
    if (e.metaKey && e.key === 't') {
      e.preventDefault();
      const fw = wm.getFocusedWindow();
      if (fw && fw.app === 'finder' && fw.addTab) fw.addTab();
      return;
    }

    // F11: Mission Control
    if (e.key === 'F11') {
      e.preventDefault();
      const mc = document.getElementById('missionControlOverlay');
      if (mc.classList.contains('show')) closeMissionControl();
      else openMissionControl();
      return;
    }

    // F4: Launchpad
    if (e.key === 'F4') {
      e.preventDefault();
      const lp = document.getElementById('launchpadOverlay');
      if (lp.classList.contains('show')) closeLaunchpad();
      else openLaunchpad();
      return;
    }

    // Escape: close overlays
    if (e.key === 'Escape') {
      if (document.getElementById('quicklook').classList.contains('show')) {
        document.getElementById('quicklook').classList.remove('show');
        return;
      }
      if (document.getElementById('spotlightOverlay').classList.contains('show')) {
        closeSpotlight();
        return;
      }
      if (document.getElementById('launchpadOverlay').classList.contains('show')) {
        closeLaunchpad();
        return;
      }
      if (document.getElementById('missionControlOverlay').classList.contains('show')) {
        closeMissionControl();
        return;
      }
    }

    // Arrow keys: file navigation in Finder
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const fw = wm.getFocusedWindow();
      if (fw && fw.app === 'finder' && fw.handleArrowKey) {
        e.preventDefault();
        fw.handleArrowKey(e.key);
      }
      // Quick Look slideshow
      if (document.getElementById('quicklook').classList.contains('show')) {
        const fw2 = wm.getFocusedWindow();
        if (fw2 && fw2.app === 'finder' && fw2.quickLookNav) {
          e.preventDefault();
          fw2.quickLookNav(e.key);
        }
      }
      return;
    }

    // Space: Quick Look
    if (e.key === ' ' && !e.metaKey) {
      if (document.getElementById('quicklook').classList.contains('show')) {
        e.preventDefault();
        document.getElementById('quicklook').classList.remove('show');
        return;
      }
      const fw = wm.getFocusedWindow();
      if (fw && fw.app === 'finder' && fw.quickLook) {
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          e.preventDefault();
          fw.quickLook();
        }
      }
      return;
    }

    // Delete: delete file
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      const fw = wm.getFocusedWindow();
      if (fw && fw.app === 'finder' && fw.deleteSelected) {
        e.preventDefault();
        fw.deleteSelected();
      }
      return;
    }

    // Enter: rename file
    if (e.key === 'Enter') {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      const fw = wm.getFocusedWindow();
      if (fw && fw.app === 'finder' && fw.renameSelected) {
        e.preventDefault();
        fw.renameSelected();
      }
      return;
    }
  });
}

/* Quick Look close on click */
document.getElementById('quicklook').addEventListener('click', () => {
  document.getElementById('quicklook').classList.remove('show');
});

/* ── Trash (simple) ── */
function openTrash() {
  openFinderWindow('trash/');
}

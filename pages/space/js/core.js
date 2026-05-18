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
    el.className = 'window focused opening';
    el.id = id;
    // Clamp position so window is fully visible
    const maxY = Math.max(30, window.innerHeight - w.height - 80);
    const maxX = Math.max(0, window.innerWidth - w.width - 20);
    w.y = Math.min(w.y, maxY);
    w.x = Math.min(w.x, maxX);
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

    // #10 Add resize handles
    ['n','s','e','w','ne','nw','se','sw'].forEach(dir => {
      const handle = document.createElement('div');
      handle.className = `window-resize-handle ${dir}`;
      el.appendChild(handle);
      handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const startX = e.clientX, startY = e.clientY;
        const startRect = el.getBoundingClientRect();
        const onMove = (ev) => {
          const dx = ev.clientX - startX, dy = ev.clientY - startY;
          if (dir.includes('e')) el.style.width = Math.max(400, startRect.width + dx) + 'px';
          if (dir.includes('w')) { el.style.width = Math.max(400, startRect.width - dx) + 'px'; el.style.left = (startRect.left + dx) + 'px'; }
          if (dir.includes('s')) el.style.height = Math.max(300, startRect.height + dy) + 'px';
          if (dir.includes('n')) { el.style.height = Math.max(300, startRect.height - dy) + 'px'; el.style.top = (startRect.top + dy) + 'px'; }
        };
        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });

    this.container.appendChild(el);
    // Remove opening animation class after it finishes
    el.addEventListener('animationend', function onOpen() {
      el.removeEventListener('animationend', onOpen);
      el.classList.remove('opening');
    });
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

    // #1 Double-click title bar to maximize
    titlebar.addEventListener('dblclick', (e) => {
      if (e.target.closest('.window-dots')) return;
      this.maximizeWindow(w.id);
    });

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
    // Animate close then remove
    w.element.classList.add('closing');
    const el = w.element;
    this.windows.splice(idx, 1);
    el.addEventListener('animationend', () => el.remove());

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
  loadUserSettings(); // #13
}

/* ── Settings sync to Firebase (#90 multi-user support) ── */
let customWallpaper = null; // #12 stores Firebase image URL if set

async function saveUserSettings() {
  if (!currentUser) return;
  const key = currentUser.email.replace(/[.@]/g, '_');
  // #90 Collect icon positions
  const iconPositions = {};
  document.querySelectorAll('.desktop-icon').forEach(icon => {
    const app = icon.dataset.app;
    if (app) {
      iconPositions[app] = {
        left: icon.style.left,
        top: icon.style.top,
        label: icon.querySelector('.desktop-icon-label')?.textContent || app,
      };
    }
  });
  const settings = {
    wallpaperIndex: wallIdx,
    customWallpaper: customWallpaper || null,
    fontSize: localStorage.getItem('space-font-size') || '14',
    iconPositions: iconPositions,
  };
  try {
    await fetch(`${FB_DB}/desktop-state/${key}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  } catch {}
}

async function loadUserSettings() {
  if (!currentUser) return;
  const key = currentUser.email.replace(/[.@]/g, '_');
  try {
    const r = await fetch(`${FB_DB}/desktop-state/${key}.json`);
    const data = await r.json();
    if (data) {
      // Wallpaper
      if (data.customWallpaper) {
        customWallpaper = data.customWallpaper;
        const desktop = document.getElementById('desktop');
        desktop.style.backgroundImage = `url(${customWallpaper})`;
        desktop.style.backgroundSize = 'cover';
        desktop.style.backgroundPosition = 'center';
      } else if (data.wallpaperIndex != null && wallpapers[data.wallpaperIndex]) {
        wallIdx = data.wallpaperIndex;
        document.getElementById('desktop').style.background = wallpapers[wallIdx];
      }
      // Font size
      if (data.fontSize) {
        document.body.style.fontSize = data.fontSize + 'px';
        localStorage.setItem('space-font-size', data.fontSize);
      }
      // #90 Icon positions
      if (data.iconPositions) {
        document.querySelectorAll('.desktop-icon').forEach(icon => {
          const app = icon.dataset.app;
          const pos = data.iconPositions[app];
          if (pos) {
            icon.style.left = pos.left;
            icon.style.top = pos.top;
            icon.style.right = 'auto';
            icon.style.bottom = 'auto';
            if (pos.label) {
              const labelEl = icon.querySelector('.desktop-icon-label');
              if (labelEl) labelEl.textContent = pos.label;
            }
          }
        });
      }
    }
  } catch {}
  // #15 Apply dynamic wallpaper if no custom wallpaper
  if (!customWallpaper) applyDynamicWallpaper();
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
    // #9 Slow double-click label editing
    let lastClickTime = 0;
    let labelEditTimeout = null;

    // Single click: select
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const now = Date.now();
      const elapsed = now - lastClickTime;
      lastClickTime = now;
      document.querySelectorAll('.desktop-icon.selected').forEach(i => i.classList.remove('selected'));
      icon.classList.add('selected');

      // Clear any pending label edit
      if (labelEditTimeout) { clearTimeout(labelEditTimeout); labelEditTimeout = null; }

      // If 500-1500ms since last click (slow double-click), start label editing
      if (elapsed >= 500 && elapsed <= 1500) {
        const labelEl = icon.querySelector('.desktop-icon-label');
        if (labelEl && !labelEl.querySelector('input')) {
          const oldName = labelEl.textContent;
          const input = document.createElement('input');
          input.type = 'text';
          input.value = oldName;
          input.style.cssText = 'font-size:0.75rem;font-weight:600;color:#fff;background:rgba(0,0,0,0.5);border:1px solid #3478f6;border-radius:3px;text-align:center;width:80px;outline:none;font-family:Inter,sans-serif;padding:1px 3px;';
          labelEl.textContent = '';
          labelEl.style.pointerEvents = 'auto';
          labelEl.appendChild(input);
          input.focus();
          input.select();

          const finishEdit = () => {
            const newName = input.value.trim() || oldName;
            labelEl.textContent = newName;
            labelEl.style.pointerEvents = '';
          };
          input.addEventListener('keydown', (ev) => {
            ev.stopPropagation();
            if (ev.key === 'Enter') { ev.preventDefault(); finishEdit(); }
            if (ev.key === 'Escape') { labelEl.textContent = oldName; labelEl.style.pointerEvents = ''; }
          });
          input.addEventListener('blur', finishEdit);
        }
        return;
      }
    });

    // Double click: open app
    icon.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (labelEditTimeout) { clearTimeout(labelEditTimeout); labelEditTimeout = null; }
      openApp(icon.dataset.app);
    });

    // #4 Right-click desktop icon context menu
    icon.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const iconCtx = document.getElementById('desktopIconCtx');
      const appName = icon.dataset.app;
      const labelEl = icon.querySelector('.desktop-icon-label');
      const appLabel = labelEl ? labelEl.textContent : appName;

      iconCtx.style.left = e.clientX + 'px';
      iconCtx.style.top = e.clientY + 'px';
      iconCtx.classList.add('show');

      document.getElementById('iconCtxOpen').onclick = () => {
        openApp(appName);
        iconCtx.classList.remove('show');
      };
      document.getElementById('iconCtxGetInfo').onclick = () => {
        alert('App: ' + appLabel + '\nType: Application');
        iconCtx.classList.remove('show');
      };
      document.getElementById('iconCtxTrash').onclick = () => {
        icon.style.display = 'none';
        iconCtx.classList.remove('show');
      };
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
        // Grid snapping (110px grid)
        x = Math.round(x / 110) * 110;
        y = Math.round(y / 110) * 110;
        x = Math.max(0, Math.min(x, areaRect.width - icon.offsetWidth));
        y = Math.max(0, Math.min(y, areaRect.height - icon.offsetHeight));
        icon.style.left = x + 'px';
        icon.style.top = y + 'px';
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        // #90 Auto-save icon positions on drag
        if (isDragging) saveUserSettings();
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

  // Single-click to open/focus app (macOS dock uses single click)
  items.forEach(item => {
    item.addEventListener('click', () => {
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

  // #15 Smooth dock magnification
  dock.addEventListener('mousemove', (e) => {
    items.forEach(item => {
      if (item.classList.contains('dock-separator')) return;
      const itemRect = item.getBoundingClientRect();
      const itemCenterX = itemRect.left + itemRect.width / 2;
      const dist = Math.abs(e.clientX - itemCenterX);
      const maxDist = 120;
      if (dist < maxDist) {
        // max 1.4x for closest, tapering to 1.0x at maxDist
        const scale = 1 + 0.4 * (1 - dist / maxDist);
        item.style.transform = `scale(${scale}) translateY(-${(scale - 1) * 20}px)`;
      } else {
        item.style.transform = 'scale(1) translateY(0)';
      }
    });
  });

  dock.addEventListener('mouseleave', () => {
    items.forEach(item => {
      if (item.classList.contains('dock-separator')) return;
      item.style.transform = '';
    });
  });
}

/* ── Open App (central dispatcher) ── */
function openApp(appName) {
  // Dock bounce animation
  const dockItem = document.querySelector(`.dock-item[data-app="${appName}"]`);
  if (dockItem) {
    dockItem.classList.add('launching');
    setTimeout(() => dockItem.classList.remove('launching'), 2400);
  }
  switch (appName) {
    case 'finder': openFinderWindow(); break;
    case 'terminal': openTerminal(); break;
    case 'notes': openNotes(); break;
    case 'activity': openActivityMonitor(); break;
    case 'preferences': openSystemPreferences(); break;
    case 'chat': openChat(); break;
    case 'editor': openCodeEditor(); break;
    case 'trash': openTrash(); break;
    case 'calculator': openCalculator(); break;
    case 'gallery': openImageGallery(); break;
    case 'markdown': openMarkdownEditor(); break;
    case 'json': openJsonViewer(); break;
    case 'logs': openLogViewer(); break;
    case 'clipboard': openClipboardManager(); break;
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
    document.getElementById('desktopIconCtx').classList.remove('show');
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
        case 'show-preview': {
          const fw = wm.getFocusedWindow();
          if (fw && fw.app === 'finder' && fw.togglePreview) fw.togglePreview();
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
    // Restore default context menu items (matches index.html #desktopCtx)
    desktopCtx.innerHTML = `
      <div class="desktop-ctx-item" id="ctxNewFolder"><i class="fas fa-folder-plus"></i> New Folder</div>
      <div class="desktop-ctx-divider"></div>
      <div class="desktop-ctx-item" id="ctxCleanUp"><i class="fas fa-th"></i> Clean Up</div>
      <div class="desktop-ctx-submenu">
        <div class="desktop-ctx-item"><i class="fas fa-sort"></i> Sort By <span style="margin-left:auto;font-size:0.6rem;"><i class="fas fa-chevron-right"></i></span></div>
        <div class="desktop-ctx-sub">
          <div class="desktop-ctx-item" data-sort="name"><i class="fas fa-font"></i> Name</div>
          <div class="desktop-ctx-item" data-sort="kind"><i class="fas fa-shapes"></i> Kind</div>
          <div class="desktop-ctx-item" data-sort="date"><i class="fas fa-clock"></i> Date Added</div>
        </div>
      </div>
      <div class="desktop-ctx-divider"></div>
      <div class="desktop-ctx-item" id="ctxGetInfo"><i class="fas fa-info-circle"></i> Get Info</div>
      <div class="desktop-ctx-divider"></div>
      <div class="desktop-ctx-item" id="ctxWallpaper"><i class="fas fa-image"></i> Change Wallpaper</div>
      <div class="desktop-ctx-divider"></div>
      <div class="desktop-ctx-item" id="ctxSaveDesktopState"><i class="fas fa-save"></i> Save Desktop State</div>
    `;
    desktopCtx.style.left = e.clientX + 'px';
    desktopCtx.style.top = e.clientY + 'px';
    desktopCtx.classList.add('show');

    document.getElementById('ctxWallpaper').addEventListener('click', () => {
      customWallpaper = null;
      wallIdx = (wallIdx + 1) % wallpapers.length;
      document.getElementById('desktop').style.background = wallpapers[wallIdx];
      document.getElementById('desktop').style.backgroundImage = '';
      saveUserSettings();
    });
    document.getElementById('ctxNewFolder').addEventListener('click', () => {
      const fw = wm.getFocusedWindow();
      if (fw && fw.app === 'finder' && fw.createFolder) fw.createFolder();
    });
    // #88 Save Desktop State
    document.getElementById('ctxSaveDesktopState').addEventListener('click', () => {
      exportDesktopState();
    });
    // #14 Sort By submenu
    desktopCtx.querySelectorAll('[data-sort]').forEach(item => {
      item.addEventListener('click', () => {
        sortDesktopIcons(item.dataset.sort);
        desktopCtx.classList.remove('show');
      });
    });
    // Clean Up (auto-arrange icons)
    document.getElementById('ctxCleanUp').addEventListener('click', () => {
      const icons = Array.from(document.querySelectorAll('.desktop-icon')).filter(i => i.style.display !== 'none');
      const areaRect = desktopArea.getBoundingClientRect();
      const gridX = 110, gridY = 110;
      const cols = Math.floor(areaRect.width / gridX);
      let col = cols - 1, row = 0;
      icons.forEach(icon => {
        const x = col * gridX;
        const y = row * gridY + 20;
        icon.style.left = x + 'px';
        icon.style.top = y + 'px';
        icon.style.right = 'auto';
        icon.style.bottom = 'auto';
        row++;
        const maxRows = Math.floor((areaRect.height - 80) / gridY);
        if (row >= maxRows) { row = 0; col--; }
      });
      saveUserSettings();
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
          { name: 'Calculator', icon: 'fas fa-calculator', app: 'calculator' },
          { name: 'Photos', icon: 'fas fa-images', app: 'gallery' },
          { name: 'Markdown', icon: 'fas fa-file-alt', app: 'markdown' },
          { name: 'JSON Viewer', icon: 'fas fa-code', app: 'json' },
          { name: 'Log Viewer', icon: 'fas fa-scroll', app: 'logs' },
          { name: 'Clipboard', icon: 'fas fa-clipboard-list', app: 'clipboard' },
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
    { name: 'Calculator', icon: 'fas fa-calculator', bg: 'linear-gradient(135deg,#333,#555)', app: 'calculator' },
    { name: 'Photos', icon: 'fas fa-images', bg: 'linear-gradient(135deg,#e44d26,#f16529)', app: 'gallery' },
    { name: 'Markdown', icon: 'fas fa-file-alt', bg: 'linear-gradient(135deg,#2b5876,#4e4376)', app: 'markdown' },
    { name: 'JSON Viewer', icon: 'fas fa-code', bg: 'linear-gradient(135deg,#f7971e,#ffd200)', color: '#333', app: 'json' },
    { name: 'Log Viewer', icon: 'fas fa-scroll', bg: 'linear-gradient(135deg,#0d1117,#161b22)', app: 'logs' },
    { name: 'Clipboard', icon: 'fas fa-clipboard-list', bg: 'linear-gradient(135deg,#11998e,#38ef7d)', app: 'clipboard' },
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

/* ── #13 Show Desktop toggle ── */
let showDesktopActive = false;
let showDesktopSavedStates = [];

function toggleShowDesktop() {
  if (!showDesktopActive) {
    // Minimize all windows
    showDesktopSavedStates = [];
    wm.getAllWindows().forEach(w => {
      if (!w.isMinimized) {
        showDesktopSavedStates.push(w.id);
        wm.minimizeWindow(w.id);
      }
    });
    showDesktopActive = true;
  } else {
    // Restore all previously minimized windows
    showDesktopSavedStates.forEach(id => {
      const w = wm.getWindow(id);
      if (w && w.isMinimized) wm.restoreWindow(id);
    });
    showDesktopSavedStates = [];
    showDesktopActive = false;
  }
}

/* ── Keyboard Shortcuts ── */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Lock screen: Cmd+Ctrl+Q
    if (e.metaKey && e.ctrlKey && e.key === 'q') {
      e.preventDefault();
      lockScreen();
      return;
    }

    // Spotlight: Cmd+Space
    if (e.metaKey && e.code === 'Space') {
      e.preventDefault();
      const spotlightOverlay = document.getElementById('spotlightOverlay');
      if (spotlightOverlay.classList.contains('show')) closeSpotlight();
      else openSpotlight();
      return;
    }

    // #2 Cmd+Q: quit app (close all windows of focused app)
    if (e.metaKey && e.key === 'q' && !e.ctrlKey) {
      e.preventDefault();
      const fw = wm.getFocusedWindow();
      if (fw) {
        const appName = fw.app;
        const appWindows = wm.getWindowsByApp(appName);
        [...appWindows].forEach(w => wm.closeWindow(w.id));
      }
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

    // #6 Cmd+R: refresh Finder
    if (e.metaKey && e.key === 'r') {
      e.preventDefault();
      const fw = wm.getFocusedWindow();
      if (fw && fw.app === 'finder' && fw.refresh) fw.refresh();
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

    // #13 Cmd+F3: Show Desktop toggle
    if (e.metaKey && e.key === 'F3') {
      e.preventDefault();
      toggleShowDesktop();
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
      // #7 Escape closes focused window if no overlays are open
      const fw = wm.getFocusedWindow();
      if (fw) {
        wm.closeWindow(fw.id);
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


/* ── Lock Screen (Cmd+Ctrl+Q) ── */
function lockScreen() {
  const lock = document.getElementById('lockScreen');
  if (!lock) return;
  lock.classList.add('show');
  updateLockClock();
}

function unlockScreen() {
  const lock = document.getElementById('lockScreen');
  if (lock) lock.classList.remove('show');
}

function updateLockClock() {
  const lock = document.getElementById('lockScreen');
  if (!lock || !lock.classList.contains('show')) return;
  const now = new Date();
  const timeEl = lock.querySelector('.lock-screen-time');
  const dateEl = lock.querySelector('.lock-screen-date');
  if (timeEl) timeEl.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  setTimeout(updateLockClock, 1000);
}

/* ── Desktop Selection Rectangle ── */
function initDesktopSelection() {
  const area = document.getElementById('desktopArea');
  let selecting = false, startX, startY, rect;

  area.addEventListener('mousedown', (e) => {
    // Only start selection on empty desktop area (not on icons or windows)
    if (e.target !== area) return;
    selecting = true;
    startX = e.clientX;
    startY = e.clientY;
    rect = document.createElement('div');
    rect.className = 'selection-rect';
    area.appendChild(rect);
  });

  document.addEventListener('mousemove', (e) => {
    if (!selecting) return;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    const areaRect = area.getBoundingClientRect();
    rect.style.left = (x - areaRect.left) + 'px';
    rect.style.top = (y - areaRect.top) + 'px';
    rect.style.width = w + 'px';
    rect.style.height = h + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (selecting && rect) {
      // #11 Select icons that overlap with the selection rectangle
      const selRect = rect.getBoundingClientRect();
      if (selRect.width > 5 || selRect.height > 5) {
        document.querySelectorAll('.desktop-icon').forEach(icon => {
          if (icon.style.display === 'none') return;
          const iconRect = icon.getBoundingClientRect();
          const overlaps = !(iconRect.right < selRect.left || iconRect.left > selRect.right ||
                            iconRect.bottom < selRect.top || iconRect.top > selRect.bottom);
          if (overlaps) icon.classList.add('selected');
        });
      }
      rect.remove();
      selecting = false;
    }
  });
}

// Initialize desktop selection on load
if (document.getElementById('desktopArea')) {
  initDesktopSelection();
}

/* ── #14 Sort desktop icons ── */
function sortDesktopIcons(criteria) {
  const desktopArea = document.getElementById('desktopArea');
  const icons = Array.from(document.querySelectorAll('.desktop-icon')).filter(i => i.style.display !== 'none');
  // Sort based on criteria
  icons.sort((a, b) => {
    const labelA = (a.querySelector('.desktop-icon-label')?.textContent || '').toLowerCase();
    const labelB = (b.querySelector('.desktop-icon-label')?.textContent || '').toLowerCase();
    const appA = a.dataset.app || '';
    const appB = b.dataset.app || '';
    switch (criteria) {
      case 'name': return labelA.localeCompare(labelB);
      case 'kind': return appA.localeCompare(appB);
      case 'date': return 0; // preserve current order (no date metadata on desktop icons)
      default: return labelA.localeCompare(labelB);
    }
  });
  // Arrange in grid order (top-right, going down then left)
  const areaRect = desktopArea.getBoundingClientRect();
  const gridX = 110, gridY = 110;
  const cols = Math.floor(areaRect.width / gridX);
  let col = cols - 1, row = 0;
  icons.forEach(icon => {
    const x = col * gridX;
    const y = row * gridY + 20;
    icon.style.left = x + 'px';
    icon.style.top = y + 'px';
    icon.style.right = 'auto';
    icon.style.bottom = 'auto';
    row++;
    const maxRows = Math.floor((areaRect.height - 80) / gridY);
    if (row >= maxRows) { row = 0; col--; }
  });
  saveUserSettings();
}

/* ── #15 Dynamic wallpaper ── */
function getDynamicWallpaper() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 8) {
    // Dawn: warm oranges/pinks
    return 'linear-gradient(135deg, #2c1810 0%, #c04e36 40%, #f4845f 70%, #f5a623 100%)';
  } else if (hour >= 8 && hour < 17) {
    // Day: light blues
    return 'linear-gradient(135deg, #2980b9 0%, #6dd5fa 50%, #a8e6cf 100%)';
  } else if (hour >= 17 && hour < 20) {
    // Dusk: purples/oranges
    return 'linear-gradient(135deg, #2c1654 0%, #7b2d8b 30%, #d4507a 60%, #f09819 100%)';
  } else {
    // Night: current dark blues (default)
    return 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
  }
}

function applyDynamicWallpaper() {
  if (customWallpaper) return; // Don't override custom wallpaper
  const desktop = document.getElementById('desktop');
  if (!desktop) return;
  desktop.style.background = getDynamicWallpaper();
  desktop.style.backgroundImage = '';
}

// Check dynamic wallpaper every 30 minutes
setInterval(() => {
  if (!customWallpaper) applyDynamicWallpaper();
}, 30 * 60 * 1000);

/* ── #88 Export desktop state ── */
async function exportDesktopState() {
  if (!currentUser) return;
  const key = currentUser.email.replace(/[.@]/g, '_');
  // Collect all state
  const iconPositions = {};
  document.querySelectorAll('.desktop-icon').forEach(icon => {
    const app = icon.dataset.app;
    if (app) {
      iconPositions[app] = {
        left: icon.style.left,
        top: icon.style.top,
        label: icon.querySelector('.desktop-icon-label')?.textContent || app,
      };
    }
  });

  const openWindows = wm.getAllWindows().map(w => ({
    app: w.app,
    title: w.title,
    x: parseInt(w.element.style.left) || 0,
    y: parseInt(w.element.style.top) || 0,
    width: parseInt(w.element.style.width) || 850,
    height: parseInt(w.element.style.height) || 550,
  }));

  const dockConfig = Array.from(document.querySelectorAll('.dock-item')).map(item => item.dataset.app).filter(Boolean);

  const state = {
    iconPositions,
    openWindows,
    wallpaperIndex: wallIdx,
    customWallpaper: customWallpaper || null,
    dockConfig,
    fontSize: localStorage.getItem('space-font-size') || '14',
    timestamp: new Date().toISOString(),
  };

  // Save to Firebase
  try {
    await fetch(`${FB_DB}/desktop-state/${key}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    alert('Desktop state saved successfully!');
  } catch (e) {
    alert('Failed to save: ' + e.message);
  }
}

/* ── #89 Import/export settings (used by System Preferences) ── */
function exportSettingsAsFile() {
  if (!currentUser) return;
  const key = currentUser.email.replace(/[.@]/g, '_');
  fetch(`${FB_DB}/desktop-state/${key}.json`)
    .then(r => r.json())
    .then(data => {
      // Also include localStorage settings
      const allSettings = {
        firebase: data || {},
        localStorage: {
          'space-font-size': localStorage.getItem('space-font-size'),
        },
        exportDate: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(allSettings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `internal-space-settings-${key}.json`;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(e => alert('Export failed: ' + e.message));
}

function importSettingsFromFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.addEventListener('change', async () => {
    if (!input.files.length) return;
    try {
      const text = await input.files[0].text();
      const allSettings = JSON.parse(text);
      if (!currentUser) { alert('Not logged in'); return; }
      const key = currentUser.email.replace(/[.@]/g, '_');
      // Write Firebase settings
      if (allSettings.firebase) {
        await fetch(`${FB_DB}/desktop-state/${key}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(allSettings.firebase),
        });
      }
      // Write localStorage settings
      if (allSettings.localStorage) {
        Object.entries(allSettings.localStorage).forEach(([k, v]) => {
          if (v != null) localStorage.setItem(k, v);
        });
      }
      alert('Settings imported! Reloading...');
      location.reload();
    } catch (e) {
      alert('Import failed: ' + e.message);
    }
  });
  input.click();
}

/* ── #12 Load wallpaper images from Firebase Storage ── */
async function loadFirebaseWallpapers() {
  try {
    const r = await fetch(`${FB_STORAGE}/o?prefix=images/&maxResults=50`);
    const data = await r.json();
    const images = (data.items || []).filter(i =>
      (i.contentType || '').startsWith('image/')
    );
    return images.map(i => ({
      name: i.name,
      url: `${FB_STORAGE}/o/${encodeURIComponent(i.name)}?alt=media`,
    }));
  } catch { return []; }
}

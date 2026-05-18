/* ═══════════════════════════════════════
   Internal Space — Finder File Manager
   ═══════════════════════════════════════ */

/* Clipboard for copy/paste */
let finderClipboard = null;

function openFinderWindow(initialPath) {
  const path = initialPath || '';

  const win = wm.createWindow({
    title: 'Finder',
    app: 'finder',
    width: 850,
    height: 550,
    buildContent: (container, w) => {
      buildFinderUI(container, w, path);
    }
  });

  return win;
}

function buildFinderUI(container, win, initialPath) {
  /* ── Finder state ── */
  let currentPath = initialPath || '';
  let fileList = [];
  let selectedFile = null;
  let selectedIndex = -1;
  let viewMode = 'icons'; // 'icons' | 'list' | 'columns'
  let sortBy = 'name';
  let sortDesc = false;
  let showPathBar = false;
  let history = [currentPath];
  let historyIdx = 0;

  /* ── Tabs state ── */
  let tabs = [{ path: currentPath, label: 'Root' }];
  let activeTab = 0;

  /* ── DOM ── */
  container.innerHTML = `
    <div class="finder-toolbar">
      <button class="finder-tb-btn btn-back"><i class="fas fa-chevron-left"></i></button>
      <button class="finder-tb-btn btn-forward" disabled style="opacity:0.4;"><i class="fas fa-chevron-right"></i></button>
      <button class="finder-tb-btn btn-upload"><i class="fas fa-upload"></i> Upload</button>
      <button class="finder-tb-btn btn-newfolder"><i class="fas fa-folder-plus"></i> New Folder</button>
      <button class="finder-tb-btn btn-delete" style="display:none;"><i class="fas fa-trash"></i> Delete</button>
      <div style="flex:1;"></div>
      <button class="finder-tb-btn btn-view-icons active" title="Icon view"><i class="fas fa-th-large"></i></button>
      <button class="finder-tb-btn btn-view-list" title="List view"><i class="fas fa-list"></i></button>
      <button class="finder-tb-btn btn-view-cols" title="Column view"><i class="fas fa-columns"></i></button>
      <div class="finder-path"></div>
    </div>
    <div class="finder-tab-bar"></div>
    <div class="finder-body">
      <div class="finder-sidebar">
        <div class="finder-sb-title">Favorites</div>
        <div class="finder-sb-item active" data-path=""><i class="fas fa-hdd" style="color:#8e8e93;"></i> Root</div>
        <div class="finder-sb-item" data-path="images/travel/"><i class="fas fa-plane" style="color:#32ade6;"></i> Travel</div>
        <div class="finder-sb-item" data-path="images/pet/"><i class="fas fa-paw" style="color:#ff9f0a;"></i> Pets</div>
      </div>
      <div class="finder-main-area" style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
        <div class="finder-files"></div>
      </div>
    </div>
    <div class="finder-pathbar" style="display:none;"></div>
    <div class="finder-status"><span>Loading...</span></div>
  `;

  const toolbar = container.querySelector('.finder-toolbar');
  const tabBar = container.querySelector('.finder-tab-bar');
  const sidebar = container.querySelector('.finder-sidebar');
  const mainArea = container.querySelector('.finder-main-area');
  const filesEl = container.querySelector('.finder-files');
  const statusEl = container.querySelector('.finder-status span');
  const pathEl = toolbar.querySelector('.finder-path');
  const pathBarEl = container.querySelector('.finder-pathbar');
  const btnBack = toolbar.querySelector('.btn-back');
  const btnForward = toolbar.querySelector('.btn-forward');
  const btnUpload = toolbar.querySelector('.btn-upload');
  const btnNewFolder = toolbar.querySelector('.btn-newfolder');
  const btnDelete = toolbar.querySelector('.btn-delete');
  const btnViewIcons = toolbar.querySelector('.btn-view-icons');
  const btnViewList = toolbar.querySelector('.btn-view-list');
  const btnViewCols = toolbar.querySelector('.btn-view-cols');

  /* ── Expose methods on window object ── */
  win.navigateTo = navigateTo;
  win.goBack = goBack;
  win.setViewMode = setView;
  win.togglePathBar = togglePathBar;
  win.handleArrowKey = handleArrowKey;
  win.quickLook = quickLook;
  win.quickLookNav = quickLookNav;
  win.deleteSelected = deleteSelected;
  win.renameSelected = startRename;
  win.copySelected = copySelected;
  win.pasteFiles = pasteFiles;
  win.selectAll = selectAll;
  win.createFolder = createFolder;
  win.addTab = addTab;

  /* ── Navigation ── */
  async function navigateTo(path) {
    currentPath = path;
    selectedFile = null;
    selectedIndex = -1;
    btnDelete.style.display = 'none';
    filesEl.innerHTML = '<div class="finder-empty"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    // Update title
    const folderName = path ? path.replace(/\/$/, '').split('/').pop() : 'Firebase Storage';
    win.title = folderName;
    win.element.querySelector('.window-title').textContent = folderName;
    if (wm.getFocusedWindow() === win) {
      document.getElementById('menuAppName').textContent = 'Finder';
    }

    // Update breadcrumb path
    const parts = path ? path.replace(/\/$/, '').split('/') : [];
    pathEl.innerHTML = '<span data-p="">Root</span>' +
      parts.map((p, i) => ` / <span data-p="${parts.slice(0, i + 1).join('/')}/">${p}</span>`).join('');
    pathEl.querySelectorAll('span').forEach(s => {
      s.addEventListener('click', () => navigateTo(s.dataset.p));
    });

    // Update sidebar active
    sidebar.querySelectorAll('.finder-sb-item').forEach(i => {
      i.classList.toggle('active', i.dataset.path === path);
    });

    // Update path bar
    updatePathBar();

    // Update tab label
    if (tabs[activeTab]) {
      tabs[activeTab].path = path;
      tabs[activeTab].label = folderName || 'Root';
      renderTabs();
    }

    // Add to history
    if (history[historyIdx] !== path) {
      history = history.slice(0, historyIdx + 1);
      history.push(path);
      historyIdx = history.length - 1;
    }
    updateNavButtons();

    try {
      const r = await fetch(`${FB_STORAGE}/o?prefix=${path}&delimiter=/`);
      const data = await r.json();

      const folders = (data.prefixes || []).map(p => ({
        type: 'folder', name: p.replace(path, '').replace(/\/$/, ''),
        path: p,
      }));
      const files = (data.items || []).filter(i => i.name !== path).map(i => ({
        type: 'file', name: i.name.replace(path, ''),
        path: i.name, size: parseInt(i.size || 0),
        contentType: i.contentType || '',
        updated: i.updated || '',
        url: `${FB_STORAGE}/o/${encodeURIComponent(i.name)}?alt=media`,
      }));

      fileList = [...folders, ...files];
      sortFiles();
      renderFiles();
    } catch (e) {
      filesEl.innerHTML = `<div class="finder-empty">Failed to load: ${e.message}</div>`;
    }
  }

  function goBack() {
    if (historyIdx > 0) {
      historyIdx--;
      navigateTo(history[historyIdx]);
    }
  }

  function goForward() {
    if (historyIdx < history.length - 1) {
      historyIdx++;
      navigateTo(history[historyIdx]);
    }
  }

  function updateNavButtons() {
    btnBack.disabled = historyIdx <= 0;
    btnBack.style.opacity = historyIdx <= 0 ? '0.4' : '1';
    btnForward.disabled = historyIdx >= history.length - 1;
    btnForward.style.opacity = historyIdx >= history.length - 1 ? '0.4' : '1';
  }

  /* ── Sorting ── */
  function sortFiles() {
    const folders = fileList.filter(f => f.type === 'folder');
    const files = fileList.filter(f => f.type === 'file');

    const sorter = (a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'date': cmp = (a.updated || '').localeCompare(b.updated || ''); break;
        case 'size': cmp = (a.size || 0) - (b.size || 0); break;
        case 'kind': cmp = (a.contentType || '').localeCompare(b.contentType || ''); break;
      }
      return sortDesc ? -cmp : cmp;
    };

    folders.sort(sorter);
    files.sort(sorter);
    fileList = [...folders, ...files];
  }

  /* ── View modes ── */
  function setView(mode) {
    viewMode = mode;
    btnViewIcons.classList.toggle('active', mode === 'icons');
    btnViewList.classList.toggle('active', mode === 'list');
    btnViewCols.classList.toggle('active', mode === 'columns');
    renderFiles();
  }

  /* ── Render files ── */
  function renderFiles() {
    if (viewMode === 'list') return renderListView();
    if (viewMode === 'columns') return renderColumnView();
    renderIconView();
  }

  function renderIconView() {
    mainArea.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'finder-files';
    mainArea.appendChild(grid);

    if (fileList.length === 0) {
      grid.innerHTML = '<div class="finder-empty"><i class="fas fa-folder-open"></i><br>Empty folder</div>';
      updateStatus();
      return;
    }

    fileList.forEach((f, idx) => {
      const el = document.createElement('div');
      el.className = 'finder-file';
      el.dataset.index = idx;

      if (f.type === 'folder') {
        el.innerHTML = `<div class="finder-file-icon" style="color:#4a90d9;"><i class="fas fa-folder"></i></div><div class="finder-file-name">${f.name}</div>`;
        el.addEventListener('dblclick', () => navigateTo(f.path));
      } else {
        const isImage = f.contentType.startsWith('image/');
        if (isImage) {
          el.innerHTML = `<img class="finder-file-thumb" src="${f.url}" alt="${f.name}"><div class="finder-file-name">${f.name}</div>`;
        } else {
          const icon = f.contentType.includes('pdf') ? 'fa-file-pdf' :
                       f.contentType.includes('text') ? 'fa-file-alt' :
                       f.contentType.includes('json') ? 'fa-file-code' : 'fa-file';
          el.innerHTML = `<div class="finder-file-icon" style="color:#aaa;"><i class="fas ${icon}"></i></div><div class="finder-file-name">${f.name}</div>`;
        }
      }

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        selectFileAt(idx);
      });

      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectFileAt(idx);
        showContextMenu(e.clientX, e.clientY, f);
      });

      // Drag file to sidebar folder
      el.setAttribute('draggable', 'true');
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify(f));
      });

      grid.appendChild(el);
    });

    // Click empty area to deselect
    grid.addEventListener('click', (e) => {
      if (e.target === grid) deselectAll();
    });

    // Drop to upload
    grid.addEventListener('dragover', e => { e.preventDefault(); grid.classList.add('dragover'); });
    grid.addEventListener('dragleave', () => grid.classList.remove('dragover'));
    grid.addEventListener('drop', (e) => handleDrop(e, grid));

    updateStatus();
  }

  function renderListView() {
    mainArea.innerHTML = '';
    const listView = document.createElement('div');
    listView.className = 'finder-list-view';

    const header = document.createElement('div');
    header.className = 'list-header';
    const cols = [
      { key: 'name', label: 'Name' },
      { key: 'date', label: 'Date Modified' },
      { key: 'size', label: 'Size' },
      { key: 'kind', label: 'Kind' },
    ];
    cols.forEach(c => {
      const sp = document.createElement('span');
      sp.textContent = c.label;
      if (sortBy === c.key) {
        sp.classList.add('sorted');
        if (sortDesc) sp.classList.add('desc');
      }
      sp.addEventListener('click', () => {
        if (sortBy === c.key) sortDesc = !sortDesc;
        else { sortBy = c.key; sortDesc = false; }
        sortFiles();
        renderFiles();
      });
      header.appendChild(sp);
    });
    listView.appendChild(header);

    const rows = document.createElement('div');
    rows.className = 'list-rows';

    fileList.forEach((f, idx) => {
      const row = document.createElement('div');
      row.className = 'list-row';
      row.dataset.index = idx;

      const nameIcon = f.type === 'folder' ? '<i class="fas fa-folder" style="color:#4a90d9;"></i>' :
        `<i class="fas ${f.contentType.includes('image') ? 'fa-image' : f.contentType.includes('pdf') ? 'fa-file-pdf' : 'fa-file'}" style="color:#aaa;"></i>`;

      const date = f.updated ? new Date(f.updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '--';
      const size = f.type === 'folder' ? '--' : formatSize(f.size);
      const kind = f.type === 'folder' ? 'Folder' : (f.contentType || 'File').split('/').pop();

      row.innerHTML = `<div class="name-cell">${nameIcon} ${f.name}</div><div>${date}</div><div>${size}</div><div>${kind}</div>`;

      row.addEventListener('click', (e) => { e.stopPropagation(); selectFileAt(idx); });
      row.addEventListener('dblclick', () => { if (f.type === 'folder') navigateTo(f.path); });
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault(); e.stopPropagation();
        selectFileAt(idx);
        showContextMenu(e.clientX, e.clientY, f);
      });

      rows.appendChild(row);
    });

    listView.appendChild(rows);
    mainArea.appendChild(listView);

    // Click to deselect
    rows.addEventListener('click', (e) => { if (e.target === rows) deselectAll(); });
    updateStatus();
  }

  function renderColumnView() {
    mainArea.innerHTML = '';
    const colView = document.createElement('div');
    colView.className = 'finder-column-view';

    function buildColumn(path, depth) {
      const col = document.createElement('div');
      col.className = 'finder-column';
      col.dataset.depth = depth;

      fetch(`${FB_STORAGE}/o?prefix=${path}&delimiter=/`)
        .then(r => r.json())
        .then(data => {
          const folders = (data.prefixes || []).map(p => ({
            type: 'folder', name: p.replace(path, '').replace(/\/$/, ''), path: p,
          }));
          const files = (data.items || []).filter(i => i.name !== path).map(i => ({
            type: 'file', name: i.name.replace(path, ''), path: i.name,
            contentType: i.contentType || '',
            url: `${FB_STORAGE}/o/${encodeURIComponent(i.name)}?alt=media`,
          }));

          [...folders, ...files].forEach(f => {
            const item = document.createElement('div');
            item.className = 'finder-column-item';
            const icon = f.type === 'folder' ? 'fa-folder' :
              f.contentType.includes('image') ? 'fa-image' : 'fa-file';
            item.innerHTML = `<i class="fas ${icon}" style="color:${f.type === 'folder' ? '#4a90d9' : '#aaa'};"></i> ${f.name}`;
            if (f.type === 'folder') {
              item.innerHTML += '<span class="col-arrow"><i class="fas fa-chevron-right"></i></span>';
            }
            item.addEventListener('click', (e) => {
              e.stopPropagation();
              col.querySelectorAll('.finder-column-item').forEach(i => i.classList.remove('selected'));
              item.classList.add('selected');
              selectedFile = f;
              // Remove columns after this depth
              const allCols = colView.querySelectorAll('.finder-column');
              allCols.forEach(c => { if (parseInt(c.dataset.depth) > depth) c.remove(); });
              if (f.type === 'folder') {
                buildColumn(f.path, depth + 1);
              }
            });
            col.appendChild(item);
          });
        });

      colView.appendChild(col);
    }

    // Build initial columns from root to current path
    const pathParts = currentPath ? currentPath.replace(/\/$/, '').split('/') : [];
    buildColumn('', 0);
    let buildPath = '';
    pathParts.forEach((p, i) => {
      buildPath += p + '/';
      buildColumn(buildPath, i + 1);
    });

    mainArea.appendChild(colView);
    updateStatus();
  }

  /* ── Selection ── */
  function selectFileAt(idx) {
    selectedIndex = idx;
    selectedFile = fileList[idx] || null;
    btnDelete.style.display = selectedFile && selectedFile.type === 'file' ? '' : 'none';

    // Update visual selection
    const allFiles = mainArea.querySelectorAll('.finder-file, .list-row, .finder-column-item');
    allFiles.forEach(el => el.classList.remove('selected'));
    const target = mainArea.querySelector(`[data-index="${idx}"]`);
    if (target) target.classList.add('selected');
  }

  function deselectAll() {
    selectedFile = null;
    selectedIndex = -1;
    btnDelete.style.display = 'none';
    mainArea.querySelectorAll('.finder-file, .list-row, .finder-column-item').forEach(el => el.classList.remove('selected'));
  }

  function selectAll() {
    mainArea.querySelectorAll('.finder-file, .list-row').forEach(el => el.classList.add('selected'));
  }

  /* ── Arrow key navigation ── */
  function handleArrowKey(key) {
    if (fileList.length === 0) return;
    if (key === 'ArrowDown' || key === 'ArrowRight') {
      selectedIndex = Math.min(selectedIndex + 1, fileList.length - 1);
    } else if (key === 'ArrowUp' || key === 'ArrowLeft') {
      selectedIndex = Math.max(selectedIndex - 1, 0);
    }
    selectFileAt(selectedIndex);
    // Scroll into view
    const target = mainArea.querySelector(`[data-index="${selectedIndex}"]`);
    if (target) target.scrollIntoView({ block: 'nearest' });
  }

  /* ── Quick Look ── */
  function quickLook() {
    if (!selectedFile || !selectedFile.contentType) return;
    if (selectedFile.contentType.startsWith('image/')) {
      document.getElementById('qlImage').src = selectedFile.url;
      document.getElementById('qlName').textContent = selectedFile.name;
      document.getElementById('quicklook').classList.add('show');
    }
  }

  function quickLookNav(key) {
    if (!document.getElementById('quicklook').classList.contains('show')) return;
    const images = fileList.filter(f => f.contentType && f.contentType.startsWith('image/'));
    if (images.length === 0) return;
    let curIdx = images.findIndex(f => f.name === selectedFile?.name);
    if (curIdx === -1) curIdx = 0;

    if (key === 'ArrowRight' || key === 'ArrowDown') curIdx = (curIdx + 1) % images.length;
    else if (key === 'ArrowLeft' || key === 'ArrowUp') curIdx = (curIdx - 1 + images.length) % images.length;

    const img = images[curIdx];
    selectedFile = img;
    document.getElementById('qlImage').src = img.url;
    document.getElementById('qlName').textContent = img.name;
  }

  /* ── Context menu ── */
  function showContextMenu(x, y, file) {
    const ctx = document.getElementById('contextMenu');
    ctx.style.left = x + 'px';
    ctx.style.top = y + 'px';
    ctx.classList.add('show');

    // Rebind handlers
    document.getElementById('ctxDownload').onclick = () => {
      if (file && file.url) {
        const a = document.createElement('a');
        a.href = file.url; a.download = file.name; a.target = '_blank'; a.click();
      }
    };
    document.getElementById('ctxDelete').onclick = () => deleteFile(file);
    document.getElementById('ctxCopyFile').onclick = () => {
      finderClipboard = { file, sourcePath: currentPath };
    };
    document.getElementById('ctxRename').onclick = () => startRename();
  }

  /* ── File operations ── */
  async function deleteFile(file) {
    if (!file) return;
    if (!confirm(`Delete "${file.name}"?`)) return;
    statusEl.textContent = `Deleting ${file.name}...`;
    try {
      await fetch(`${FB_STORAGE}/o/${encodeURIComponent(file.path)}`, { method: 'DELETE' });
      navigateTo(currentPath);
    } catch (e) {
      statusEl.textContent = `Delete failed: ${e.message}`;
    }
  }

  function deleteSelected() {
    if (selectedFile && selectedFile.type === 'file') deleteFile(selectedFile);
  }

  /* ── Rename ── */
  function startRename() {
    if (!selectedFile) return;
    const fileEl = mainArea.querySelector(`[data-index="${selectedIndex}"]`);
    if (!fileEl) return;
    const nameEl = fileEl.querySelector('.finder-file-name');
    if (!nameEl) return;

    const oldName = selectedFile.name;
    const input = document.createElement('input');
    input.className = 'finder-file-name-input';
    input.value = oldName;
    nameEl.replaceWith(input);
    input.focus();
    input.select();

    const finish = async () => {
      const newName = input.value.trim();
      if (newName && newName !== oldName && selectedFile.type === 'file') {
        statusEl.textContent = `Renaming ${oldName} to ${newName}...`;
        try {
          // Download old file, upload with new name, delete old
          const resp = await fetch(selectedFile.url);
          const blob = await resp.blob();
          const newPath = currentPath + newName;
          await fetch(`${FB_STORAGE}/o?uploadType=media&name=${encodeURIComponent(newPath)}`, {
            method: 'POST',
            headers: { 'Content-Type': selectedFile.contentType || 'application/octet-stream' },
            body: blob,
          });
          await fetch(`${FB_STORAGE}/o/${encodeURIComponent(selectedFile.path)}`, { method: 'DELETE' });
          navigateTo(currentPath);
        } catch (e) {
          statusEl.textContent = `Rename failed: ${e.message}`;
          navigateTo(currentPath);
        }
      } else {
        navigateTo(currentPath);
      }
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(); }
      if (e.key === 'Escape') { navigateTo(currentPath); }
      e.stopPropagation();
    });
    input.addEventListener('blur', finish);
  }

  /* ── Copy / Paste ── */
  function copySelected() {
    if (selectedFile) {
      finderClipboard = { file: selectedFile, sourcePath: currentPath };
      statusEl.textContent = `Copied "${selectedFile.name}"`;
    }
  }

  async function pasteFiles() {
    if (!finderClipboard || !finderClipboard.file) return;
    const f = finderClipboard.file;
    if (f.type !== 'file') return;
    statusEl.textContent = `Copying ${f.name}...`;
    try {
      const resp = await fetch(f.url);
      const blob = await resp.blob();
      const newPath = currentPath + f.name;
      await fetch(`${FB_STORAGE}/o?uploadType=media&name=${encodeURIComponent(newPath)}`, {
        method: 'POST',
        headers: { 'Content-Type': f.contentType || 'application/octet-stream' },
        body: blob,
      });
      navigateTo(currentPath);
    } catch (e) {
      statusEl.textContent = `Paste failed: ${e.message}`;
    }
  }

  /* ── Upload ── */
  const fileInput = document.getElementById('fileInput');

  btnUpload.addEventListener('click', () => {
    // Create a fresh file input each time for this Finder window
    const fi = document.getElementById('fileInput');
    fi.onchange = async () => {
      for (const file of fi.files) {
        const uploadPath = currentPath + file.name;
        statusEl.textContent = `Uploading ${file.name}...`;
        try {
          await fetch(`${FB_STORAGE}/o?uploadType=media&name=${encodeURIComponent(uploadPath)}`, {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
          });
        } catch (e) {
          statusEl.textContent = `Upload failed: ${e.message}`;
        }
      }
      fi.value = '';
      navigateTo(currentPath);
    };
    fi.click();
  });

  /* ── Drop handler ── */
  async function handleDrop(e, grid) {
    e.preventDefault();
    grid.classList.remove('dragover');

    // Check if it's a file from another folder (internal drag)
    const dragData = e.dataTransfer.getData('text/plain');
    if (dragData) {
      try {
        const f = JSON.parse(dragData);
        if (f.type === 'file' && f.url) {
          statusEl.textContent = `Moving ${f.name}...`;
          const resp = await fetch(f.url);
          const blob = await resp.blob();
          const newPath = currentPath + f.name;
          await fetch(`${FB_STORAGE}/o?uploadType=media&name=${encodeURIComponent(newPath)}`, {
            method: 'POST',
            headers: { 'Content-Type': f.contentType || 'application/octet-stream' },
            body: blob,
          });
          // Delete old
          await fetch(`${FB_STORAGE}/o/${encodeURIComponent(f.path)}`, { method: 'DELETE' });
          navigateTo(currentPath);
          return;
        }
      } catch {}
    }

    // External file drop (from OS)
    for (const file of e.dataTransfer.files) {
      const uploadPath = currentPath + file.name;
      statusEl.textContent = `Uploading ${file.name}...`;
      await fetch(`${FB_STORAGE}/o?uploadType=media&name=${encodeURIComponent(uploadPath)}`, {
        method: 'POST', headers: { 'Content-Type': file.type }, body: file,
      });
    }
    navigateTo(currentPath);
  }

  /* ── New Folder ── */
  async function createFolder() {
    const name = prompt('New folder name:');
    if (!name) return;
    // Create a placeholder file inside the folder
    const folderPath = currentPath + name + '/.placeholder';
    await fetch(`${FB_STORAGE}/o?uploadType=media&name=${encodeURIComponent(folderPath)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: '',
    });
    navigateTo(currentPath);
  }

  btnNewFolder.addEventListener('click', createFolder);

  /* ── Delete button ── */
  btnDelete.addEventListener('click', () => deleteSelected());

  /* ── Navigation buttons ── */
  btnBack.addEventListener('click', goBack);
  btnForward.addEventListener('click', goForward);

  /* ── Sidebar navigation ── */
  sidebar.querySelectorAll('.finder-sb-item').forEach(item => {
    item.addEventListener('click', () => {
      navigateTo(item.dataset.path);
    });
    // Allow drop on sidebar items to move files
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      item.style.background = 'rgba(100,100,255,0.2)';
    });
    item.addEventListener('dragleave', () => {
      item.style.background = '';
    });
    item.addEventListener('drop', async (e) => {
      e.preventDefault();
      item.style.background = '';
      const dragData = e.dataTransfer.getData('text/plain');
      if (dragData) {
        try {
          const f = JSON.parse(dragData);
          if (f.type === 'file' && f.url) {
            const targetPath = item.dataset.path + f.name;
            statusEl.textContent = `Moving ${f.name}...`;
            const resp = await fetch(f.url);
            const blob = await resp.blob();
            await fetch(`${FB_STORAGE}/o?uploadType=media&name=${encodeURIComponent(targetPath)}`, {
              method: 'POST',
              headers: { 'Content-Type': f.contentType || 'application/octet-stream' },
              body: blob,
            });
            await fetch(`${FB_STORAGE}/o/${encodeURIComponent(f.path)}`, { method: 'DELETE' });
            navigateTo(currentPath);
          }
        } catch {}
      }
    });
  });

  /* ── View mode buttons ── */
  btnViewIcons.addEventListener('click', () => setView('icons'));
  btnViewList.addEventListener('click', () => setView('list'));
  btnViewCols.addEventListener('click', () => setView('columns'));

  /* ── Path bar ── */
  function togglePathBar() {
    showPathBar = !showPathBar;
    pathBarEl.style.display = showPathBar ? 'flex' : 'none';
    updatePathBar();
  }

  function updatePathBar() {
    if (!showPathBar) return;
    const parts = currentPath ? currentPath.replace(/\/$/, '').split('/') : [];
    pathBarEl.innerHTML = '<i class="fas fa-hdd" style="font-size:0.55rem;color:rgba(255,255,255,0.3);"></i> ';
    pathBarEl.innerHTML += `<span data-p="">Root</span>`;
    parts.forEach((p, i) => {
      pathBarEl.innerHTML += `<span class="pathbar-sep">/</span><span data-p="${parts.slice(0, i + 1).join('/')}/">${p}</span>`;
    });
    pathBarEl.querySelectorAll('span[data-p]').forEach(s => {
      s.addEventListener('click', () => navigateTo(s.dataset.p));
    });
  }

  /* ── Tabs ── */
  function addTab() {
    tabs.push({ path: '', label: 'Root' });
    activeTab = tabs.length - 1;
    renderTabs();
    navigateTo('');
  }

  function renderTabs() {
    if (tabs.length <= 1) {
      tabBar.innerHTML = '';
      return;
    }
    tabBar.innerHTML = '';
    tabs.forEach((tab, i) => {
      const el = document.createElement('div');
      el.className = 'finder-tab' + (i === activeTab ? ' active' : '');
      el.innerHTML = `<span>${tab.label || 'Root'}</span><div class="finder-tab-close"><i class="fas fa-times"></i></div>`;
      el.addEventListener('click', (e) => {
        if (e.target.closest('.finder-tab-close')) {
          tabs.splice(i, 1);
          if (activeTab >= tabs.length) activeTab = tabs.length - 1;
          if (tabs.length === 0) { tabs = [{ path: '', label: 'Root' }]; activeTab = 0; }
          renderTabs();
          navigateTo(tabs[activeTab].path);
          return;
        }
        activeTab = i;
        renderTabs();
        navigateTo(tab.path);
      });
      tabBar.appendChild(el);
    });
  }

  /* ── Status bar ── */
  function updateStatus() {
    const fileCount = fileList.filter(f => f.type === 'file').length;
    const folderCount = fileList.filter(f => f.type === 'folder').length;
    statusEl.textContent = `${folderCount ? folderCount + ' folder' + (folderCount > 1 ? 's' : '') + ', ' : ''}${fileCount} file${fileCount !== 1 ? 's' : ''}`;
  }

  /* ── Helper ── */
  function formatSize(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return size.toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
  }

  /* ── Initialize ── */
  navigateTo(currentPath);
}

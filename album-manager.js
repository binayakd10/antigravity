/**
 * Binayak Dhakal — Royal Trekking Album Engine (v6)
 * - Full Permanent Media Deletion & Exclusion Control across all assets
 * - Custom DOM Modals for Owner Access & Delete Confirmation
 * - Pure Binary Blob HTML5 Video Streaming & Inline Controls
 * - Restore & Media Management Controls
 */

class TrekkingAlbumManager {
  constructor(albumKey, albumTitle) {
    this.albumKey = albumKey; // 'north_abc' or 'dhorpatan'
    this.albumTitle = albumTitle;
    this.dbName = 'BinayakTrekkingAlbumsDB_v6';
    this.dbVersion = 1;
    this.db = null;
    this.ownerPin = 'Bam';
    this.isOwner = localStorage.getItem('binayak_album_admin') === 'true' || sessionStorage.getItem('binayak_album_admin') === 'true';
    this.removedKeys = new Set(JSON.parse(localStorage.getItem('binayak_removed_media_' + this.albumKey) || '[]'));
    this.currentFilter = 'all';
    this.cachedItems = [];
    this.blobUrls = new Map();
    this.activeLightboxIndex = -1;
    this.pendingDeleteId = null;
    this.init();
  }

  async init() {
    await this.openDatabase();
    this.bindDOM();
    this.bindCustomModals();
    this.updateOwnerUI();
    this.loadMedia();
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('album_media')) {
          const store = db.createObjectStore('album_media', { keyPath: 'id', autoIncrement: true });
          store.createIndex('albumKey', 'albumKey', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.error('IndexedDB open error:', e);
        resolve(null);
      };
    });
  }

  bindDOM() {
    this.fileInput = document.getElementById('album-file-input');
    this.dropzone = document.getElementById('album-dropzone');
    this.captionInput = document.getElementById('album-caption-input');
    this.locationInput = document.getElementById('album-location-input');
    this.uploaderSection = document.getElementById('album-uploader-section');
    this.galleryContainer = document.getElementById('dynamic-gallery-grid');
    this.emptyState = document.getElementById('gallery-empty-state');
    this.mediaCountBadge = document.getElementById('user-media-count');
    this.ownerAuthBtn = document.getElementById('btn-owner-auth');
    this.filterButtons = document.querySelectorAll('.gallery-filter-btn');

    // Lightbox modal elements
    this.lightbox = document.getElementById('album-lightbox');
    this.lightboxMediaContainer = document.getElementById('lightbox-media-container');
    this.lightboxCaption = document.getElementById('lightbox-caption');
    this.lightboxMeta = document.getElementById('lightbox-meta');
    this.lightboxClose = document.getElementById('lightbox-close');
    this.lightboxPrev = document.getElementById('lightbox-prev');
    this.lightboxNext = document.getElementById('lightbox-next');
    this.lightboxDelete = document.getElementById('lightbox-delete');
    this.lightboxDownload = document.getElementById('lightbox-download');

    // Filter Buttons
    if (this.filterButtons) {
      this.filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          this.filterButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentFilter = btn.getAttribute('data-filter') || 'all';
          this.renderGallery(this.cachedItems);
        });
      });
    }

    // Owner Auth Button (In Top Bar)
    if (this.ownerAuthBtn) {
      this.ownerAuthBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.isOwner) {
          this.logoutOwner();
        } else {
          this.openOwnerModal();
        }
      });
    }

    if (this.dropzone && this.fileInput) {
      this.dropzone.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
        this.fileInput.click();
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        this.dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropzone.classList.add('drag-over');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        this.dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropzone.classList.remove('drag-over');
        });
      });

      this.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropzone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          this.handleFiles(files);
        }
      });

      this.fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
          this.handleFiles(files);
        }
      });
    }

    // Lightbox Controls
    if (this.lightboxClose && this.lightbox) {
      this.lightboxClose.addEventListener('click', () => this.closeLightbox());
      this.lightbox.addEventListener('click', (e) => {
        if (e.target === this.lightbox) this.closeLightbox();
      });
      document.addEventListener('keydown', (e) => {
        if (!this.lightbox.classList.contains('is-active')) return;
        if (e.key === 'Escape') this.closeLightbox();
        if (e.key === 'ArrowLeft') this.navLightbox(-1);
        if (e.key === 'ArrowRight') this.navLightbox(1);
      });
    }

    if (this.lightboxPrev) this.lightboxPrev.addEventListener('click', () => this.navLightbox(-1));
    if (this.lightboxNext) this.lightboxNext.addEventListener('click', () => this.navLightbox(1));
    if (this.lightboxDelete) {
      this.lightboxDelete.addEventListener('click', (e) => {
        e.preventDefault();
        const currentItem = this.getVisibleItems()[this.activeLightboxIndex];
        if (currentItem) {
          this.openDeleteModal(currentItem.id);
        }
      });
    }
  }

  /* --------------------------------------------------------------------------
     Custom Modal Dialog Controls
     -------------------------------------------------------------------------- */
  bindCustomModals() {
    this.ownerModal = document.getElementById('owner-auth-modal');
    this.ownerPasscodeInput = document.getElementById('owner-passcode-input');
    this.submitOwnerBtn = document.getElementById('submit-owner-btn');
    this.cancelOwnerBtn = document.getElementById('cancel-owner-btn');
    this.closeOwnerModalBtn = document.getElementById('close-owner-modal-btn');

    if (this.submitOwnerBtn) {
      this.submitOwnerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.processOwnerLogin();
      });
    }

    if (this.ownerPasscodeInput) {
      this.ownerPasscodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.processOwnerLogin();
        }
      });
    }

    if (this.cancelOwnerBtn) {
      this.cancelOwnerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeOwnerModal();
      });
    }

    if (this.closeOwnerModalBtn) {
      this.closeOwnerModalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeOwnerModal();
      });
    }

    if (this.ownerModal) {
      this.ownerModal.addEventListener('click', (e) => {
        if (e.target === this.ownerModal) this.closeOwnerModal();
      });
    }

    this.deleteModal = document.getElementById('delete-confirm-modal');
    this.confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    this.cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    this.closeDeleteModalBtn = document.getElementById('close-delete-modal-btn');

    if (this.confirmDeleteBtn) {
      this.confirmDeleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.pendingDeleteId !== null) {
          this.executeDeleteItem(this.pendingDeleteId);
          this.closeDeleteModal();
          this.closeLightbox();
        }
      });
    }

    if (this.cancelDeleteBtn) {
      this.cancelDeleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeDeleteModal();
      });
    }

    if (this.closeDeleteModalBtn) {
      this.closeDeleteModalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.closeDeleteModal();
      });
    }

    if (this.deleteModal) {
      this.deleteModal.addEventListener('click', (e) => {
        if (e.target === this.deleteModal) this.closeDeleteModal();
      });
    }
  }

  openOwnerModal() {
    if (!this.ownerModal) return;
    this.ownerModal.classList.add('is-active');
    this.ownerModal.setAttribute('aria-hidden', 'false');
    if (this.ownerPasscodeInput) {
      this.ownerPasscodeInput.value = '';
      setTimeout(() => this.ownerPasscodeInput.focus(), 100);
    }
  }

  closeOwnerModal() {
    if (!this.ownerModal) return;
    this.ownerModal.classList.remove('is-active');
    this.ownerModal.setAttribute('aria-hidden', 'true');
  }

  processOwnerLogin() {
    const val = this.ownerPasscodeInput ? this.ownerPasscodeInput.value.trim().toLowerCase() : '';
    if (val === 'bam' || val === this.ownerPin.toLowerCase()) {
      this.isOwner = true;
      localStorage.setItem('binayak_album_admin', 'true');
      this.closeOwnerModal();
      this.showToastNotification('Owner Access Granted', 'Photo & Video upload and deletion tools are now unlocked.');
      this.updateOwnerUI();
      this.renderGallery(this.cachedItems);
    } else {
      alert('Incorrect passcode. Please try again.');
      if (this.ownerPasscodeInput) this.ownerPasscodeInput.focus();
    }
  }

  logoutOwner() {
    this.isOwner = false;
    localStorage.removeItem('binayak_album_admin');
    sessionStorage.removeItem('binayak_album_admin');
    this.showToastNotification('Owner Mode Locked', 'Switched to Public Visitor view.');
    this.updateOwnerUI();
    this.renderGallery(this.cachedItems);
  }

  openDeleteModal(id) {
    this.pendingDeleteId = id;
    if (!this.deleteModal) {
      if (confirm('Permanently remove this item from the website album?')) {
        this.executeDeleteItem(id);
      }
      return;
    }
    this.deleteModal.classList.add('is-active');
    this.deleteModal.setAttribute('aria-hidden', 'false');
  }

  closeDeleteModal() {
    this.pendingDeleteId = null;
    if (!this.deleteModal) return;
    this.deleteModal.classList.remove('is-active');
    this.deleteModal.setAttribute('aria-hidden', 'true');
  }

  updateOwnerUI() {
    if (this.uploaderSection) {
      this.uploaderSection.style.display = this.isOwner ? 'block' : 'none';
    }

    if (this.ownerAuthBtn) {
      if (this.isOwner) {
        this.ownerAuthBtn.classList.add('unlocked');
        this.ownerAuthBtn.innerHTML = '<i class="fa-solid fa-lock-open"></i> <span>Owner Mode (Click to Lock)</span>';
        this.ownerAuthBtn.title = 'Owner mode active. Click to lock and hide upload/delete controls.';
      } else {
        this.ownerAuthBtn.classList.remove('unlocked');
        this.ownerAuthBtn.innerHTML = '<i class="fa-solid fa-lock"></i> <span>Owner Unlock</span>';
        this.ownerAuthBtn.title = 'Click to enter passcode and add/remove photos & videos.';
      }
    }
  }

  async handleFiles(files) {
    const defaultCaption = this.captionInput ? this.captionInput.value.trim() : '';
    const defaultLocation = this.locationInput ? this.locationInput.value.trim() : '';

    let addedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|avi|mkv|ogg)$/i.test(file.name);
      const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|heic|webp|gif|avif)$/i.test(file.name);

      if (!isImage && !isVideo) {
        alert(`File "${file.name}" is not a recognized photo or video format.`);
        continue;
      }

      try {
        let mime = file.type;
        if (!mime) {
          if (isVideo) {
            if (file.name.toLowerCase().endsWith('.webm')) mime = 'video/webm';
            else if (file.name.toLowerCase().endsWith('.mov')) mime = 'video/mp4';
            else mime = 'video/mp4';
          } else {
            mime = 'image/jpeg';
          }
        }

        const buffer = await file.arrayBuffer();
        const blob = new Blob([buffer], { type: mime });

        const item = {
          albumKey: this.albumKey,
          name: file.name,
          type: isVideo ? 'video' : 'image',
          mimeType: mime,
          blob: blob,
          caption: defaultCaption || file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
          location: defaultLocation || (this.albumKey === 'north_abc' ? 'North ABC • 4,190m' : 'Dhorpatan Reserve • 2,900m'),
          dateAdded: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
          size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
        };

        await this.saveMediaItem(item);
        addedCount++;
      } catch (err) {
        console.error('Failed to process file upload:', err);
      }
    }

    if (addedCount > 0) {
      if (this.captionInput) this.captionInput.value = '';
      if (this.fileInput) this.fileInput.value = '';
      this.showToastNotification('Media Added Successfully', `Added ${addedCount} item(s) to your ${this.albumTitle} album.`);
      this.loadMedia();
    }
  }

  saveMediaItem(item) {
    return new Promise((resolve, reject) => {
      if (!this.db) { resolve(null); return; }
      const transaction = this.db.transaction(['album_media'], 'readwrite');
      const store = transaction.objectStore('album_media');
      const req = store.add(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e);
    });
  }

  async loadMedia() {
    let permanentItems = [];

    // Load permanent items from assets JSON if available
    try {
      const jsonFile = this.albumKey === 'north_abc' ? 'assets/north_abc_media.json' : 'assets/dhorpatan_media.json';
      const res = await fetch(jsonFile);
      if (res.ok) {
        const staticData = await res.json();
        permanentItems = staticData.map((item, idx) => ({
          id: 'perm_' + idx,
          isPermanent: true,
          albumKey: this.albumKey,
          name: item.filename || item.path.split('/').pop(),
          type: item.type,
          mimeType: item.type === 'video' ? 'video/mp4' : 'image/jpeg',
          mediaUrl: item.path,
          caption: item.caption,
          location: item.location || (this.albumKey === 'north_abc' ? 'North ABC • 4,190m' : 'Dhorpatan Reserve • 2,900m'),
          dateAdded: 'Expedition Archive',
          size: item.size || 'HD'
        }));
      }
    } catch (e) {
      console.log('No static JSON found');
    }

    // Load dynamic user uploads from IndexedDB
    let dbItems = [];
    if (this.db) {
      try {
        const transaction = this.db.transaction(['album_media'], 'readonly');
        const store = transaction.objectStore('album_media');
        const index = store.index('albumKey');
        const request = index.getAll(IDBKeyRange.only(this.albumKey));

        dbItems = await new Promise((resolve) => {
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => resolve([]);
        });
      } catch (e) {
        console.warn('Could not read IndexedDB:', e);
      }
    }

    // Revoke previous blob URLs
    this.blobUrls.forEach(url => URL.revokeObjectURL(url));
    this.blobUrls.clear();

    // Create URLs for DB items
    dbItems.forEach(item => {
      if (item.blob) {
        const mime = item.mimeType || (item.type === 'video' ? 'video/mp4' : 'image/jpeg');
        const safeBlob = new Blob([item.blob], { type: mime });
        const url = URL.createObjectURL(safeBlob);
        this.blobUrls.set(item.id, url);
        item.mediaUrl = url;
      }
    });

    // Merge permanent filesystem assets with dynamic uploads, FILTERING OUT any removed items
    const allCombined = [...permanentItems, ...dbItems];
    this.cachedItems = allCombined.filter(item => {
      const isRemoved = this.removedKeys.has(item.name) ||
        this.removedKeys.has(item.mediaUrl) ||
        this.removedKeys.has(String(item.id));
      return !isRemoved;
    });

    this.renderGallery(this.cachedItems);
  }

  getVisibleItems() {
    if (this.currentFilter === 'photo') {
      return this.cachedItems.filter(item => item.type === 'image');
    }
    if (this.currentFilter === 'video') {
      return this.cachedItems.filter(item => item.type === 'video');
    }
    return this.cachedItems;
  }

  renderGallery(items) {
    if (!this.galleryContainer) return;

    this.galleryContainer.innerHTML = '';

    const visibleItems = this.getVisibleItems();

    if (this.mediaCountBadge) {
      const photoCount = this.cachedItems.filter(i => i.type === 'image').length;
      const videoCount = this.cachedItems.filter(i => i.type === 'video').length;
      this.mediaCountBadge.textContent = `${this.cachedItems.length} Total (${photoCount} Photos, ${videoCount} Videos)`;
    }

    if (visibleItems.length === 0) {
      if (this.emptyState) this.emptyState.style.display = 'block';
    } else {
      if (this.emptyState) this.emptyState.style.display = 'none';

      visibleItems.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'album-media-card dynamic-media-card royal-card';
        card.setAttribute('data-id', item.id);

        const url = item.mediaUrl || this.blobUrls.get(item.id) || '';

        // In Owner Mode, show Delete button on ALL cards
        const deleteButtonHTML = this.isOwner ? `
          <button class="btn-delete-media" title="Permanently remove from website album" onclick="window.albumManager.openDeleteModal('${item.id}')">
            <i class="fa-solid fa-trash-can"></i> Remove
          </button>
        ` : '';

        if (item.type === 'video') {
          card.innerHTML = `
            <div class="card-video-box">
              <video 
                src="${url}" 
                controls 
                playsinline 
                preload="metadata" 
                class="card-embedded-video"
                title="${this.escapeHTML(item.caption)}"
              >
                <source src="${url}" type="${item.mimeType || 'video/mp4'}">
                Your browser cannot play this video directly.
              </video>
            </div>
            <div class="album-card-content">
              <div class="album-card-top-row">
                <span class="media-type-pill video-pill"><i class="fa-solid fa-film"></i> Video Clip</span>
                <span class="media-size">${item.size}</span>
              </div>
              <h4 class="album-photo-caption">${this.escapeHTML(item.caption)}</h4>
              <div class="album-photo-meta">
                <span><i class="fa-solid fa-location-dot"></i> ${this.escapeHTML(item.location)}</span>
                <span><i class="fa-solid fa-hard-drive"></i> ${item.isPermanent ? 'Permanent Asset' : item.dateAdded}</span>
              </div>
              <div class="album-card-actions">
                <button class="btn-play-fullscreen-action" onclick="window.albumManager.openVideoLightbox(${index})">
                  <i class="fa-solid fa-expand"></i> Theater View
                </button>
                ${deleteButtonHTML}
              </div>
            </div>
          `;
        } else {
          card.innerHTML = `
            <div class="album-photo-thumb" onclick="window.albumManager.openPhotoLightbox(${index})">
              <img src="${url}" alt="${this.escapeHTML(item.caption)}" loading="lazy">
              <div class="zoom-overlay">
                <i class="fa-solid fa-magnifying-glass-plus"></i>
              </div>
            </div>
            <div class="album-card-content">
              <div class="album-card-top-row">
                <span class="media-type-pill photo-pill"><i class="fa-solid fa-camera"></i> High-Res Photo</span>
                <span class="media-size">${item.size}</span>
              </div>
              <h4 class="album-photo-caption">${this.escapeHTML(item.caption)}</h4>
              <div class="album-photo-meta">
                <span><i class="fa-solid fa-location-dot"></i> ${this.escapeHTML(item.location)}</span>
                <span><i class="fa-solid fa-hard-drive"></i> ${item.isPermanent ? 'Permanent Asset' : item.dateAdded}</span>
              </div>
              <div class="album-card-actions">
                <button class="btn-view-fullscreen" onclick="window.albumManager.openPhotoLightbox(${index})">
                  <i class="fa-solid fa-expand"></i> View Full
                </button>
                ${deleteButtonHTML}
              </div>
            </div>
          `;
        }

        this.galleryContainer.appendChild(card);
      });
    }
  }

  executeDeleteItem(id) {
    const item = this.cachedItems.find(i => String(i.id) === String(id));

    if (item) {
      // Record in permanent removal registry
      this.removedKeys.add(item.name);
      if (item.mediaUrl) this.removedKeys.add(item.mediaUrl);
      this.removedKeys.add(String(item.id));
      localStorage.setItem('binayak_removed_media_' + this.albumKey, JSON.stringify(Array.from(this.removedKeys)));
    }

    // If in IndexedDB, also delete from DB
    if (this.db && typeof id === 'number') {
      const transaction = this.db.transaction(['album_media'], 'readwrite');
      const store = transaction.objectStore('album_media');
      store.delete(id);
    }

    this.showToastNotification('Photo Removed', 'Removed permanently from your website album.');
    this.loadMedia();
  }

  openPhotoLightbox(index) {
    const items = this.getVisibleItems();
    if (!items[index] || !this.lightbox) return;

    this.activeLightboxIndex = index;
    const item = items[index];
    const url = item.mediaUrl || this.blobUrls.get(item.id) || '';

    this.lightboxMediaContainer.innerHTML = `<img src="${url}" alt="${this.escapeHTML(item.caption)}" class="lightbox-main-img">`;
    this.updateLightboxMeta(item);
    this.showLightbox();
  }

  openVideoLightbox(index) {
    const items = this.getVisibleItems();
    if (!items[index] || !this.lightbox) return;

    this.activeLightboxIndex = index;
    const item = items[index];
    const url = item.mediaUrl || this.blobUrls.get(item.id) || '';

    this.lightboxMediaContainer.innerHTML = `
      <div class="lightbox-video-wrap">
        <video 
          src="${url}" 
          controls 
          autoplay 
          playsinline 
          class="lightbox-main-video"
          title="${this.escapeHTML(item.caption)}"
        >
          <source src="${url}" type="${item.mimeType || 'video/mp4'}">
          Your browser does not support HTML5 video.
        </video>
      </div>
    `;

    const videoEl = this.lightboxMediaContainer.querySelector('video');
    if (videoEl) {
      videoEl.load();
      videoEl.play().catch(e => {
        console.log('Autoplay deferred, controls enabled:', e);
      });
    }

    this.updateLightboxMeta(item);
    this.showLightbox();
  }

  updateLightboxMeta(item) {
    const url = item.mediaUrl || this.blobUrls.get(item.id) || '';

    if (this.lightboxCaption) {
      this.lightboxCaption.textContent = item.caption || 'Expedition Media';
    }

    if (this.lightboxMeta) {
      this.lightboxMeta.innerHTML = `
        <span><i class="fa-solid fa-location-dot"></i> ${this.escapeHTML(item.location)}</span>
        <span>•</span>
        <span><i class="fa-solid fa-hard-drive"></i> ${item.isPermanent ? 'Permanent Asset' : item.dateAdded}</span>
        <span>•</span>
        <span><i class="fa-solid fa-database"></i> ${item.size}</span>
      `;
    }

    if (this.lightboxDownload) {
      this.lightboxDownload.href = url;
      this.lightboxDownload.download = item.name || 'trekking_media';
    }

    if (this.lightboxDelete) {
      this.lightboxDelete.style.display = this.isOwner ? 'inline-flex' : 'none';
    }
  }

  navLightbox(direction) {
    const items = this.getVisibleItems();
    if (items.length <= 1) return;

    let nextIndex = this.activeLightboxIndex + direction;
    if (nextIndex < 0) nextIndex = items.length - 1;
    if (nextIndex >= items.length) nextIndex = 0;

    const nextItem = items[nextIndex];
    if (nextItem.type === 'video') {
      this.openVideoLightbox(nextIndex);
    } else {
      this.openPhotoLightbox(nextIndex);
    }
  }

  showLightbox() {
    this.lightbox.classList.add('is-active');
    this.lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    if (!this.lightbox) return;

    const video = this.lightboxMediaContainer.querySelector('video');
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }

    this.lightbox.classList.remove('is-active');
    this.lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  showToastNotification(title, message) {
    const toast = document.getElementById('album-toast');
    if (!toast) return;
    const titleEl = document.getElementById('album-toast-title');
    const msgEl = document.getElementById('album-toast-message');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;

    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }
}

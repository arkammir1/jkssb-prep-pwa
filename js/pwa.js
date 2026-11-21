/**
 * JKSSB Prep Master - PWA Installation & Offline Handler
 */

class PWAController {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.init();
  }

  init() {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => console.log('[PWA] Service Worker registered with scope:', reg.scope))
          .catch((err) => console.warn('[PWA] Service Worker registration failed:', err));
      });
    }

    // Check if already in standalone display mode
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      this.isInstalled = true;
      console.log('[PWA] Running in Standalone Installed Mode');
    }

    // Intercept BeforeInstallPrompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallUI();
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.hideInstallUI();
      if (window.showToast) {
        window.showToast('🎉 JKSSB Prep App installed successfully! You can launch it from your home screen anytime offline.');
      }
    });

    // Monitor connectivity
    window.addEventListener('online', () => this.updateOnlineStatus(true));
    window.addEventListener('offline', () => this.updateOnlineStatus(false));
  }

  showInstallUI() {
    const installBtn = document.getElementById('pwa-install-btn');
    const installBanner = document.getElementById('pwa-install-banner');
    if (installBtn) installBtn.classList.remove('hidden');
    if (installBanner && !sessionStorage.getItem('dismiss_install_banner')) {
      installBanner.classList.remove('hidden');
    }
  }

  hideInstallUI() {
    const installBtn = document.getElementById('pwa-install-btn');
    const installBanner = document.getElementById('pwa-install-banner');
    if (installBtn) installBtn.classList.add('hidden');
    if (installBanner) installBanner.classList.add('hidden');
  }

  async promptInstall() {
    if (!this.deferredPrompt) {
      // If iOS or already installed or unsupported
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        alert('To install on iPhone/iPad: Tap the Share button (square with arrow) at the bottom and choose "Add to Home Screen".');
      } else {
        alert('To install on Desktop or Android: Click the three dots (⋮) menu in your browser and select "Install app" or "Add to Home Screen".');
      }
      return;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log('[PWA] User response to install prompt:', outcome);
    this.deferredPrompt = null;
    this.hideInstallUI();
  }

  updateOnlineStatus(isOnline) {
    const statusPill = document.getElementById('online-status-pill');
    if (!statusPill) return;

    if (isOnline) {
      statusPill.innerHTML = '<span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span> Online';
      statusPill.className = 'text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950/40 text-emerald-300 border border-emerald-800 flex items-center';
    } else {
      statusPill.innerHTML = '<span class="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 mr-1.5"></span> Offline Ready';
      statusPill.className = 'text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-950/40 text-amber-300 border border-amber-800 flex items-center';
    }
  }
}

window.pwaController = new PWAController();

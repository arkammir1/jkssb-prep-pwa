/**
 * JKSSB Prep Master - Main Application Logic
 */

class JKSSBApp {
  constructor() {
    this.posts = [];
    this.activePost = null;
    this.activeTab = 'dashboard';
    this.activeExam = null;
    this.practiceQuestions = [];
    this.practiceIndex = 0;
    this.practiceSelectedOption = null;
    this.practiceRevealed = false;
    this.practiceSolutionTab = 'shortcut'; // 'shortcut' or 'traditional'
    this.vaultOffset = 0;
    this.vaultLimit = 25;
  }

  async init() {
    try {
      // 1. Initialize IndexedDB
      await window.appDB.init();

      // 2. Fetch Posts & Syllabus
      const res = await fetch('./data/posts_syllabus.json');
      const data = await res.json();
      this.posts = data.posts;

      // 3. Load user's saved post or default to JKP SI
      const savedPostId = localStorage.getItem('jkssb_active_post') || 'jkp-si';
      this.activePost = this.posts.find(p => p.id === savedPostId) || this.posts[0];

      // 4. Populate post selector
      this.renderPostSelector();

      // 5. Update question counters
      await this.updateTotalQuestionStats();

      // 6. Render current view
      this.renderDashboard();
      this.initIcons();

      // Check hash router
      const hash = window.location.hash.replace('#', '');
      if (['practice', 'mock-test', 'pyq-vault', 'bookmarks', 'analytics', 'packs-manager'].includes(hash)) {
        this.navigate(hash);
      }
    } catch (err) {
      console.error('[App] Initialization error:', err);
      this.showToast('Failed to initialize local data. Please refresh.', 'error');
    }
  }

  initIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
    if (window.renderMathInElement) {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    }
  }

  renderPostSelector() {
    const sel = document.getElementById('post-selector');
    if (!sel) return;

    sel.innerHTML = this.posts.map(p => `
      <option value="${p.id}" ${p.id === this.activePost.id ? 'selected' : ''}>
        ${p.name}
      </option>
    `).join('');

    sel.onchange = (e) => {
      this.setActivePost(e.target.value);
    };
  }

  async setActivePost(postId) {
    const target = this.posts.find(p => p.id === postId);
    if (!target) return;
    this.activePost = target;
    localStorage.setItem('jkssb_active_post', postId);

    this.showToast(`Switched target exam to: ${target.name}`);
    this.renderDashboard();

    // If currently on mock test or practice, reset appropriately
    if (this.activeTab === 'practice') {
      this.startPracticeWithSettings({});
    } else if (this.activeTab === 'mock-test' && !this.activeExam) {
      this.renderMockStartScreen();
    } else if (this.activeTab === 'pyq-vault') {
      this.filterVaultQuestions();
    }
  }

  async updateTotalQuestionStats() {
    const count = await window.appDB.getQuestionsCount();
    const formatted = count > 0 ? `${count.toLocaleString()}+ MCQs` : 'Loading...';
    
    const headerEl = document.getElementById('header-total-count');
    if (headerEl) headerEl.innerText = formatted;

    const packCountEl = document.getElementById('pack-offline-count');
    if (packCountEl) packCountEl.innerText = count.toLocaleString();
  }

  navigate(tabName) {
    this.activeTab = tabName;
    window.location.hash = tabName;

    // Toggle Desktop Tab Buttons active styling
    const navButtons = document.querySelectorAll('#main-nav .nav-item');
    navButtons.forEach(btn => {
      const match = btn.getAttribute('data-tab') === tabName;
      if (match) {
        btn.className = 'nav-item px-3 py-1.5 font-medium rounded-lg transition flex items-center gap-1.5 whitespace-nowrap bg-blue-600/20 text-blue-400 border border-blue-500/30';
      } else {
        btn.className = 'nav-item px-3 py-1.5 font-medium rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition flex items-center gap-1.5 whitespace-nowrap';
      }
    });

    // Toggle Mobile Bottom Navigation Buttons active styling
    const mobileNavButtons = document.querySelectorAll('.mobile-nav-btn');
    mobileNavButtons.forEach(btn => {
      const match = btn.getAttribute('data-mobile-tab') === tabName;
      if (match) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Hide all view sections
    const views = ['dashboard', 'practice', 'mock-test', 'pyq-vault', 'bookmarks', 'analytics', 'packs-manager'];
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.classList.add('hidden');
    });

    // Show active view
    const targetView = document.getElementById(`view-${tabName}`);
    if (targetView) targetView.classList.remove('hidden');

    // Trigger tab-specific initialization
    if (tabName === 'dashboard') {
      this.renderDashboard();
    } else if (tabName === 'practice') {
      if (this.practiceQuestions.length === 0) {
        this.startPracticeWithSettings({});
      }
    } else if (tabName === 'mock-test') {
      if (!this.activeExam) this.renderMockStartScreen();
    } else if (tabName === 'pyq-vault') {
      this.filterVaultQuestions();
    } else if (tabName === 'bookmarks') {
      this.renderBookmarks();
    } else if (tabName === 'analytics') {
      this.renderAnalytics();
    } else if (tabName === 'packs-manager') {
      this.updateTotalQuestionStats();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.initIcons();
  }

  // -------------------------------------------------------------
  // DASHBOARD VIEW
  // -------------------------------------------------------------
  renderDashboard() {
    const post = this.activePost;
    const heroCard = document.getElementById('post-hero-card');
    if (!heroCard) return;

    heroCard.innerHTML = `
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 relative z-10">
        <div class="space-y-2 sm:space-y-3 max-w-2xl">
          <div class="flex flex-wrap items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              ${post.badge || 'Official JKSSB Exam'}
            </span>
            <span class="text-xs text-slate-400">${post.department}</span>
          </div>
          <h1 class="text-xl sm:text-3xl font-extrabold text-white tracking-tight">
            ${post.name} Examination
          </h1>
          <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
            ${post.description}
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
          <button onclick="app.startMockExam()" class="w-full sm:w-auto px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-950/40 transition flex items-center justify-center gap-2 active:scale-95">
            <i data-lucide="play" class="w-4 h-4 fill-current"></i>
            <span>Take 120-Min Mock Test</span>
          </button>
          <button onclick="app.startPracticeWithSettings({ is_math: true })" class="w-full sm:w-auto px-5 py-2.5 sm:py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 active:scale-95">
            <i data-lucide="zap" class="w-4 h-4 text-cyan-400"></i>
            <span>Maths Shortcuts</span>
          </button>
        </div>
      </div>
    `;

    // Render Syllabus Subject Cards
    const subjectList = document.getElementById('syllabus-subject-list');
    if (!subjectList) return;

    subjectList.innerHTML = post.subjects.map(sub => `
      <div class="bg-slate-950/60 p-4 rounded-xl border border-slate-800/90 hover:border-slate-700 transition flex flex-col justify-between">
        <div class="space-y-2">
          <div class="flex items-start justify-between gap-2">
            <h4 class="font-bold text-sm text-white flex items-center gap-2">
              ${sub.hasShortcutMethods ? '<i data-lucide="zap" class="w-4 h-4 text-cyan-400 shrink-0"></i>' : '<i data-lucide="book-open" class="w-4 h-4 text-slate-400 shrink-0"></i>'}
              <span>${sub.name}</span>
            </h4>
            <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-900/40 text-blue-300 border border-blue-800 shrink-0">
              ${sub.weightage} Marks
            </span>
          </div>
          <ul class="text-xs text-slate-400 space-y-1 pl-4 list-disc">
            ${(sub.topics || []).slice(0, 3).map(t => `<li>${t}</li>`).join('')}
            ${(sub.topics || []).length > 3 ? `<li class="text-slate-500">+${sub.topics.length - 3} more topics</li>` : ''}
          </ul>
        </div>
        <div class="pt-4 mt-3 border-t border-slate-900 flex items-center justify-between">
          <span class="text-[11px] text-slate-500">
            ${sub.hasShortcutMethods ? '⚡ Traditional + Shortcut methods included' : 'PYQs with full references'}
          </span>
          <button onclick="app.startPracticeWithSettings({ subject: '${sub.name.replace(/'/g, "\\'")}' })" class="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
            <span>Practice</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `).join('');

    this.initIcons();
  }

  // -------------------------------------------------------------
  // PRACTICE ENGINE & DUAL-METHOD MATH SOLUTIONS
  // -------------------------------------------------------------
  async startPracticeWithSettings({ subject, is_math, is_pyq }) {
    this.navigate('practice');
    const badge = document.getElementById('practice-subject-badge');
    if (badge) {
      if (is_math) badge.innerText = 'Quantitative Aptitude & Shortcuts';
      else if (is_pyq) badge.innerText = 'Previous Year Papers';
      else if (subject) badge.innerText = subject;
      else badge.innerText = 'Mixed Syllabus Practice';
    }

    const questions = await window.appDB.getRandomPracticeSet({
      postId: this.activePost.id,
      subject,
      is_math,
      is_pyq,
      count: 25
    });

    this.practiceQuestions = questions;
    this.practiceIndex = 0;
    this.practiceSelectedOption = null;
    this.practiceRevealed = false;
    this.practiceSolutionTab = 'shortcut';

    this.renderPracticeCard();
  }

  renderPracticeCard() {
    const container = document.getElementById('practice-card-container');
    const progressEl = document.getElementById('practice-progress');
    if (!container) return;

    if (!this.practiceQuestions || this.practiceQuestions.length === 0) {
      container.innerHTML = `
        <div class="bg-slate-900 rounded-xl p-8 border border-slate-800 text-center space-y-4">
          <i data-lucide="info" class="w-10 h-10 text-cyan-400 mx-auto"></i>
          <h3 class="font-bold text-white text-base">No practice questions found for this specific filter.</h3>
          <p class="text-xs text-slate-400">Download the full 12,000+ pack or try another subject.</p>
          <button onclick="app.startPracticeWithSettings({})" class="px-4 py-2 bg-blue-600 text-white font-semibold text-xs rounded-lg">
            Practice All Subjects
          </button>
        </div>
      `;
      this.initIcons();
      return;
    }

    const q = this.practiceQuestions[this.practiceIndex];
    if (progressEl) {
      progressEl.innerText = `Question ${this.practiceIndex + 1} of ${this.practiceQuestions.length}`;
    }

    const isMathOrQuant = q.is_math || !!q.shortcut_method || q.subject?.toLowerCase().includes('math');

    container.innerHTML = `
      <div class="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
        <!-- Question Meta Header -->
        <div class="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300 border border-slate-700">
              Q ${this.practiceIndex + 1}
            </span>
            <span class="text-slate-400 font-medium">${q.subject || 'General'}</span>
            ${q.topic ? `<span class="text-slate-600">•</span><span class="text-slate-400">${q.topic}</span>` : ''}
          </div>
          <div class="flex items-center gap-2">
            ${q.pyq ? `<span class="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800 font-semibold text-[11px]">${q.pyq}</span>` : ''}
            <button onclick="app.toggleBookmarkCurrentQuestion()" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition" title="Save / Bookmark">
              <i data-lucide="bookmark" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- Question Body -->
        <div class="text-base sm:text-lg font-semibold text-white leading-relaxed select-text" id="practice-q-text">
          ${q.q}
        </div>

        <!-- Options List -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
          ${q.options.map((opt, idx) => {
            let stateClass = 'border-slate-800 bg-slate-950/50 hover:border-slate-700 text-slate-200';
            let badge = String.fromCharCode(65 + idx); // A, B, C, D

            if (this.practiceRevealed) {
              if (idx === q.answer) {
                stateClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200 font-bold';
              } else if (idx === this.practiceSelectedOption) {
                stateClass = 'border-rose-500 bg-rose-950/40 text-rose-200';
              } else {
                stateClass = 'border-slate-800/40 bg-slate-950/20 text-slate-500 opacity-60';
              }
            } else if (this.practiceSelectedOption === idx) {
              stateClass = 'border-cyan-500 bg-cyan-950/30 text-cyan-200 font-semibold';
            }

            return `
              <div onclick="app.practiceSelectOption(${idx})" class="option-card p-3 sm:p-4 rounded-xl border transition flex items-center gap-3 ${stateClass} ${this.practiceRevealed ? 'cursor-default' : 'cursor-pointer'}">
                <span class="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                  ${badge}
                </span>
                <span class="text-xs sm:text-sm select-text">${opt}</span>
              </div>
            `;
          }).join('')}
        </div>

        <!-- REVEALED EXPLANATION & DUAL-METHOD MATH SECTION -->
        ${this.practiceRevealed ? `
          <div class="pt-4 border-t border-slate-800 space-y-4 animate-fadeIn">
            
            ${isMathOrQuant ? `
              <!-- Dual-Method Switcher Tabs for Maths -->
              <div class="bg-slate-950 p-1 rounded-xl border border-slate-800 flex flex-col xs:flex-row items-stretch sm:items-center gap-1.5 max-w-lg">
                <button onclick="app.setPracticeSolutionTab('shortcut')" class="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${this.practiceSolutionTab === 'shortcut' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}">
                  <i data-lucide="zap" class="w-3.5 h-3.5 text-cyan-200"></i>
                  <span>⚡ Shortcut / Trick Method</span>
                </button>
                <button onclick="app.setPracticeSolutionTab('traditional')" class="flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${this.practiceSolutionTab === 'traditional' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}">
                  <i data-lucide="book-open" class="w-3.5 h-3.5 text-amber-200"></i>
                  <span>📝 Traditional Step-by-Step</span>
                </button>
              </div>

              <!-- Shortcut Card -->
              <div class="${this.practiceSolutionTab === 'shortcut' ? 'block' : 'hidden'} bg-cyan-950/20 border border-cyan-800/60 rounded-xl p-5 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <i data-lucide="sparkles" class="w-4 h-4 text-cyan-400"></i>
                    Exam Speed Solution (~10-20 Seconds)
                  </span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-900/60 text-cyan-300 border border-cyan-700">
                    High Scoring Trick
                  </span>
                </div>
                <div class="text-xs sm:text-sm text-cyan-100 leading-relaxed font-sans whitespace-pre-line select-text">
                  ${this.formatMathText(q.shortcut_method || q.explanation || 'Shortcut method available.')}
                </div>
              </div>

              <!-- Traditional Card -->
              <div class="${this.practiceSolutionTab === 'traditional' ? 'block' : 'hidden'} bg-amber-950/20 border border-amber-800/60 rounded-xl p-5 space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <i data-lucide="book" class="w-4 h-4 text-amber-400"></i>
                    Textbook Algebraic Derivation
                  </span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 border border-amber-700">
                    Concept Builder
                  </span>
                </div>
                <div class="text-xs sm:text-sm text-amber-100 leading-relaxed font-sans whitespace-pre-line select-text">
                  ${this.formatMathText(q.traditional_method || q.explanation || 'Traditional derivation available.')}
                </div>
              </div>
            ` : `
              <!-- Standard Subject Detailed Explanation -->
              <div class="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-2">
                <span class="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400"></i>
                  Explanation &amp; Exam Facts:
                </span>
                <p class="text-xs sm:text-sm text-slate-300 leading-relaxed select-text">
                  ${q.explanation || 'Correct answer verified from official JKSSB answer keys.'}
                </p>
              </div>
            `}

            <!-- Next Question Footer Button -->
            <div class="flex items-center justify-end pt-3">
              <button onclick="app.loadNewPracticeQuestion()" class="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition flex items-center gap-2">
                <span>Next Question</span>
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    this.initIcons();
  }

  formatMathText(text) {
    if (!text) return '';
    // Formats Markdown bolding into HTML strong
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  setPracticeSolutionTab(tab) {
    this.practiceSolutionTab = tab;
    this.renderPracticeCard();
  }

  practiceSelectOption(index) {
    if (this.practiceRevealed) return;
    this.practiceSelectedOption = index;
    this.practiceRevealed = true;
    this.renderPracticeCard();
  }

  loadNewPracticeQuestion() {
    if (this.practiceIndex < this.practiceQuestions.length - 1) {
      this.practiceIndex++;
      this.practiceSelectedOption = null;
      this.practiceRevealed = false;
      this.renderPracticeCard();
      window.scrollTo({ top: 120, behavior: 'smooth' });
    } else {
      this.showToast('Great job! You completed all questions in this practice set.');
      this.startPracticeWithSettings({});
    }
  }

  async toggleBookmarkCurrentQuestion() {
    const q = this.practiceQuestions[this.practiceIndex];
    if (!q) return;
    const res = await window.appDB.toggleBookmark(q);
    if (res.bookmarked) {
      this.showToast('Question saved to Bookmarks & Weak Areas!');
    } else {
      this.showToast('Question removed from Bookmarks.');
    }
  }

  // -------------------------------------------------------------
  // FULL MOCK TEST (CBT ENGINE)
  // -------------------------------------------------------------
  renderMockStartScreen() {
    const post = this.activePost;
    const title = document.getElementById('mock-post-title');
    const totalQ = document.getElementById('mock-total-q');
    const duration = document.getElementById('mock-duration');
    const cutoff = document.getElementById('mock-target-cutoff');

    if (title) title.innerText = `${post.name} Full Mock Test`;
    if (totalQ) totalQ.innerText = `${post.totalQuestions} MCQs`;
    if (duration) duration.innerText = `${post.durationMinutes} Minutes`;
    if (cutoff) cutoff.innerText = post.targetCutoff || '85 - 95';

    document.getElementById('mock-start-screen')?.classList.remove('hidden');
    document.getElementById('mock-live-screen')?.classList.add('hidden');
    document.getElementById('mock-result-screen')?.classList.add('hidden');
  }

  async launchExam() {
    const post = this.activePost;
    this.showToast(`Loading ${post.totalQuestions} balanced mock questions...`);

    const questions = await window.appDB.getMockExamQuestions(post);
    if (!questions || questions.length === 0) {
      this.showToast('No questions available in database. Please download the packs first.', 'error');
      return;
    }

    this.activeExam = new window.JKSSBExamEngine(post, questions, 'mock');

    // Setup UI
    document.getElementById('mock-start-screen')?.classList.add('hidden');
    document.getElementById('mock-live-screen')?.classList.remove('hidden');
    document.getElementById('mock-result-screen')?.classList.add('hidden');

    const titleEl = document.getElementById('live-exam-title');
    if (titleEl) titleEl.innerText = `${post.name} Mock Test`;

    // Start exam timer
    this.activeExam.start(
      (formattedTime, remainingSecs) => {
        const timerEl = document.getElementById('live-exam-timer');
        if (timerEl) {
          timerEl.innerText = formattedTime;
          if (remainingSecs <= 600) {
            timerEl.classList.add('text-rose-500', 'animate-pulse');
          }
        }
      },
      () => {
        this.showToast('Time is up! Submitting exam automatically.', 'warning');
        this.finalizeExamSubmission();
      }
    );

    this.renderLiveQuestion();
    this.renderLivePalette();
    this.initIcons();
  }

  renderLiveQuestion() {
    if (!this.activeExam) return;
    const q = this.activeExam.getCurrentQuestion();
    const content = document.getElementById('live-question-content');
    const subName = document.getElementById('live-subject-name');
    if (!content || !q) return;

    if (subName) subName.innerText = q.subject || 'General Section';

    const selectedIdx = this.activeExam.answers[q.id];

    content.innerHTML = `
      <div class="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
        <span class="font-bold text-slate-200">Question ${this.activeExam.currentIndex + 1} of ${this.activeExam.questions.length}</span>
        <span class="text-emerald-400 font-semibold">+1.0 / -0.25 Mark</span>
      </div>

      <div class="text-base sm:text-lg font-semibold text-white leading-relaxed select-text py-2">
        ${q.q}
      </div>

      <div class="space-y-3 pt-2">
        ${q.options.map((opt, idx) => `
          <div onclick="app.examSelectOption(${idx})" class="option-card p-3.5 rounded-xl border ${selectedIdx === idx ? 'border-cyan-500 bg-cyan-950/30 text-cyan-200 font-semibold' : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'} flex items-center gap-3 cursor-pointer">
            <span class="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
              ${String.fromCharCode(65 + idx)}
            </span>
            <span class="text-sm select-text">${opt}</span>
          </div>
        `).join('')}
      </div>
    `;

    this.initIcons();
  }

  toggleMobileMenuSheet(isOpen) {
    const sheet = document.getElementById('mobile-more-sheet');
    if (!sheet) return;
    if (isOpen) sheet.classList.remove('hidden');
    else sheet.classList.add('hidden');
    this.initIcons();
  }

  toggleMobilePaletteDrawer(isOpen) {
    const drawer = document.getElementById('mobile-palette-drawer');
    if (!drawer) return;
    if (isOpen) {
      drawer.classList.remove('hidden');
      this.renderLivePalette();
    } else {
      drawer.classList.add('hidden');
    }
    this.initIcons();
  }

  renderLivePalette() {
    if (!this.activeExam) return;

    // Update palette trigger button label with live progress
    const triggerLabel = document.getElementById('live-palette-trigger-label');
    if (triggerLabel) {
      triggerLabel.innerText = `Palette (${this.activeExam.currentIndex + 1}/${this.activeExam.questions.length})`;
    }

    const html = this.activeExam.questions.map((q, idx) => {
      const status = this.activeExam.getStatus(idx);
      const isCurrent = idx === this.activeExam.currentIndex;
      return `
        <button onclick="app.examGoTo(${idx})" class="palette-btn status-${status} ${isCurrent ? 'current' : ''}">
          ${idx + 1}
        </button>
      `;
    }).join('');

    const gridDesktop = document.getElementById('live-palette-grid-desktop');
    if (gridDesktop) gridDesktop.innerHTML = html;

    const gridMobile = document.getElementById('live-palette-grid-mobile');
    if (gridMobile) gridMobile.innerHTML = html;
  }

  examSelectOption(idx) {
    if (!this.activeExam) return;
    this.activeExam.selectAnswer(idx);
    this.renderLiveQuestion();
    this.renderLivePalette();
  }

  examClearResponse() {
    if (!this.activeExam) return;
    this.activeExam.clearAnswer();
    this.renderLiveQuestion();
    this.renderLivePalette();
  }

  examToggleReview() {
    if (!this.activeExam) return;
    this.activeExam.toggleReview();
    this.renderLivePalette();
  }

  examNextQuestion() {
    if (!this.activeExam) return;
    this.activeExam.next();
    this.renderLiveQuestion();
    this.renderLivePalette();
  }

  examPrevQuestion() {
    if (!this.activeExam) return;
    this.activeExam.prev();
    this.renderLiveQuestion();
    this.renderLivePalette();
  }

  examGoTo(index) {
    if (!this.activeExam) return;
    this.activeExam.goTo(index);
    this.renderLiveQuestion();
    this.renderLivePalette();
    this.toggleMobilePaletteDrawer(false); // Close mobile drawer when question is picked
  }

  confirmSubmitExam() {
    if (!this.activeExam) return;
    const summary = this.activeExam.getSummary();
    const modal = document.getElementById('submit-confirm-modal');
    const grid = document.getElementById('submit-summary-grid');

    if (grid) {
      grid.innerHTML = `
        <div class="p-2 rounded bg-slate-900 border border-slate-800">
          <span class="text-slate-400 block text-[11px]">Answered</span>
          <span class="font-bold text-emerald-400 text-sm">${summary.answered + summary.answeredMarked}</span>
        </div>
        <div class="p-2 rounded bg-slate-900 border border-slate-800">
          <span class="text-slate-400 block text-[11px]">Unanswered</span>
          <span class="font-bold text-rose-400 text-sm">${summary.notAnswered}</span>
        </div>
        <div class="p-2 rounded bg-slate-900 border border-slate-800">
          <span class="text-slate-400 block text-[11px]">Marked for Review</span>
          <span class="font-bold text-purple-400 text-sm">${summary.marked}</span>
        </div>
        <div class="p-2 rounded bg-slate-900 border border-slate-800">
          <span class="text-slate-400 block text-[11px]">Total MCQs</span>
          <span class="font-bold text-white text-sm">${summary.total}</span>
        </div>
      `;
    }

    modal?.classList.remove('hidden');
    this.initIcons();
  }

  async finalizeExamSubmission() {
    document.getElementById('submit-confirm-modal')?.classList.add('hidden');
    if (!this.activeExam) return;

    const result = this.activeExam.submit();
    await window.appDB.saveTestAttempt(result);

    document.getElementById('mock-live-screen')?.classList.add('hidden');
    document.getElementById('mock-result-screen')?.classList.remove('hidden');

    this.renderExamScorecard(result);
  }

  renderExamScorecard(res) {
    const screen = document.getElementById('mock-result-screen');
    if (!screen) return;

    screen.innerHTML = `
      <div class="bg-slate-900 rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <span class="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase">
              Official Scorecard
            </span>
            <h2 class="text-2xl font-extrabold text-white mt-1">${res.postName} Mock Exam Result</h2>
            <p class="text-xs text-slate-400">Completed in ${Math.round(res.timeTakenSeconds / 60)} minutes • Negative marking of 0.25 applied</p>
          </div>
          <button onclick="app.launchExam()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition self-start sm:self-auto flex items-center gap-1.5">
            <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
            <span>Retake Mock Test</span>
          </button>
        </div>

        <!-- Big Scorecard KPI Metrics -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span class="text-xs text-slate-400 block">Total Score</span>
            <span class="text-2xl sm:text-3xl font-extrabold text-emerald-400">${res.finalScore}</span>
            <span class="text-[11px] text-slate-500 block mt-0.5">out of ${res.maxMarks}</span>
          </div>
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span class="text-xs text-slate-400 block">Accuracy</span>
            <span class="text-2xl sm:text-3xl font-extrabold text-cyan-400">${res.accuracy}%</span>
            <span class="text-[11px] text-slate-500 block mt-0.5">${res.correctCount} correct / ${res.correctCount + res.incorrectCount} attempted</span>
          </div>
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span class="text-xs text-slate-400 block">Negative Lost</span>
            <span class="text-2xl sm:text-3xl font-extrabold text-rose-400">-${res.negativePenaltyLost}</span>
            <span class="text-[11px] text-slate-500 block mt-0.5">${res.incorrectCount} incorrect answers</span>
          </div>
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span class="text-xs text-slate-400 block">Unattempted</span>
            <span class="text-2xl sm:text-3xl font-extrabold text-slate-300">${res.unattemptedCount}</span>
            <span class="text-[11px] text-slate-500 block mt-0.5">Skipped questions</span>
          </div>
        </div>

        <!-- Subject Breakdown Table -->
        <div class="space-y-3 pt-4">
          <h3 class="font-bold text-sm text-white">Subject-wise Breakdown</h3>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-slate-300 border border-slate-800 rounded-xl overflow-hidden">
              <thead class="bg-slate-950 text-slate-400 uppercase font-semibold">
                <tr>
                  <th class="p-3">Subject</th>
                  <th class="p-3">Total</th>
                  <th class="p-3 text-emerald-400">Correct</th>
                  <th class="p-3 text-rose-400">Wrong</th>
                  <th class="p-3">Skipped</th>
                  <th class="p-3 font-bold text-white">Net Score</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/80 bg-slate-900/60">
                ${Object.entries(res.subjectBreakdown).map(([sub, data]) => `
                  <tr>
                    <td class="p-3 font-semibold text-slate-200">${sub}</td>
                    <td class="p-3">${data.total}</td>
                    <td class="p-3 text-emerald-400 font-bold">${data.correct}</td>
                    <td class="p-3 text-rose-400 font-bold">${data.incorrect}</td>
                    <td class="p-3">${data.unattempted}</td>
                    <td class="p-3 font-bold text-white">${data.score.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- IN-DEPTH QUESTION-BY-QUESTION DUAL METHOD REVIEW -->
        <div class="space-y-4 pt-6 border-t border-slate-800">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-base text-white flex items-center gap-2">
              <i data-lucide="check-check" class="w-5 h-5 text-cyan-400"></i>
              <span>Detailed Question Review &amp; Dual-Method Solutions</span>
            </h3>
            <span class="text-xs text-slate-400">Review answers with both Shortcut &amp; Traditional methods</span>
          </div>

          <div class="space-y-4">
            ${this.activeExam.questions.map((q, qIndex) => {
              const userAns = res.answers[q.id];
              const isCorrect = userAns === q.answer;
              const isSkipped = userAns === undefined;
              const isMath = q.is_math || !!q.shortcut_method || q.subject?.toLowerCase().includes('math');

              return `
                <div class="bg-slate-950 rounded-xl border ${isCorrect ? 'border-emerald-800/50' : (isSkipped ? 'border-slate-800' : 'border-rose-800/50')} p-5 space-y-3">
                  <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span class="font-bold text-slate-300">Q${qIndex + 1}. [${q.subject}]</span>
                    <div>
                      ${isCorrect ? '<span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800">Correct (+1.0)</span>' : ''}
                      ${!isCorrect && !isSkipped ? '<span class="px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-800">Incorrect (-0.25)</span>' : ''}
                      ${isSkipped ? '<span class="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">Unattempted (0.0)</span>' : ''}
                    </div>
                  </div>

                  <p class="text-sm font-semibold text-white select-text">${q.q}</p>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    ${q.options.map((opt, oIdx) => {
                      let badgeColor = 'bg-slate-900 border-slate-800 text-slate-300';
                      if (oIdx === q.answer) badgeColor = 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold';
                      else if (oIdx === userAns) badgeColor = 'bg-rose-950/60 border-rose-500 text-rose-300';
                      return `
                        <div class="p-2.5 rounded-lg border ${badgeColor} flex items-center gap-2 select-text">
                          <span class="w-5 h-5 rounded bg-slate-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                            ${String.fromCharCode(65 + oIdx)}
                          </span>
                          <span>${opt}</span>
                        </div>
                      `;
                    }).join('')}
                  </div>

                  <!-- Solutions Box -->
                  ${isMath ? `
                    <div class="mt-3 pt-3 border-t border-slate-900 space-y-2">
                      <div class="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/60 text-xs text-cyan-200">
                        <strong class="text-cyan-400 block mb-1">⚡ Shortcut / Speed Method:</strong>
                        <div class="whitespace-pre-line select-text">${this.formatMathText(q.shortcut_method || q.explanation)}</div>
                      </div>
                      <div class="p-3 rounded-lg bg-amber-950/20 border border-amber-800/50 text-xs text-amber-200">
                        <strong class="text-amber-400 block mb-1">📝 Traditional Method:</strong>
                        <div class="whitespace-pre-line select-text">${this.formatMathText(q.traditional_method || q.explanation)}</div>
                      </div>
                    </div>
                  ` : `
                    <div class="mt-2 p-3 rounded-lg bg-slate-900 text-xs text-slate-300 border border-slate-800 select-text">
                      <strong class="text-emerald-400 block mb-0.5">Explanation:</strong>
                      ${q.explanation || 'Verified from official JKSSB answer key.'}
                    </div>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    this.initIcons();
  }

  // -------------------------------------------------------------
  // PYQ VAULT & QUESTION SEARCH
  // -------------------------------------------------------------
  async filterVaultQuestions() {
    const search = document.getElementById('vault-search-input')?.value || '';
    const subject = document.getElementById('vault-subject-filter')?.value || 'ALL';
    const isPyq = document.getElementById('vault-pyq-only')?.checked || false;
    const isMath = document.getElementById('vault-math-only')?.checked || false;

    const { questions, total } = await window.appDB.getQuestionsByFilter({
      postId: this.activePost.id,
      subject,
      search,
      is_pyq: isPyq,
      is_math: isMath,
      limit: this.vaultLimit,
      offset: this.vaultOffset
    });

    const countEl = document.getElementById('vault-match-count');
    if (countEl) countEl.innerText = `Showing ${questions.length} of ${total.toLocaleString()}`;

    const list = document.getElementById('vault-questions-list');
    if (!list) return;

    if (questions.length === 0) {
      list.innerHTML = `
        <div class="bg-slate-900 p-8 rounded-xl border border-slate-800 text-center text-slate-400 text-xs">
          No questions matching your query. Download the offline packs or adjust search filters.
        </div>
      `;
      return;
    }

    list.innerHTML = questions.map((q, idx) => {
      const isMath = q.is_math || !!q.shortcut_method;
      return `
        <div class="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300 border border-slate-700">
                #${this.vaultOffset + idx + 1}
              </span>
              <span class="text-indigo-300 font-semibold">${q.subject}</span>
              ${q.topic ? `<span class="text-slate-500">•</span><span class="text-slate-400">${q.topic}</span>` : ''}
            </div>
            ${q.pyq ? `<span class="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800">${q.pyq}</span>` : ''}
          </div>

          <p class="text-sm font-semibold text-white select-text">${q.q}</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            ${q.options.map((opt, oIdx) => `
              <div class="p-2.5 rounded-lg border ${oIdx === q.answer ? 'border-emerald-600 bg-emerald-950/30 text-emerald-300 font-bold' : 'border-slate-800 bg-slate-950/40 text-slate-300'} flex items-center gap-2 select-text">
                <span class="w-5 h-5 rounded bg-slate-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                  ${String.fromCharCode(65 + oIdx)}
                </span>
                <span>${opt}</span>
              </div>
            `).join('')}
          </div>

          <!-- Solution Accordion -->
          <details class="text-xs pt-2">
            <summary class="cursor-pointer text-cyan-400 hover:text-cyan-300 font-semibold select-none flex items-center gap-1 w-fit">
              <span>View ${isMath ? '⚡ Shortcut & Traditional Solution' : 'Full Detailed Explanation'}</span>
            </summary>
            <div class="mt-2 space-y-2">
              ${isMath ? `
                <div class="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800 text-cyan-200 select-text">
                  <strong class="text-cyan-400 block mb-1">⚡ Shortcut / Speed Trick:</strong>
                  <div class="whitespace-pre-line">${this.formatMathText(q.shortcut_method || q.explanation)}</div>
                </div>
                <div class="p-3 rounded-lg bg-amber-950/30 border border-amber-800 text-amber-200 select-text">
                  <strong class="text-amber-400 block mb-1">📝 Traditional Method:</strong>
                  <div class="whitespace-pre-line">${this.formatMathText(q.traditional_method || q.explanation)}</div>
                </div>
              ` : `
                <div class="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 select-text">
                  ${q.explanation || 'Verified from official JKSSB answer keys.'}
                </div>
              `}
            </div>
          </details>
        </div>
      `;
    }).join('');

    // Pagination
    const pagination = document.getElementById('vault-pagination');
    if (pagination) {
      pagination.innerHTML = `
        <button onclick="app.vaultPrevPage()" ${this.vaultOffset === 0 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:text-white"'} flex items-center gap-1>
          <i data-lucide="chevron-left" class="w-4 h-4"></i> Previous Page
        </button>
        <span class="text-slate-400">Page ${Math.floor(this.vaultOffset / this.vaultLimit) + 1} of ${Math.ceil(total / this.vaultLimit) || 1}</span>
        <button onclick="app.vaultNextPage(${total})" ${this.vaultOffset + this.vaultLimit >= total ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:text-white"'} flex items-center gap-1>
          Next Page <i data-lucide="chevron-right" class="w-4 h-4"></i>
        </button>
      `;
    }

    this.initIcons();
  }

  vaultNextPage(total) {
    if (this.vaultOffset + this.vaultLimit < total) {
      this.vaultOffset += this.vaultLimit;
      this.filterVaultQuestions();
      window.scrollTo({ top: 200, behavior: 'smooth' });
    }
  }

  vaultPrevPage() {
    if (this.vaultOffset >= this.vaultLimit) {
      this.vaultOffset -= this.vaultLimit;
      this.filterVaultQuestions();
      window.scrollTo({ top: 200, behavior: 'smooth' });
    }
  }

  // -------------------------------------------------------------
  // BOOKMARKS & SAVED QUESTIONS
  // -------------------------------------------------------------
  async renderBookmarks() {
    const list = document.getElementById('bookmarks-list');
    if (!list) return;

    const bookmarks = await window.appDB.getBookmarks();
    if (bookmarks.length === 0) {
      list.innerHTML = `
        <div class="bg-slate-900 rounded-xl p-8 border border-slate-800 text-center space-y-3">
          <i data-lucide="bookmark" class="w-8 h-8 text-rose-400 mx-auto"></i>
          <p class="text-xs text-slate-400">No saved questions yet. Tap the bookmark icon on any question in practice mode to save it here for revision.</p>
        </div>
      `;
      this.initIcons();
      return;
    }

    list.innerHTML = bookmarks.map((b) => {
      const q = b.question;
      const isMath = q.is_math || !!q.shortcut_method;
      return `
        <div class="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-3">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-300">${q.subject}</span>
            <button onclick="app.removeBookmark('${q.id}')" class="text-rose-400 hover:text-rose-300 text-xs font-semibold">
              Remove
            </button>
          </div>
          <p class="text-sm font-semibold text-white select-text">${q.q}</p>
          <div class="p-3 bg-slate-950 rounded-lg text-xs space-y-1">
            <strong class="text-emerald-400">Correct Answer:</strong> ${q.options[q.answer]}
            ${isMath ? `
              <div class="mt-2 text-cyan-300">
                <strong>⚡ Shortcut:</strong> ${this.formatMathText(q.shortcut_method)}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    this.initIcons();
  }

  async removeBookmark(qId) {
    await window.appDB.toggleBookmark({ id: qId });
    this.showToast('Removed from saved questions.');
    this.renderBookmarks();
  }

  async clearAllBookmarks() {
    if (!confirm('Are you sure you want to clear all saved bookmarks?')) return;
    const bookmarks = await window.appDB.getBookmarks();
    for (const b of bookmarks) {
      await window.appDB.toggleBookmark({ id: b.id });
    }
    this.showToast('All bookmarks cleared.');
    this.renderBookmarks();
  }

  // -------------------------------------------------------------
  // ANALYTICS & TEST HISTORY
  // -------------------------------------------------------------
  async renderAnalytics() {
    const history = await window.appDB.getTestHistory();
    const summaryCards = document.getElementById('analytics-summary-cards');
    const tableEl = document.getElementById('test-history-table');

    const totalTests = history.length;
    let avgScore = 0;
    let avgAccuracy = 0;

    if (totalTests > 0) {
      avgScore = (history.reduce((acc, h) => acc + h.finalScore, 0) / totalTests).toFixed(1);
      avgAccuracy = (history.reduce((acc, h) => acc + h.accuracy, 0) / totalTests).toFixed(1);
    }

    if (summaryCards) {
      summaryCards.innerHTML = `
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <span class="text-xs text-slate-400 block">Tests Attempted</span>
          <span class="text-2xl font-bold text-white">${totalTests}</span>
          <span class="text-[11px] text-slate-500 block mt-0.5">Full Mock Exams</span>
        </div>
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <span class="text-xs text-slate-400 block">Average Score</span>
          <span class="text-2xl font-bold text-emerald-400">${avgScore}</span>
          <span class="text-[11px] text-slate-500 block mt-0.5">Across all mock tests</span>
        </div>
        <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <span class="text-xs text-slate-400 block">Average Accuracy</span>
          <span class="text-2xl font-bold text-cyan-400">${avgAccuracy}%</span>
          <span class="text-[11px] text-slate-500 block mt-0.5">Attempted questions precision</span>
        </div>
      `;
    }

    if (tableEl) {
      if (totalTests === 0) {
        tableEl.innerHTML = `<p class="text-xs text-slate-500 py-4">No tests attempted yet. Take a full mock test to populate analytics!</p>`;
        return;
      }

      tableEl.innerHTML = `
        <table class="w-full text-left text-xs text-slate-300 border border-slate-800 rounded-xl overflow-hidden">
          <thead class="bg-slate-950 text-slate-400 uppercase font-semibold">
            <tr>
              <th class="p-3">Date</th>
              <th class="p-3">Exam Post</th>
              <th class="p-3 text-emerald-400">Score</th>
              <th class="p-3">Accuracy</th>
              <th class="p-3">Duration</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/80 bg-slate-900/40">
            ${history.map(h => `
              <tr>
                <td class="p-3 text-slate-400">${new Date(h.timestamp).toLocaleDateString()}</td>
                <td class="p-3 font-semibold text-white">${h.postName}</td>
                <td class="p-3 font-bold text-emerald-400">${h.finalScore} / ${h.maxMarks}</td>
                <td class="p-3 text-cyan-300 font-semibold">${h.accuracy}%</td>
                <td class="p-3 text-slate-400">${Math.round(h.timeTakenSeconds / 60)} mins</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    this.initIcons();
  }

  // -------------------------------------------------------------
  // PACKS MANAGER & OFFLINE DATA SYNC
  // -------------------------------------------------------------
  async downloadAllOfflinePacks() {
    const btn = document.getElementById('btn-download-all-packs');
    const progressContainer = document.getElementById('pack-progress-container');
    const progressBar = document.getElementById('pack-progress-bar');
    const progressText = document.getElementById('pack-progress-text');

    if (btn) btn.disabled = true;
    if (progressContainer) progressContainer.classList.remove('hidden');

    try {
      await window.appDB.installAllPacks(({ current, total, status }) => {
        const pct = Math.round((current / total) * 100);
        if (progressBar) progressBar.style.width = `${pct}%`;
        if (progressText) progressText.innerText = `${status} (${pct}%)`;
      });

      await this.updateTotalQuestionStats();
      this.showToast('✅ All 12,000+ MCQs downloaded successfully into offline storage!');
    } catch (e) {
      this.showToast('Error downloading question packs. Please check network connection.', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async importCustomFile() {
    const fileInput = document.getElementById('custom-pack-file');
    if (!fileInput || !fileInput.files.length) {
      this.showToast('Please select a .json or .csv file first.', 'warning');
      return;
    }

    const file = fileInput.files[0];
    const text = await file.text();

    try {
      let parsed = [];
      if (file.name.endsWith('.json')) {
        parsed = JSON.parse(text);
      } else {
        // Basic CSV parsing
        const lines = text.split('\n');
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',');
          if (parts.length >= 5) {
            parsed.push({
              q: parts[0].trim(),
              options: [parts[1].trim(), parts[2].trim(), parts[3].trim(), parts[4].trim()],
              answer: parseInt(parts[5] || '0'),
              subject: parts[6]?.trim() || 'General'
            });
          }
        }
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Invalid format or empty file.');
      }

      await window.appDB.saveQuestionsBatch(parsed);
      await this.updateTotalQuestionStats();
      this.showToast(`Imported ${parsed.length} questions successfully!`);
      fileInput.value = '';
    } catch (err) {
      console.error(err);
      this.showToast('Failed to import file. Ensure valid JSON/CSV structure.', 'error');
    }
  }

  async exportDatabaseBackup() {
    try {
      const url = await window.appDB.exportQuestionsJSON();
      const a = document.createElement('a');
      a.href = url;
      a.download = `JKSSB_Prep_Questions_Backup_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('Questions backup exported successfully!');
    } catch (e) {
      this.showToast('Export failed.', 'error');
    }
  }

  // -------------------------------------------------------------
  // TOAST NOTIFICATIONS
  // -------------------------------------------------------------
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'error') toast.style.borderLeftColor = '#f43f5e';
    if (type === 'warning') toast.style.borderLeftColor = '#f59e0b';

    toast.innerHTML = `
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4000);
  }
}

// Global initialization
window.app = new JKSSBApp();
window.showToast = (msg, type) => window.app.showToast(msg, type);

window.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});

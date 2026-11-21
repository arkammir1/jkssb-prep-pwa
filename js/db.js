/**
 * JKSSB Prep Master - IndexedDB Database Engine
 * Capable of storing and querying 20,000+ MCQs completely offline in the browser.
 */

const DB_NAME = 'JKSSB_Prep_DB_v1';
const DB_VERSION = 1;

class JKSSBDatabase {
  constructor() {
    this.db = null;
    this.isReady = false;
    this.initPromise = null;
  }

  async init() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Questions Store
        if (!db.objectStoreNames.contains('questions')) {
          const qStore = db.createObjectStore('questions', { keyPath: 'id' });
          qStore.createIndex('subject', 'subject', { unique: false });
          qStore.createIndex('topic', 'topic', { unique: false });
          qStore.createIndex('is_pyq', 'is_pyq', { unique: false });
          qStore.createIndex('is_math', 'is_math', { unique: false });
        }

        // Bookmarks Store
        if (!db.objectStoreNames.contains('bookmarks')) {
          db.createObjectStore('bookmarks', { keyPath: 'id' });
        }

        // Test Attempts Store
        if (!db.objectStoreNames.contains('test_history')) {
          const tStore = db.createObjectStore('test_history', { keyPath: 'id', autoIncrement: true });
          tStore.createIndex('postId', 'postId', { unique: false });
          tStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Packs Metadata Store
        if (!db.objectStoreNames.contains('packs_meta')) {
          db.createObjectStore('packs_meta', { keyPath: 'id' });
        }
      };

      request.onsuccess = async (event) => {
        this.db = event.target.result;
        this.isReady = true;

        // Auto-seed starter pack if empty
        const count = await this.getQuestionsCount();
        if (count === 0) {
          console.log('[DB] Seeding starter pack questions...');
          try {
            await this.loadStarterPack();
          } catch (e) {
            console.warn('[DB] Could not load starter pack automatically:', e);
          }
        }

        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[DB] Failed to open IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });

    return this.initPromise;
  }

  async loadStarterPack() {
    try {
      const res = await fetch('./data/questions_starter.json');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      await this.saveQuestionsBatch(data);
      await this.markPackInstalled('starter_pack', data.length);
      console.log(`[DB] Successfully loaded ${data.length} starter questions into IndexedDB.`);
    } catch (err) {
      console.error('[DB] Failed loading starter pack:', err);
    }
  }

  async markPackInstalled(packId, count) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('packs_meta', 'readwrite');
      const store = tx.objectStore('packs_meta');
      store.put({ id: packId, installedAt: Date.now(), count });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getInstalledPacks() {
    return new Promise((resolve) => {
      const tx = this.db.transaction('packs_meta', 'readonly');
      const store = tx.objectStore('packs_meta');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async getQuestionsCount() {
    return new Promise((resolve) => {
      if (!this.db) return resolve(0);
      const tx = this.db.transaction('questions', 'readonly');
      const store = tx.objectStore('questions');
      const countReq = store.count();
      countReq.onsuccess = () => resolve(countReq.result);
      countReq.onerror = () => resolve(0);
    });
  }

  async saveQuestionsBatch(questions) {
    return new Promise((resolve, reject) => {
      if (!questions || !questions.length) return resolve(0);
      const tx = this.db.transaction('questions', 'readwrite');
      const store = tx.objectStore('questions');

      for (const q of questions) {
        if (!q.id) q.id = 'q-' + Math.random().toString(36).substring(2, 9);
        store.put(q);
      }

      tx.oncomplete = () => resolve(questions.length);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAllQuestions() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('questions', 'readonly');
      const store = tx.objectStore('questions');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getQuestionsByFilter({ postId, subject, topic, is_pyq, is_math, search, limit = 50, offset = 0 }) {
    const all = await this.getAllQuestions();
    
    let filtered = all.filter(q => {
      if (postId && q.posts && q.posts.length > 0) {
        if (!q.posts.includes(postId)) return false;
      }
      if (subject && subject !== 'ALL') {
        if (q.subject !== subject) return false;
      }
      if (topic && topic !== 'ALL') {
        if (q.topic !== topic) return false;
      }
      if (is_pyq === true) {
        if (!q.is_pyq) return false;
      }
      if (is_math === true) {
        if (!q.is_math && !q.shortcut_method) return false;
      }
      if (search && search.trim()) {
        const needle = search.toLowerCase();
        const matchesQ = q.q.toLowerCase().includes(needle);
        const matchesTopic = q.topic && q.topic.toLowerCase().includes(needle);
        const matchesSubject = q.subject && q.subject.toLowerCase().includes(needle);
        if (!matchesQ && !matchesTopic && !matchesSubject) return false;
      }
      return true;
    });

    const totalMatching = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      questions: paginated,
      total: totalMatching
    };
  }

  async getRandomPracticeSet({ postId, subject, is_math, is_pyq, count = 20 }) {
    const { questions } = await this.getQuestionsByFilter({
      postId,
      subject,
      is_math,
      is_pyq,
      limit: 10000
    });

    if (questions.length === 0) return [];
    // Shuffle using Fisher-Yates
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  }

  async getMockExamQuestions(postObj) {
    const all = await this.getAllQuestions();
    const postId = postObj.id;
    const relevant = all.filter(q => !q.posts || q.posts.includes(postId));

    if (relevant.length < 20) {
      // Fallback to all questions if specific post tag is small
      return all.slice(0, Math.min(postObj.totalQuestions, all.length));
    }

    // Attempt to distribute proportionally across syllabus subjects
    const selected = [];
    const subjects = postObj.subjects || [];

    for (const sub of subjects) {
      const subQuestions = relevant.filter(q => q.subject.toLowerCase().includes(sub.name.toLowerCase()) || (sub.name.toLowerCase().includes('math') && q.is_math));
      const targetCount = Math.round((sub.weightage / postObj.totalMarks) * postObj.totalQuestions);
      
      const shuffledSub = [...subQuestions].sort(() => 0.5 - Math.random());
      selected.push(...shuffledSub.slice(0, Math.max(1, targetCount)));
    }

    // Fill remaining up to postObj.totalQuestions
    const remainingNeed = postObj.totalQuestions - selected.length;
    if (remainingNeed > 0) {
      const selectedIds = new Set(selected.map(q => q.id));
      const others = relevant.filter(q => !selectedIds.has(q.id)).sort(() => 0.5 - Math.random());
      selected.push(...others.slice(0, remainingNeed));
    }

    return selected.slice(0, postObj.totalQuestions).sort(() => 0.5 - Math.random());
  }

  // Bookmarks
  async toggleBookmark(question, note = '') {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('bookmarks', 'readwrite');
      const store = tx.objectStore('bookmarks');
      const req = store.get(question.id);

      req.onsuccess = () => {
        if (req.result) {
          store.delete(question.id);
          resolve({ bookmarked: false });
        } else {
          store.put({
            id: question.id,
            question,
            note,
            savedAt: Date.now()
          });
          resolve({ bookmarked: true });
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  async isBookmarked(questionId) {
    return new Promise((resolve) => {
      const tx = this.db.transaction('bookmarks', 'readonly');
      const store = tx.objectStore('bookmarks');
      const req = store.get(questionId);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  }

  async getBookmarks() {
    return new Promise((resolve) => {
      const tx = this.db.transaction('bookmarks', 'readonly');
      const store = tx.objectStore('bookmarks');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  // Test History & Analytics
  async saveTestAttempt(attempt) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('test_history', 'readwrite');
      const store = tx.objectStore('test_history');
      const req = store.add(attempt);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getTestHistory() {
    return new Promise((resolve) => {
      const tx = this.db.transaction('test_history', 'readonly');
      const store = tx.objectStore('test_history');
      const req = store.getAll();
      req.onsuccess = () => {
        const sorted = (req.result || []).sort((a, b) => b.timestamp - a.timestamp);
        resolve(sorted);
      };
      req.onerror = () => resolve([]);
    });
  }

  // Stream install all chunks to reach 12,000+ to 20,000 MCQs
  async installAllPacks(onProgress = () => {}) {
    try {
      const manifestRes = await fetch('./data/dataset_manifest.json');
      const manifest = await manifestRes.json();
      const totalPacks = manifest.totalPacks || 6;
      let totalImported = 0;

      for (let i = 1; i <= totalPacks; i++) {
        const packNum = String(i).padStart(2, '0');
        const packUrl = `./data/packs/pack_${packNum}.json`;
        onProgress({ current: i, total: totalPacks, status: `Downloading Question Pack ${i}/${totalPacks}...` });

        try {
          const res = await fetch(packUrl);
          if (res.ok) {
            const packData = await res.json();
            await this.saveQuestionsBatch(packData);
            await this.markPackInstalled(`pack_${packNum}`, packData.length);
            totalImported += packData.length;
          }
        } catch (packErr) {
          console.warn(`Failed loading pack ${packUrl}:`, packErr);
        }
      }

      onProgress({ current: totalPacks, total: totalPacks, status: `Complete! ${totalImported} MCQs ready offline.` });
      return totalImported;
    } catch (e) {
      console.error('[DB] Pack download error:', e);
      throw e;
    }
  }

  // Export questions backup
  async exportQuestionsJSON() {
    const questions = await this.getAllQuestions();
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' });
    return URL.createObjectURL(blob);
  }
}

// Global DB instance
window.appDB = new JKSSBDatabase();

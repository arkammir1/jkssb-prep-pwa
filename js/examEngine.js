/**
 * JKSSB Prep Master - Exam & Test Engine
 * Full-scale simulation of JKSSB Computer-Based Test (CBT) & Practice Engine
 */

class JKSSBExamEngine {
  constructor(post, questions, mode = 'mock') {
    this.post = post;
    this.questions = questions; // array of question objects
    this.mode = mode; // 'mock' or 'practice'
    this.currentIndex = 0;
    this.answers = {}; // qId -> selectedOptionIndex (0-3)
    this.reviewFlags = {}; // qId -> boolean
    this.timeSpent = {}; // qId -> seconds
    this.startTime = Date.now();
    this.durationSeconds = (post.durationMinutes || 120) * 60;
    this.remainingSeconds = this.durationSeconds;
    this.timerInterval = null;
    this.isSubmitted = false;
    this.result = null;
    this.activeSolutionTab = {}; // qId -> 'shortcut' or 'traditional'
  }

  start(onTick, onTimeUp) {
    this.startTime = Date.now();
    this.remainingSeconds = this.durationSeconds;

    if (this.mode === 'mock') {
      this.timerInterval = setInterval(() => {
        this.remainingSeconds--;
        const currentQId = this.questions[this.currentIndex]?.id;
        if (currentQId) {
          this.timeSpent[currentQId] = (this.timeSpent[currentQId] || 0) + 1;
        }

        onTick(this.formatTime(this.remainingSeconds), this.remainingSeconds);

        if (this.remainingSeconds <= 0) {
          this.stop();
          onTimeUp();
        }
      }, 1000);
    }
  }

  stop() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatTime(secs) {
    if (secs < 0) secs = 0;
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  getCurrentQuestion() {
    return this.questions[this.currentIndex];
  }

  selectAnswer(optionIndex) {
    const q = this.getCurrentQuestion();
    if (!q || this.isSubmitted) return;
    this.answers[q.id] = optionIndex;
  }

  clearAnswer() {
    const q = this.getCurrentQuestion();
    if (!q || this.isSubmitted) return;
    delete this.answers[q.id];
  }

  toggleReview() {
    const q = this.getCurrentQuestion();
    if (!q) return;
    this.reviewFlags[q.id] = !this.reviewFlags[q.id];
  }

  goTo(index) {
    if (index >= 0 && index < this.questions.length) {
      this.currentIndex = index;
    }
  }

  next() {
    if (this.currentIndex < this.questions.length - 1) {
      this.currentIndex++;
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
  }

  getStatus(index) {
    const q = this.questions[index];
    if (!q) return 'not-visited';
    const isAnswered = this.answers[q.id] !== undefined;
    const isMarked = !!this.reviewFlags[q.id];

    if (isAnswered && isMarked) return 'answered-marked';
    if (isAnswered) return 'answered';
    if (isMarked) return 'marked';
    if (this.timeSpent[q.id] !== undefined || index <= this.currentIndex) return 'not-answered';
    return 'not-visited';
  }

  getSummary() {
    let answered = 0;
    let notAnswered = 0;
    let marked = 0;
    let answeredMarked = 0;

    for (let i = 0; i < this.questions.length; i++) {
      const status = this.getStatus(i);
      if (status === 'answered') answered++;
      else if (status === 'answered-marked') answeredMarked++;
      else if (status === 'marked') marked++;
      else notAnswered++;
    }

    return {
      total: this.questions.length,
      answered,
      notAnswered,
      marked,
      answeredMarked
    };
  }

  submit() {
    this.stop();
    this.isSubmitted = true;

    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    let totalMarks = 0;
    const negPenalty = this.post.negativeMarking || 0.25;

    const subjectBreakdown = {};

    this.questions.forEach((q) => {
      const sub = q.subject || 'General';
      if (!subjectBreakdown[sub]) {
        subjectBreakdown[sub] = { total: 0, correct: 0, incorrect: 0, unattempted: 0, score: 0 };
      }
      subjectBreakdown[sub].total++;

      const selected = this.answers[q.id];
      if (selected === undefined) {
        unattemptedCount++;
        subjectBreakdown[sub].unattempted++;
      } else if (selected === q.answer) {
        correctCount++;
        subjectBreakdown[sub].correct++;
        subjectBreakdown[sub].score += 1.0;
        totalMarks += 1.0;
      } else {
        incorrectCount++;
        subjectBreakdown[sub].incorrect++;
        subjectBreakdown[sub].score -= negPenalty;
        totalMarks -= negPenalty;
      }
    });

    const attempted = correctCount + incorrectCount;
    const accuracy = attempted > 0 ? ((correctCount / attempted) * 100).toFixed(1) : '0.0';
    const finalScore = Math.max(0, parseFloat(totalMarks.toFixed(2)));
    const percentage = ((finalScore / this.questions.length) * 100).toFixed(1);

    this.result = {
      postId: this.post.id,
      postName: this.post.name,
      totalQuestions: this.questions.length,
      maxMarks: this.questions.length,
      finalScore,
      correctCount,
      incorrectCount,
      unattemptedCount,
      negativePenaltyLost: parseFloat((incorrectCount * negPenalty).toFixed(2)),
      accuracy: parseFloat(accuracy),
      percentage: parseFloat(percentage),
      timeTakenSeconds: this.durationSeconds - this.remainingSeconds,
      timestamp: Date.now(),
      subjectBreakdown,
      answers: this.answers
    };

    return this.result;
  }
}

window.JKSSBExamEngine = JKSSBExamEngine;

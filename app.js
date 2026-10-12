// ===== 초등 5학년 사회 퀴즈: 조선 시대 문화 =====

(function() {
  'use strict';

  // 상태 관리 객체
  const state = {
    currentIndex: 0,
    score: 0,
    answers: [], // { questionId, selectedIndex, isCorrect }
    isAnswered: false,
    isMuted: false,
    fontSize: 'large' // 'normal' | 'large' | 'xlarge'
  };

  // DOM 요소 캐싱
  const elements = {
    questionCard: document.getElementById('quiz-card'),
    resultCard: document.getElementById('result-container'),
    
    // 헤더 및 상태
    currNum: document.getElementById('curr-num'),
    totalNum: document.getElementById('total-num'),
    liveScore: document.getElementById('live-score'),
    progressDots: document.getElementById('progress-dots'),
    
    // 문제 본문
    categoryTag: document.getElementById('category-tag'),
    questionText: document.getElementById('question-text'),
    optionsList: document.getElementById('options-list'),
    
    // 해설 카드
    explanationCard: document.getElementById('explanation-card'),
    explanationTitle: document.getElementById('explanation-title'),
    explanationContent: document.getElementById('explanation-content'),
    
    // 액션 버튼
    cardActions: document.getElementById('card-actions'),
    nextBtn: document.getElementById('next-btn'),
    
    // 결과 화면
    resultBadge: document.getElementById('result-badge'),
    resultScoreText: document.getElementById('result-score-text'),
    resultCorrectCount: document.getElementById('result-correct-count'),
    praiseTitle: document.getElementById('praise-title'),
    praiseDesc: document.getElementById('praise-desc'),
    wrongNotesSection: document.getElementById('wrong-notes-section'),
    wrongNotesToggle: document.getElementById('wrong-notes-toggle'),
    wrongNotesList: document.getElementById('wrong-notes-list'),
    restartBtn: document.getElementById('restart-btn'),
    
    // 컨트롤 버튼들
    soundBtn: document.getElementById('sound-toggle-btn'),
    fullscreenBtn: document.getElementById('fullscreen-btn'),
    fontBtns: document.querySelectorAll('.font-btn'),
    confettiCanvas: document.getElementById('confetti-canvas')
  };

  // ==========================================
  // 1. Web Audio API 사운드 합성기 (외부 파일 다운로드 의존성 0)
  // ==========================================
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // 맑은 비프 톤 재생
  function playTone(freq, type = 'sine', duration = 0.15, startTime = 0, gainLevel = 0.15) {
    if (state.isMuted || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);

      gain.gain.setValueAtTime(gainLevel, audioCtx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(audioCtx.currentTime + startTime);
      osc.stop(audioCtx.currentTime + startTime + duration);
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }

  // 효과음 1: 딩동댕 (정답)
  function soundCorrect() {
    initAudio();
    if (state.isMuted) return;
    // 도(523Hz) -> 미(659Hz) -> 솔(784Hz) -> 높은 도(1046Hz) 화음
    playTone(523.25, 'triangle', 0.2, 0.0, 0.2);
    playTone(659.25, 'triangle', 0.2, 0.12, 0.2);
    playTone(783.99, 'triangle', 0.2, 0.24, 0.2);
    playTone(1046.50, 'triangle', 0.35, 0.36, 0.25);
  }

  // 효과음 2: 땡 (오답)
  function soundWrong() {
    initAudio();
    if (state.isMuted) return;
    // 낮은 음 2연타
    playTone(320, 'sawtooth', 0.2, 0.0, 0.15);
    playTone(280, 'sawtooth', 0.3, 0.15, 0.18);
  }

  // 효과음 3: 버튼 톡 (클릭)
  function soundClick() {
    initAudio();
    if (state.isMuted) return;
    playTone(600, 'sine', 0.06, 0.0, 0.08);
  }

  // 효과음 4: 팡파르 (퀴즈 종료 축하)
  function soundFanfare() {
    initAudio();
    if (state.isMuted) return;
    const notes = [
      { f: 523.25, t: 0.0, d: 0.15 },
      { f: 523.25, t: 0.15, d: 0.15 },
      { f: 523.25, t: 0.3, d: 0.15 },
      { f: 659.25, t: 0.45, d: 0.35 },
      { f: 783.99, t: 0.8, d: 0.2 },
      { f: 1046.50, t: 1.0, d: 0.6 }
    ];
    notes.forEach(n => playTone(n.f, 'triangle', n.d, n.t, 0.22));
  }

  // ==========================================
  // 2. 가벼운 내장 Canvas Confetti (꽃가루 폭죽)
  // ==========================================
  let confettiParticles = [];
  let confettiAnimId = null;

  function triggerConfetti(particleCount = 50, durationMs = 2500) {
    const canvas = elements.confettiCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#ef4444', '#fbbf24'];

    for (let i = 0; i < particleCount; i++) {
      confettiParticles.push({
        x: canvas.width * (0.2 + Math.random() * 0.6),
        y: canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 12 - 4,
        size: Math.random() * 10 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 10,
        alpha: 1
      });
    }

    const startTime = performance.now();

    function renderConfetti(currentTime) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const elapsed = currentTime - startTime;

      confettiParticles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // 중력
        p.rotation += p.rSpeed;
        p.vx *= 0.98;

        if (elapsed > durationMs - 800) {
          p.alpha = Math.max(0, p.alpha - 0.02);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      confettiParticles = confettiParticles.filter(p => p.y < canvas.height + 50 && p.alpha > 0);

      if (confettiParticles.length > 0 && elapsed < durationMs) {
        confettiAnimId = requestAnimationFrame(renderConfetti);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        confettiParticles = [];
      }
    }

    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
    confettiAnimId = requestAnimationFrame(renderConfetti);
  }

  // ==========================================
  // 3. UI 및 글자 크기 / 전체화면 제어
  // ==========================================
  function setFontSize(size) {
    state.fontSize = size;
    document.body.setAttribute('data-font-size', size);
    localStorage.setItem('quiz_font_size', size);

    elements.fontBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Fullscreen error: ${err.message}`);
      });
      elements.fullscreenBtn.innerHTML = `<span>⤢</span><span>창모드</span>`;
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      elements.fullscreenBtn.innerHTML = `<span>⛶</span><span>전체화면</span>`;
    }
  }

  function toggleMute() {
    state.isMuted = !state.isMuted;
    elements.soundBtn.innerHTML = state.isMuted ? '<span>🔇</span><span>소리 끔</span>' : '<span>🔊</span><span>소리 켬</span>';
    localStorage.setItem('quiz_muted', state.isMuted ? '1' : '0');
  }

  // 진행 도트 인디케이터 초기 렌더링
  function initProgressDots() {
    elements.progressDots.innerHTML = '';
    QUIZ_DATA.forEach((_, idx) => {
      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.id = `dot-${idx}`;
      elements.progressDots.appendChild(dot);
    });
  }

  function updateProgressDots() {
    QUIZ_DATA.forEach((_, idx) => {
      const dot = document.getElementById(`dot-${idx}`);
      if (!dot) return;

      dot.className = 'dot';
      const ansRecord = state.answers[idx];

      if (ansRecord) {
        dot.classList.add(ansRecord.isCorrect ? 'correct' : 'wrong');
      } else if (idx === state.currentIndex) {
        dot.classList.add('active');
      }
    });
  }

  // ==========================================
  // 4. 문제 렌더링 및 인터랙션
  // ==========================================
  const OPTION_CIRCLES = ['①', '②', '③', '④'];

  function renderQuestion(index) {
    state.isAnswered = false;
    const qData = QUIZ_DATA[index];

    // 헤더 상태 갱신
    elements.currNum.textContent = index + 1;
    elements.totalNum.textContent = QUIZ_DATA.length;
    elements.liveScore.textContent = `${state.score}점`;
    updateProgressDots();

    // 카테고리 & 지문
    elements.categoryTag.innerHTML = `<span>${qData.icon}</span><span>${qData.category}</span>`;
    elements.questionText.textContent = `${index + 1}. ${qData.question}`;

    // 해설 카드 숨김 초기화
    elements.explanationCard.style.display = 'none';
    elements.explanationCard.className = 'explanation-card';
    elements.cardActions.style.display = 'none';

    // 보기 버튼 렌더링
    elements.optionsList.innerHTML = '';
    qData.options.forEach((optText, optIdx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.setAttribute('data-index', optIdx);

      btn.innerHTML = `
        <span class="option-num">${OPTION_CIRCLES[optIdx]}</span>
        <span class="option-text">${optText}</span>
        <span class="option-result-icon"></span>
      `;

      btn.addEventListener('click', () => handleOptionSelect(optIdx));
      elements.optionsList.appendChild(btn);
    });

    // 다음 버튼 텍스트 설정
    if (index === QUIZ_DATA.length - 1) {
      elements.nextBtn.innerHTML = `<span>결과 보러 가기</span><span>🏆</span>`;
    } else {
      elements.nextBtn.innerHTML = `<span>다음 문제로</span><span>👉</span>`;
    }
  }

  // 보기 선택 처리
  function handleOptionSelect(selectedIndex) {
    if (state.isAnswered) return;
    state.isAnswered = true;

    initAudio();

    const qData = QUIZ_DATA[state.currentIndex];
    const isCorrect = (selectedIndex === qData.answer);

    // 점수 및 기록 반영
    if (isCorrect) {
      state.score += 10;
    }
    state.answers.push({
      questionIndex: state.currentIndex,
      questionId: qData.id,
      selectedIndex: selectedIndex,
      correctIndex: qData.answer,
      isCorrect: isCorrect
    });

    // 실시간 점수 UI 업데이트
    elements.liveScore.textContent = `${state.score}점`;
    updateProgressDots();

    // 모든 보기 버튼 비활성화 & 정답/오답 스타일링
    const optionBtns = elements.optionsList.querySelectorAll('.option-btn');
    optionBtns.forEach((btn, idx) => {
      btn.disabled = true;

      const iconSpan = btn.querySelector('.option-result-icon');

      if (idx === selectedIndex) {
        if (isCorrect) {
          btn.classList.add('selected-correct');
          iconSpan.textContent = '✅ 정답!';
        } else {
          btn.classList.add('selected-wrong');
          iconSpan.textContent = '❌ 내가 고른 답';
        }
      }

      // 오답을 골랐을 때, 진짜 정답 버튼을 강조 표시
      if (!isCorrect && idx === qData.answer) {
        btn.classList.add('highlight-answer');
        const correctIcon = btn.querySelector('.option-result-icon');
        correctIcon.style.display = 'inline-block';
        correctIcon.textContent = '🌟 정답';
      }
    });

    // 해설 카드 내용 설정 및 표시
    if (isCorrect) {
      soundCorrect();
      triggerConfetti(25, 1800);
      elements.explanationCard.classList.add('is-correct');
      elements.explanationTitle.className = 'explanation-title title-correct';
      elements.explanationTitle.innerHTML = `<span>🎉</span><span>정답입니다! 참 잘했어요!</span>`;
    } else {
      soundWrong();
      elements.explanationCard.classList.add('is-wrong');
      elements.explanationTitle.className = 'explanation-title title-wrong';
      elements.explanationTitle.innerHTML = `<span>💡</span><span>아쉽지만 정답은 ${OPTION_CIRCLES[qData.answer]}번이에요!</span>`;
    }

    elements.explanationContent.textContent = qData.explanation;
    elements.explanationCard.style.display = 'block';

    // 다음 문제 액션 버튼 노출
    elements.cardActions.style.display = 'flex';
    elements.nextBtn.focus();
  }

  // 다음 문제로 넘어가기
  function handleNext() {
    soundClick();
    if (state.currentIndex < QUIZ_DATA.length - 1) {
      state.currentIndex++;
      renderQuestion(state.currentIndex);
      // 부드러운 스크롤 탑
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      showResult();
    }
  }

  // ==========================================
  // 5. 결과 화면 및 총점 표시
  // ==========================================
  function showResult() {
    soundFanfare();
    triggerConfetti(80, 4000);

    elements.questionCard.style.display = 'none';
    elements.resultCard.style.display = 'block';

    const correctCount = state.answers.filter(a => a.isCorrect).length;
    elements.resultScoreText.textContent = `${state.score}점`;
    elements.resultCorrectCount.textContent = `${QUIZ_DATA.length}문제 중 ${correctCount}문제를 맞혔어요!`;

    // 칭찬 피드백 문구 및 배지 설정
    let badge = "👑";
    let title = "조선의 최고 학자! 집현전 대제학";
    let desc = "조선 시대 문화를 완벽하게 섭렵했군요! 세종대왕님도 깜짝 놀라 칭찬하실 멋진 실력입니다!";

    if (state.score === 100) {
      badge = "👑";
      title = "조선 최고의 학자! 집현전 대제학";
      desc = "100점 만점! 조선 시대 역사와 문화를 완벽하게 이해하고 있어요. 우리 문화유산을 사랑하는 최고 멋쟁이입니다!";
    } else if (state.score >= 80) {
      badge = "📜";
      title = "해박한 지식의 실학자";
      desc = "80점 이상 고득점 달성! 조선 시대 문화를 아주 잘 알고 있네요. 조금만 더 복습하면 곧 만점 왕이 될 거예요!";
    } else if (state.score >= 60) {
      badge = "🎨";
      title = "지혜로운 조선의 서당 학동";
      desc = "조선 시대 문화의 기본을 탄탄하게 다졌어요! 틀린 문제를 해설과 함께 다시 읽어보고 한 번 더 도전해 보세요!";
    } else {
      badge = "🐯";
      title = "열정 가득한 역사 탐험대장";
      desc = "포기하지 않고 끝까지 10문제를 모두 풀었어요! 아래 [오답 확인하기]를 꼼꼼히 읽고 다시 풀기에 도전해 보세요!";
    }

    elements.resultBadge.textContent = badge;
    elements.praiseTitle.textContent = title;
    elements.praiseDesc.textContent = desc;

    // 틀린 문제 오답 노트 생성
    const wrongAnswers = state.answers.filter(a => !a.isCorrect);
    if (wrongAnswers.length > 0) {
      elements.wrongNotesSection.style.display = 'block';
      elements.wrongNotesList.innerHTML = '';
      
      wrongAnswers.forEach(item => {
        const q = QUIZ_DATA[item.questionIndex];
        const noteDiv = document.createElement('div');
        noteDiv.className = 'wrong-note-item';
        noteDiv.innerHTML = `
          <div class="wrong-q-title">Q${item.questionIndex + 1}. ${q.question}</div>
          <div style="font-size:0.95rem; margin-bottom: 0.35rem; color: #b91c1c; font-weight:700;">
            내가 고른 답: ${OPTION_CIRCLES[item.selectedIndex]} ${q.options[item.selectedIndex]} ➔ 
            <span style="color:#15803d;">정답: ${OPTION_CIRCLES[item.correctIndex]} ${q.options[item.correctIndex]}</span>
          </div>
          <div class="wrong-q-exp">💡 <b>해설:</b> ${q.explanation}</div>
        `;
        elements.wrongNotesList.appendChild(noteDiv);
      });
    } else {
      elements.wrongNotesSection.style.display = 'none';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 퀴즈 다시 풀기
  function restartQuiz() {
    soundClick();
    state.currentIndex = 0;
    state.score = 0;
    state.answers = [];
    state.isAnswered = false;

    elements.resultCard.style.display = 'none';
    elements.questionCard.style.display = 'flex';

    initProgressDots();
    renderQuestion(0);
  }

  // ==========================================
  // 6. 키보드 단축키 지원 (교실 TV / 무선 리모컨 호환)
  // ==========================================
  function handleKeyDown(e) {
    // 1~4 숫자키로 보기 선택
    if (!state.isAnswered && ['1', '2', '3', '4'].includes(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      const optionBtns = elements.optionsList.querySelectorAll('.option-btn');
      if (optionBtns[idx]) {
        optionBtns[idx].click();
      }
    }
    // Enter 또는 Space 키로 다음 문제 넘어가기
    else if (state.isAnswered && (e.key === 'Enter' || e.key === ' ')) {
      if (elements.resultCard.style.display === 'block') {
        // 결과 화면에서는 다시 풀기
        restartQuiz();
      } else {
        handleNext();
      }
      e.preventDefault();
    }
  }

  // ==========================================
  // 7. 초기화 및 이벤트 리스너 바인딩
  // ==========================================
  function init() {
    // 저장된 설정 불러오기
    const savedFontSize = localStorage.getItem('quiz_font_size') || 'large';
    setFontSize(savedFontSize);

    const savedMuted = localStorage.getItem('quiz_muted') === '1';
    if (savedMuted) {
      toggleMute();
    }

    // 이벤트 리스너
    elements.nextBtn.addEventListener('click', handleNext);
    elements.restartBtn.addEventListener('click', restartQuiz);
    elements.soundBtn.addEventListener('click', toggleMute);
    elements.fullscreenBtn.addEventListener('click', toggleFullscreen);

    elements.fontBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        setFontSize(btn.dataset.size);
        soundClick();
      });
    });

    // 오답 노트 토글
    elements.wrongNotesToggle.addEventListener('click', () => {
      soundClick();
      const isVisible = elements.wrongNotesList.style.display === 'block';
      elements.wrongNotesList.style.display = isVisible ? 'none' : 'block';
      elements.wrongNotesToggle.querySelector('span:last-child').textContent = isVisible ? '▼ 펼치기' : '▲ 접기';
    });

    // 키보드 이벤트
    window.addEventListener('keydown', handleKeyDown);

    // 첫 인터랙션 시 오디오 컨텍스트 기동
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });

    // 퀴즈 시작
    initProgressDots();
    renderQuestion(0);
  }

  // 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

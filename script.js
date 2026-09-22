/**
 * OmniCalc — Multi-Mode Calculator Application
 * Features: Standard, Scientific, Programmer, and Unit Converter
 */

(() => {
  'use strict';

  /* ==========================================================================
     Application State
     ========================================================================== */
  const state = {
    mode: 'standard', // 'standard' | 'scientific' | 'programmer' | 'converter'
    theme: localStorage.getItem('omnicalc_theme') || 'dark',
    soundEnabled: localStorage.getItem('omnicalc_sound') !== 'off',
    angleUnit: localStorage.getItem('omnicalc_angle') || 'deg', // 'deg' | 'rad'
    is2ndActive: false,

    // Standard / Scientific State
    currentInput: '0',
    expressionTokens: [], // Array of numbers/operators/parens
    previousExpression: '',
    activeOperator: null,
    isNewInput: true,
    memoryValue: parseFloat(localStorage.getItem('omnicalc_memory') || '0'),
    history: JSON.parse(localStorage.getItem('omnicalc_history') || '[]'),

    // Programmer State
    progBase: 'DEC', // 'HEX' | 'DEC' | 'OCT' | 'BIN'
    progWordSize: 64, // 64 | 32 | 16 | 8
    progValue: 0n,
    progPrevValue: null,
    progOp: null,
    progNewInput: true,

    // Converter State
    converterCat: 'length',
    fromUnit: '',
    toUnit: '',
    convInputVal: '1'
  };

  /* ==========================================================================
     DOM Elements Cache
     ========================================================================== */
  const DOM = {
    body: document.body,
    // Header & Controls
    modeTabs: document.querySelectorAll('.mode-tab'),
    soundToggleBtn: document.getElementById('soundToggleBtn'),
    soundIconOn: document.getElementById('soundIconOn'),
    soundIconOff: document.getElementById('soundIconOff'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeDropdown: document.getElementById('themeDropdown'),
    themeOptions: document.querySelectorAll('.theme-opt'),
    historyToggleBtn: document.getElementById('historyToggleBtn'),

    // Sections
    calculatorSection: document.getElementById('calculatorSection'),
    converterSection: document.getElementById('converterSection'),

    // Display & Badges
    displayContainer: document.getElementById('displayContainer'),
    primaryDisplay: document.getElementById('primaryDisplay'),
    historyPreview: document.getElementById('historyPreview'),
    memoryBadge: document.getElementById('memoryBadge'),
    degRadBadge: document.getElementById('degRadBadge'),
    baseModeBadge: document.getElementById('baseModeBadge'),
    copyBtn: document.getElementById('copyBtn'),

    // Memory Bar
    memoryBar: document.getElementById('memoryBar'),
    memBtns: document.querySelectorAll('.mem-btn'),

    // Keypads
    scientificGrid: document.getElementById('scientificGrid'),
    btn2nd: document.getElementById('btn2nd'),
    btnDegRadKey: document.getElementById('btnDegRadKey'),
    programmerBases: document.getElementById('programmerBases'),
    programmerGrid: document.getElementById('programmerGrid'),
    standardGrid: document.getElementById('standardGrid'),
    keyClear: document.getElementById('keyClear'),

    // Programmer Elements
    baseRows: document.querySelectorAll('.base-row'),
    hexVal: document.getElementById('hexVal'),
    decVal: document.getElementById('decVal'),
    octVal: document.getElementById('octVal'),
    binVal: document.getElementById('binVal'),
    wordSizeBtns: document.querySelectorAll('.word-size-btn'),
    hexBtns: document.querySelectorAll('.btn-hex'),
    progOpBtns: document.querySelectorAll('.btn-prog'),

    // Converter Elements
    converterCategories: document.getElementById('converterCategories'),
    catPills: document.querySelectorAll('.cat-pill'),
    fromUnitSelect: document.getElementById('fromUnitSelect'),
    toUnitSelect: document.getElementById('toUnitSelect'),
    fromUnitInput: document.getElementById('fromUnitInput'),
    convClearInput: document.getElementById('convClearInput'),
    swapUnitsBtn: document.getElementById('swapUnitsBtn'),
    toUnitDisplay: document.getElementById('toUnitDisplay'),
    convFormulaInfo: document.getElementById('convFormulaInfo'),
    convKeys: document.querySelectorAll('.conv-key'),

    // History Drawer
    historyDrawer: document.getElementById('historyDrawer'),
    closeHistoryBtn: document.getElementById('closeHistoryBtn'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    historyList: document.getElementById('historyList'),

    // Toast
    toast: document.getElementById('toastNotification')
  };

  /* ==========================================================================
     Audio Synthesis (Web Audio API)
     ========================================================================== */
  class SoundEngine {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    play(freq, type = 'sine', duration = 0.03, gainVal = 0.15) {
      if (!state.soundEnabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(gainVal, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + duration);
      } catch (e) {
        // Audio playback can fail silently if user hasn't interacted
      }
    }

    click() {
      this.play(1100, 'sine', 0.02, 0.08);
      if (navigator.vibrate) navigator.vibrate(10);
    }

    opClick() {
      this.play(750, 'triangle', 0.03, 0.1);
      if (navigator.vibrate) navigator.vibrate(12);
    }

    equals() {
      if (!state.soundEnabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25]; // C5, E5
        notes.forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.06);
          gain.gain.setValueAtTime(0.12, now + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.12);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.12);
        });
      } catch (e) {}
      if (navigator.vibrate) navigator.vibrate([15, 30, 20]);
    }

    clear() {
      this.play(380, 'sine', 0.04, 0.1);
      if (navigator.vibrate) navigator.vibrate(15);
    }

    error() {
      this.play(180, 'sawtooth', 0.08, 0.12);
      if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
    }
  }

  const sound = new SoundEngine();

  /* ==========================================================================
     Theme Management
     ========================================================================== */
  function applyTheme(themeName) {
    DOM.body.setAttribute('data-theme', themeName);
    state.theme = themeName;
    localStorage.setItem('omnicalc_theme', themeName);

    DOM.themeOptions.forEach(opt => {
      const match = opt.getAttribute('data-theme-val') === themeName;
      opt.classList.toggle('active', match);
    });
  }

  function toggleThemeDropdown(show) {
    const isHidden = DOM.themeDropdown.classList.contains('hidden');
    const targetState = show !== undefined ? show : isHidden;
    DOM.themeDropdown.classList.toggle('hidden', !targetState);
  }

  /* ==========================================================================
     Sound Settings
     ========================================================================== */
  function updateSoundUI() {
    DOM.soundIconOn.classList.toggle('hidden', !state.soundEnabled);
    DOM.soundIconOff.classList.toggle('hidden', state.soundEnabled);
    DOM.soundToggleBtn.setAttribute('title', state.soundEnabled ? 'Mute audio' : 'Unmute audio');
  }

  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    localStorage.setItem('omnicalc_sound', state.soundEnabled ? 'on' : 'off');
    updateSoundUI();
    if (state.soundEnabled) sound.click();
  }

  /* ==========================================================================
     Toast Notifications
     ========================================================================== */
  let toastTimer = null;
  function showToast(message, duration = 2200) {
    if (!DOM.toast) return;
    DOM.toast.textContent = message;
    DOM.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      DOM.toast.classList.add('hidden');
    }, duration);
  }

  /* ==========================================================================
     Display Helper Utilities
     ========================================================================== */
  function adjustFontSize(text) {
    const len = text.length;
    if (len > 18) {
      DOM.primaryDisplay.style.fontSize = '1.3rem';
    } else if (len > 13) {
      DOM.primaryDisplay.style.fontSize = '1.75rem';
    } else if (len > 9) {
      DOM.primaryDisplay.style.fontSize = '2.1rem';
    } else {
      DOM.primaryDisplay.style.fontSize = '2.5rem';
    }
  }

  function setDisplay(text, updateFontSize = true) {
    DOM.primaryDisplay.textContent = text;
    if (updateFontSize) adjustFontSize(text);
  }

  function setHistoryPreview(text) {
    DOM.historyPreview.textContent = text;
  }

  function formatNumber(num, maxDecimals = 10) {
    if (isNaN(num)) return 'Error';
    if (!isFinite(num)) return num > 0 ? 'Infinity' : '-Infinity';

    // Handle floating point inaccuracies (e.g., 0.1 + 0.2 = 0.3)
    const factor = Math.pow(10, maxDecimals);
    const rounded = Math.round((num + Number.EPSILON) * factor) / factor;

    // Check if exponential notation is needed
    if (Math.abs(rounded) >= 1e15 || (Math.abs(rounded) > 0 && Math.abs(rounded) < 1e-7)) {
      return rounded.toExponential(6).replace(/\.0+e/, 'e');
    }

    const str = rounded.toString();
    const parts = str.split('.');
    // Add comma formatting to integer part if reasonable length
    if (parts[0].length <= 15 && !parts[0].includes('e')) {
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return parts.join('.');
  }

  /* ==========================================================================
     Math & Evaluation Engine (Standard & Scientific)
     ========================================================================== */
  function factorial(n) {
    if (n < 0 || Math.floor(n) !== n) return NaN;
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity; // Overflow standard IEEE float
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  }

  function toRadians(angle) {
    return state.angleUnit === 'deg' ? (angle * Math.PI) / 180 : angle;
  }

  function fromRadians(angle) {
    return state.angleUnit === 'deg' ? (angle * 180) / Math.PI : angle;
  }

  /**
   * Safe Math Expression Evaluator
   * Supports: +, -, *, /, %, ^, unary minus, parentheses, and math functions
   */
  function evaluateExpression(expr) {
    // Standardize symbols
    let sanitized = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/π/g, `${Math.PI}`)
      .replace(/e(?![a-z0-9])/gi, `${Math.E}`);

    // Tokenizer
    const tokens = [];
    let i = 0;
    while (i < sanitized.length) {
      const ch = sanitized[i];

      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Numbers (including decimals)
      if (/\d/.test(ch) || (ch === '.' && /\d/.test(sanitized[i + 1] || ''))) {
        let numStr = '';
        while (i < sanitized.length && (/[\d.]/.test(sanitized[i]) || (sanitized[i] === 'e' && /[\d+-]/.test(sanitized[i + 1] || '')))) {
          numStr += sanitized[i];
          if (sanitized[i] === 'e') {
            i++;
            if (i < sanitized.length && (sanitized[i] === '+' || sanitized[i] === '-')) {
              numStr += sanitized[i];
              i++;
            }
            continue;
          }
          i++;
        }
        tokens.push({ type: 'number', value: parseFloat(numStr) });
        continue;
      }

      // Function identifiers (sin, cos, tan, asin, acos, atan, ln, log, sqrt, abs)
      if (/[a-zA-Z]/.test(ch)) {
        let fnStr = '';
        while (i < sanitized.length && /[a-zA-Z0-9]/.test(sanitized[i])) {
          fnStr += sanitized[i];
          i++;
        }
        tokens.push({ type: 'func', value: fnStr.toLowerCase() });
        continue;
      }

      // Operators & Parentheses
      if ('+-*/%^()'.includes(ch)) {
        tokens.push({ type: 'op', value: ch });
        i++;
        continue;
      }

      i++;
    }

    // Shunting-yard algorithm to Reverse Polish Notation (RPN)
    const precedence = {
      '+': 1,
      '-': 1,
      '*': 2,
      '/': 2,
      '%': 2,
      '^': 3,
      'u-': 4 // Unary minus
    };

    const associativity = {
      '+': 'L',
      '-': 'L',
      '*': 'L',
      '/': 'L',
      '%': 'L',
      '^': 'R',
      'u-': 'R'
    };

    const outputQueue = [];
    const opStack = [];

    for (let k = 0; k < tokens.length; k++) {
      const token = tokens[k];

      if (token.type === 'number') {
        outputQueue.push(token);
      } else if (token.type === 'func') {
        opStack.push(token);
      } else if (token.type === 'op') {
        let op = token.value;

        // Determine if minus is unary
        if (op === '-') {
          const prev = tokens[k - 1];
          if (!prev || (prev.type === 'op' && prev.value !== ')') || prev.type === 'func') {
            op = 'u-';
          }
        }

        if (op === '(') {
          opStack.push({ type: 'op', value: '(' });
        } else if (op === ')') {
          while (opStack.length && opStack[opStack.length - 1].value !== '(') {
            outputQueue.push(opStack.pop());
          }
          if (!opStack.length) throw new Error('Mismatched parentheses');
          opStack.pop(); // discard '('
          if (opStack.length && opStack[opStack.length - 1].type === 'func') {
            outputQueue.push(opStack.pop());
          }
        } else {
          while (
            opStack.length &&
            opStack[opStack.length - 1].value !== '(' &&
            (
              (associativity[op] === 'L' && precedence[op] <= precedence[opStack[opStack.length - 1].value]) ||
              (associativity[op] === 'R' && precedence[op] < precedence[opStack[opStack.length - 1].value])
            )
          ) {
            outputQueue.push(opStack.pop());
          }
          opStack.push({ type: 'op', value: op });
        }
      }
    }

    while (opStack.length) {
      const top = opStack.pop();
      if (top.value === '(' || top.value === ')') throw new Error('Mismatched parentheses');
      outputQueue.push(top);
    }

    // Evaluate RPN
    const stack = [];
    for (const token of outputQueue) {
      if (token.type === 'number') {
        stack.push(token.value);
      } else if (token.type === 'func') {
        const arg = stack.pop();
        if (arg === undefined) throw new Error('Invalid function call');
        let res;
        switch (token.value) {
          case 'sin':
            res = Math.sin(toRadians(arg));
            break;
          case 'cos':
            res = Math.cos(toRadians(arg));
            break;
          case 'tan': {
            const rad = toRadians(arg);
            if (Math.abs(Math.cos(rad)) < 1e-15) throw new Error('Undefined (tan 90°)');
            res = Math.tan(rad);
            break;
          }
          case 'asin':
            if (arg < -1 || arg > 1) throw new Error('Invalid asin domain [-1, 1]');
            res = fromRadians(Math.asin(arg));
            break;
          case 'acos':
            if (arg < -1 || arg > 1) throw new Error('Invalid acos domain [-1, 1]');
            res = fromRadians(Math.acos(arg));
            break;
          case 'atan':
            res = fromRadians(Math.atan(arg));
            break;
          case 'ln':
            if (arg <= 0) throw new Error('Invalid logarithm argument');
            res = Math.log(arg);
            break;
          case 'log':
            if (arg <= 0) throw new Error('Invalid logarithm argument');
            res = Math.log10(arg);
            break;
          case 'sqrt':
            if (arg < 0) throw new Error('Negative square root');
            res = Math.sqrt(arg);
            break;
          case 'abs':
            res = Math.abs(arg);
            break;
          case 'exp':
            res = Math.exp(arg);
            break;
          default:
            throw new Error(`Unknown function: ${token.value}`);
        }
        stack.push(res);
      } else if (token.type === 'op') {
        if (token.value === 'u-') {
          const val = stack.pop();
          if (val === undefined) throw new Error('Syntax error');
          stack.push(-val);
        } else {
          const b = stack.pop();
          const a = stack.pop();
          if (a === undefined || b === undefined) throw new Error('Syntax error');
          let res;
          switch (token.value) {
            case '+': res = a + b; break;
            case '-': res = a - b; break;
            case '*': res = a * b; break;
            case '/':
              if (b === 0) throw new Error('Cannot divide by zero');
              res = a / b;
              break;
            case '%':
              res = a % b;
              break;
            case '^':
              res = Math.pow(a, b);
              break;
            default:
              throw new Error(`Invalid operator ${token.value}`);
          }
          stack.push(res);
        }
      }
    }

    if (stack.length !== 1) throw new Error('Malformed expression');
    return stack[0];
  }

  /* ==========================================================================
     History Storage & Management
     ========================================================================== */
  function addHistory(expression, result) {
    const item = {
      id: Date.now(),
      expression,
      result: result.toString(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    state.history.unshift(item);
    if (state.history.length > 50) state.history.pop();
    localStorage.setItem('omnicalc_history', JSON.stringify(state.history));
    renderHistory();
  }

  function renderHistory() {
    if (!state.history.length) {
      DOM.historyList.innerHTML = `
        <div class="history-empty">
          <div class="empty-icon">🕒</div>
          <p>No calculations yet</p>
          <span>Your past expressions and results will appear here</span>
        </div>
      `;
      return;
    }

    DOM.historyList.innerHTML = state.history.map(item => `
      <div class="history-item" data-res="${item.result}">
        <div class="history-item-exp">${item.expression}</div>
        <div class="history-item-res">${item.result}</div>
      </div>
    `).join('');

    DOM.historyList.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        const val = el.getAttribute('data-res');
        if (state.mode === 'programmer') {
          try {
            const bigVal = BigInt(val.replace(/,/g, ''));
            setProgValue(bigVal);
          } catch (e) {}
        } else {
          state.currentInput = val.replace(/,/g, '');
          state.isNewInput = true;
          setDisplay(state.currentInput);
        }
        sound.click();
        toggleHistoryDrawer(false);
      });
    });
  }

  function clearHistory() {
    state.history = [];
    localStorage.removeItem('omnicalc_history');
    renderHistory();
    sound.clear();
  }

  function toggleHistoryDrawer(show) {
    const isHidden = DOM.historyDrawer.classList.contains('hidden');
    const targetState = show !== undefined ? show : isHidden;
    DOM.historyDrawer.classList.toggle('hidden', !targetState);
    if (targetState) renderHistory();
  }

  /* ==========================================================================
     Standard & Scientific Calculator Handler
     ========================================================================== */
  function clearOperatorHighlight() {
    document.querySelectorAll('.btn-operator').forEach(btn => btn.classList.remove('active-op'));
    state.activeOperator = null;
  }

  function handleNumberInput(digit) {
    sound.click();
    clearOperatorHighlight();

    if (state.isNewInput) {
      state.currentInput = digit === '.' ? '0.' : digit;
      state.isNewInput = false;
    } else {
      if (digit === '.') {
        if (state.currentInput.includes('.')) return;
        state.currentInput += '.';
      } else {
        if (state.currentInput === '0') {
          state.currentInput = digit;
        } else {
          state.currentInput += digit;
        }
      }
    }
    setDisplay(state.currentInput);
    DOM.keyClear.textContent = 'C';
  }

  function handleOperator(op) {
    sound.opClick();
    const btn = document.querySelector(`.btn-operator[data-op="${op}"]`);
    clearOperatorHighlight();
    if (btn) btn.classList.add('active-op');

    state.activeOperator = op;

    if (state.expressionTokens.length > 0 && state.isNewInput) {
      // Replace last operator
      const last = state.expressionTokens[state.expressionTokens.length - 1];
      if ('+-×÷*/^%'.includes(last)) {
        state.expressionTokens[state.expressionTokens.length - 1] = op;
        setHistoryPreview(state.expressionTokens.join(' '));
        return;
      }
    }

    state.expressionTokens.push(state.currentInput);
    state.expressionTokens.push(op);
    setHistoryPreview(state.expressionTokens.join(' '));
    state.isNewInput = true;
  }

  function calculateResult() {
    if (!state.expressionTokens.length && !state.activeOperator) {
      sound.equals();
      return;
    }

    clearOperatorHighlight();

    // Push current input if needed
    if (!state.isNewInput || state.expressionTokens.length % 2 === 1) {
      state.expressionTokens.push(state.currentInput);
    } else if (state.expressionTokens.length % 2 === 0) {
      state.expressionTokens.push(state.currentInput);
    }

    const exprString = state.expressionTokens.join(' ');

    try {
      const rawResult = evaluateExpression(exprString);
      if (isNaN(rawResult)) {
        sound.error();
        setDisplay('Error');
        setHistoryPreview(exprString + ' =');
        state.currentInput = '0';
        state.expressionTokens = [];
        state.isNewInput = true;
        return;
      }

      const formatted = formatNumber(rawResult);
      sound.equals();
      setDisplay(formatted);
      setHistoryPreview(exprString + ' =');
      addHistory(exprString + ' =', formatted);

      state.currentInput = rawResult.toString();
      state.expressionTokens = [];
      state.isNewInput = true;
      DOM.keyClear.textContent = 'AC';
    } catch (err) {
      sound.error();
      setDisplay(err.message || 'Error');
      setHistoryPreview(exprString + ' =');
      state.currentInput = '0';
      state.expressionTokens = [];
      state.isNewInput = true;
      DOM.keyClear.textContent = 'AC';
    }
  }

  function handleAction(action) {
    switch (action) {
      case 'clear':
        sound.clear();
        clearOperatorHighlight();
        if (DOM.keyClear.textContent === 'C' && !state.isNewInput) {
          state.currentInput = '0';
          state.isNewInput = true;
          DOM.keyClear.textContent = 'AC';
          setDisplay('0');
        } else {
          state.currentInput = '0';
          state.expressionTokens = [];
          state.previousExpression = '';
          state.isNewInput = true;
          setDisplay('0');
          setHistoryPreview('');
          DOM.keyClear.textContent = 'AC';
        }
        break;

      case 'backspace':
        sound.clear();
        if (state.isNewInput) return;
        if (state.currentInput.length > 1) {
          state.currentInput = state.currentInput.slice(0, -1);
          if (state.currentInput === '-' || state.currentInput === '-0') {
            state.currentInput = '0';
          }
        } else {
          state.currentInput = '0';
          state.isNewInput = true;
        }
        setDisplay(state.currentInput);
        break;

      case 'negate':
        sound.opClick();
        if (state.currentInput !== '0') {
          if (state.currentInput.startsWith('-')) {
            state.currentInput = state.currentInput.slice(1);
          } else {
            state.currentInput = '-' + state.currentInput;
          }
          setDisplay(state.currentInput);
        }
        break;

      case 'paren': {
        sound.opClick();
        clearOperatorHighlight();
        // Smart parentheses
        const openCount = (state.expressionTokens.join('').match(/\(/g) || []).length;
        const closeCount = (state.expressionTokens.join('').match(/\)/g) || []).length;

        if (state.isNewInput) {
          if (openCount > closeCount) {
            state.expressionTokens.push(state.currentInput);
            state.expressionTokens.push(')');
          } else {
            state.expressionTokens.push('(');
          }
        } else {
          if (openCount > closeCount) {
            state.expressionTokens.push(state.currentInput);
            state.expressionTokens.push(')');
            state.isNewInput = true;
          } else {
            state.expressionTokens.push(state.currentInput);
            state.expressionTokens.push('×');
            state.expressionTokens.push('(');
            state.isNewInput = true;
          }
        }
        setHistoryPreview(state.expressionTokens.join(' '));
        break;
      }

      case 'mod':
        sound.opClick();
        // Percent behavior: if in middle of expression, e.g. 50 + 10%
        if (state.expressionTokens.length >= 2) {
          const prevOp = state.expressionTokens[state.expressionTokens.length - 1];
          const firstVal = parseFloat(state.expressionTokens[0]);
          const currentVal = parseFloat(state.currentInput);
          if (prevOp === '+' || prevOp === '−' || prevOp === '-') {
            state.currentInput = ((firstVal * currentVal) / 100).toString();
          } else {
            state.currentInput = (currentVal / 100).toString();
          }
          setDisplay(formatNumber(parseFloat(state.currentInput)));
        } else {
          const val = parseFloat(state.currentInput) / 100;
          state.currentInput = val.toString();
          setDisplay(formatNumber(val));
        }
        break;

      case 'calculate':
        calculateResult();
        break;
    }
  }

  function handleScientificFunction(fnName) {
    sound.opClick();
    const currentVal = parseFloat(state.currentInput);

    try {
      let result;
      switch (fnName) {
        case '2nd':
          state.is2ndActive = !state.is2ndActive;
          DOM.btn2nd.classList.toggle('active', state.is2ndActive);
          update2ndKeyLabels();
          return;

        case 'deg-rad':
          state.angleUnit = state.angleUnit === 'deg' ? 'rad' : 'deg';
          localStorage.setItem('omnicalc_angle', state.angleUnit);
          updateAngleBadgeUI();
          return;

        case 'pi':
          state.currentInput = Math.PI.toString();
          setDisplay(formatNumber(Math.PI));
          state.isNewInput = false;
          return;

        case 'e':
          state.currentInput = Math.E.toString();
          setDisplay(formatNumber(Math.E));
          state.isNewInput = false;
          return;

        case 'sin':
          result = state.is2ndActive
            ? fromRadians(Math.asin(currentVal))
            : Math.sin(toRadians(currentVal));
          break;

        case 'cos':
          result = state.is2ndActive
            ? fromRadians(Math.acos(currentVal))
            : Math.cos(toRadians(currentVal));
          break;

        case 'tan': {
          if (state.is2ndActive) {
            result = fromRadians(Math.atan(currentVal));
          } else {
            const rad = toRadians(currentVal);
            if (Math.abs(Math.cos(rad)) < 1e-15) throw new Error('Undefined (tan 90°)');
            result = Math.tan(rad);
          }
          break;
        }

        case 'ln':
          result = state.is2ndActive ? Math.exp(currentVal) : Math.log(currentVal);
          if (result === -Infinity || isNaN(result)) throw new Error('Invalid ln');
          break;

        case 'log':
          result = state.is2ndActive ? Math.pow(10, currentVal) : Math.log10(currentVal);
          if (result === -Infinity || isNaN(result)) throw new Error('Invalid log');
          break;

        case 'sqrt':
          if (currentVal < 0) throw new Error('Negative square root');
          result = Math.sqrt(currentVal);
          break;

        case 'square':
          result = state.is2ndActive ? Math.pow(currentVal, 3) : Math.pow(currentVal, 2);
          break;

        case 'power':
          handleOperator('^');
          return;

        case 'inv':
          if (currentVal === 0) throw new Error('Cannot divide by zero');
          result = 1 / currentVal;
          break;

        case 'abs':
          result = Math.abs(currentVal);
          break;

        case 'fact':
          if (currentVal < 0 || Math.floor(currentVal) !== currentVal) throw new Error('Integer >= 0 only');
          result = factorial(currentVal);
          break;

        default:
          return;
      }

      if (isNaN(result) || !isFinite(result)) {
        throw new Error('Math Error');
      }

      const formatted = formatNumber(result);
      setHistoryPreview(`${fnName}(${currentVal}) =`);
      addHistory(`${fnName}(${currentVal}) =`, formatted);
      setDisplay(formatted);
      state.currentInput = result.toString();
      state.isNewInput = true;
    } catch (e) {
      sound.error();
      setDisplay(e.message || 'Error');
      state.isNewInput = true;
    }
  }

  function update2ndKeyLabels() {
    const keys = DOM.scientificGrid.querySelectorAll('[data-alt]');
    keys.forEach(btn => {
      const defaultText = btn.getAttribute('data-fn');
      const altText = btn.getAttribute('data-alt');
      btn.innerHTML = state.is2ndActive ? (altText === 'cube' ? 'x³' : (altText === '10^x' ? '10<sup>x</sup>' : (altText === 'e^x' ? 'e<sup>x</sup>' : altText))) : (defaultText === 'square' ? 'x²' : defaultText);
    });
  }

  function updateAngleBadgeUI() {
    const isDeg = state.angleUnit === 'deg';
    DOM.degRadBadge.textContent = isDeg ? 'DEG' : 'RAD';
    DOM.btnDegRadKey.textContent = isDeg ? 'Rad' : 'Deg';
  }

  /* ==========================================================================
     Memory Bar Management
     ========================================================================== */
  function updateMemoryUI() {
    const hasMemory = Math.abs(state.memoryValue) > 0;
    DOM.memoryBadge.classList.toggle('hidden', !hasMemory);
    localStorage.setItem('omnicalc_memory', state.memoryValue.toString());

    DOM.memBtns.forEach(btn => {
      const act = btn.getAttribute('data-action');
      if (act === 'mc' || act === 'mr') {
        btn.classList.toggle('active', hasMemory);
      }
    });
  }

  function handleMemory(action) {
    sound.click();
    const current = parseFloat(state.currentInput) || 0;
    switch (action) {
      case 'mc':
        state.memoryValue = 0;
        showToast('Memory cleared');
        break;
      case 'mr':
        state.currentInput = state.memoryValue.toString();
        setDisplay(formatNumber(state.memoryValue));
        state.isNewInput = true;
        showToast(`Memory recalled: ${formatNumber(state.memoryValue)}`);
        break;
      case 'm-plus':
        state.memoryValue += current;
        state.isNewInput = true;
        showToast(`Added to memory: +${formatNumber(current)}`);
        break;
      case 'm-minus':
        state.memoryValue -= current;
        state.isNewInput = true;
        showToast(`Subtracted from memory: -${formatNumber(current)}`);
        break;
      case 'ms':
        state.memoryValue = current;
        state.isNewInput = true;
        showToast(`Stored in memory: ${formatNumber(current)}`);
        break;
    }
    updateMemoryUI();
  }

  /* ==========================================================================
     Programmer Mode Engine
     ========================================================================== */
  function getProgMask(bits) {
    switch (bits) {
      case 8: return 0xFFn;
      case 16: return 0xFFFFn;
      case 32: return 0xFFFFFFFFn;
      case 64:
      default:
        return 0xFFFFFFFFFFFFFFFFn;
    }
  }

  function maskProgValue(val) {
    const mask = getProgMask(state.progWordSize);
    return BigInt.asUintN(state.progWordSize, val & mask);
  }

  function formatBinary(binStr) {
    // Pad to word size
    const padded = binStr.padStart(state.progWordSize, '0');
    // Group in 4s
    return padded.match(/.{1,4}/g)?.join(' ') || padded;
  }

  function updateProgrammerDisplays() {
    const masked = maskProgValue(state.progValue);
    const hex = masked.toString(16).toUpperCase();
    const dec = BigInt.asIntN(state.progWordSize, masked).toString(10);
    const oct = masked.toString(8);
    const bin = formatBinary(masked.toString(2));

    DOM.hexVal.textContent = hex || '0';
    DOM.decVal.textContent = dec || '0';
    DOM.octVal.textContent = oct || '0';
    DOM.binVal.textContent = bin || '0';

    // Primary display format matches active base
    let activeStr = '0';
    switch (state.progBase) {
      case 'HEX': activeStr = hex || '0'; break;
      case 'DEC': activeStr = dec || '0'; break;
      case 'OCT': activeStr = oct || '0'; break;
      case 'BIN': activeStr = bin || '0'; break;
    }
    setDisplay(activeStr);
    DOM.baseModeBadge.textContent = state.progBase;
  }

  function setProgValue(bigVal) {
    state.progValue = maskProgValue(bigVal);
    updateProgrammerDisplays();
  }

  function updateProgrammerKeypadState() {
    // Enable/disable keys based on active base
    const base = state.progBase;

    // A-F keys
    DOM.hexBtns.forEach(btn => {
      btn.disabled = base !== 'HEX';
    });

    // Digits 0-9
    DOM.standardGrid.querySelectorAll('.btn-num').forEach(btn => {
      const num = btn.getAttribute('data-num');
      if (num === '.') {
        btn.disabled = true; // No floats in programmer mode
        return;
      }
      const val = parseInt(num, 10);
      if (base === 'BIN') {
        btn.disabled = val > 1;
      } else if (base === 'OCT') {
        btn.disabled = val > 7;
      } else {
        btn.disabled = false;
      }
    });

    // Update active row
    DOM.baseRows.forEach(row => {
      const isAct = row.getAttribute('data-base') === base;
      row.classList.toggle('active', isAct);
    });
  }

  function handleProgrammerInput(char) {
    sound.click();
    const base = state.progBase;

    // Validate char against active base
    let isValid = false;
    if (base === 'HEX' && /[0-9A-Fa-f]/.test(char)) isValid = true;
    if (base === 'DEC' && /[0-9]/.test(char)) isValid = true;
    if (base === 'OCT' && /[0-7]/.test(char)) isValid = true;
    if (base === 'BIN' && /[0-1]/.test(char)) isValid = true;

    if (!isValid) return;

    const radix = base === 'HEX' ? 16n : (base === 'DEC' ? 10n : (base === 'OCT' ? 8n : 2n));
    const digitVal = BigInt(parseInt(char, 16));

    if (state.progNewInput) {
      state.progValue = digitVal;
      state.progNewInput = false;
    } else {
      state.progValue = (state.progValue * radix) + digitVal;
    }

    setProgValue(state.progValue);
    DOM.keyClear.textContent = 'C';
  }

  function handleProgrammerOperation(op) {
    sound.opClick();
    if (op === 'NOT') {
      const mask = getProgMask(state.progWordSize);
      setProgValue((~state.progValue) & mask);
      addHistory(`NOT ${state.progValue}`, state.progValue.toString(16).toUpperCase());
      state.progNewInput = true;
      return;
    }

    state.progPrevValue = state.progValue;
    state.progOp = op;
    state.progNewInput = true;
    setHistoryPreview(`${state.progValue.toString(16).toUpperCase()} ${op}`);
  }

  function calculateProgrammerResult() {
    if (state.progOp === null || state.progPrevValue === null) {
      sound.equals();
      return;
    }

    const a = state.progPrevValue;
    const b = state.progValue;
    const mask = getProgMask(state.progWordSize);
    let res = 0n;

    try {
      switch (state.progOp) {
        case 'AND': res = (a & b) & mask; break;
        case 'OR': res = (a | b) & mask; break;
        case 'XOR': res = (a ^ b) & mask; break;
        case 'LSH': res = (a << b) & mask; break;
        case 'RSH': res = (a >> b) & mask; break;
        case '÷':
          if (b === 0n) throw new Error('Divide by zero');
          res = (a / b) & mask;
          break;
        case '×': res = (a * b) & mask; break;
        case '+': res = (a + b) & mask; break;
        case '−': res = (a - b) & mask; break;
        default: return;
      }

      sound.equals();
      const expStr = `${a.toString(16).toUpperCase()} ${state.progOp} ${b.toString(16).toUpperCase()} =`;
      setHistoryPreview(expStr);
      addHistory(expStr, res.toString(16).toUpperCase());
      setProgValue(res);
      state.progOp = null;
      state.progPrevValue = null;
      state.progNewInput = true;
      DOM.keyClear.textContent = 'AC';
    } catch (e) {
      sound.error();
      setDisplay(e.message || 'Error');
      state.progNewInput = true;
    }
  }

  /* ==========================================================================
     Unit Converter Engine
     ========================================================================== */
  const CONVERSION_DATA = {
    length: {
      name: 'Length',
      baseUnit: 'm',
      units: {
        m: { name: 'Meters (m)', factor: 1 },
        km: { name: 'Kilometers (km)', factor: 1000 },
        cm: { name: 'Centimeters (cm)', factor: 0.01 },
        mm: { name: 'Millimeters (mm)', factor: 0.001 },
        mi: { name: 'Miles (mi)', factor: 1609.344 },
        yd: { name: 'Yards (yd)', factor: 0.9144 },
        ft: { name: 'Feet (ft)', factor: 0.3048 },
        in: { name: 'Inches (in)', factor: 0.0254 },
        nmi: { name: 'Nautical Miles', factor: 1852 }
      },
      defaultFrom: 'm',
      defaultTo: 'ft'
    },
    weight: {
      name: 'Mass & Weight',
      baseUnit: 'kg',
      units: {
        kg: { name: 'Kilograms (kg)', factor: 1 },
        g: { name: 'Grams (g)', factor: 0.001 },
        mg: { name: 'Milligrams (mg)', factor: 1e-6 },
        t: { name: 'Metric Tons (t)', factor: 1000 },
        lb: { name: 'Pounds (lb)', factor: 0.45359237 },
        oz: { name: 'Ounces (oz)', factor: 0.028349523125 },
        st: { name: 'Stones (st)', factor: 6.35029318 }
      },
      defaultFrom: 'kg',
      defaultTo: 'lb'
    },
    temperature: {
      name: 'Temperature',
      isSpecial: true,
      units: {
        C: { name: 'Celsius (°C)' },
        F: { name: 'Fahrenheit (°F)' },
        K: { name: 'Kelvin (K)' }
      },
      convert: (val, from, to) => {
        let celsius;
        if (from === 'C') celsius = val;
        else if (from === 'F') celsius = (val - 32) * (5 / 9);
        else if (from === 'K') celsius = val - 273.15;

        if (to === 'C') return celsius;
        if (to === 'F') return (celsius * 9) / 5 + 32;
        if (to === 'K') return celsius + 273.15;
        return celsius;
      },
      defaultFrom: 'C',
      defaultTo: 'F'
    },
    data: {
      name: 'Digital Storage',
      baseUnit: 'B',
      units: {
        B: { name: 'Bytes (B)', factor: 1 },
        KB: { name: 'Kilobytes (KB)', factor: 1024 },
        MB: { name: 'Megabytes (MB)', factor: 1024 ** 2 },
        GB: { name: 'Gigabytes (GB)', factor: 1024 ** 3 },
        TB: { name: 'Terabytes (TB)', factor: 1024 ** 4 },
        PB: { name: 'Petabytes (PB)', factor: 1024 ** 5 }
      },
      defaultFrom: 'MB',
      defaultTo: 'GB'
    },
    speed: {
      name: 'Speed',
      baseUnit: 'm/s',
      units: {
        'm/s': { name: 'Meters / second (m/s)', factor: 1 },
        'km/h': { name: 'Kilometers / hour (km/h)', factor: 1 / 3.6 },
        mph: { name: 'Miles / hour (mph)', factor: 0.44704 },
        knot: { name: 'Knots (kn)', factor: 0.514444 },
        'ft/s': { name: 'Feet / second (ft/s)', factor: 0.3048 }
      },
      defaultFrom: 'km/h',
      defaultTo: 'mph'
    },
    time: {
      name: 'Time',
      baseUnit: 's',
      units: {
        ms: { name: 'Milliseconds (ms)', factor: 0.001 },
        s: { name: 'Seconds (s)', factor: 1 },
        min: { name: 'Minutes (min)', factor: 60 },
        h: { name: 'Hours (h)', factor: 3600 },
        d: { name: 'Days (d)', factor: 86400 },
        wk: { name: 'Weeks (wk)', factor: 604800 },
        yr: { name: 'Years (365 d)', factor: 31536000 }
      },
      defaultFrom: 'min',
      defaultTo: 'h'
    },
    currency: {
      name: 'Currency (Forex Ref)',
      baseUnit: 'USD',
      units: {
        USD: { name: 'USD — US Dollar ($)', factor: 1 },
        EUR: { name: 'EUR — Euro (€)', factor: 1.09 },
        GBP: { name: 'GBP — British Pound (£)', factor: 1.28 },
        JPY: { name: 'JPY — Japanese Yen (¥)', factor: 0.0065 },
        CAD: { name: 'CAD — Canadian Dollar ($)', factor: 0.73 },
        AUD: { name: 'AUD — Australian Dollar ($)', factor: 0.66 },
        CHF: { name: 'CHF — Swiss Franc (Fr)', factor: 1.14 },
        CNY: { name: 'CNY — Chinese Yuan (¥)', factor: 0.138 },
        INR: { name: 'INR — Indian Rupee (₹)', factor: 0.0119 }
      },
      defaultFrom: 'USD',
      defaultTo: 'EUR'
    }
  };

  function initConverterCategory(catKey) {
    const cat = CONVERSION_DATA[catKey];
    if (!cat) return;
    state.converterCat = catKey;

    // Set options in selects
    DOM.fromUnitSelect.innerHTML = '';
    DOM.toUnitSelect.innerHTML = '';

    Object.entries(cat.units).forEach(([k, u]) => {
      const optFrom = document.createElement('option');
      optFrom.value = k;
      optFrom.textContent = u.name;
      DOM.fromUnitSelect.appendChild(optFrom);

      const optTo = document.createElement('option');
      optTo.value = k;
      optTo.textContent = u.name;
      DOM.toUnitSelect.appendChild(optTo);
    });

    state.fromUnit = cat.defaultFrom;
    state.toUnit = cat.defaultTo;
    DOM.fromUnitSelect.value = state.fromUnit;
    DOM.toUnitSelect.value = state.toUnit;

    DOM.catPills.forEach(p => {
      p.classList.toggle('active', p.getAttribute('data-cat') === catKey);
    });

    calculateConversion();
  }

  function calculateConversion() {
    const cat = CONVERSION_DATA[state.converterCat];
    if (!cat) return;

    const inputVal = parseFloat(DOM.fromUnitInput.value);
    if (isNaN(inputVal)) {
      DOM.toUnitDisplay.textContent = '0';
      DOM.convFormulaInfo.textContent = '';
      return;
    }

    const fromKey = DOM.fromUnitSelect.value;
    const toKey = DOM.toUnitSelect.value;
    let convertedVal = 0;
    let formulaExample = 0;

    if (cat.isSpecial && cat.convert) {
      convertedVal = cat.convert(inputVal, fromKey, toKey);
      formulaExample = cat.convert(1, fromKey, toKey);
    } else {
      const fromFactor = cat.units[fromKey]?.factor || 1;
      const toFactor = cat.units[toKey]?.factor || 1;
      const inBase = inputVal * fromFactor;
      convertedVal = inBase / toFactor;
      formulaExample = (1 * fromFactor) / toFactor;
    }

    DOM.toUnitDisplay.textContent = formatNumber(convertedVal, 6);
    DOM.convFormulaInfo.textContent = `1 ${cat.units[fromKey]?.name || fromKey} = ${formatNumber(formulaExample, 6)} ${cat.units[toKey]?.name || toKey}`;
  }

  function handleConverterKey(key) {
    sound.click();
    let current = DOM.fromUnitInput.value;

    switch (key) {
      case 'clr':
        DOM.fromUnitInput.value = '0';
        break;
      case 'bksp':
        if (current.length > 1) {
          DOM.fromUnitInput.value = current.slice(0, -1);
        } else {
          DOM.fromUnitInput.value = '0';
        }
        break;
      case 'neg':
        if (current !== '0') {
          DOM.fromUnitInput.value = current.startsWith('-') ? current.slice(1) : '-' + current;
        }
        break;
      case '.':
        if (!current.includes('.')) {
          DOM.fromUnitInput.value = current + '.';
        }
        break;
      default:
        // Digit
        if (current === '0') {
          DOM.fromUnitInput.value = key;
        } else {
          DOM.fromUnitInput.value += key;
        }
        break;
    }
    calculateConversion();
  }

  /* ==========================================================================
     Mode Switching
     ========================================================================== */
  function switchMode(newMode) {
    state.mode = newMode;
    sound.click();

    DOM.modeTabs.forEach(tab => {
      tab.classList.toggle('active', tab.getAttribute('data-mode') === newMode);
    });

    const isConverter = newMode === 'converter';
    const isProgrammer = newMode === 'programmer';
    const isScientific = newMode === 'scientific';

    DOM.calculatorSection.classList.toggle('hidden', isConverter);
    DOM.converterSection.classList.toggle('hidden', !isConverter);

    // Keypads & Badges visibility
    DOM.scientificGrid.classList.toggle('hidden', !isScientific);
    DOM.degRadBadge.classList.toggle('hidden', !isScientific);

    DOM.programmerBases.classList.toggle('hidden', !isProgrammer);
    DOM.programmerGrid.classList.toggle('hidden', !isProgrammer);
    DOM.baseModeBadge.classList.toggle('hidden', !isProgrammer);

    if (isConverter) {
      initConverterCategory(state.converterCat);
      return;
    }

    if (isProgrammer) {
      updateProgrammerKeypadState();
      updateProgrammerDisplays();
    } else {
      // Re-enable all number buttons
      DOM.standardGrid.querySelectorAll('.btn-num').forEach(b => b.disabled = false);
      setDisplay(state.currentInput);
      setHistoryPreview(state.expressionTokens.join(' '));
    }

    if (isScientific) {
      updateAngleBadgeUI();
    }
  }

  /* ==========================================================================
     Event Listeners Setup
     ========================================================================== */
  function setupEventListeners() {
    // Mode navigation
    DOM.modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetMode = tab.getAttribute('data-mode');
        switchMode(targetMode);
      });
    });

    // Sound toggle
    DOM.soundToggleBtn.addEventListener('click', toggleSound);

    // Theme dropdown
    DOM.themeToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.click();
      toggleThemeDropdown();
    });

    DOM.themeOptions.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.click();
        const themeVal = opt.getAttribute('data-theme-val');
        applyTheme(themeVal);
        toggleThemeDropdown(false);
      });
    });

    document.addEventListener('click', (e) => {
      if (!DOM.themeDropdown.contains(e.target) && e.target !== DOM.themeToggleBtn) {
        toggleThemeDropdown(false);
      }
    });

    // History drawer
    DOM.historyToggleBtn.addEventListener('click', () => {
      sound.click();
      toggleHistoryDrawer();
    });

    DOM.closeHistoryBtn.addEventListener('click', () => {
      sound.click();
      toggleHistoryDrawer(false);
    });

    DOM.clearHistoryBtn.addEventListener('click', clearHistory);

    // Angle badge toggle
    DOM.degRadBadge.addEventListener('click', () => {
      handleScientificFunction('deg-rad');
    });

    // Copy display
    DOM.copyBtn.addEventListener('click', () => {
      sound.click();
      const textToCopy = DOM.primaryDisplay.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy)
          .then(() => showToast('Copied to clipboard'))
          .catch(() => fallbackCopy(textToCopy));
      } else {
        fallbackCopy(textToCopy);
      }
    });

    function fallbackCopy(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showToast('Copied to clipboard');
      } catch (e) {
        showToast('Unable to copy');
      }
      document.body.removeChild(textarea);
    }

    // Memory bar
    DOM.memBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        handleMemory(action);
      });
    });

    // Scientific pad
    DOM.scientificGrid.querySelectorAll('.btn-fn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fn = btn.getAttribute('data-fn');
        handleScientificFunction(fn);
      });
    });

    // Standard keypad (numbers, operators, actions)
    DOM.standardGrid.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;

        if (btn.hasAttribute('data-num')) {
          const num = btn.getAttribute('data-num');
          if (state.mode === 'programmer') {
            handleProgrammerInput(num);
          } else {
            handleNumberInput(num);
          }
        } else if (btn.hasAttribute('data-op')) {
          const op = btn.getAttribute('data-op');
          if (state.mode === 'programmer') {
            handleProgrammerOperation(op);
          } else {
            handleOperator(op);
          }
        } else if (btn.hasAttribute('data-action')) {
          const action = btn.getAttribute('data-action');
          if (state.mode === 'programmer') {
            if (action === 'calculate') calculateProgrammerResult();
            else if (action === 'clear') {
              sound.clear();
              setProgValue(0n);
              state.progPrevValue = null;
              state.progOp = null;
              state.progNewInput = true;
              setHistoryPreview('');
              DOM.keyClear.textContent = 'AC';
            } else if (action === 'backspace') {
              sound.clear();
              const radix = state.progBase === 'HEX' ? 16n : (state.progBase === 'DEC' ? 10n : (state.progBase === 'OCT' ? 8n : 2n));
              setProgValue(state.progValue / radix);
            } else if (action === 'negate') {
              sound.opClick();
              const mask = getProgMask(state.progWordSize);
              setProgValue((-state.progValue) & mask);
            }
          } else {
            handleAction(action);
          }
        }
      });
    });

    // Programmer keys (A-F & operators)
    DOM.hexBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const hex = btn.getAttribute('data-hex');
        handleProgrammerInput(hex);
      });
    });

    DOM.progOpBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const progOp = btn.getAttribute('data-prog');
        handleProgrammerOperation(progOp);
      });
    });

    // Programmer word size
    DOM.wordSizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sound.click();
        const bits = parseInt(btn.getAttribute('data-word'), 10);
        state.progWordSize = bits;
        DOM.wordSizeBtns.forEach(b => b.classList.toggle('active', b === btn));
        setProgValue(state.progValue); // Re-masks value
      });
    });

    // Programmer base rows
    DOM.baseRows.forEach(row => {
      row.addEventListener('click', () => {
        sound.click();
        const newBase = row.getAttribute('data-base');
        state.progBase = newBase;
        state.progNewInput = true;
        updateProgrammerKeypadState();
        updateProgrammerDisplays();
      });
    });

    // Converter events
    DOM.catPills.forEach(pill => {
      pill.addEventListener('click', () => {
        sound.click();
        const cat = pill.getAttribute('data-cat');
        initConverterCategory(cat);
      });
    });

    DOM.fromUnitSelect.addEventListener('change', () => {
      state.fromUnit = DOM.fromUnitSelect.value;
      calculateConversion();
    });

    DOM.toUnitSelect.addEventListener('change', () => {
      state.toUnit = DOM.toUnitSelect.value;
      calculateConversion();
    });

    DOM.fromUnitInput.addEventListener('input', calculateConversion);

    DOM.convClearInput.addEventListener('click', () => {
      sound.clear();
      DOM.fromUnitInput.value = '0';
      calculateConversion();
    });

    DOM.swapUnitsBtn.addEventListener('click', () => {
      sound.click();
      const currentFrom = DOM.fromUnitSelect.value;
      const currentTo = DOM.toUnitSelect.value;
      DOM.fromUnitSelect.value = currentTo;
      DOM.toUnitSelect.value = currentFrom;
      state.fromUnit = currentTo;
      state.toUnit = currentFrom;
      calculateConversion();
    });

    DOM.convKeys.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        handleConverterKey(val);
      });
    });

    // Physical Keyboard Listener
    window.addEventListener('keydown', handleKeyboardShortcut);
  }

  /* ==========================================================================
     Keyboard Shortcuts Support
     ========================================================================== */
  function triggerButtonFlash(selector) {
    const btn = document.querySelector(selector);
    if (btn) {
      btn.classList.add('active');
      setTimeout(() => btn.classList.remove('active'), 120);
    }
  }

  function handleKeyboardShortcut(e) {
    // If typing directly into converter input, allow native typing
    if (document.activeElement === DOM.fromUnitInput) return;

    const key = e.key;

    if (state.mode === 'converter') {
      if (/^[0-9]$/.test(key)) {
        handleConverterKey(key);
      } else if (key === '.') {
        handleConverterKey('.');
      } else if (key === 'Backspace') {
        handleConverterKey('bksp');
      } else if (key === 'Escape') {
        handleConverterKey('clr');
      }
      return;
    }

    if (state.mode === 'programmer') {
      if (/^[0-9]$/.test(key)) {
        handleProgrammerInput(key);
        triggerButtonFlash(`button[data-num="${key}"]`);
      } else if (/^[a-fA-F]$/.test(key) && state.progBase === 'HEX') {
        handleProgrammerInput(key.toUpperCase());
        triggerButtonFlash(`button[data-hex="${key.toUpperCase()}"]`);
      } else if (key === '+' || key === '-' || key === '*' || key === '/') {
        e.preventDefault();
        const opMap = { '+': '+', '-': '−', '*': '×', '/': '÷' };
        handleProgrammerOperation(opMap[key]);
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculateProgrammerResult();
        triggerButtonFlash('.btn-equal');
      } else if (key === 'Backspace') {
        const radix = state.progBase === 'HEX' ? 16n : (state.progBase === 'DEC' ? 10n : (state.progBase === 'OCT' ? 8n : 2n));
        setProgValue(state.progValue / radix);
      } else if (key === 'Escape' || key.toLowerCase() === 'c') {
        setProgValue(0n);
        state.progPrevValue = null;
        state.progOp = null;
        state.progNewInput = true;
        setHistoryPreview('');
      }
      return;
    }

    // Standard & Scientific Mode Keyboard Shortcuts
    if (/^[0-9]$/.test(key)) {
      handleNumberInput(key);
      triggerButtonFlash(`button[data-num="${key}"]`);
    } else if (key === '.' || key === ',') {
      handleNumberInput('.');
      triggerButtonFlash('button[data-num="."]');
    } else if (key === '+') {
      e.preventDefault();
      handleOperator('+');
      triggerButtonFlash('button[data-op="+"]');
    } else if (key === '-') {
      e.preventDefault();
      handleOperator('−');
      triggerButtonFlash('button[data-op="−"]');
    } else if (key === '*' || key === 'x' || key === 'X') {
      e.preventDefault();
      handleOperator('×');
      triggerButtonFlash('button[data-op="×"]');
    } else if (key === '/') {
      e.preventDefault();
      handleOperator('÷');
      triggerButtonFlash('button[data-op="÷"]');
    } else if (key === '^') {
      e.preventDefault();
      handleOperator('^');
    } else if (key === '%') {
      e.preventDefault();
      handleAction('mod');
    } else if (key === '(' || key === ')') {
      e.preventDefault();
      handleAction('paren');
    } else if (key === 'Enter' || key === '=') {
      e.preventDefault();
      calculateResult();
      triggerButtonFlash('.btn-equal');
    } else if (key === 'Backspace') {
      e.preventDefault();
      handleAction('backspace');
    } else if (key === 'Escape' || key.toLowerCase() === 'c') {
      e.preventDefault();
      handleAction('clear');
      triggerButtonFlash('#keyClear');
    }
  }

  /* ==========================================================================
     Initialization
     ========================================================================== */
  function initApp() {
    applyTheme(state.theme);
    updateSoundUI();
    updateMemoryUI();
    updateAngleBadgeUI();
    setDisplay('0');
    renderHistory();
    switchMode('standard');
    setupEventListeners();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();

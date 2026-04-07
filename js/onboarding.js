// ============================================
// js/onboarding.js — Multi-step Onboarding Wizard
// Shown on first visit. Saves settings to store.
// ============================================

import store from './store.js';

const ONBOARDING_KEY = 'sufa-onboarding-complete';
const TOTAL_STEPS = 4;
const CURRENCY_MAP = {
  USD: { symbol: '$', label: 'USD ($)' },
  EUR: { symbol: '\u20AC', label: 'EUR (\u20AC)' },
  GBP: { symbol: '\u00A3', label: 'GBP (\u00A3)' },
  BDT: { symbol: '\u09F3', label: 'BDT (\u09F3)' },
  INR: { symbol: '\u20B9', label: 'INR (\u20B9)' },
  JPY: { symbol: '\u00A5', label: 'JPY (\u00A5)' },
};

let currentStep = 1;
let overlayEl = null;
let stepContents = [];
let progressDots = [];

// ============================================
// PUBLIC API
// ============================================

/**
 * Check if onboarding is needed. If so, show the wizard.
 * Must be called BEFORE the router initializes.
 */
export function checkOnboarding() {
  if (localStorage.getItem(ONBOARDING_KEY)) return false;
  showOnboarding();
  return true;
}

// ============================================
// WIZARD RENDERING
// ============================================

function showOnboarding() {
  currentStep = 1;
  stepContents = [];
  progressDots = [];

  overlayEl = document.createElement('div');
  overlayEl.id = 'onboarding-overlay';
  overlayEl.innerHTML = buildOverlayHTML();
  document.body.appendChild(overlayEl);

  // Cache step content containers
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    stepContents.push(overlayEl.querySelector(`#onboard-step-${i}`));
  }
  progressDots = Array.from(overlayEl.querySelectorAll('.onboard-dot'));

  // Bind events
  overlayEl.querySelector('#onboard-skip').addEventListener('click', completeOnboarding);
  overlayEl.querySelector('#onboard-next').addEventListener('click', goNext);
  overlayEl.querySelector('#onboard-back').addEventListener('click', goBack);

  // Initial render
  updateStep();
}

function buildOverlayHTML() {
  return `
    <style>
      #onboarding-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 30%, #F5F3FF 70%, #EDE9FE 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--spacing-4);
        animation: onboard-fade-in 0.4s ease;
      }
      [data-theme="dark"] #onboarding-overlay,
      #onboarding-overlay.dark {
        background: linear-gradient(135deg, #1E1B4B 0%, #312E81 30%, #1E1B4B 70%, #2E1065 100%);
      }
      @keyframes onboard-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes onboard-slide-up {
        from { opacity: 0; transform: translateY(24px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes onboard-success-pop {
        0% { transform: scale(0); opacity: 0; }
        50% { transform: scale(1.15); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes onboard-success-ring {
        0% { transform: scale(0.8); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      .onboard-card {
        background: #fff;
        border-radius: var(--radius-2xl);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
        width: 100%;
        max-width: 480px;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
      }
      [data-theme="dark"] .onboard-card,
      #onboarding-overlay.dark .onboard-card {
        background: var(--color-neutral-900, #111827);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      }
      .onboard-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-4) var(--spacing-6) 0;
      }
      .onboard-skip {
        font-size: var(--text-sm, 0.875rem);
        color: var(--color-neutral-400, #9CA3AF);
        cursor: pointer;
        background: none;
        border: none;
        padding: var(--spacing-1) var(--spacing-2);
        border-radius: var(--radius-md, 8px);
        transition: color 0.15s ease, background-color 0.15s ease;
        text-decoration: none;
      }
      .onboard-skip:hover {
        color: var(--color-neutral-600, #4B5563);
        background-color: rgba(0,0,0,0.04);
      }
      [data-theme="dark"] .onboard-skip,
      #onboarding-overlay.dark .onboard-skip {
        color: var(--color-neutral-500, #6B7280);
      }
      [data-theme="dark"] .onboard-skip:hover,
      #onboarding-overlay.dark .onboard-skip:hover {
        color: var(--color-neutral-300, #D1D5DB);
        background-color: rgba(255,255,255,0.06);
      }
      /* Progress dots */
      .onboard-progress {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-2, 8px);
        padding: var(--spacing-4) var(--spacing-6) var(--spacing-3);
      }
      .onboard-dot {
        width: 32px;
        height: 4px;
        border-radius: var(--radius-full, 9999px);
        background: var(--color-neutral-200, #E5E7EB);
        transition: background-color 0.3s ease, width 0.3s ease;
      }
      .onboard-dot.active {
        background: var(--color-primary-500, #6366F1);
        width: 48px;
      }
      .onboard-dot.done {
        background: var(--color-primary-300, #A5B4FC);
      }
      [data-theme="dark"] .onboard-dot,
      #onboarding-overlay.dark .onboard-dot {
        background: var(--color-neutral-700, #374151);
      }
      [data-theme="dark"] .onboard-dot.active,
      #onboarding-overlay.dark .onboard-dot.active {
        background: var(--color-primary-400, #818CF8);
      }
      [data-theme="dark"] .onboard-dot.done,
      #onboarding-overlay.dark .onboard-dot.done {
        background: var(--color-primary-800, #3730A3);
      }
      /* Step content area */
      .onboard-body {
        padding: var(--spacing-2) var(--spacing-6) var(--spacing-6);
      }
      .onboard-step {
        display: none;
        animation: onboard-slide-up 0.35s ease;
      }
      .onboard-step.active {
        display: block;
      }
      /* Welcome step */
      .onboard-welcome-icon {
        width: 72px;
        height: 72px;
        border-radius: var(--radius-2xl, 20px);
        background: linear-gradient(135deg, var(--color-primary-500, #6366F1), var(--color-secondary-500, #8B5CF6));
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 36px;
        margin: 0 auto var(--spacing-5);
        box-shadow: 0 8px 24px rgba(99, 102, 241, 0.3);
      }
      .onboard-title {
        font-size: var(--text-2xl, 1.5rem);
        font-weight: 700;
        color: var(--color-neutral-900, #111827);
        text-align: center;
        margin: 0 0 var(--spacing-2);
        line-height: 1.3;
      }
      [data-theme="dark"] .onboard-title,
      #onboarding-overlay.dark .onboard-title {
        color: var(--color-neutral-50, #F9FAFB);
      }
      .onboard-subtitle {
        font-size: var(--text-sm, 0.875rem);
        color: var(--color-neutral-500, #6B7280);
        text-align: center;
        line-height: 1.6;
        margin: 0 0 var(--spacing-6);
      }
      [data-theme="dark"] .onboard-subtitle,
      #onboarding-overlay.dark .onboard-subtitle {
        color: var(--color-neutral-400, #9CA3AF);
      }
      /* Features grid */
      .onboard-features {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-3);
        margin-bottom: var(--spacing-6);
      }
      .onboard-feature {
        display: flex;
        align-items: center;
        gap: var(--spacing-2);
        padding: var(--spacing-3);
        border-radius: var(--radius-lg, 12px);
        background: var(--color-neutral-50, #F9FAFB);
        font-size: var(--text-sm, 0.875rem);
        color: var(--color-neutral-700, #374151);
      }
      [data-theme="dark"] .onboard-feature,
      #onboarding-overlay.dark .onboard-feature {
        background: var(--color-neutral-800, #1F2937);
        color: var(--color-neutral-300, #D1D5DB);
      }
      .onboard-feature-icon {
        font-size: 18px;
        flex-shrink: 0;
      }
      /* Form styles */
      .onboard-form-group {
        margin-bottom: var(--spacing-4);
      }
      .onboard-label {
        display: block;
        font-size: var(--text-sm, 0.875rem);
        font-weight: 500;
        color: var(--color-neutral-700, #374151);
        margin-bottom: var(--spacing-1-5, 6px);
      }
      [data-theme="dark"] .onboard-label,
      #onboarding-overlay.dark .onboard-label {
        color: var(--color-neutral-300, #D1D5DB);
      }
      .onboard-input {
        width: 100%;
        padding: var(--spacing-2-5, 10px) var(--spacing-3, 12px);
        border: 1px solid var(--color-neutral-300, #D1D5DB);
        border-radius: var(--radius-lg, 12px);
        font-size: var(--text-sm, 0.875rem);
        color: var(--color-neutral-900, #111827);
        background: #fff;
        outline: none;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
        box-sizing: border-box;
      }
      .onboard-input:focus {
        border-color: var(--color-primary-500, #6366F1);
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
      }
      .onboard-input::placeholder {
        color: var(--color-neutral-400, #9CA3AF);
      }
      [data-theme="dark"] .onboard-input,
      #onboarding-overlay.dark .onboard-input {
        background: var(--color-neutral-800, #1F2937);
        border-color: var(--color-neutral-700, #374151);
        color: var(--color-neutral-50, #F9FAFB);
      }
      [data-theme="dark"] .onboard-input:focus,
      #onboarding-overlay.dark .onboard-input:focus {
        border-color: var(--color-primary-400, #818CF8);
        box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15);
      }
      .onboard-input-required::after {
        content: ' *';
        color: var(--color-danger-500, #EF4444);
      }
      .onboard-input-hint {
        font-size: var(--text-xs, 0.75rem);
        color: var(--color-neutral-400, #9CA3AF);
        margin-top: var(--spacing-1, 4px);
      }
      .onboard-form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--spacing-3);
      }
      /* Buttons */
      .onboard-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-3);
      }
      .onboard-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--spacing-2, 8px);
        padding: var(--spacing-2-5, 10px) var(--spacing-5, 20px);
        border-radius: var(--radius-lg, 12px);
        font-size: var(--text-sm, 0.875rem);
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: all 0.15s ease;
        white-space: nowrap;
      }
      .onboard-btn-primary {
        background: linear-gradient(135deg, var(--color-primary-500, #6366F1), var(--color-primary-600, #4F46E5));
        color: #fff;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
      }
      .onboard-btn-primary:hover {
        background: linear-gradient(135deg, var(--color-primary-600, #4F46E5), var(--color-primary-700, #4338CA));
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
      }
      .onboard-btn-secondary {
        background: var(--color-neutral-100, #F3F4F6);
        color: var(--color-neutral-700, #374151);
      }
      .onboard-btn-secondary:hover {
        background: var(--color-neutral-200, #E5E7EB);
      }
      [data-theme="dark"] .onboard-btn-secondary,
      #onboarding-overlay.dark .onboard-btn-secondary {
        background: var(--color-neutral-800, #1F2937);
        color: var(--color-neutral-300, #D1D5DB);
      }
      [data-theme="dark"] .onboard-btn-secondary:hover,
      #onboarding-overlay.dark .onboard-btn-secondary:hover {
        background: var(--color-neutral-700, #374151);
      }
      /* Success step */
      .onboard-success-icon-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: var(--spacing-5);
      }
      .onboard-success-ring {
        width: 96px;
        height: 96px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--color-success-100, #DCFCE7), var(--color-success-200, #BBF7D0));
        display: flex;
        align-items: center;
        justify-content: center;
        animation: onboard-success-ring 0.5s ease;
      }
      [data-theme="dark"] .onboard-success-ring,
      #onboarding-overlay.dark .onboard-success-ring {
        background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.25));
      }
      .onboard-success-check {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--color-success-500, #22C55E), var(--color-success-600, #16A34A));
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        animation: onboard-success-pop 0.5s ease 0.15s both;
      }
      .onboard-success-check svg {
        width: 28px;
        height: 28px;
        stroke: #fff;
        stroke-width: 3;
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .onboard-success-list {
        list-style: none;
        padding: 0;
        margin: 0 0 var(--spacing-6);
        text-align: left;
      }
      .onboard-success-list li {
        display: flex;
        align-items: center;
        gap: var(--spacing-2, 8px);
        padding: var(--spacing-2) 0;
        font-size: var(--text-sm, 0.875rem);
        color: var(--color-neutral-600, #4B5563);
      }
      [data-theme="dark"] .onboard-success-list li,
      #onboarding-overlay.dark .onboard-success-list li {
        color: var(--color-neutral-400, #9CA3AF);
      }
      .onboard-success-list li span:first-child {
        color: var(--color-success-500, #22C55E);
        font-size: 16px;
        flex-shrink: 0;
      }
    </style>

    <div class="onboard-card">
      <div class="onboard-header">
        <div></div>
        <button id="onboard-skip" class="onboard-skip">Skip</button>
      </div>

      <div class="onboard-progress">
        <div class="onboard-dot active" data-step="1"></div>
        <div class="onboard-dot" data-step="2"></div>
        <div class="onboard-dot" data-step="3"></div>
        <div class="onboard-dot" data-step="4"></div>
      </div>

      <div class="onboard-body">
        <!-- Step 1: Welcome -->
        <div id="onboard-step-1" class="onboard-step active">
          <div class="onboard-welcome-icon">\uD83D\uDCE6</div>
          <h2 class="onboard-title">Welcome to SuFa Inventory</h2>
          <p class="onboard-subtitle">
            A complete inventory and accounts management system to help you
            track products, manage sales, and stay on top of your business finances.
          </p>
          <div class="onboard-features">
            <div class="onboard-feature">
              <span class="onboard-feature-icon">\uD83D\uDCC8</span>
              <span>Dashboard</span>
            </div>
            <div class="onboard-feature">
              <span class="onboard-feature-icon">\uD83D\uDCE6</span>
              <span>Products</span>
            </div>
            <div class="onboard-feature">
              <span class="onboard-feature-icon">\uD83D\uDCB3</span>
              <span>Invoicing</span>
            </div>
            <div class="onboard-feature">
              <span class="onboard-feature-icon">\uD83D\uDD0D</span>
              <span>Reports</span>
            </div>
          </div>
          <div class="onboard-actions">
            <div></div>
            <button id="onboard-next" class="onboard-btn onboard-btn-primary">Get Started \u2192</button>
          </div>
        </div>

        <!-- Step 2: Company Info -->
        <div id="onboard-step-2" class="onboard-step">
          <h2 class="onboard-title">Company Information</h2>
          <p class="onboard-subtitle">Tell us about your business. You can change this later in Settings.</p>
          <div class="onboard-form-group">
            <label class="onboard-label">Company Name <span style="color:var(--color-danger-500,#EF4444)">*</span></label>
            <input type="text" id="onboard-company" class="onboard-input" placeholder="e.g. Acme Corporation" autocomplete="organization">
          </div>
          <div class="onboard-form-group">
            <label class="onboard-label">Address</label>
            <input type="text" id="onboard-address" class="onboard-input" placeholder="123 Business Street, City">
          </div>
          <div class="onboard-form-row">
            <div class="onboard-form-group">
              <label class="onboard-label">Phone</label>
              <input type="tel" id="onboard-phone" class="onboard-input" placeholder="+1 (555) 123-4567">
            </div>
            <div class="onboard-form-group">
              <label class="onboard-label">Email</label>
              <input type="email" id="onboard-email" class="onboard-input" placeholder="hello@company.com">
            </div>
          </div>
          <div class="onboard-actions">
            <button id="onboard-back" class="onboard-btn onboard-btn-secondary">\u2190 Back</button>
            <button id="onboard-next" class="onboard-btn onboard-btn-primary">Next \u2192</button>
          </div>
        </div>

        <!-- Step 3: Preferences -->
        <div id="onboard-step-3" class="onboard-step">
          <h2 class="onboard-title">Preferences</h2>
          <p class="onboard-subtitle">Customize your experience. All settings can be updated later.</p>
          <div class="onboard-form-group">
            <label class="onboard-label">Currency</label>
            <select id="onboard-currency" class="onboard-input">
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (\u20AC)</option>
              <option value="GBP">GBP (\u00A3)</option>
              <option value="BDT">BDT (\u09F3)</option>
              <option value="INR">INR (\u20B9)</option>
              <option value="JPY">JPY (\u00A5)</option>
            </select>
          </div>
          <div class="onboard-form-row">
            <div class="onboard-form-group">
              <label class="onboard-label">Tax Rate (%)</label>
              <input type="number" id="onboard-tax" class="onboard-input" placeholder="10" value="10" min="0" max="100" step="0.5">
              <div class="onboard-input-hint">Applied to invoices by default</div>
            </div>
            <div class="onboard-form-group">
              <label class="onboard-label">Low Stock Threshold</label>
              <input type="number" id="onboard-threshold" class="onboard-input" placeholder="10" value="10" min="0" step="1">
              <div class="onboard-input-hint">Alert when stock falls below</div>
            </div>
          </div>
          <div class="onboard-actions">
            <button id="onboard-back" class="onboard-btn onboard-btn-secondary">\u2190 Back</button>
            <button id="onboard-next" class="onboard-btn onboard-btn-primary">Next \u2192</button>
          </div>
        </div>

        <!-- Step 4: Complete -->
        <div id="onboard-step-4" class="onboard-step">
          <div class="onboard-success-icon-wrap">
            <div class="onboard-success-ring">
              <div class="onboard-success-check">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
            </div>
          </div>
          <h2 class="onboard-title">You're All Set!</h2>
          <p class="onboard-subtitle">Your workspace is configured and ready. Here's what you can do next:</p>
          <ul class="onboard-success-list">
            <li><span>\u2713</span> Add your first products and categories</li>
            <li><span>\u2713</span> Create customers and suppliers</li>
            <li><span>\u2713</span> Generate invoices and track payments</li>
            <li><span>\u2713</span> View reports and insights</li>
          </ul>
          <div class="onboard-actions">
            <div></div>
            <button id="onboard-next" class="onboard-btn onboard-btn-primary">Go to Dashboard \u2192</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// NAVIGATION
// ============================================

function updateStep() {
  // Update step visibility
  stepContents.forEach((el, i) => {
    if (el) {
      el.classList.toggle('active', i + 1 === currentStep);
    }
  });

  // Update progress dots
  progressDots.forEach((dot, i) => {
    const stepNum = i + 1;
    dot.classList.remove('active', 'done');
    if (stepNum === currentStep) {
      dot.classList.add('active');
    } else if (stepNum < currentStep) {
      dot.classList.add('done');
    }
  });

  // Rebind action buttons for current step
  const nextBtns = overlayEl.querySelectorAll('#onboard-next');
  const backBtns = overlayEl.querySelectorAll('#onboard-back');

  nextBtns.forEach(btn => {
    btn.removeEventListener('click', goNext);
    btn.addEventListener('click', goNext);
  });

  backBtns.forEach(btn => {
    btn.removeEventListener('click', goBack);
    btn.addEventListener('click', goBack);
  });
}

function goNext() {
  // Validate step 2 (company name required)
  if (currentStep === 2) {
    const companyName = overlayEl.querySelector('#onboard-company').value.trim();
    if (!companyName) {
      const input = overlayEl.querySelector('#onboard-company');
      input.style.borderColor = 'var(--color-danger-500, #EF4444)';
      input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.12)';
      input.focus();
      input.addEventListener('input', function handler() {
        input.style.borderColor = '';
        input.style.boxShadow = '';
        input.removeEventListener('input', handler);
      });
      return;
    }
  }

  if (currentStep === TOTAL_STEPS) {
    completeOnboarding();
    return;
  }

  currentStep++;
  updateStep();
}

function goBack() {
  if (currentStep <= 1) return;
  currentStep--;
  updateStep();
}

// ============================================
// COMPLETION
// ============================================

function completeOnboarding() {
  // Gather form data
  const companyName = overlayEl.querySelector('#onboard-company')?.value.trim() || 'SuFa Inventory';
  const companyAddress = overlayEl.querySelector('#onboard-address')?.value.trim() || '';
  const companyPhone = overlayEl.querySelector('#onboard-phone')?.value.trim() || '';
  const companyEmail = overlayEl.querySelector('#onboard-email')?.value.trim() || '';
  const currency = overlayEl.querySelector('#onboard-currency')?.value || 'USD';
  const taxRate = parseFloat(overlayEl.querySelector('#onboard-tax')?.value) || 10;
  const threshold = parseInt(overlayEl.querySelector('#onboard-threshold')?.value, 10) || 10;

  const currencyInfo = CURRENCY_MAP[currency] || CURRENCY_MAP.USD;

  // Save settings to store
  store.updateSettings({
    companyName,
    companyAddress,
    companyPhone,
    companyEmail,
    currency,
    currencySymbol: currencyInfo.symbol,
    taxRate,
    lowStockThreshold: threshold,
  });

  // Mark onboarding complete
  localStorage.setItem(ONBOARDING_KEY, 'true');

  // Remove overlay
  if (overlayEl && overlayEl.parentNode) {
    overlayEl.style.animation = 'onboard-fade-in 0.3s ease reverse forwards';
    setTimeout(() => {
      if (overlayEl && overlayEl.parentNode) {
        overlayEl.parentNode.removeChild(overlayEl);
      }
      overlayEl = null;
    }, 280);
  }

  // Navigate to dashboard
  window.location.hash = 'dashboard';
}

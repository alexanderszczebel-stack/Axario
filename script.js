'use strict';

// ─── Adres backendu chatbota na Render ───────────────────────
const CHAT_API_URL = 'https://axario-chat-backend.onrender.com/api/chat';

// ─── Pobierz odpowiedź od AI ─────────────────────────────────
async function fetchChatbotReply(userMessage) {
  try {
    const response = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
    });
    if (!response.ok) throw new Error('Błąd serwera');
    const data = await response.json();
    return data.reply || 'Brak odpowiedzi od czatu.';
  } catch {
    return 'Ups! Wystąpił problem z połączeniem. Spróbuj ponownie później.';
  }
}

// ─── Animacja ptaszka po wysłaniu formularza ─────────────────
let formSuccessTimeout;
function showFormSuccessOverlay() {
  const overlay = document.getElementById('formSuccessOverlay');
  if (!overlay) return;
  window.clearTimeout(formSuccessTimeout);
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  formSuccessTimeout = window.setTimeout(() => {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
  }, 1800);
}

// ─── Okno chatu ───────────────────────────────────────────────
function setupChat(windowId, formId, inputId, chipsSelector, initialMessage) {
  const windowEl = document.getElementById(windowId);
  const formEl   = document.getElementById(formId);
  const inputEl  = document.getElementById(inputId);
  const chips    = chipsSelector ? document.querySelectorAll(chipsSelector) : [];

  if (!windowEl) return;

  function addMessage(text, type) {
    if (type === undefined) type = 'bot';
    const div = document.createElement('div');
    div.className = 'message ' + type;
    div.textContent = text;
    windowEl.appendChild(div);
    windowEl.scrollTop = windowEl.scrollHeight;
  }

  function addTyping() {
    const wrapper = document.createElement('div');
    wrapper.className = 'message bot typing';
    const dots = document.createElement('div');
    dots.className = 'typing-dots';
    dots.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'typing-dot';
      dots.appendChild(dot);
    }
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = 'Piszę odpowiedź';
    wrapper.appendChild(dots);
    wrapper.appendChild(sr);
    windowEl.appendChild(wrapper);
    windowEl.scrollTop = windowEl.scrollHeight;
    return wrapper;
  }

  async function handleUserMessage(text) {
    if (!text.trim()) return;
    addMessage(text.trim(), 'user');
    const typing = addTyping();
    if (inputEl) inputEl.disabled = true;
    const submitBtn = formEl ? formEl.querySelector('button[type="submit"]') : null;
    if (submitBtn) submitBtn.disabled = true;
    try {
      const reply = await fetchChatbotReply(text.trim());
      addMessage(reply, 'bot');
    } finally {
      typing.remove();
      if (inputEl) inputEl.disabled = false;
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  chips.forEach(function(chip) {
    chip.addEventListener('click', function() {
      var text = chip.textContent || '';
      if (!text.trim()) return;
      if (inputEl) inputEl.value = '';
      handleUserMessage(text);
    });
  });

  if (formEl && inputEl) {
    formEl.addEventListener('submit', function(e) {
      e.preventDefault();
      var text = inputEl.value;
      if (!text.trim()) return;
      inputEl.value = '';
      handleUserMessage(text);
    });
  }

  if (initialMessage) addMessage(initialMessage, 'bot');
}

// ─── Wszystko inicjalizuje się po załadowaniu DOM ─────────────
document.addEventListener('DOMContentLoaded', function() {

  // Hamburger menu
  var navToggle = document.querySelector('.nav-toggle');
  var navLinks  = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function() {
      navLinks.classList.toggle('is-open');
      navToggle.classList.toggle('is-open');
    });
    navLinks.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function() {
        navLinks.classList.remove('is-open');
        navToggle.classList.remove('is-open');
      });
    });
  }

  // FAQ accordion
  var faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(function(item) {
    item.addEventListener('click', function() {
      var isOpen = item.classList.contains('is-open');
      faqItems.forEach(function(i) { i.classList.remove('is-open'); });
      if (!isOpen) item.classList.add('is-open');
    });
  });

  // ─── Formularz wyceny → Formspree ────────────────────────
  var quoteForm = document.getElementById('quoteForm');
  var formNote  = document.getElementById('formNote');

  if (quoteForm) {
    quoteForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      event.stopPropagation();

      var submitBtn = quoteForm.querySelector('button[type="submit"]');
      var originalText = submitBtn ? submitBtn.textContent : '';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Wysyłanie…';
      }
      if (formNote) {
        formNote.textContent = '';
        formNote.className = 'form-note';
      }

      try {
        var response = await fetch('https://formspree.io/f/xqeyrnoa', {
          method: 'POST',
          body: new FormData(quoteForm),
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          quoteForm.reset();
          showFormSuccessOverlay();
          if (formNote) {
            formNote.textContent = 'Wiadomość wysłana! Odezwiemy się w 1–2 dni robocze.';
            formNote.className = 'form-note success';
          }
        } else {
          var data = await response.json().catch(function() { return {}; });
          var msg = (data.errors && data.errors.length)
            ? data.errors.map(function(e) { return e.message; }).join(', ')
            : 'Coś poszło nie tak. Spróbuj ponownie później.';
          if (formNote) {
            formNote.textContent = msg;
            formNote.className = 'form-note error';
          }
        }
      } catch(err) {
        if (formNote) {
          formNote.textContent = 'Błąd połączenia. Sprawdź internet i spróbuj ponownie.';
          formNote.className = 'form-note error';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

  // ─── Floating chat popup ──────────────────────────────────
  var launcher    = document.querySelector('.chat-launcher');
  var popup       = document.querySelector('.chat-popup');
  var chatOverlay = document.querySelector('.chat-overlay');
  var popupClose  = document.querySelector('.chat-popup-close');

  function openPopup() {
    if (!popup) return;
    popup.classList.add('is-open');
    popup.setAttribute('aria-hidden', 'false');
    if (chatOverlay) chatOverlay.classList.add('is-open');
  }

  function closePopup() {
    if (!popup) return;
    popup.classList.remove('is-open');
    popup.setAttribute('aria-hidden', 'true');
    if (chatOverlay) chatOverlay.classList.remove('is-open');
  }

  if (launcher) launcher.addEventListener('click', openPopup);
  if (popupClose) popupClose.addEventListener('click', closePopup);
  if (chatOverlay) chatOverlay.addEventListener('click', closePopup);

  // Chat wbudowany w sekcję
  setupChat(
    'chatWindow', 'chatForm', 'chatInput',
    '.chat-suggestions .suggestion-chip',
    'Cześć, jestem przykładowym asystentem AI. Napisz krótko, czego potrzebujesz – strony, SEO czy chatbota – a podpowiem, od czego zacząć i jak wygląda darmowa wycena.'
  );

  // Chat popup (floating)
  setupChat(
    'chatWindowFloating', 'chatFormFloating', 'chatInputFloating',
    '.chat-popup .suggestion-chip',
    'Cześć, tu szybki podgląd, jak może działać chatbot na Twojej stronie. Napisz, o co chcesz zapytać.'
  );

  // ─── Demo modal ───────────────────────────────────────────
  var cards        = document.querySelectorAll('.demo-card-new');
  var modal        = document.getElementById('demoModal');
  var modalFrame   = document.getElementById('demoModalFrame');
  var closeButtons = modal ? modal.querySelectorAll('[data-demo-close]') : [];

  if (cards.length && modal && modalFrame) {
    function openDemo(card) {
      var previewFrame = card.querySelector('iframe');
      if (!previewFrame) return;
      if (previewFrame.getAttribute('srcdoc')) {
        modalFrame.srcdoc = previewFrame.getAttribute('srcdoc');
        modalFrame.removeAttribute('src');
      } else if (previewFrame.getAttribute('src')) {
        modalFrame.src = previewFrame.getAttribute('src');
        modalFrame.removeAttribute('srcdoc');
      }
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeDemo() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      modalFrame.removeAttribute('src');
      modalFrame.removeAttribute('srcdoc');
      document.body.style.overflow = '';
    }

    cards.forEach(function(card) {
      card.addEventListener('click', function() { openDemo(card); });
      card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDemo(card); }
      });
    });

    closeButtons.forEach(function(btn) { btn.addEventListener('click', closeDemo); });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeDemo();
    });
  }

}); // DOMContentLoaded

// ─── Czekamy aż DOM będzie gotowy ────────────────────────
// To jest kluczowe — bez tego getElementById zwraca null
// i żadne eventy nie są podpięte (chatbot milczy)
document.addEventListener('DOMContentLoaded', () => {

  // ─── Chatbot: adres backendu na Render ──────────────────
  const CHAT_API_URL = 'https://axario-chat-backend.onrender.com/api/chat';

  // ─── Chatbot: wywołanie API ──────────────────────────────
  async function fetchChatbotReply(userMessage) {
    try {
      const response = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });
      if (!response.ok) throw new Error('Błąd serwera');
      const data = await response.json();
      return data.reply || 'Ups! Nie udało mi się pobrać odpowiedzi.';
    } catch (err) {
      return 'Ups! Wystąpił problem z połączeniem. Spróbuj ponownie później.';
    }
  }

  // ─── Nav toggle ─────────────────────────────────────────
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks  = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('is-open');
    });
  }

  // ─── FAQ accordion ──────────────────────────────────────
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach((item) => {
    item.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      faqItems.forEach((i) => i.classList.remove('is-open'));
      if (!isOpen) item.classList.add('is-open');
    });
  });

  // ─── setupChat ──────────────────────────────────────────
  function setupChat(windowId, formId, inputId, chipsSelector, initialMessage) {
    const windowEl = document.getElementById(windowId);
    const formEl   = document.getElementById(formId);
    const inputEl  = document.getElementById(inputId);
    const chips    = chipsSelector ? document.querySelectorAll(chipsSelector) : [];

    // Jeśli elementu nie ma na tej podstronie — pomijamy cicho
    if (!windowEl) return;

    function addMessage(text, type = 'bot') {
      const div = document.createElement('div');
      div.className = `message ${type}`;
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

      for (let i = 0; i < 3; i += 1) {
        const dot = document.createElement('span');
        dot.className = 'typing-dot';
        dots.appendChild(dot);
      }

      const srText = document.createElement('span');
      srText.className = 'sr-only';
      srText.textContent = 'Piszę odpowiedź';

      wrapper.appendChild(dots);
      wrapper.appendChild(srText);
      windowEl.appendChild(wrapper);
      windowEl.scrollTop = windowEl.scrollHeight;
      return wrapper;
    }

    async function handleUserMessage(text) {
      if (!text.trim()) return;

      addMessage(text.trim(), 'user');
      const typing = addTyping();

      const submitBtn = formEl ? formEl.querySelector('button[type="submit"]') : null;
      if (inputEl)   inputEl.disabled   = true;
      if (submitBtn) submitBtn.disabled = true;

      try {
        const reply = await fetchChatbotReply(text.trim());
        addMessage(reply, 'bot');
      } finally {
        if (typing)    typing.remove();
        if (inputEl)   inputEl.disabled   = false;
        if (submitBtn) submitBtn.disabled = false;
        if (inputEl)   inputEl.focus();
      }
    }

    // Kliknięcie chipu → przez backend AI, bez hardcoded reply
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const text = chip.textContent || '';
        if (!text.trim()) return;
        if (inputEl) inputEl.value = '';
        handleUserMessage(text);
      });
    });

    if (formEl && inputEl) {
      formEl.addEventListener('submit', (event) => {
        event.preventDefault();
        const text = inputEl.value;
        if (!text.trim()) return;
        inputEl.value = '';
        handleUserMessage(text);
      });
    }

    if (initialMessage) {
      addMessage(initialMessage, 'bot');
    }
  }

  // ─── Chatbot na stronie (pełny widok) ───────────────────
  setupChat(
    'chatWindow',
    'chatForm',
    'chatInput',
    '.chat-suggestions .suggestion-chip',
    'Cześć! Jestem asystentem Axario. Napisz krótko, czego potrzebujesz — strony, SEO czy chatbota — a podpowiem, od czego zacząć i jak wygląda darmowa wycena.',
  );

  // ─── Formularz wyceny ───────────────────────────────────
  const quoteForm = document.getElementById('quoteForm');

  if (quoteForm) {
    let formNote = document.getElementById('formNote');
    if (!formNote) {
      formNote = document.createElement('p');
      formNote.id = 'formNote';
      formNote.className = 'form-note';
      quoteForm.appendChild(formNote);
    }

    quoteForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const submitBtn    = quoteForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Wysyłanie…';
      }
      formNote.textContent = '';
      formNote.className = 'form-note';

      try {
        const response = await fetch(quoteForm.action, {
          method: 'POST',
          body: new FormData(quoteForm),
          headers: { Accept: 'application/json' },
        });

        if (response.ok) {
          formNote.textContent = 'Wiadomość wysłana. Odezwiemy się w 1–2 dni robocze.';
          formNote.className = 'form-note success';
          quoteForm.reset();
        } else {
          const data = await response.json().catch(() => ({}));
          const msg =
            data.errors && data.errors.length
              ? data.errors.map((e) => e.message).join(', ')
              : 'Coś poszło nie tak. Spróbuj ponownie później.';
          formNote.textContent = msg;
          formNote.className = 'form-note error';
        }
      } catch {
        formNote.textContent = 'Błąd połączenia. Sprawdź internet i spróbuj ponownie.';
        formNote.className = 'form-note error';
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

  // ─── Popup chatbot (floating) ───────────────────────────
  const launcher   = document.querySelector('.chat-launcher');
  const popup      = document.querySelector('.chat-popup');
  const overlay    = document.querySelector('.chat-overlay');
  const popupClose = document.querySelector('.chat-popup-close');

  function openPopup() {
    if (!popup) return;
    popup.classList.add('is-open');
    if (overlay) overlay.classList.add('is-open');
  }

  function closePopup() {
    if (!popup) return;
    popup.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-open');
  }

  if (launcher && popup) launcher.addEventListener('click', openPopup);
  if (popupClose)        popupClose.addEventListener('click', closePopup);
  if (overlay && popup)  overlay.addEventListener('click', closePopup);

  // ─── Chatbot popup (floating) ───────────────────────────
  setupChat(
    'chatWindowFloating',
    'chatFormFloating',
    'chatInputFloating',
    '.chat-popup .suggestion-chip',
    'Cześć! Jestem asystentem Axario. Napisz, o co chcesz zapytać — chętnie pomogę.',
  );

}); // koniec DOMContentLoaded

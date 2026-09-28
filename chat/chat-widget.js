/*
 * Superior Brass support chat widget.
 *
 * Three entry points, all talking to the same backend (see API doc):
 *   - sticky_widget          floating launcher on every page
 *   - product_page           "Ask about this product" button next to .product-code
 *   - technical_support_page inline chat inside #sb-chat-inline
 *
 * API URL: LOCAL_API_URL when the site is opened on localhost / 127.0.0.1,
 * PRODUCTION_API_URL everywhere else (e.g. on Vercel). Set PRODUCTION_API_URL to the
 * deployed backend (Railway / Render / …) before deploying.
 */
(function () {
  "use strict";

  var LOCAL_API_URL = "http://localhost:3001";
  var PRODUCTION_API_URL = "https://YOUR-BACKEND-URL.example.com"; // TODO: set before deploying

  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var API_URL = (isLocal ? LOCAL_API_URL : PRODUCTION_API_URL).replace(/\/$/, "");

  var TEXT = {
    title: "Superior Brass Assistant",
    subtitleSticky: "Ask us anything about our products",
    subtitleProduct: "About product ",
    subtitleSupport: "Technical support",
    // Greeting per entry point (frontend-only text, not from the backend).
    greetingSticky: "Hi! How can we help you today?",
    greetingProduct: "Hi! Have a question about product {code}? Ask away.",
    greetingSupport: "Hi! Describe the problem you're having. If you know your product code (e.g. 59405), please include it.",
    placeholder: "Type your message…",
    send: "Send",
    modelLabel: "Your model (optional)",
    modelNone: "— select model —",
    error: "Sorry, something went wrong. Please try again in a moment.",
    errorRateLimit: "Our AI assistant has reached its usage limit. Please try again shortly.",
    errorUpstream: "Our AI assistant is temporarily busy. Please try again shortly.",
    errorAuth: "The assistant is temporarily unavailable. Please try again later.",
    errorPartial: "The answer was interrupted.",
    emailLabel: "Your email",
    emailPlaceholder: "you@example.com",
    emailSubmit: "Send to our team",
    emailInvalid: "Please enter a valid email address.",
    escalated: "Thanks! Our team will follow up with you by email.",
    productButton: "Ask our assistant about this product",
    launcher: "Chat with us",
    close: "Close chat",
    newChat: "New chat",
  };

  // ---------- storage (per-viewer convenience only; must work without it) ----------
  function load(key) {
    try { return JSON.parse(sessionStorage.getItem(key)) || null; } catch (e) { return null; }
  }
  function store(key, val) {
    try { sessionStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
  }
  function forget(key) {
    try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  // ---------- product code list (shared, fetched once) ----------
  var productsPromise = null;
  function getProducts() {
    if (!productsPromise) {
      productsPromise = fetch(API_URL + "/chat/products")
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; });
    }
    return productsPromise;
  }

  // Backend error codes: RATE_LIMIT | AUTH_ERROR | UPSTREAM_ERROR | UNKNOWN.
  function errorText(code) {
    if (code === "RATE_LIMIT") return TEXT.errorRateLimit;
    if (code === "UPSTREAM_ERROR") return TEXT.errorUpstream;
    if (code === "AUTH_ERROR") return TEXT.errorAuth;
    return TEXT.error;
  }

  // Non-streaming error bodies look like { code, message } (HTTP 503).
  function httpError(res) {
    return res.json().catch(function () { return {}; }).then(function (body) {
      var err = new Error("HTTP " + res.status);
      err.code = body && body.code;
      throw err;
    });
  }

  // Bot replies use light Markdown: escape everything, then allow **bold** only.
  function setBotText(node, text) {
    var safe = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    node.innerHTML = safe.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ---------- SSE over fetch ----------
  function streamMessage(body, handlers) {
    return fetch(API_URL + "/chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (res) {
      if (!res.ok) return httpError(res);
      if (!res.body) throw new Error("no response body");
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";
      var finished = false;
      function handle(part) {
        part = part.trim();
        if (part.indexOf("data:") !== 0) return;
        var event;
        try { event = JSON.parse(part.slice(5).trim()); } catch (e) { return; }
        if (event.type === "done" || event.type === "error") finished = true;
        (handlers[event.type] || function () {})(event);
      }
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) {
            if (buffer) handle(buffer);
            if (!finished) throw new Error("stream ended early");
            return;
          }
          buffer += decoder.decode(r.value, { stream: true });
          var parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          parts.forEach(handle);
          return pump();
        });
      }
      return pump();
    });
  }

  // ---------- one chat conversation UI ----------
  // ctx = { entryPoint, productCode? }
  function ChatView(root, ctx) {
    this.root = root;
    this.ctx = ctx;
    this.key = "sbchat:" + ctx.entryPoint + ":" + (ctx.productCode || "");
    this.state = load(this.key) || { sessionId: null, messages: [], pendingEscalation: null, escalated: false };
    this.busy = false;
    this.render();
  }

  ChatView.prototype.save = function () { store(this.key, this.state); };

  ChatView.prototype.reset = function () {
    forget(this.key);
    this.state = { sessionId: null, messages: [], pendingEscalation: null, escalated: false };
    this.render();
  };

  ChatView.prototype.render = function () {
    var self = this;
    this.root.innerHTML = "";

    this.list = el("div", "sbc-messages");
    this.list.setAttribute("aria-live", "polite");
    this.root.appendChild(this.list);

    this.addBubble("bot", greetingFor(this.ctx), true);
    this.state.messages.forEach(function (m) { self.addBubble(m.role, m.text, true); });

    this.escalationSlot = el("div", "sbc-escalation-slot");
    this.list.appendChild(this.escalationSlot);
    if (this.state.pendingEscalation && !this.state.escalated) this.showEmailForm();

    var form = el("form", "sbc-form");

    // Model dropdown: only when the product isn't already known from the page.
    if (!this.ctx.productCode) {
      var modelRow = el("label", "sbc-model");
      modelRow.appendChild(el("span", null, TEXT.modelLabel));
      this.modelSelect = el("select");
      this.modelSelect.appendChild(new Option(TEXT.modelNone, ""));
      modelRow.appendChild(this.modelSelect);
      form.appendChild(modelRow);
      getProducts().then(function (codes) {
        codes.forEach(function (c) { self.modelSelect.appendChild(new Option(c, c)); });
        if (self.state.selectedModel) self.modelSelect.value = self.state.selectedModel;
        if (!codes.length) modelRow.style.display = "none";
      });
      this.modelSelect.addEventListener("change", function () {
        self.state.selectedModel = self.modelSelect.value;
        self.save();
      });
    }

    var row = el("div", "sbc-input-row");
    this.input = el("textarea", "sbc-input");
    this.input.rows = 1;
    this.input.maxLength = 2000;
    this.input.placeholder = TEXT.placeholder;
    this.input.setAttribute("aria-label", TEXT.placeholder);
    this.sendBtn = el("button", "sbc-send", TEXT.send);
    this.sendBtn.type = "submit";
    row.appendChild(this.input);
    row.appendChild(this.sendBtn);
    form.appendChild(row);
    this.root.appendChild(form);

    this.input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : self.send(); }
    });
    this.input.addEventListener("input", function () {
      self.input.style.height = "auto";
      self.input.style.height = Math.min(self.input.scrollHeight, 120) + "px";
    });
    form.addEventListener("submit", function (e) { e.preventDefault(); self.send(); });

    this.scroll();
  };

  ChatView.prototype.addBubble = function (role, text, silent) {
    var b = el("div", "sbc-msg sbc-" + role);
    if (role === "bot") setBotText(b, text); else b.textContent = text;
    if (this.escalationSlot && this.escalationSlot.parentNode === this.list) this.list.insertBefore(b, this.escalationSlot);
    else this.list.appendChild(b);
    if (!silent) this.scroll();
    return b;
  };

  ChatView.prototype.scroll = function () { this.list.scrollTop = this.list.scrollHeight; };

  ChatView.prototype.setBusy = function (busy) {
    this.busy = busy;
    this.sendBtn.disabled = busy;
    this.input.disabled = busy;
    if (!busy) this.input.focus();
  };

  ChatView.prototype.productCode = function () {
    return this.ctx.productCode || (this.modelSelect && this.modelSelect.value) || undefined;
  };

  ChatView.prototype.send = function () {
    var self = this;
    var text = this.input.value.trim();
    if (!text || this.busy) return;
    this.input.value = "";
    this.input.style.height = "auto";

    this.addBubble("user", text);
    this.state.messages.push({ role: "user", text: text });
    this.save();

    var bubble = this.addBubble("bot", "");
    bubble.classList.add("sbc-typing");
    var answer = "";
    this.setBusy(true);

    var body = { message: text, entryPoint: this.ctx.entryPoint };
    if (this.state.sessionId) body.sessionId = this.state.sessionId;
    var code = this.productCode();
    if (code) body.productCode = code;

    // Error event or network failure. Codes come from the stream's error event or a 503 body.
    // If part of the answer already streamed, keep it and append a note instead of discarding it.
    function fail(errOrEvent) {
      var note = errorText(errOrEvent && errOrEvent.code);
      bubble.classList.remove("sbc-typing");
      if (answer) {
        var extra = el("div", "sbc-error-note", TEXT.errorPartial + " " + note);
        bubble.appendChild(extra);
        self.state.messages.push({ role: "bot", text: answer });
        self.save();
      } else {
        bubble.classList.add("sbc-error");
        bubble.textContent = note;
      }
      self.scroll();
    }

    streamMessage(body, {
      session: function (ev) { self.state.sessionId = ev.sessionId; self.save(); },
      chunk: function (ev) {
        bubble.classList.remove("sbc-typing");
        answer += ev.text;
        setBotText(bubble, answer);
        self.scroll();
      },
      done: function (ev) {
        bubble.classList.remove("sbc-typing");
        if (ev.needsEscalation) {
          answer = ev.message || answer;
          setBotText(bubble, answer);
          self.state.pendingEscalation = { summary: ev.escalationSummary || text, productCode: code };
          self.state.escalated = false;
          self.showEmailForm();
        }
        self.state.messages.push({ role: "bot", text: answer });
        self.save();
        self.scroll();
      },
      error: fail,
    }).catch(fail).then(function () { self.setBusy(false); });
  };

  ChatView.prototype.showEmailForm = function () {
    var self = this;
    var pending = this.state.pendingEscalation;
    this.escalationSlot.innerHTML = "";

    var form = el("form", "sbc-email");
    var label = el("label", null, TEXT.emailLabel);
    var input = el("input");
    input.type = "email";
    input.required = true;
    input.placeholder = TEXT.emailPlaceholder;
    input.autocomplete = "email";
    label.appendChild(input);
    var btn = el("button", "sbc-send", TEXT.emailSubmit);
    btn.type = "submit";
    var msg = el("div", "sbc-email-msg");
    form.appendChild(label);
    form.appendChild(btn);
    form.appendChild(msg);
    this.escalationSlot.appendChild(form);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = TEXT.emailInvalid; return; }
      btn.disabled = true;
      msg.textContent = "";
      var body = { sessionId: self.state.sessionId, customerEmail: email, issueDescription: pending.summary };
      if (pending.productCode) body.productCode = pending.productCode;
      fetch(API_URL + "/chat/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(function (res) {
        if (res.status === 400) { msg.textContent = TEXT.emailInvalid; btn.disabled = false; return; }
        if (!res.ok) return httpError(res);
        self.escalationSlot.innerHTML = "";
        self.state.pendingEscalation = null;
        self.state.escalated = true;
        self.state.messages.push({ role: "bot", text: TEXT.escalated });
        self.save();
        self.addBubble("bot", TEXT.escalated);
      }).catch(function (err) {
        msg.textContent = errorText(err && err.code);
        btn.disabled = false;
      });
    });
    this.scroll();
  };

  // ---------- chrome: header + body ----------
  function buildShell(subtitle, onClose) {
    var shell = el("div", "sbc-shell");
    var head = el("div", "sbc-head");
    var titles = el("div", "sbc-titles");
    titles.appendChild(el("div", "sbc-title", TEXT.title));
    var sub = el("div", "sbc-subtitle", subtitle);
    titles.appendChild(sub);
    head.appendChild(titles);
    var actions = el("div", "sbc-actions");
    var reset = el("button", "sbc-icon-btn", "↺");
    reset.type = "button";
    reset.title = TEXT.newChat;
    reset.setAttribute("aria-label", TEXT.newChat);
    actions.appendChild(reset);
    if (onClose) {
      var close = el("button", "sbc-icon-btn", "×");
      close.type = "button";
      close.title = TEXT.close;
      close.setAttribute("aria-label", TEXT.close);
      close.addEventListener("click", onClose);
      actions.appendChild(close);
    }
    head.appendChild(actions);
    var body = el("div", "sbc-body");
    shell.appendChild(head);
    shell.appendChild(body);
    return { shell: shell, body: body, sub: sub, reset: reset };
  }

  function greetingFor(ctx) {
    if (ctx.entryPoint === "product_page") return TEXT.greetingProduct.replace("{code}", ctx.productCode);
    if (ctx.entryPoint === "technical_support_page") return TEXT.greetingSupport;
    return TEXT.greetingSticky;
  }

  function subtitleFor(ctx) {
    if (ctx.entryPoint === "product_page") return TEXT.subtitleProduct + ctx.productCode;
    if (ctx.entryPoint === "technical_support_page") return TEXT.subtitleSupport;
    return TEXT.subtitleSticky;
  }

  // ---------- floating widget (sticky + product page) ----------
  var floating = null;
  function getFloating() {
    if (floating) return floating;
    var panel = el("div", "sbc-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", TEXT.title);
    panel.hidden = true;
    var parts = buildShell("", function () { setOpen(false); });
    panel.appendChild(parts.shell);

    var launcher = el("button", "sbc-launcher");
    launcher.type = "button";
    launcher.setAttribute("aria-label", TEXT.launcher);
    launcher.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2z"/></svg>';
    launcher.appendChild(el("span", "sbc-launcher-label", TEXT.launcher));
    launcher.addEventListener("click", function () {
      if (!panel.hidden && floating.view && floating.view.ctx.entryPoint === "sticky_widget") setOpen(false);
      else openWith({ entryPoint: "sticky_widget" });
    });

    document.body.appendChild(panel);
    document.body.appendChild(launcher);

    parts.reset.addEventListener("click", function () { floating.view && floating.view.reset(); });

    function setOpen(open) {
      panel.hidden = !open;
      launcher.classList.toggle("sbc-open", open);
      store("sbchat:open", open ? floating.view.ctx : null);
      if (open) floating.view.input.focus();
    }

    function openWith(ctx) {
      if (!floating.view || floating.view.key !== "sbchat:" + ctx.entryPoint + ":" + (ctx.productCode || "")) {
        floating.view = new ChatView(parts.body, ctx);
        parts.sub.textContent = subtitleFor(ctx);
      }
      setOpen(true);
    }

    floating = { openWith: openWith, view: null };
    return floating;
  }

  // ---------- init ----------
  function init() {
    // Technical support page: inline chat, no floating launcher.
    var inline = document.getElementById("sb-chat-inline");
    if (inline) {
      var ctx = { entryPoint: "technical_support_page" };
      var parts = buildShell(subtitleFor(ctx), null);
      parts.shell.classList.add("sbc-inline");
      inline.appendChild(parts.shell);
      var view = new ChatView(parts.body, ctx);
      parts.reset.addEventListener("click", function () { view.reset(); });
      return;
    }

    var w = getFloating();

    // Product detail page only (.detailCart exists only on pd.html, not on category lists,
    // where every card has its own p.product-code). Button goes in the action row,
    // left of "Request Info" / "Print", styled like those buttons.
    var pc = document.querySelector(".detailCart p.product-code");
    var requestInfo = document.querySelector('a[href*="request_information"]');
    if (pc && requestInfo) {
      var code = pc.textContent.replace(/Product Code:/i, "").trim();
      if (code) {
        var btn = el("button", "btn btn-light mb-2 sbc-product-btn");
        btn.type = "button";
        btn.innerHTML = '<i class="fa fa-comments"></i> ';
        btn.appendChild(document.createTextNode(TEXT.productButton));
        btn.addEventListener("click", function () { w.openWith({ entryPoint: "product_page", productCode: code }); });
        requestInfo.parentNode.insertBefore(btn, requestInfo);
        requestInfo.parentNode.insertBefore(document.createTextNode(" "), requestInfo);
      }
    }

    // Keep the panel open across page navigation if it was open.
    var wasOpen = load("sbchat:open");
    if (wasOpen && wasOpen.entryPoint) {
      if (wasOpen.entryPoint === "product_page" && (!pc || pc.textContent.indexOf(wasOpen.productCode) === -1)) {
        w.openWith({ entryPoint: "sticky_widget" });
      } else {
        w.openWith(wasOpen);
      }
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

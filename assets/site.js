/* 베스트엑싯 FAQ 가이드 — 화면 동작(내용은 모두 HTML 에 들어 있고, 여기서는 보이기·숨기기·순서만 바꿉니다)
   1) TOP 버튼: 300px 넘게 내리면 보이고, 누르면 맨 위로(동작 줄이기 설정이면 바로 이동)
   2) 첫 화면형 페이지
      · 펼침: 한 번에 하나, 펼친 항목의 질문 줄을 분야 메뉴 띠 바로 아래로
      · 검색: 챗봇처럼 관련도 순서로 한 목록에 보여 줌(분야 구역은 잠시 숨김). 챗봇 동의어 표로 검색어를 정리
      · 분야 탭: 누르면 그 분야로, 스크롤하면 메뉴 띠 아래를 지나간 분야에 밑줄(검색 중에는 '전체') */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var behavior = function (smooth) { return smooth && !reduce ? 'smooth' : 'auto'; };

  // ── 1) TOP 버튼 ──
  var top = document.getElementById('scrollTopPc');
  if (top) {
    var onTop = function () { top.style.display = (window.pageYOffset || document.documentElement.scrollTop) > 300 ? 'inline' : 'none'; };
    window.addEventListener('scroll', onTop, { passive: true });
    onTop();
    top.addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: behavior(true) }); });
  }

  var land = document.querySelector('[data-landing]');
  if (!land) return;

  // ── 공통: 메뉴 띠 아랫변 위치와 '그 바로 아래로 옮기기' ──
  var menubar = land.querySelector('.menubar');
  function barBottom() { return menubar ? (parseFloat(getComputedStyle(menubar).top) || 0) + menubar.offsetHeight : 0; }
  function placeUnderBar(el, smooth) {
    var r = el.getBoundingClientRect().top;
    if (Math.abs(r - barBottom()) <= 2) return;   // 이미 그 자리면 흔들지 않음
    window.scrollTo({ top: Math.max(0, Math.round(r + window.pageYOffset - barBottom())), behavior: behavior(smooth) });
  }

  // ── 2-1) 펼침: 한 번에 하나(details name 미지원 브라우저 대비) + 펼친 항목을 메뉴 띠 바로 아래로 ──
  var all = Array.prototype.slice.call(land.querySelectorAll('details.acc'));
  var smoothNext = true;
  all.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open) return;
      all.forEach(function (o) { if (o !== d && o.open) o.open = false; });
      var smooth = smoothNext; smoothNext = true;
      placeUnderBar(d, smooth);   // 위치를 재는 순간 배치가 다시 계산되므로 앞 항목이 닫힌 뒤의 위치가 나옵니다
    });
  });

  // ── 2-2) 분야 탭(스크롤 따라 밑줄) ──
  var sections = Array.prototype.slice.call(land.querySelectorAll('section.cat-sec'));
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tabbar a[data-sec]'));
  var allTab = document.querySelector('.tabbar a[data-all]');
  var searching = false, spyLock = 0;
  function setActive(a) {
    if (!a) return;
    document.querySelectorAll('.tabbar a').forEach(function (x) { x.removeAttribute('aria-current'); });
    a.setAttribute('aria-current', 'true');
    var bar = a.parentNode;
    if (bar && bar.scrollWidth > bar.clientWidth) {   // 휴대폰처럼 탭이 넘칠 때만, 지금 탭이 보이게 탭 줄을 옆으로
      var x = a.getBoundingClientRect().left - bar.getBoundingClientRect().left + bar.scrollLeft;
      bar.scrollLeft = Math.max(0, x - 12);
    }
  }
  function spy() {
    if (!tabs.length || searching || Date.now() < spyLock) return;
    var line = barBottom() + 2, current = null;
    sections.forEach(function (s) { if (!s.hidden && s.getBoundingClientRect().top <= line) current = s; });
    setActive(current ? document.querySelector('.tabbar a[data-sec="' + current.id + '"]') : allTab);
  }
  var spyQueued = false;
  window.addEventListener('scroll', function () {
    if (spyQueued) return; spyQueued = true;
    setTimeout(function () { spyQueued = false; spy(); }, 60);
  }, { passive: true });

  // ── 2-3) 검색(관련도 순) ──
  var input = document.getElementById('find');
  var resSec = document.getElementById('results'), resList = document.getElementById('results-list');
  var resH = document.getElementById('results-h'), resEmpty = document.getElementById('results-empty');
  var syn = [];
  try { syn = JSON.parse((document.getElementById('syn') || {}).textContent || '[]').map(function (p) { return [new RegExp(p[0], 'gi'), p[1]]; }); } catch (err) { syn = []; }
  var norm = function (s) { return String(s || '').toLowerCase().replace(/[\s·,.?!()'"‘’“”\-\/~:;\[\]{}<>|_+=*#@$%^]/g, ''); };
  var PARTICLES = ['으로', '은', '는', '이', '가', '을', '를', '의', '도', '로'];
  function stripParticle(t) { for (var i = 0; i < PARTICLES.length; i++) { var p = PARTICLES[i]; if (t.length - p.length >= 2 && t.slice(-p.length) === p) return t.slice(0, -p.length); } return t; }
  var index = null;   // 처음 검색할 때 한 번 만듭니다
  function buildIndex() {
    index = all.map(function (d, i) {
      var panel = d.querySelector('.acc-p');
      var ans = panel.querySelector('.acc-a');
      var a = ans ? ans.textContent : '';
      var marker = document.createComment('');
      d.parentNode.insertBefore(marker, d);
      return { d: d, i: i, calc: d.hasAttribute('data-calcq'), marker: marker, t: norm(d.querySelector('.acc-t').textContent), k: norm(d.getAttribute('data-k')), a: norm(a), x: norm((panel.textContent || '').replace(a, '')) };
    });
  }
  function queryTokens(raw) {
    var s = String(raw || '').toLowerCase();
    syn.forEach(function (p) { s = s.replace(p[0], ' ' + p[1] + ' '); });   // 챗봇 맞춤법·동의어 표
    return s.split(/\s+/).map(norm).map(stripParticle).filter(Boolean);
  }
  function score(it, toks, q) {
    if (it.t === q) return 1000;                                     // 제목과 똑같음
    var per = toks.map(function (t) { return it.t.indexOf(t) >= 0 ? 600 : it.k.indexOf(t) >= 0 ? 400 : it.a.indexOf(t) >= 0 ? 200 : it.x.indexOf(t) >= 0 ? 100 : 0; });
    var found = per.filter(function (v) { return v > 0; }).length;
    if (!found) return 0;
    var avg = per.reduce(function (a, b) { return a + b; }, 0) / toks.length;
    if (found < toks.length) return avg * 0.4;                       // 일부 낱말만 맞음(모두 맞는 항목이 없을 때만 보여 줌)
    if (it.t.indexOf(q) === 0) return 800;                           // 제목이 검색어로 시작
    return avg + (it.t.indexOf(q) >= 0 ? 50 : 0);                    // 제목 > 다른 표현·동의어 > 한 줄 답 > 자세히
  }
  var savedY = null;
  function putBack() { index.forEach(function (it) { if (it.d.parentNode === resList) it.marker.parentNode.insertBefore(it.d, it.marker.nextSibling); }); }
  function runSearch(raw, position) {
    var toks = queryTokens(raw);
    if (!toks.length) { clearSearch(true); return; }
    if (!index) buildIndex();
    if (!searching) savedY = window.pageYOffset;
    var q = toks.join('');
    var scored = index.map(function (it) { return { it: it, s: score(it, toks, q) }; });
    var list = scored.filter(function (r) { return r.s >= 100; });
    if (!list.length) list = scored.filter(function (r) { return r.s > 0; });
    // 같은 층(제목 일치 · 다른 표현 · 한 줄 답 · 자세히)이면 일반 질문을 계산기 소개 질문보다 앞에, 그다음 점수·원래 순서
    var tier = function (v) { return v >= 1000 ? 5 : v >= 600 ? 4 : v >= 400 ? 3 : v >= 200 ? 2 : v >= 100 ? 1 : 0; };
    list.sort(function (a, b) { return tier(b.s) - tier(a.s) || (a.it.calc - b.it.calc) || b.s - a.s || a.it.i - b.it.i; });
    searching = true;
    land.classList.add('searching');
    all.forEach(function (d) { if (d.open) d.open = false; });
    putBack();
    list.forEach(function (r) { resList.appendChild(r.it.d); });
    sections.forEach(function (s) { s.hidden = true; });
    resSec.hidden = false;
    resH.textContent = '‘' + String(raw).trim() + '’ 검색 결과 ' + list.length + '개';
    resEmpty.hidden = list.length !== 0;
    resList.hidden = list.length === 0;
    setActive(allTab || document.querySelector('.tabbar a[aria-current]') || document.querySelector('.tabbar a'));
    if (position) placeUnderBar(resSec, true);
  }
  function clearSearch(restoreScroll) {
    if (!searching) return;
    putBack();
    sections.forEach(function (s) { s.hidden = false; });
    resSec.hidden = true;
    land.classList.remove('searching');
    searching = false;
    if (restoreScroll && savedY !== null) window.scrollTo({ top: savedY, behavior: 'auto' });
    savedY = null;
    spy();
  }
  if (input && resSec) {
    var timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { runSearch(input.value, true); }, 250);   // 입력이 멈추면 결과로 이동
    });
    var form = input.form;
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(timer); runSearch(input.value, true); });
    var q0 = new URLSearchParams(location.search).get('q');
    if (q0) { input.value = q0; runSearch(q0, true); window.addEventListener('load', function () { if (searching) placeUnderBar(resSec, false); }); }
  }

  // 분야 탭 누르기: 바로 밑줄, 이동하는 동안 밑줄이 다른 탭으로 바뀌지 않게
  tabs.concat(allTab ? [allTab] : []).forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('data-sec');
      if (searching) { if (input) input.value = ''; clearSearch(false); }
      var target = id ? document.getElementById(id) : land;
      if (!target) return;
      e.preventDefault();
      setActive(a);
      spyLock = Date.now() + 1200;
      if (id) placeUnderBar(target, true); else window.scrollTo({ top: 0, behavior: behavior(true) });
      try { history.replaceState(null, '', id ? '#' + id : location.pathname + location.search); } catch (err) { /* 무시 */ }
    });
  });

  // ── 2-4) 펼침 항목으로 바로 가기(#t-…, #q-…, #c-…) ──
  function openItem(id, smooth) {
    var d = document.getElementById(id);
    if (!d || d.tagName !== 'DETAILS') return false;
    if (searching && d.parentNode !== resList) { if (input) input.value = ''; clearSearch(false); }
    if (d.open) placeUnderBar(d, smooth);
    else { smoothNext = smooth; d.open = true; }
    return true;
  }
  land.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-open]');
    if (!a) return;
    if (openItem(a.getAttribute('data-open'), true)) {
      e.preventDefault();
      try { history.replaceState(null, '', '#' + a.getAttribute('data-open')); } catch (err) { /* 무시 */ }
    }
  });
  function fromHash() { var h = decodeURIComponent(location.hash.slice(1)); if (h) openItem(h, false); }
  window.addEventListener('hashchange', fromHash);
  fromHash();
  // 글꼴이 늦게 들어와 줄 높이가 바뀌어도 주소의 항목이 메뉴 띠 바로 아래에 오도록 한 번 더 맞춥니다
  window.addEventListener('load', function () { var h = decodeURIComponent(location.hash.slice(1)); var d = h && document.getElementById(h); if (d && d.tagName === 'DETAILS' && d.open) placeUnderBar(d, false); spy(); });
  spy();
})();

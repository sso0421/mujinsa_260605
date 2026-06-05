export function headerHTML(active = "") {
  return `
  <header class="header" id="siteHeader">
    <div class="header__top">
      <a class="brand" href="./index.html" id="gnbHome">
        <div class="brand__logo" aria-label="brand">MUJINSA</div>
        <div class="brand__sub">무진사랑해</div>
      </a>

      <nav class="gnb" aria-label="GNB">
        <div class="gnb__links" id="gnbLinks">
          <a href="./signup.html" id="gnbSignup">회원가입</a>
          <a href="./login.html" id="gnbLogin">로그인</a>
          <a href="./orders.html" id="gnbOrders">주문조회</a>
          <a href="./recent.html" id="gnbRecent">최근본상품</a>
          <a href="./help.html" id="gnbHelp">고객센터</a>
        </div>
        <div class="gnb__icons">
          <button class="icon-btn" id="btnSearch" aria-label="검색" data-event="search_open">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
          </button>
          <a class="icon-btn" id="btnAccount" aria-label="계정" href="./login.html" data-event="account_open">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </a>
          <a class="icon-btn" id="btnCart" aria-label="장바구니" href="./cart.html" data-event="cart_open">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6h15l-1.5 9h-12z"></path><path d="M6 6l-2-3H1"></path><circle cx="9" cy="20" r="1"></circle><circle cx="18" cy="20" r="1"></circle></svg>
          </a>
        </div>
        <!-- ✅ 모바일 토글 버튼 -->
        <button class="gnb__toggle" id="gnbToggle" type="button" aria-label="메뉴 열기" aria-expanded="false">
          ☰
        </button>
      </nav>
      <!-- ✅ 모바일 메뉴 드로어(링크 복제해서 넣거나, JS로 gnbLinks를 이동) -->
      <div class="gnb__drawer" id="gnbDrawer" hidden>
        <!-- 모바일에서 보여줄 링크 -->
      </div>
    </div>

    <div class="nav" role="navigation" aria-label="카테고리">
      <a href="./index.html" class="${active === "home" ? "active" : ""}" id="navRecommend">추천</a>
      <a href="./index.html#new" class="${active === "new" ? "active" : ""}" id="navNew">신상품</a>
      <a href="./index.html#sale" class="${active === "sale" ? "active" : ""}" id="navSale">세일</a>
      <a href="./index.html#ranking" class="${active === "rank" ? "active" : ""}" id="navRank">랭킹</a>
      <a href="./index.html#brands" class="${active === "brands" ? "active" : ""}" id="navBrands">브랜드</a>
    </div>
  </header>
  `;
}

export function searchModalHTML() {
  return `
  <div class="modal" id="searchModal" role="dialog" aria-modal="true" aria-labelledby="searchTitle">
    <div class="modal__panel">
      <div class="modal__head">
        <h2 id="searchTitle">SEARCH</h2>
        <button class="modal__close" id="btnSearchClose" aria-label="닫기" data-event="search_close">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18"></path><path d="M6 6l12 12"></path></svg>
        </button>
      </div>
      <div class="modal__body">
        <form class="searchbox" id="searchForm">
          <input id="searchInput" name="q" placeholder="검색어를 입력하세요" autocomplete="off" />
          <button type="submit" id="btnSearchSubmit" aria-label="검색" data-event="search_submit">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
          </button>
        </form>
        <div class="popular" id="popularKeywords">
          <a href="#" data-k="진주귀걸이" class="kw">#진주귀걸이</a>
          <a href="#" data-k="귀걸이" class="kw">#귀걸이</a>
          <a href="#" data-k="패션귀걸이" class="kw">#패션귀걸이</a>
          <a href="#" data-k="여성패션" class="kw">#여성패션</a>
          <a href="#" data-k="여자귀걸이" class="kw">#여자귀걸이</a>
        </div>
        <div id="searchPreview" style="margin-top:18px;"></div>
      </div>
    </div>
  </div>
  `;
}

export function footerHTML() {
  return `
  <footer class="footer">
    <div class="footer__inner">
      <div>
        <b>MUJINSA</b><br>
      </div>
      <div>
        <div></div>
        <div style="margin-top:6px;">© 2026 MUJINSA. All rights reserved.</div>
      </div>
    </div>
  </footer>
  `;
}

export function mountTopNotice() {
  const el = document.createElement("div");
  document.body.appendChild(el);
}

export function mountGnbToggle() {
  const tryMount = () => {
    console.log("mountGnbToggle called");
    console.log("btn", document.getElementById("gnbToggle"));
    console.log("drawer", document.getElementById("gnbDrawer"));

    const btn = document.getElementById("gnbToggle");
    const drawer = document.getElementById("gnbDrawer");
    const links = document.getElementById("gnbLinks");

    if (!btn || !drawer || !links) {
      requestAnimationFrame(tryMount);
    }
    if (!drawer.dataset.bound) {
      drawer.innerHTML = `
      <div class="gnb__links">
        ${links.innerHTML}
      </div>
    `;
      drawer.dataset.bound = "1";
    }

    const closeDrawer = () => {
      btn.setAttribute("aria-expanded", "false");
      drawer.hidden = true;
    };

    closeDrawer();

    btn.addEventListener("click", () => {
      const opened = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!opened));
      drawer.hidden = opened;
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 768) {
        btn.setAttribute("aria-expanded", "false");
        drawer.hidden = true;
      }
    });

    console.log("[gnb] mounted ✅");
  };

  tryMount();
}

import {
  qs,
  qsa,
  formatKRW,
  slugify,
  clamp,
  storeRecentlyViewed,
  toggleWish,
  getWishList,
  getRecentlyViewed,
  addToCart,
} from "./utils.js";
import { loadData } from "./data.js";
import { headerHTML, searchModalHTML, footerHTML } from "./partials.js";

// ====== simple analytics hook for GA4/GTM later ======
function track(name, params = {}) {
  // Keep it silent: no alert/console spam for students.
  // You can later push to dataLayer here.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: name, ...params });
}

function setHeader(active) {
  qs("#app").insertAdjacentHTML("afterbegin", headerHTML(active));
  document.body.insertAdjacentHTML("beforeend", searchModalHTML());
  // document.body.insertAdjacentHTML("beforeend", footerHTML());
}

function openSearch() {
  const modal = qs("#searchModal");
  if (!modal) return;
  modal.classList.add("is-open");
  qs("#searchInput").focus();
  track("search_open");
}
function closeSearch() {
  const modal = qs("#searchModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  track("search_close");
}

function wireSearchModal(products) {
  const btn = qs("#btnSearch");
  const closeBtn = qs("#btnSearchClose");
  const modal = qs("#searchModal");
  const form = qs("#searchForm");
  const input = qs("#searchInput");
  const preview = qs("#searchPreview");

  btn?.addEventListener("click", openSearch);
  closeBtn?.addEventListener("click", closeSearch);
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeSearch();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSearch();
  });

  // popular keyword chips
  qsa("#popularKeywords .kw").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const k = a.dataset.k || "";
      input.value = k;
      input.dispatchEvent(new Event("input"));
      input.focus();
      track("search_keyword_click", { keyword: k });
    });
  });

  // live preview
  input?.addEventListener("input", () => {
    const q = input.value.trim();
    if (!q) {
      preview.innerHTML = "";
      return;
    }
    const list = products
      .filter((p) =>
        (p.name + p.brand + p.tags.join(" "))
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
      .slice(0, 6);

    preview.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;">
        <div style="color:#666;font-size:13px;">미리보기 결과 (${list.length})</div>
        <a href="./search.html?q=${encodeURIComponent(q)}" id="goSearchPage" data-event="search_more">전체 결과 보기</a>
      </div>
      <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:12px;">
        ${list.map((p) => cardHTML(p, { compact: true })).join("")}
      </div>
    `;
  });

  // submit behavior: empty => search page (blank), non-empty => search page with q
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = (input.value || "").trim();
    track("search_submit", { query: q || "(empty)" });
    closeSearch();
    if (!q) location.href = "./search.html";
    else location.href = `./search.html?q=${encodeURIComponent(q)}`;
  });
}

function cardHTML(p, { compact = false } = {}) {
  const tags = (p.tags || []).slice(0, compact ? 2 : 3);
  return `
    <article class="card" data-product-id="${p.id}">
      <a href="./product.html?id=${encodeURIComponent(p.id)}" class="card__link" id="productCard-${p.id}" data-event="select_item" data-item-name="${escapeHtml(p.name)}">
        <div class="card__img"><img src="${p.thumbnailUrl}" alt="${escapeHtml(p.name)}" loading="lazy"></div>
        <div class="card__body">
          <div class="card__brand">${escapeHtml(p.brand)}</div>
          <div class="card__name">${escapeHtml(p.name)}</div>
          <div class="card__price">
            <span class="card__dc">${p.discountRate}%</span>
            <span class="card__sale">${formatKRW(p.salePrice)}</span>
            <span class="card__origin">${formatKRW(p.price)}</span>
          </div>
          <div class="card__meta">
            <span>★ ${p.rating.toFixed(1)}</span>
            <span>리뷰 ${p.reviewCount.toLocaleString("ko-KR")}</span>
          </div>
          ${tags.length ? `<div class="badges">${tags.map((t) => `<span class="badge">#${escapeHtml(t)}</span>`).join("")}</div>` : ""}
        </div>
      </a>
    </article>
  `;
}

function escapeHtml(s) {
  return (s || "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}

// ====== Pages ======
async function pageHome() {
  const { products } = await loadData();
  setHeader("home");
  wireSearchModal(products);

  qs("#pageTitle").textContent = "추천 상품";
  qs("#pageDesc").textContent = "MUJINSA · 오늘의 추천";

  // category options
  const cats = Array.from(new Set(products.map((p) => p.category))).sort();
  const catSel = qs("#filterCategory");
  catSel.innerHTML =
    `<option value="">전체 카테고리</option>` +
    cats
      .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
      .join("");

  let state = {
    q: "",
    category: "",
    sort: "recommend",
    min: "",
    max: "",
    cursor: 0,
    list: [],
  };

  function apply() {
    const q = state.q.trim().toLowerCase();
    const min = state.min === "" ? null : Number(state.min);
    const max = state.max === "" ? null : Number(state.max);

    let list = products.slice();
    if (state.category)
      list = list.filter((p) => p.category === state.category);
    if (q)
      list = list.filter((p) =>
        (p.name + p.brand + p.tags.join(" ")).toLowerCase().includes(q),
      );
    if (min != null && Number.isFinite(min))
      list = list.filter((p) => p.salePrice >= min);
    if (max != null && Number.isFinite(max))
      list = list.filter((p) => p.salePrice <= max);

    // sort
    if (state.sort === "priceAsc")
      list.sort((a, b) => a.salePrice - b.salePrice);
    else if (state.sort === "priceDesc")
      list.sort((a, b) => b.salePrice - a.salePrice);
    else if (state.sort === "discount")
      list.sort((a, b) => b.discountRate - a.discountRate);
    else if (state.sort === "review")
      list.sort((a, b) => b.reviewCount - a.reviewCount);
    else if (state.sort === "rating") list.sort((a, b) => b.rating - a.rating);
    else {
      // recommend: keep as-is (already in db order)
    }

    state.list = list;
    state.cursor = 0;
    qs("#countText").textContent =
      `${list.length.toLocaleString("ko-KR")}개 상품`;

    qs("#productGrid").innerHTML = "";
    renderNext();
    track("filter_apply", {
      q: state.q,
      category: state.category,
      sort: state.sort,
      min: state.min || null,
      max: state.max || null,
    });
  }

  function renderNext() {
    const start = state.cursor;
    const end = Math.min(
      state.cursor + Number(qs("#pageSize").value || 24),
      state.list.length,
    );
    const chunk = state.list.slice(start, end);

    const html = chunk.map((p) => cardHTML(p)).join("");
    qs("#productGrid").insertAdjacentHTML("beforeend", html);

    // click tracking
    chunk.forEach((p) => {
      const el = qs(`#productCard-${CSS.escape(p.id)}`);
      el?.addEventListener("click", () => {
        track("select_item", {
          item_id: p.id,
          item_name: p.name,
          item_brand: p.brand,
          item_category: p.category,
          price: p.salePrice,
        });
      });
    });

    state.cursor = end;
    qs("#loadMore").style.display =
      state.cursor < state.list.length ? "inline-flex" : "none";
  }

  // wire filters
  qs("#filterQuery").addEventListener("input", (e) => {
    state.q = e.target.value;
  });
  qs("#filterCategory").addEventListener("change", (e) => {
    state.category = e.target.value;
  });
  qs("#sortBy").addEventListener("change", (e) => {
    state.sort = e.target.value;
    apply();
  });
  qs("#minPrice").addEventListener("change", (e) => {
    state.min = e.target.value;
  });
  qs("#maxPrice").addEventListener("change", (e) => {
    state.max = e.target.value;
  });
  qs("#btnApply").addEventListener("click", apply);
  qs("#loadMore").addEventListener("click", () => {
    renderNext();
    track("load_more", { cursor: state.cursor });
  });

  // render initial
  apply();

  // scroll depth tracking (no popups)
  let fired = new Set();
  window.addEventListener(
    "scroll",
    () => {
      const doc = document.documentElement;
      const pct = Math.round(
        (doc.scrollTop / (doc.scrollHeight - doc.clientHeight)) * 100,
      );
      [25, 50, 75, 90].forEach((th) => {
        if (pct >= th && !fired.has(th)) {
          fired.add(th);
          track("scroll_depth", { percent: th, page: "home" });
        }
      });
    },
    { passive: true },
  );

  // recently viewed preview block
  renderRecentlyViewed();
}

function renderRecentlyViewed() {
  const items = getRecentlyViewed();
  const box = qs("#recentlyViewed");
  if (!box) return;
  if (!items.length) {
    box.innerHTML = `<div style="color:#666;font-size:13px;">최근 본 상품이 없습니다.</div>`;
    return;
  }
  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;">
      <b>최근 본 상품</b>
      <a href="./recent.html" id="recentMore">전체보기</a>
    </div>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;">
      ${items
        .slice(0, 6)
        .map(
          (p) => `
        <a href="./product.html?id=${encodeURIComponent(p.id)}" class="card" style="border-radius:14px;overflow:hidden;">
          <div class="card__img" style="aspect-ratio:1/1;"><img src="${p.thumbnailUrl}" alt="${escapeHtml(p.name)}"></div>
          <div class="card__body" style="padding:10px;">
            <div class="card__brand" style="font-size:11px;">${escapeHtml(p.brand)}</div>
            <div class="card__name" style="min-height:auto;-webkit-line-clamp:1;">${escapeHtml(p.name)}</div>
          </div>
        </a>
      `,
        )
        .join("")}
    </div>
  `;
}

async function pageProduct() {
  const { products } = await loadData();
  setHeader();
  wireSearchModal(products);

  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const product = products.find((p) => p.id === id) || products[0];
  if (!product) return;

  storeRecentlyViewed(product);
  track("view_item", {
    item_id: product.id,
    item_name: product.name,
    item_brand: product.brand,
    item_category: product.category,
    price: product.salePrice,
  });

  // render
  qs("#bcCategory").textContent = product.category;
  qs("#bcBrand").textContent = product.brand;

  qs("#pBrand").textContent = product.brand;
  qs("#pName").textContent = product.name;
  qs("#pSale").textContent = formatKRW(product.salePrice);
  qs("#pOrigin").textContent = formatKRW(product.price);
  qs("#pDc").textContent = `${product.discountRate}%`;
  qs("#pRating").textContent = product.rating.toFixed(1);
  qs("#pReviewCount").textContent = product.reviewCount.toLocaleString("ko-KR");
  // qs("#pShipping").textContent = product.shipping;
  let shippingText = "배송정보 없음";

  if (typeof product.shipping === "string") {
    shippingText = product.shipping;
  } else if (product.shipping && typeof product.shipping === "object") {
    shippingText =
      product.shipping.type ||
      product.shipping.name ||
      product.shipping.method ||
      "배송정보";
  }

  qs("#pShipping").textContent = shippingText;
  qs("#pSeller").textContent = product.seller;
  qs("#pStock").textContent = String(product.stock);
  qs("#pDesc").textContent = product.description;
  qs("#detailImg").src = product.thumbnailUrl;
  qs("#detailImg").alt = product.name;
  qs("#detailBrand").textContent = product.brand;
  qs("#detailName").textContent = product.name;
  qs("#detailDesc").textContent = product.description;

  const reviewTexts = (product.reviews || [])
    .slice(0, 5)
    .map((r) => r.text)
    .filter(Boolean);

  qs("#detailRecommendText").textContent =
    `${product.name}은 데일리룩, 캐주얼 코디, 주말 외출룩에 활용하기 좋은 상품입니다. ` +
    `현재 ${product.reviewCount.toLocaleString("ko-KR")}개의 리뷰와 평균 평점 ${product.rating.toFixed(1)}점을 기준으로 보면, ` +
    `실제 고객 반응이 비교적 안정적으로 쌓인 상품입니다.`;

  qs("#detailReviewSummary").innerHTML = reviewTexts.length
    ? reviewTexts
        .map(
          (text) => `
          <div class="detail-review-card">
            “${escapeHtml(text)}”
          </div>
        `,
        )
        .join("")
    : `<div class="detail-review-card">아직 등록된 리뷰가 없습니다.</div>`;

  // tags
  const tags = (product.tags || []).slice(0, 12);
  qs("#pTags").innerHTML =
    tags.map((t) => `<span class="badge">#${escapeHtml(t)}</span>`).join("") ||
    `<span class="badge">#추천</span>`;

  // gallery
  const mainImg = qs("#mainImg");
  mainImg.src = product.images[0] || product.thumbnailUrl;
  mainImg.alt = product.name;

  qs("#thumbs").innerHTML = product.images
    .slice(0, 8)
    .map(
      (src, i) => `
    <button type="button" class="thumb" id="thumb-${i}" data-src="${src}" data-event="gallery_thumb">
      <img src="${src}" alt="thumb ${i + 1}">
    </button>
  `,
    )
    .join("");

  qsa("#thumbs .thumb").forEach((btn, i) => {
    btn.addEventListener("click", () => {
      mainImg.src = btn.dataset.src;
      track("gallery_thumb_click", { item_id: product.id, index: i });
    });
  });

  // actions
  qs("#btnBuy").addEventListener("click", () =>
    track("begin_checkout", {
      item_id: product.id,
      item_name: product.name,
      price: product.salePrice,
    }),
  );
  // qs("#btnCart2").addEventListener("click", () =>
  //   track("add_to_cart", {
  //     item_id: product.id,
  //     item_name: product.name,
  //     price: product.salePrice,
  //   }),
  // );
  qs("#btnCart2").addEventListener("click", () => {
    addToCart(product);

    track("add_to_cart", {
      item_id: product.id,
      item_name: product.name,
      price: product.salePrice,
    });

    const goCart = confirm("장바구니에 담았습니다. 장바구니로 이동할까요?");
    if (goCart) {
      location.href = "./cart.html";
    }
  });

  // WISH LIST: update address bar with product name
  const wishBtn = qs("#btnWish");
  const wishCount = qs("#wishCount");
  const wishlist = getWishList();
  let wished = wishlist.some((x) => x.id === product.id);
  renderWish();

  function renderWish() {
    wishBtn.setAttribute("aria-pressed", wished ? "true" : "false");
    wishBtn.textContent = wished ? "WISH LIST · 담김" : "WISH LIST";
    wishCount.textContent = String(getWishList().length);
  }

  wishBtn.addEventListener("click", () => {
    const res = toggleWish(product);
    wished = res.wished;
    renderWish();

    // pushState with product name slug
    const slug = slugify(product.name);
    const nextUrl = `./product.html?id=${encodeURIComponent(product.id)}&name=${encodeURIComponent(slug)}`;
    history.pushState({}, "", nextUrl);

    track("add_to_wishlist", {
      item_id: product.id,
      item_name: product.name,
      wished,
    });
  });

  // reviews
  const reviews = product.reviews || [];
  qs("#reviewList").innerHTML =
    reviews
      .slice(0, 40)
      .map(
        (r) => `
    <div class="review" data-review-id="${r.id}">
      <div class="review__head">
        <span>★ ${(Number(r.rating) || product.rating).toFixed(1)} · ${escapeHtml(r.user?.name || "익명")}</span>
        <span>${escapeHtml(r.createdAt)}</span>
      </div>
      <div class="review__text">${escapeHtml(r.text)}</div>
      ${
        r.nlp
          ? `<div style="margin-top:10px;color:#666;font-size:12px;">키워드: ${(() => {
              const raw = r?.nlp?.nouns;

              const nouns = Array.isArray(raw)
                ? raw
                : typeof raw === "string"
                  ? raw.split(/[\s,|]+/).filter(Boolean)
                  : [];

              return nouns
                .slice(0, 6)
                .map((n) => `#${escapeHtml(String(n))}`)
                .join(" ");
            })()}</div>`
          : ""
      }
    </div>
  `,
      )
      .join("") || `<div style="color:#666;">아직 리뷰가 없습니다.</div>`;

  // tabs
  const buttons = qsa(".tabbar button");
  const panels = qsa(".tabpanel");
  function showTab(id) {
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
    panels.forEach(
      (p) => (p.style.display = p.dataset.panel === id ? "block" : "none"),
    );
    track("tab_click", { tab: id, item_id: product.id });
  }
  buttons.forEach((b) =>
    b.addEventListener("click", () => showTab(b.dataset.tab)),
  );
  showTab("detail");

  // scroll depth tracking for product detail
  let fired = new Set();
  window.addEventListener(
    "scroll",
    () => {
      const doc = document.documentElement;
      const pct = Math.round(
        (doc.scrollTop / (doc.scrollHeight - doc.clientHeight)) * 100,
      );
      [25, 50, 75, 90].forEach((th) => {
        if (pct >= th && !fired.has(th)) {
          fired.add(th);
          track("scroll_depth", {
            percent: th,
            page: "product",
            item_id: product.id,
          });
        }
      });
    },
    { passive: true },
  );
}

async function pageSearch() {
  const { products } = await loadData();
  setHeader();
  wireSearchModal(products);

  const params = new URLSearchParams(location.search);
  const q = (params.get("q") || "").trim();

  // this page mimics the "상품검색" blank state when no query
  qs("#searchQ").value = q;
  qs("#searchQ").focus();

  function render() {
    const query = (qs("#searchQ").value || "").trim();
    track("search", { query: query || "(empty)", page: "search" });

    if (!query) {
      qs("#searchEmpty").style.display = "block";
      qs("#searchResults").innerHTML = "";
      qs("#searchCount").textContent = "";
      return;
    }

    qs("#searchEmpty").style.display = "none";
    const list = products.filter((p) =>
      (p.name + p.brand + p.tags.join(" "))
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
    qs("#searchCount").textContent =
      `${list.length.toLocaleString("ko-KR")}개 검색 결과`;
    qs("#searchResults").innerHTML = list.map((p) => cardHTML(p)).join("");

    // click tracking
    list.slice(0, 50).forEach((p) => {
      const el = qs(`#productCard-${CSS.escape(p.id)}`);
      el?.addEventListener("click", () => {
        track("select_item", {
          item_id: p.id,
          item_name: p.name,
          item_brand: p.brand,
          item_category: p.category,
          price: p.salePrice,
          origin: "search",
        });
      });
    });
  }

  qs("#searchFormPage").addEventListener("submit", (e) => {
    e.preventDefault();
    const query = (qs("#searchQ").value || "").trim();
    // update URL (no reload) so students can see query param behavior
    const next = query
      ? `./search.html?q=${encodeURIComponent(query)}`
      : "./search.html";
    history.pushState({}, "", next);
    render();
  });

  render();
}

// ====== Router ======
(async function init() {
  const page = document.body.dataset.page;
  if (page === "home") return pageHome();
  if (page === "product") return pageProduct();
  if (page === "search") return pageSearch();
})();

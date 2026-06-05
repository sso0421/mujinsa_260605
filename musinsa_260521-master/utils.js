export function qs(sel, el = document) {
  return el.querySelector(sel);
}
export function qsa(sel, el = document) {
  return Array.from(el.querySelectorAll(sel));
}

export function formatKRW(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString("ko-KR") + "원";
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function slugify(str) {
  return (str || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[~`!@#$%^&*()+={}\[\]|\\:;"'<>?,./]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function pick(arr, fallback) {
  return Array.isArray(arr) && arr.length ? arr[0] : fallback;
}

export function safeArray(v) {
  return Array.isArray(v) ? v : v == null ? [] : [v];
}

export function normalizeDataset(raw) {
  // Accept:
  // 1) { products: [...] }
  // 2) { items: [...] }
  // 3) [...]
  // 4) { data: { products: [...] } }
  let root = raw;
  if (raw && typeof raw === "object" && "data" in raw) root = raw.data;

  let products = [];
  if (Array.isArray(root)) products = root;
  else if (root && Array.isArray(root.products)) products = root.products;
  else if (root && Array.isArray(root.items)) products = root.items;
  else if (root && Array.isArray(root.list)) products = root.list;

  // normalize fields to a Musinsa-like model
  const normalized = products.map((p, idx) => {
    const id = p.id ?? p.productId ?? p.pid ?? p.no ?? String(idx + 1);
    const name = p.name ?? p.productName ?? p.title ?? "상품명";
    const brand = p.brand ?? p.brandName ?? p.maker ?? "브랜드";
    const category = p.category ?? p.cat ?? "전체";

    // price fields
    const salePrice =
      p.salePrice ??
      p.priceSale ??
      p.finalPrice ??
      p.discountedPrice ??
      p.sale_price ??
      p.price ??
      0;
    const price =
      p.price ??
      p.originPrice ??
      p.originalPrice ??
      p.priceOrigin ??
      p.listPrice ??
      p.origin_price ??
      salePrice;
    let discountRate =
      p.discountRate ?? p.discount ?? p.dcRate ?? p.discount_rate;

    const _price = Number(price);
    const _sale = Number(salePrice);
    if (discountRate == null || discountRate === "") {
      if (
        Number.isFinite(_price) &&
        Number.isFinite(_sale) &&
        _price > 0 &&
        _sale > 0 &&
        _sale <= _price
      ) {
        discountRate = Math.round((1 - _sale / _price) * 100);
      } else discountRate = 0;
    }

    const thumbnailUrl =
      p.thumbnailUrl ??
      p.thumbnail ??
      p.thumb ??
      p.image ??
      p.img ??
      "https://images.unsplash.com/photo-1520975693411-7e6f3af3aeb0?auto=format&fit=crop&w=800&q=70";
    const images = safeArray(
      p.images ?? p.imageUrls ?? p.gallery ?? p.pics ?? [],
    ).filter(Boolean);

    const rating = Number(p.rating ?? p.score ?? p.avgRating ?? 0) || 0;
    const reviewCount =
      Number(
        p.reviewCount ?? p.reviewsCount ?? p.nReviews ?? p.review_cnt ?? 0,
      ) || 0;

    const tags = safeArray(p.tags ?? p.keywords ?? p.mainTags ?? [])
      .filter(Boolean)
      .slice(0, 12);

    // reviews
    const reviews = safeArray(p.reviews ?? p.reviewList ?? p.comments ?? [])
      .map((r, rIdx) => ({
        id: r.id ?? r.reviewId ?? `${id}-r${rIdx + 1}`,
        productId: id,
        rating: Number(r.rating ?? p.rating ?? rating) || rating,
        text: (r.text ?? r.review ?? r.content ?? "").toString(),
        createdAt: r.createdAt ?? r.date ?? r.created_at ?? "2026-02-01",
        nlp: r.nlp ?? r.kiwi ?? r.morph ?? null,
        user: r.user ??
          r.writer ?? { name: r.userName ?? r.nickname ?? "익명" },
      }))
      .filter((r) => r.text && r.text.trim().length);

    return {
      id: String(id),
      name,
      brand,
      category,
      price: Number.isFinite(_price) ? _price : Number(_sale) || 0,
      salePrice: Number.isFinite(_sale) ? _sale : Number(_price) || 0,
      discountRate: Number(discountRate) || 0,
      thumbnailUrl,
      images: images.length ? images : [thumbnailUrl],
      rating,
      reviewCount: reviewCount || reviews.length,
      tags,
      url: p.url ?? p.link ?? p.productUrl ?? "",
      color: p.color ?? "",
      size: p.size ?? "",
      material: p.material ?? "",
      shipping: p.shipping ?? "무료배송",
      seller: p.seller ?? brand,
      stock: p.stock ?? 999,
      likes: p.likes ?? p.wishCount ?? Math.floor(50 + Math.random() * 5000),
      description: p.description ?? p.desc ?? `${brand}의 ${name} 상품입니다.`,
      reviews,
    };
  });

  return { products: normalized };
}

export function storeRecentlyViewed(product) {
  try {
    const key = "musinsa_recently_viewed";
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    const next = [
      {
        id: product.id,
        name: product.name,
        brand: product.brand,
        thumbnailUrl: product.thumbnailUrl,
        salePrice: product.salePrice,
        discountRate: product.discountRate,
      },
      ...prev.filter((x) => x.id !== product.id),
    ].slice(0, 20);
    localStorage.setItem(key, JSON.stringify(next));
  } catch (e) {}
}

export function getRecentlyViewed() {
  try {
    return JSON.parse(localStorage.getItem("musinsa_recently_viewed") || "[]");
  } catch (e) {
    return [];
  }
}

export function toggleWish(product) {
  const key = "musinsa_wishlist";
  const list = (() => {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch (e) {
      return [];
    }
  })();
  const exists = list.some((x) => x.id === product.id);
  const next = exists
    ? list.filter((x) => x.id !== product.id)
    : [
        {
          id: product.id,
          name: product.name,
          brand: product.brand,
          thumbnailUrl: product.thumbnailUrl,
          salePrice: product.salePrice,
          discountRate: product.discountRate,
        },
        ...list,
      ];
  localStorage.setItem(key, JSON.stringify(next));
  return { wished: !exists, count: next.length };
}

export function getWishList() {
  try {
    return JSON.parse(localStorage.getItem("musinsa_wishlist") || "[]");
  } catch (e) {
    return [];
  }
}

/* ====== Cart Page 추가수정 ====== */
export function getCartList() {
  try {
    return JSON.parse(localStorage.getItem("musinsa_cart") || "[]");
  } catch (e) {
    return [];
  }
}

export function addToCart(product) {
  const key = "musinsa_cart";
  const list = getCartList();

  const exists = list.find((x) => x.id === product.id);

  const next = exists
    ? list.map((x) =>
        x.id === product.id ? { ...x, qty: Number(x.qty || 1) + 1 } : x,
      )
    : [
        {
          id: product.id,
          name: product.name,
          brand: product.brand,
          thumbnailUrl: product.thumbnailUrl,
          salePrice: product.salePrice,
          price: product.price,
          discountRate: product.discountRate,
          qty: 1,
        },
        ...list,
      ];

  localStorage.setItem(key, JSON.stringify(next));
  return next;
}

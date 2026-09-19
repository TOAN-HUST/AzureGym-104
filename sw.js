// Service worker: lưu index.html vào cache của trình duyệt để mở được khi offline.
// - Có mạng: lấy bản mới nhất từ GitHub Pages (có câu hỏi mới thì thấy ngay), đồng thời cập nhật cache.
// - Mạng chậm (quá NETWORK_TIMEOUT_MS) hoặc mất mạng: dùng bản trong cache.
const CACHE_NAME = "azuregym-v1";
const APP_SHELL = ["./", "./index.html"];
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

function fetchWithTimeout(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), NETWORK_TIMEOUT_MS);
    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function fromCache(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  // Mở trang bằng đường dẫn khác (ví dụ /AzureGym-104/ hay /AzureGym-104/index.html) vẫn trả về app.
  if (request.mode === "navigate") {
    return (await caches.match("./index.html")) || (await caches.match("./"));
  }
  return Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetchWithTimeout(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => fromCache(request)),
  );
});

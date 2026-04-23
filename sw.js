// sw.js - Kelime Kartları Servis Çalışanı

const CACHE_NAME = 'ducards-v1';

// Uygulama dosyalarını önbelleğe al
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// --- BİLDİRİM ZAMANLAYICI ---
let notifyInterval = null;
let wordList = [];
let currentWordIndex = 0;

self.addEventListener('message', (event) => {
    const data = event.data;

    if (data.type === 'START') {
        wordList = data.cards || [];
        currentWordIndex = 0;

        // Önceki zamanlayıcıyı temizle
        if (notifyInterval) {
            clearInterval(notifyInterval);
            notifyInterval = null;
        }

        if (wordList.length === 0) return;

        // İlk bildirimi hemen gönder
        sendWordNotification();

        // Her 2 dakikada bir bildirim gönder
        notifyInterval = setInterval(() => {
            sendWordNotification();
        }, 2 * 60 * 1000);

    } else if (data.type === 'STOP') {
        if (notifyInterval) {
            clearInterval(notifyInterval);
            notifyInterval = null;
        }
        wordList = [];
    }
});

function sendWordNotification() {
    if (wordList.length === 0) return;

    const card = wordList[currentWordIndex % wordList.length];
    currentWordIndex++;

    // Tüm açık pencere/sekmelere sesli okuma mesajı gönder
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
            client.postMessage({ type: 'SPEAK', word: card.word });
        }
    });

    // Bildirimi Service Worker üzerinden göster (mobil uyumlu)
    self.registration.showNotification('🔔 Kelime Tekrarı', {
        body: `${card.word}  →  ${card.meaning}`,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        tag: 'ducards-word-notify',   // Aynı tag → yeni bildirim eskinin üstüne yazar
        renotify: true,               // Tag aynı olsa bile tekrar titret
        requireInteraction: false,
        silent: false,
        data: { word: card.word }
    });
}

// Bildirime tıklanınca uygulamayı aç veya öne getir
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('./');
        })
    );
});

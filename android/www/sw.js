/* APK/EXE 内置资源：空 SW，题库更新由 updater.js(IndexedDB) 统一负责 */
self.addEventListener("install",function(e){self.skipWaiting();});
self.addEventListener("activate",function(e){self.clients.claim();});

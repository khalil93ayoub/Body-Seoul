(function () {
    const syncKeys = ["cart", "favorites"];
    let firebaseTools = null;
    let currentUser = null;
    let customerData = {};
    let orders = [];
    let listeners = [];
    let isApplyingRemote = false;
    let pushTimer = null;
    let initialized = false;
    let notifyTimer = null;

    function readList(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || "[]");
        } catch (error) {
            return [];
        }
    }

    function writeList(key, value) {
        isApplyingRemote = true;
        try {
            localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
        } finally {
            isApplyingRemote = false;
        }
    }

    function itemId(item) {
        return item && (item.id || item.title || item.name);
    }

    function mergeById(localItems, remoteItems, options = {}) {
        const merged = new Map();
        [...(remoteItems || []), ...(localItems || [])].forEach(item => {
            const id = itemId(item);
            if (!id) return;
            const existing = merged.get(id);

            if (options.quantity && existing) {
                merged.set(id, {
                    ...existing,
                    ...item,
                    quantity: Math.max(Number(existing.quantity) || 1, Number(item.quantity) || 1)
                });
                return;
            }

            merged.set(id, {
                ...existing,
                ...item
            });
        });
        return Array.from(merged.values());
    }

    function notify() {
        clearTimeout(notifyTimer);
        notifyTimer = setTimeout(() => {
            const state = getState();
            listeners.forEach(listener => listener(state));
            window.renderCart?.();
            window.renderCheckout?.();
            window.renderFavorites?.();
            window.updateFavoriteButtons?.();
            window.initHeaderDropdowns?.();
            document.dispatchEvent(new CustomEvent("bodySeoulSync", { detail: state }));
        }, 40);
    }

    function profileRef() {
        if (!firebaseTools?.ready || !currentUser) return null;
        return firebaseTools.db.collection("customers").doc(currentUser.uid);
    }

    function saveStateNow() {
        const ref = profileRef();
        if (!ref) return Promise.resolve();

        return ref.set({
            cart: readList("cart"),
            favorites: readList("favorites"),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(error => {
            console.warn("Body & Seoul sync failed", error);
        });
    }

    function schedulePush() {
        if (!currentUser || isApplyingRemote) return;
        clearTimeout(pushTimer);
        pushTimer = setTimeout(saveStateNow, 350);
    }

    function fetchOrders() {
        if (!firebaseTools?.ready || !currentUser) {
            orders = [];
            notify();
            return Promise.resolve([]);
        }

        return firebaseTools.db.collection("orders")
            .where("userId", "==", currentUser.uid)
            .limit(20)
            .get()
            .then(snapshot => {
                orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a, b) => {
                        const left = a.createdAt?.toMillis?.() || 0;
                        const right = b.createdAt?.toMillis?.() || 0;
                        return right - left;
                    });
                notify();
                return orders;
            })
            .catch(error => {
                console.warn("Body & Seoul orders load failed", error);
                orders = [];
                notify();
                return [];
            });
    }

    function loadCustomerState() {
        const ref = profileRef();
        if (!ref) return Promise.resolve();

        return ref.get().then(doc => {
            customerData = doc.exists ? doc.data() : {};
            const mergedCart = mergeById(readList("cart"), customerData.cart || [], { quantity: true });
            const mergedFavorites = mergeById(readList("favorites"), customerData.favorites || []);

            writeList("cart", mergedCart);
            writeList("favorites", mergedFavorites);

            return ref.set({
                cart: mergedCart,
                favorites: mergedFavorites,
                email: currentUser.email || customerData.email || "",
                name: currentUser.displayName || customerData.name || "",
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }).then(fetchOrders).then(notify);
    }

    function getState() {
        return {
            user: currentUser,
            customer: customerData,
            cart: readList("cart"),
            favorites: readList("favorites"),
            orders
        };
    }

    function onStateChange(listener) {
        listeners.push(listener);
        listener(getState());
        return () => {
            listeners = listeners.filter(item => item !== listener);
        };
    }

    function patchLocalStorage() {
        try {
            if (!window.Storage || Storage.prototype.__bodySeoulSyncPatched) return;
            const originalSetItem = Storage.prototype.setItem;
            const originalRemoveItem = Storage.prototype.removeItem;

            Storage.prototype.setItem = function (key, value) {
                const result = originalSetItem.apply(this, arguments);
                if (syncKeys.includes(key) && !isApplyingRemote) {
                    schedulePush();
                    notify();
                }
                return result;
            };

            Storage.prototype.removeItem = function (key) {
                const result = originalRemoveItem.apply(this, arguments);
                if (syncKeys.includes(key) && !isApplyingRemote) {
                    schedulePush();
                    notify();
                }
                return result;
            };

            Storage.prototype.__bodySeoulSyncPatched = true;
        } catch (error) {
            console.warn("Body & Seoul storage sync patch failed", error);
        }
    }

    function init() {
        if (initialized) return;
        initialized = true;
        patchLocalStorage();

        if (!window.BodySeoulFirebase) {
            notify();
            return;
        }

        window.BodySeoulFirebase.load().then(tools => {
            firebaseTools = tools;
            if (!tools.ready) {
                notify();
                return;
            }

            tools.auth.onAuthStateChanged(user => {
                currentUser = user;
                customerData = {};
                orders = [];

                if (!user) {
                    notify();
                    return;
                }

                loadCustomerState();
            });
        });
    }

    window.BodySeoulSync = {
        init,
        getState,
        onStateChange,
        saveStateNow,
        fetchOrders,
        schedulePush
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

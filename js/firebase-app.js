(function () {
    const firebaseVersion = "10.12.5";
    let loadingPromise = null;

    function hasRealConfig(config) {
        return Boolean(config && config.apiKey && !String(config.apiKey).startsWith("PASTE_"));
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector('script[src="' + src + '"]')) {
                resolve();
                return;
            }

            const script = document.createElement("script");
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function loadFirebase() {
        if (loadingPromise) {
            return loadingPromise;
        }

        loadingPromise = Promise.resolve()
            .then(() => loadScript("https://www.gstatic.com/firebasejs/" + firebaseVersion + "/firebase-app-compat.js"))
            .then(() => loadScript("https://www.gstatic.com/firebasejs/" + firebaseVersion + "/firebase-auth-compat.js"))
            .then(() => loadScript("https://www.gstatic.com/firebasejs/" + firebaseVersion + "/firebase-firestore-compat.js"))
            .then(() => {
                const config = window.BodySeoulFirebaseConfig;

                if (!hasRealConfig(config)) {
                    return { ready: false, reason: "Firebase config missing" };
                }

                if (!firebase.apps.length) {
                    firebase.initializeApp(config);
                }

                return {
                    ready: true,
                    app: firebase.app(),
                    auth: firebase.auth(),
                    db: firebase.firestore()
                };
            })
            .catch(error => {
                console.error("Firebase failed to load", error);
                return { ready: false, reason: "Firebase failed to load" };
            });

        return loadingPromise;
    }

    window.BodySeoulFirebase = {
        load: loadFirebase,
        hasRealConfig
    };
})();

(function () {
    const gallery = document.querySelector('.product-gallery');
    if (!gallery) return;
    const images = Array.from(gallery.querySelectorAll('.gallery-thumbnails img'));
    const main = gallery.querySelector('#mainProductImage');
    const counter = gallery.querySelector('.mobile-image-count');
    let current = 0;
    function show(index) {
        if (!images.length || !main) return;
        current = (index + images.length) % images.length;
        main.src = images[current].src;
        images.forEach((image, i) => image.classList.toggle('active-thumb', i === current));
        if (counter) counter.textContent = `${current + 1}/${images.length}`;
    }
    images.forEach((image, index) => image.addEventListener('click', () => show(index)));
    gallery.querySelector('.left-arrow')?.addEventListener('click', () => show(current - 1));
    gallery.querySelector('.right-arrow')?.addEventListener('click', () => show(current + 1));
    let touchStart = null;
    main.addEventListener('touchstart', event => { touchStart = event.changedTouches[0]?.clientX ?? null; }, { passive: true });
    main.addEventListener('touchend', event => {
        if (touchStart === null) return;
        const distance = (event.changedTouches[0]?.clientX ?? touchStart) - touchStart;
        if (Math.abs(distance) > 40) show(current + (distance < 0 ? 1 : -1));
        touchStart = null;
    }, { passive: true });
})();

document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const nav = document.getElementById('nav');

    if (!hamburger || !nav) {
        return;
    }

    hamburger.addEventListener('click', function() {
        const isOpen = nav.classList.toggle('active');
        this.setAttribute('aria-expanded', isOpen);
    });

    nav.querySelectorAll('a').forEach(function(link) {
        link.addEventListener('click', function() {
            nav.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
        });
    });
});

document.querySelectorAll('.contact-form').forEach(function (form) {
    form.addEventListener('submit', function () {
        var subjectInput = form.querySelector('[name="subject"]');
        var subjectHidden = form.querySelector('[name="_subject"]');
        if (subjectInput && subjectHidden && subjectInput.value.trim()) {
            subjectHidden.value = subjectInput.value.trim();
        }
    });
});

(function () {
    var toastShown = false;

    function showSuccessToast() {
        if (toastShown) return;

        var params = new URLSearchParams(window.location.search);
        if (params.get('sent') !== '1') return;

        toastShown = true;

        var toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = 'Thanks! Your message was sent.';
        document.body.appendChild(toast);

        requestAnimationFrame(function () {
            toast.classList.add('toast-visible');
        });

        setTimeout(function () {
            toast.classList.remove('toast-visible');
            toast.classList.add('toast-hidden');
        }, 4000);

        setTimeout(function () {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 4500);

        var cleanUrl = window.location.pathname + window.location.hash;
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', cleanUrl);
        }
    }

    showSuccessToast();

    window.addEventListener('pageshow', function (event) {
        if (event.persisted) {
            showSuccessToast();
        }
    });
})();

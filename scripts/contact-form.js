document.querySelectorAll('.contact-form').forEach(function (form) {
    form.addEventListener('submit', function () {
        var subjectInput = form.querySelector('[name="subject"]');
        var subjectHidden = form.querySelector('[name="_subject"]');
        if (subjectInput && subjectHidden && subjectInput.value.trim()) {
            subjectHidden.value = subjectInput.value.trim();
        }
    });
});

(function() {
  'use strict';

  var INVITE_ENDPOINT = '/api/invite';
  var MAX_FIELD_LENGTH = 500;
  var MAX_TOTAL_SIZE = 4000;

  var form = document.getElementById('invite-form');
  var reasonSelect = document.getElementById('invite-reason');
  var detailsGroup = document.getElementById('details-group');
  var errorDiv = document.getElementById('invite-error');
  var modal = document.getElementById('invite-modal');
  var modalClose = document.getElementById('modal-close');

  if (!form || !reasonSelect || !detailsGroup || !errorDiv || !modal || !modalClose) {
    return;
  }

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }

  function hideError() {
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';
  }

  function showModal() {
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    modalClose.focus();
    document.body.style.overflow = 'hidden';
  }

  function hideModal() {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  reasonSelect.addEventListener('change', function() {
    if (this.value === 'Other') {
      detailsGroup.style.display = 'block';
    } else {
      detailsGroup.style.display = 'none';
    }
  });

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    hideError();

    var name = (form.elements['name'].value || '').trim();
    var phone = (form.elements['phone'].value || '').trim();
    var email = (form.elements['email'].value || '').trim();
    var reason = (form.elements['reason'].value || '').trim();
    var details = (form.elements['details'].value || '').trim();
    var honeypot = (form.elements['website'].value || '').trim();

    if (honeypot) {
      showError('Something went wrong. Please try again.');
      return;
    }

    if (!name) {
      showError('Please enter your name.');
      form.elements['name'].focus();
      return;
    }

    if (!email) {
      showError('Please enter your email address.');
      form.elements['email'].focus();
      return;
    }

    if (!isValidEmail(email)) {
      showError('Please enter a valid email address.');
      form.elements['email'].focus();
      return;
    }

    if (!reason) {
      showError('Please select a reason for your invitation.');
      form.elements['reason'].focus();
      return;
    }

    if (name.length > MAX_FIELD_LENGTH || phone.length > MAX_FIELD_LENGTH ||
        email.length > MAX_FIELD_LENGTH || reason.length > MAX_FIELD_LENGTH ||
        details.length > MAX_FIELD_LENGTH) {
      showError('One or more fields exceed the maximum length.');
      return;
    }

    var payload = {
      name: name,
      phone: phone,
      email: email,
      reason: reason,
      details: details,
      page: window.location.pathname.replace(/^\//, '').replace(/\.html$/, '') || 'invite'
    };

    if (JSON.stringify(payload).length > MAX_TOTAL_SIZE) {
      showError('Your submission is too large. Please shorten your input.');
      return;
    }

    var submitBtn = form.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    fetch(INVITE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(response) {
      if (!response.ok) {
        return response.json().then(function(data) {
          throw new Error(data.error || 'Submission failed');
        });
      }
      return response.json();
    })
    .then(function() {
      form.reset();
      detailsGroup.style.display = 'none';
      showModal();
    })
    .catch(function(err) {
      showError(err.message || 'Something went wrong. Please try again.');
    })
    .finally(function() {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Invite Hugh';
    });
  });

  modalClose.addEventListener('click', hideModal);

  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      hideModal();
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      hideModal();
    }
  });
})();

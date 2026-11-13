(function() {
  'use strict';

  var TRACK_ENDPOINT = '/api/track';
  var PAGE = window.location.pathname.replace(/^\//, '').replace(/\.html$/, '') || 'index';

  function sendTrack(linkType) {
    var data = JSON.stringify({ linkType: linkType, page: PAGE });

    if (navigator.sendBeacon) {
      var blob = new Blob([data], { type: 'application/json' });
      navigator.sendBeacon(TRACK_ENDPOINT, blob);
    } else {
      fetch(TRACK_ENDPOINT, {
        method: 'POST',
        body: data,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true
      }).catch(function() {});
    }
  }

  function isGiveLink(href) {
    return href && href.indexOf('alvinmbc.com/give') !== -1;
  }

  function isEventsLink(href) {
    if (!href) return false;
    var lower = href.toLowerCase();
    return lower.indexOf('theobp.com/events') !== -1;
  }

  function isNewsletterPdfLink(href) {
    return href && href.indexOf('mailchi.mp/') !== -1;
  }

  function handleClick(e) {
    var target = e.target;
    while (target && target !== document.body) {
      if (target.tagName === 'A' && target.href) {
        var href = target.href;
        if (isGiveLink(href)) {
          sendTrack('give');
          return;
        }
        if (isEventsLink(href)) {
          sendTrack('events');
          return;
        }
        if (isNewsletterPdfLink(href)) {
          sendTrack('newsletter_pdf');
          return;
        }
      }
      target = target.parentElement;
    }
  }

  function handleNewsletterSubmit(e) {
    var form = e.target;
    if (form.id === 'mc-embedded-subscribe-form' || form.name === 'mc-embedded-subscribe-form') {
      sendTrack('newsletter_signup');
    }
  }

  document.addEventListener('click', handleClick, true);
  document.addEventListener('submit', handleNewsletterSubmit, true);
})();

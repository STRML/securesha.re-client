'use strict';
document.addEventListener('WebComponentsReady', function() {
  window.addEventListener('resize', repositionFooter);
  repositionFooter();

  function repositionFooter() {
    var buffer = 10;
    var main = document.getElementsByTagName('main')[0];
    var footer = document.getElementsByTagName('footer-element')[0];
    var footerHeight = footer.clientHeight + buffer;
    main.style['margin-bottom'] = footerHeight + 'px';
  }
});

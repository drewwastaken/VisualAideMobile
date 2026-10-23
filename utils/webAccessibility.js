export function createWebAccessibilityScript(settings, install = false, fontData = null) {
  const serializedSettings = JSON.stringify(settings);
  const serializedFontData = JSON.stringify(fontData);
  const initialize = install ? `
    (function() {
      window.__visualAideFontData = ${serializedFontData};
      if (window.__visualAideInstalled) {
        window.__visualAideApply(${serializedSettings});
        return true;
      }
      window.__visualAideInstalled = true;
      var observer;
      var scheduled = false;
      var settings = {};
      var excluded = 'script,style,noscript,svg,canvas,iframe,pre,code,kbd,samp,math,button,input,textarea,select,option,nav,[role="button"],[aria-hidden="true"],[class*="icon" i],[class*="material-icons" i],[class*="fontawesome" i]';

      function tagTextNodes(root) {
        if (!(settings.isActive !== false && settings.bionicReading)) {
          Array.from(root.querySelectorAll('[data-va-bionic="true"]')).forEach(function(element) {
            element.replaceWith(document.createTextNode(element.textContent || ''));
          });
        }
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        var nodes = [];
        while (walker.nextNode()) {
          var node = walker.currentNode;
          var parent = node.parentElement;
          if (!parent || parent.closest(excluded) || !node.nodeValue.trim()) continue;
          if (settings.isActive !== false && settings.bionicReading && !parent.closest('[data-va-bionic]')) nodes.push(node);
          else parent.setAttribute('data-va-text', 'true');
        }
        nodes.forEach(function(node) {
          var parent = node.parentElement;
          if (!parent || parent.closest(excluded)) return;
          var fragment = document.createDocumentFragment();
          node.nodeValue.split(/(\\s+)/).forEach(function(part) {
            if (!part) return;
            if (/^\\s+$/.test(part)) {
              fragment.appendChild(document.createTextNode(part));
              return;
            }
            var word = document.createElement('span');
            word.setAttribute('data-va-bionic', 'true');
            word.setAttribute('data-va-text', 'true');
            var count = Math.ceil(Array.from(part).length / 2);
            var lead = document.createElement('strong');
            lead.textContent = Array.from(part).slice(0, count).join('');
            word.appendChild(lead);
            word.appendChild(document.createTextNode(Array.from(part).slice(count).join('')));
            fragment.appendChild(word);
          });
          node.parentNode.replaceChild(fragment, node);
        });
      }

      function apply(nextSettings) {
        settings = nextSettings;
        var style = document.getElementById('visual-aide-mobile-styles');
        if (!style && document.head) {
          style = document.createElement('style');
          style.id = 'visual-aide-mobile-styles';
          document.head.appendChild(style);
        }
        if (style) {
          var active = settings.isActive !== false;
          var families = {
            openDyslexic: '"OpenDyslexic", "Comic Sans MS", sans-serif',
            lexend: '"Lexend", "Trebuchet MS", sans-serif',
            atkinsonHyperlegible: '"Atkinson Hyperlegible", Verdana, sans-serif',
            verdana: 'Verdana, Arial, sans-serif',
            trebuchet: '"Trebuchet MS", Arial, sans-serif',
            comicSans: '"Comic Sans MS", cursive',
            systemClean: 'system-ui, sans-serif'
          };
          var family = families[settings.font] || 'inherit';
          var palettes = {
            default: { bg: '#ffffff', text: '#222222' },
            softCream: { bg: '#FDF6E3', text: '#302B24' },
            warmPeach: { bg: '#FCE8DF', text: '#352622' },
            calmMint: { bg: '#E6F3E8', text: '#20332A' },
            navyNight: { bg: '#111A2B', text: '#E8EFFF' },
            charcoalDark: { bg: '#202020', text: '#F0F0F0' },
            yellowOnBlack: { bg: '#000000', text: '#FFED00' }
          };
          var palette = palettes[settings.contrastPreset] || palettes.default;
          var textColor = settings.textColor && settings.textColor !== 'default' && settings.textColor !== 'custom'
            ? settings.textColor
            : settings.textColor === 'custom' ? settings.customTextColor : palette.text;
          var background = settings.contrastPreset && settings.contrastPreset !== 'default' ? palette.bg : '';
          var fonts = window.__visualAideFontData || {};
          var fontFaces = [
            fonts.openDyslexicRegular ? '@font-face{font-family:"OpenDyslexic";src:url(data:font/otf;base64,' + fonts.openDyslexicRegular + ') format("opentype");font-weight:400}' : '',
            fonts.openDyslexicBold ? '@font-face{font-family:"OpenDyslexic";src:url(data:font/otf;base64,' + fonts.openDyslexicBold + ') format("opentype");font-weight:700}' : '',
            fonts.lexend ? '@font-face{font-family:"Lexend";src:url(data:font/ttf;base64,' + fonts.lexend + ') format("truetype");font-weight:100 900}' : '',
            fonts.atkinsonRegular ? '@font-face{font-family:"Atkinson Hyperlegible";src:url(data:font/ttf;base64,' + fonts.atkinsonRegular + ') format("truetype");font-weight:400}' : '',
            fonts.atkinsonBold ? '@font-face{font-family:"Atkinson Hyperlegible";src:url(data:font/ttf;base64,' + fonts.atkinsonBold + ') format("truetype");font-weight:700}' : ''
          ].join('');
          var tintColors = {
            amber: '#FFBF4A', peach: '#FF9A7A', rose: '#FF7398', mint: '#70D9A0',
            aqua: '#55DDE0', lavender: '#B39DDB', cream: '#F4E6B8'
          };
          var tint = settings.tintIntensity > 0
            ? 'background: rgba(' + parseInt((tintColors[settings.tintColor] || '#FFBF4A').slice(1, 3), 16) + ',' +
              parseInt((tintColors[settings.tintColor] || '#FFBF4A').slice(3, 5), 16) + ',' +
              parseInt((tintColors[settings.tintColor] || '#FFBF4A').slice(5, 7), 16) + ',' + settings.tintIntensity + ');'
            : '';
          style.textContent = active ? [fontFaces,
            'html,body{' + (background ? 'background:' + background + ' !important;' : '') + '}',
            '[data-va-text="true"]{font-family:' + family + ' !important;letter-spacing:' + (settings.tracking || 0) +
              'px !important;word-spacing:' + (settings.wordSpacing || 0) + 'px !important;line-height:' +
              (settings.leading || 1.5) + ' !important;color:' + textColor + ' !important;' +
              (settings.leftAlign ? 'text-align:left !important;' : '') +
              (background ? 'background-color:' + background + ' !important;box-decoration-break:clone;' : '') + '}',
            '#visual-aide-mobile-tint{position:fixed;inset:0;z-index:2147483646;pointer-events:none;' + tint + '}',
            '#visual-aide-mobile-focus{position:fixed;left:0;right:0;top:40%;height:' + (settings.focusHeight || 120) +
              'px;z-index:2147483645;pointer-events:none;border-top:2px solid ' + palette.text +
              ';border-bottom:2px solid ' + palette.text + ';box-sizing:border-box;' +
              (settings.focusMode === 'mask' ? 'background:rgba(0,0,0,.72);' : '') + '}',
            '#visual-aide-mobile-focus[data-mode="mask"]{background:transparent;box-shadow:0 -100vh 0 100vh rgba(0,0,0,.65),0 100vh 0 100vh rgba(0,0,0,.65)}'
          ].join('') : '';
          if (settings.focusMode !== 'off' && active && !document.getElementById('visual-aide-mobile-focus')) {
            var focus = document.createElement('div');
            focus.id = 'visual-aide-mobile-focus';
            document.documentElement.appendChild(focus);
          }
          var focusElement = document.getElementById('visual-aide-mobile-focus');
          if (focusElement) {
            focusElement.style.display = settings.focusMode !== 'off' && active ? 'block' : 'none';
            focusElement.setAttribute('data-mode', settings.focusMode);
            focusElement.style.height = (settings.focusHeight || 120) + 'px';
          }
          if (settings.tintIntensity > 0 && active && !document.getElementById('visual-aide-mobile-tint')) {
            var overlay = document.createElement('div');
            overlay.id = 'visual-aide-mobile-tint';
            document.documentElement.appendChild(overlay);
          }
          var tintElement = document.getElementById('visual-aide-mobile-tint');
          if (tintElement) tintElement.style.display = settings.tintIntensity > 0 && active ? 'block' : 'none';
        }
        if (observer) observer.disconnect();
        if (document.body && settings.isActive !== false) tagTextNodes(document.body);
        if (document.body) {
          observer = new MutationObserver(function() {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(function() {
              scheduled = false;
              if (observer) observer.disconnect();
              if (document.body && settings.isActive !== false) tagTextNodes(document.body);
              if (observer && document.body) observer.observe(document.body, { childList: true, characterData: true, subtree: true });
            });
          });
          observer.observe(document.body, { childList: true, characterData: true, subtree: true });
        }
      }
      window.__visualAideApply = apply;
      document.addEventListener('selectionchange', function() {
        clearTimeout(window.__visualAideSelectionTimer);
        window.__visualAideSelectionTimer = setTimeout(function() {
          var text = String(window.getSelection ? window.getSelection() : '').trim().slice(0, 4000);
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'selection', text: text }));
          }
        }, 250);
      });
      document.addEventListener('keydown', function(event) {
        if (event.altKey && event.shiftKey && event.key.toLowerCase() === 'v' && window.ReactNativeWebView) {
          event.preventDefault();
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'toggle' }));
        }
      });
      document.addEventListener('pointermove', function(event) {
        var focus = document.getElementById('visual-aide-mobile-focus');
        if (focus && settings.focusMode !== 'off' && event.pointerType !== 'mouse') {
          focus.style.top = Math.max(0, Math.min(window.innerHeight - focus.offsetHeight, event.clientY)) + 'px';
        }
      }, { passive: true });
      apply(${serializedSettings});
      return true;
    })();
  ` : `
    (function() {
      if (window.__visualAideApply) window.__visualAideApply(${serializedSettings});
      return true;
    })();
  `;

  return initialize;
}

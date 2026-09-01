(function() {
  if (window.synthidListenerAdded) return;
  window.synthidListenerAdded = true;

  let overlay = null;

  function createOverlay() {
    if (overlay) {
      document.body.removeChild(overlay);
    }

    overlay = document.createElement('div');
    overlay.className = 'synthid-overlay';
    
    const header = document.createElement('div');
    header.className = 'synthid-overlay-header';
    header.innerHTML = `
      <div class="synthid-overlay-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #a78bfa"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        SynthID Scan
      </div>
      <button class="synthid-overlay-close">✕</button>
    `;
    
    header.querySelector('.synthid-overlay-close').addEventListener('click', () => {
      if (overlay) {
        document.body.removeChild(overlay);
        overlay = null;
      }
    });

    const content = document.createElement('div');
    content.className = 'synthid-overlay-content';
    content.innerHTML = `
      <div class="synthid-loading">
        <div class="synthid-spinner"></div>
        Analyzing image...
      </div>
    `;

    overlay.appendChild(header);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    return content;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SCAN_START') {
      createOverlay();
    } else if (message.type === 'SCAN_COMPLETE') {
      if (!overlay) return;
      const content = overlay.querySelector('.synthid-overlay-content');
      const res = message.result;
      
      let html = '';
      
      // Watermark
      html += `
        <div class="synthid-result-row">
          <span class="synthid-result-label">Invisible Watermark:</span>
          <span class="synthid-result-value ${res.is_watermarked ? 'high-prob' : 'low-prob'}">
            ${res.is_watermarked ? 'Detected' : 'Not Found'}
          </span>
        </div>
      `;

      // Classifier
      html += `
        <div class="synthid-result-row">
          <span class="synthid-result-label">AI Signature:</span>
      `;

      if (res.ood_status === "out_of_distribution") {
        html += `
          </div>
          <div class="synthid-ood-badge">
            Outside trained scope — unverified
          </div>
        `;
      } else if (res.classifier_probability !== null) {
        const prob = res.classifier_probability * 100;
        html += `
          <span class="synthid-result-value ${prob > 50 ? 'high-prob' : 'low-prob'}">
            ${prob.toFixed(1)}%
          </span>
        </div>
        `;
      } else {
        html += `
          <span class="synthid-result-value">N/A</span>
        </div>
        `;
      }

      // Deep Analysis button
      html += `
        <a href="http://localhost:3000" target="_blank" class="synthid-action-btn">
          Open Deep Analysis
        </a>
      `;

      content.innerHTML = html;
      
    } else if (message.type === 'SCAN_ERROR') {
      if (!overlay) return;
      const content = overlay.querySelector('.synthid-overlay-content');
      content.innerHTML = `
        <div class="synthid-error">
          Error: ${message.error}
        </div>
      `;
    }
  });
})();

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "scanImage",
    title: "Scan for AI Generation",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "scanImage") {
    const imageUrl = info.srcUrl;
    
    // Inject CSS & JS first to show loading state
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["content.css"]
    });
    
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });

    // Notify content script we are scanning
    chrome.tabs.sendMessage(tab.id, {
      type: "SCAN_START",
      imageUrl: imageUrl
    });

    try {
      // Fetch the image as a Blob
      const res = await fetch(imageUrl);
      const blob = await res.blob();

      // Send to local backend
      const formData = new FormData();
      formData.append("image", blob, "image.jpg");

      const backendRes = await fetch("http://localhost:8000/quick-scan", {
        method: "POST",
        body: formData
      });

      if (!backendRes.ok) {
        throw new Error("Backend error: " + backendRes.status);
      }

      const result = await backendRes.json();
      
      // Notify content script with results
      chrome.tabs.sendMessage(tab.id, {
        type: "SCAN_COMPLETE",
        result: result,
        imageUrl: imageUrl
      });

    } catch (e) {
      console.error(e);
      chrome.tabs.sendMessage(tab.id, {
        type: "SCAN_ERROR",
        error: e.message
      });
    }
  }
});

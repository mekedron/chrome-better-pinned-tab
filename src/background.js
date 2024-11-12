const pinnedTabs = new Map();

// Initialize pinnedTabs map on startup
chrome.tabs.query({}, (tabs) => {
  tabs.forEach((tab) => {
    if (tab.pinned) {
      pinnedTabs.set(tab.id, tab);
    }
  });
});

// Update pinnedTabs map when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.pinned) {
    // Add or update the tab in pinnedTabs
    pinnedTabs.set(tabId, tab);
  } else {
    // Remove from pinnedTabs if it exists
    pinnedTabs.delete(tabId);
  }
});

// When a tab is removed, check if it was pinned
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (pinnedTabs.has(tabId) && !removeInfo.isWindowClosing) {
    const tab = pinnedTabs.get(tabId);
    // Recreate the tab
    chrome.tabs.create(
      {
        index: tab.index,
        url: tab.url,
        pinned: true,
        active: false,
        windowId: tab.windowId,
      },
      (newTab) => {
        // Update the pinnedTabs map
        pinnedTabs.set(newTab.id, newTab);
      },
    );
    // Remove the old tab from the map
    pinnedTabs.delete(tabId);
  } else {
    // Remove the tab from the map if it exists
    pinnedTabs.delete(tabId);
  }
});

//-------------------

let recentlyClosedPinnedTabs = [];

// Update the list of recently closed pinned tabs
function updateRecentlyClosedPinnedTabs() {
  chrome.sessions.getRecentlyClosed((sessions) => {
    recentlyClosedPinnedTabs = sessions
      .filter((session) => session.tab && session.tab.pinned)
      .map((session) => session.tab.url);
  });
}

// Initialize the list when the extension starts
updateRecentlyClosedPinnedTabs();

// Listen for changes in recently closed sessions
chrome.sessions.onChanged.addListener(() => {
  updateRecentlyClosedPinnedTabs();
});

// Listen for new tabs being created
chrome.tabs.onCreated.addListener((tab) => {
  if (tab.pinned && recentlyClosedPinnedTabs.includes(tab.url)) {
    // Prevented restoring a pinned tab.
    chrome.tabs.update(tab.id, { pinned: false });
    // Remove the URL from the list to prevent multiple removals
    recentlyClosedPinnedTabs = recentlyClosedPinnedTabs.filter(
      (url) => url !== tab.url,
    );
  }
});

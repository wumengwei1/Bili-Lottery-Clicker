// 全局状态管理
let state = {
  isRunning: false,
  links: [],
  currentIndex: 0,
  sourceTabId: null,
  currentTabId: null,
  processingTab: false
};

// 处理来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startProcess") {
    state.isRunning = true;
    state.links = message.links;
    state.currentIndex = 0;
    state.sourceTabId = sender.tab.id;
    processNextLink();
    sendResponse({success: true});
  } 
  else if (message.action === "stopProcess") {
    state.isRunning = false;
    sendResponse({success: true});
  }
  else if (message.action === "updateCounter") {
    // 向源标签页发送更新计数器的消息
    chrome.tabs.sendMessage(state.sourceTabId, {
      action: "updateCounter",
      count: state.currentIndex
    });
    sendResponse({success: true});
  }
  else if (message.action === "notifyInteractionComplete") {
    // 抽奖互动完成，关闭当前标签并立即处理下一个
    if (state.currentTabId) {
      chrome.tabs.remove(state.currentTabId, () => {
        state.processingTab = false;
        // 立即处理下一个，不等待
        processNextLink();
      });
    }
    sendResponse({success: true});
  }
  return true; // 保持消息通道打开，支持异步响应
});

// 修改链接处理函数，增加打开新链接前的等待时间
function processNextLink() {
  if (!state.isRunning || state.currentIndex >= state.links.length || state.processingTab) {
    if (!state.isRunning || state.currentIndex >= state.links.length) {
      // 完成所有链接处理
      chrome.tabs.sendMessage(state.sourceTabId, {
        action: "processComplete"
      });
    }
    return;
  }

  const nextLink = state.links[state.currentIndex];
  state.currentIndex++;
  state.processingTab = true;
  
  // 更新源页面计数器
  chrome.tabs.sendMessage(state.sourceTabId, {
    action: "updateCounter",
    count: state.currentIndex
  });
  
  // 添加随机延迟 (800-1500毫秒) 再打开新链接
  const tabDelay = Math.floor(Math.random() * 700) + 800;
  console.log(`将在 ${tabDelay}ms 后打开下一个链接`);
  
  setTimeout(() => {
    // 创建新标签页
    chrome.tabs.create({ url: nextLink, active: true }, (tab) => {
      state.currentTabId = tab.id;
    });
  }, tabDelay);
}

// 监听标签页更新事件，用于判断页面加载完成
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === state.currentTabId && changeInfo.status === 'complete' && state.isRunning) {
    // 增加页面加载后的等待时间 (1000-2000毫秒)
    const loadDelay = Math.floor(Math.random() * 1000) + 1000;
    console.log(`页面已加载完成，将在 ${loadDelay}ms 后开始互动`);
    
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, {
        action: "performLotteryInteraction"
      });
    }, loadDelay); // 从500毫秒增加到1000-2000毫秒
  }
});
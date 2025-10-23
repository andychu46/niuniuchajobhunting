// 牛牛查求职助手 - 后台脚本 (Service Worker)

console.log('[牛牛查求职助手] Service Worker 已启动');

// 监听扩展安装
chrome.runtime.onInstalled.addListener((details) => {
    console.log('[牛牛查求职助手] 扩展已安装/更新:', details.reason);
    
    // 设置默认配置
    if (details.reason === 'install') {
        chrome.storage.sync.set({
            enableCompanyTags: true,
            enableApiInterception: true,
            debugMode: false
        });
    }
});

// 监听来自content script和popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSettings') {
        // 获取设置
        chrome.storage.sync.get({
            enableCompanyTags: true,
            enableApiInterception: true,
            debugMode: false
        }, (settings) => {
            sendResponse(settings);
        });
        return true; // 保持消息通道开放
    }
});
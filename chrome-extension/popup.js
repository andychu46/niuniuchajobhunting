// 牛牛查求职助手 - 弹出窗口脚本

// 全局变量定义
let SITE_CONFIGS = {};

// 直接从Chrome扩展manifest获取版本号
function getManifestVersion() {
    try {
        const manifest = chrome.runtime.getManifest();
        if (manifest && manifest.version) {
            console.log('从manifest获取的版本号:', manifest.version);
            return manifest.version;
        }
    } catch (e) {
        console.warn('获取manifest版本号失败:', e);
    }
    return null;
}

// 加载配置
function loadConfig() {
    const configUrl = chrome.runtime.getURL('config.js');
    console.log('尝试加载配置文件:', configUrl);
    
    // 初始化空配置
    SITE_CONFIGS = {};
    
    return fetch(configUrl)
        .then(response => {
            console.log('配置文件请求状态:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP错误! 状态: ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            console.log('获取到配置文件内容');
            try {
                // 只提取SITE_CONFIGS配置信息
                const siteConfigsMatch = text.match(/const\s+SITE_CONFIGS\s*=\s*({[\s\S]*?})(;|\n)/);
                
                if (siteConfigsMatch) {
                    console.log('找到SITE_CONFIGS配置');
                    // 尝试解析完整的SITE_CONFIGS
                    const cleanText = siteConfigsMatch[1]
                        .replace(/'/g, '"')
                        .replace(/\/\/[^\n]*/g, '')
                        .replace(/,\s*}/g, '}');
                    
                    try {
                        // 尝试完整解析SITE_CONFIGS
                        SITE_CONFIGS = JSON.parse(`{${cleanText}}`);
                        console.log('成功解析完整的SITE_CONFIGS');
                    } catch (parseError) {
                        console.warn('完整解析SITE_CONFIGS失败，尝试提取域名列表:', parseError.message);
                        // 提取域名列表
                        const domainRegex = /"([^"]+)"\s*:/g;
                        const domains = [];
                        let match;
                        while ((match = domainRegex.exec(cleanText)) !== null) {
                            domains.push(match[1]);
                        }
                        
                        // 构建简化的SITE_CONFIGS
                        SITE_CONFIGS = {};
                        domains.forEach(domain => {
                            SITE_CONFIGS[domain] = true;
                        });
                    }
                    console.log('解析的SITE_CONFIGS:', Object.keys(SITE_CONFIGS));
                } else {
                    console.error('未找到SITE_CONFIGS配置');
                    // 不再使用硬编码的域名列表，保持为空对象
                }
            } catch (e) {
                console.error('解析配置时出错:', e);
                // 出错时保持空配置，不再设置硬编码值
            }
            
            return { SITE_CONFIGS };
        })
        .catch(error => {
            console.error('加载配置时出错:', error);
            // 出错时保持空配置，不再设置硬编码值
            return { SITE_CONFIGS };
        });
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM已加载，开始初始化popup');
    
    // HTML中已为版本信息元素设置了id="versionInfo"，无需再次添加
    
    // 获取必要的DOM元素
    const currentSiteElement = document.getElementById('currentSite');
    const statusElement = document.getElementById('extensionStatus');
    
    // 直接通过id获取版本信息元素
    let versionElement = document.getElementById('versionInfo');
    console.log('版本元素查找结果:', versionElement);
    
    console.log('DOM元素状态:', {
        currentSiteElement: !!currentSiteElement,
        statusElement: !!statusElement,
        versionElement: !!versionElement
    });
    
    // 立即更新状态为加载中
    if (currentSiteElement) {
        currentSiteElement.textContent = '正在检测...';
    }
    if (statusElement) {
        statusElement.textContent = '正在初始化...';
        statusElement.style.color = '#FFC107';
    }
    
    // 加载配置
    loadConfig().then((config) => {
        console.log('配置加载完成，开始更新UI', config);
        
        // 直接从manifest获取版本号并更新显示
        if (versionElement) {
            const version = getManifestVersion();
            if (version) {
                console.log('准备更新版本信息，当前值:', versionElement.textContent, '目标值:', version);
                versionElement.textContent = `v${version}`; // 直接从manifest获取版本号
                console.log('已更新版本信息:', versionElement.textContent);
                
                // 额外确保我们更新的是正确的元素
                if (versionElement.parentElement) {
                    console.log('版本元素位置:', versionElement.parentElement.textContent);
                }
            } else {
                console.error('无法获取manifest版本号，保持原有显示');
            }
        } else {
            console.error('未找到版本信息元素，无法更新');
        }
        
        // 获取当前标签页信息
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            console.log('获取当前标签页信息:', tabs);
            if (tabs && tabs.length > 0) {
                const currentTab = tabs[0];
                const url = new URL(currentTab.url);
                const hostname = url.hostname;
                console.log('当前网站hostname:', hostname);
                
                // 更新当前网站显示
                if (currentSiteElement) {
                    // 使用loadConfig返回的配置来检查网站支持情况
                    if (config && config.SITE_CONFIGS && typeof config.SITE_CONFIGS === 'object' && config.SITE_CONFIGS[hostname]) {
                        currentSiteElement.textContent = hostname; // 直接显示域名
                        currentSiteElement.style.color = '#4CAF50';
                        console.log('当前网站已识别为支持的网站');
                    } else {
                        currentSiteElement.textContent = hostname; // 直接显示域名
                        currentSiteElement.style.color = '#FF5722';
                        console.log('当前网站不支持');
                    }
                }
                
                // 更新扩展状态
                if (statusElement) {
                    // 使用config中的SITE_CONFIGS来检查网站支持情况，不再使用全局变量
                    if (config && config.SITE_CONFIGS && typeof config.SITE_CONFIGS === 'object' && config.SITE_CONFIGS[hostname]) {
                        statusElement.textContent = '正常运行';
                        statusElement.style.color = '#4CAF50';
                    } else {
                        statusElement.textContent = '等待支持的网站';
                        statusElement.style.color = '#FF9800';
                    }
                }
            } else {
                console.error('未找到活动标签页');
                if (currentSiteElement) {
                    currentSiteElement.textContent = '无法检测';
                }
                if (statusElement) {
                    statusElement.textContent = '无法检测状态';
                }
            }
        });
    });
    
    // 刷新页面按钮
    document.getElementById('refreshBtn').addEventListener('click', function() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.reload(tabs[0].id);
            window.close();
        });
    });
    
    // 设置按钮
    document.getElementById('settingsBtn').addEventListener('click', function() {
        // 打开设置页面或显示设置选项
        chrome.tabs.create({
            url: chrome.runtime.getURL('options.html')
        });
    });
});

function checkExtensionStatus() {
    const statusElement = document.getElementById('extensionStatus');
    
    // 检查是否在支持的网站上
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        const url = new URL(currentTab.url);
        const hostname = url.hostname;
        
        // 使用从config.js加载的SITE_CONFIGS配置
        if (SITE_CONFIGS[hostname]) {
            statusElement.textContent = '正常运行';
            statusElement.style.color = '#4CAF50';
        } else {
            statusElement.textContent = '等待支持的网站';
            statusElement.style.color = '#FF9800';
        }
    });
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateStatus') {
        const statusElement = document.getElementById('extensionStatus');
        statusElement.textContent = request.status;
        statusElement.style.color = request.color || '#4CAF50';
    }
});
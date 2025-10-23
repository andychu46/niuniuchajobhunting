// 牛牛查求职助手 - 设置页面脚本

// 使用统一配置中的默认公司名单
const DEFAULT_COMPANY_LISTS = {
    scam: DEFAULT_COMPANY_BLACKLISTS.scam.companies,
    outsourcing: DEFAULT_COMPANY_BLACKLISTS.outsourcing.companies,
    training: DEFAULT_COMPANY_BLACKLISTS.training.companies,
    custom: DEFAULT_COMPANY_BLACKLISTS.custom.companies
};

// 默认设置
const DEFAULT_SETTINGS = {
    enableCompanyTags: true,
    enableApiInterception: true,
    debugMode: false
};

document.addEventListener('DOMContentLoaded', function () {
    loadSettings();
    bindEvents();
});

function loadSettings() {
    // 加载基本设置
    chrome.storage.sync.get(DEFAULT_SETTINGS, function (items) {
        document.getElementById('enableCompanyTags').checked = items.enableCompanyTags;
        document.getElementById('enableApiInterception').checked = items.enableApiInterception;
        document.getElementById('debugMode').checked = items.debugMode;
    });

    // 加载公司名单
    chrome.storage.sync.get({
        scamCompanies: DEFAULT_COMPANY_LISTS.scam.join('\n'),
        outsourcingCompanies: DEFAULT_COMPANY_LISTS.outsourcing.join('\n'),
        trainingCompanies: DEFAULT_COMPANY_LISTS.training.join('\n'),
        customCompanies: DEFAULT_COMPANY_LISTS.custom.join('\n')
    }, function (items) {
        document.getElementById('scamCompanies').value = items.scamCompanies;
        document.getElementById('outsourcingCompanies').value = items.outsourcingCompanies;
        document.getElementById('trainingCompanies').value = items.trainingCompanies;
        document.getElementById('customCompanies').value = items.customCompanies;
    });
}

function bindEvents() {
    // 保存设置按钮
    document.getElementById('saveSettings').addEventListener('click', saveSettings);

    // 恢复默认按钮
    document.getElementById('resetSettings').addEventListener('click', resetSettings);
}

function saveSettings() {
    const settings = {
        enableCompanyTags: document.getElementById('enableCompanyTags').checked,
        enableApiInterception: document.getElementById('enableApiInterception').checked,
        debugMode: document.getElementById('debugMode').checked,
        scamCompanies: document.getElementById('scamCompanies').value,
        outsourcingCompanies: document.getElementById('outsourcingCompanies').value,
        trainingCompanies: document.getElementById('trainingCompanies').value,
        customCompanies: document.getElementById('customCompanies').value
    };

    chrome.storage.sync.set(settings, function () {
        // 显示保存成功提示
        showNotification('设置已保存！', 'success');

        // 通知content script设置已更新
        chrome.tabs.query({}, function (tabs) {
            console.log('[设置页面] 找到标签页数量:', tabs.length);
            tabs.forEach(function (tab) {
                if (tab.url && (tab.url.includes('51job.com') ||
                    tab.url.includes('zhipin.com') ||
                    tab.url.includes('niuqizp.com'))) {
                    console.log('[设置页面] 向标签页发送设置更新消息:', tab.url);
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'settingsUpdated',
                        settings: settings
                    }, function (response) {
                        if (chrome.runtime.lastError) {
                            console.log('[设置页面] 发送消息失败:', chrome.runtime.lastError.message);
                        } else {
                            console.log('[设置页面] 消息发送成功');
                        }
                    });
                }
            });
        });
    });
}

function resetSettings() {
    if (confirm('确定要恢复默认设置吗？这将清除所有自定义配置。')) {
        // 恢复基本设置
        document.getElementById('enableCompanyTags').checked = DEFAULT_SETTINGS.enableCompanyTags;
        document.getElementById('enableApiInterception').checked = DEFAULT_SETTINGS.enableApiInterception;
        document.getElementById('debugMode').checked = DEFAULT_SETTINGS.debugMode;

        // 恢复公司名单
        document.getElementById('scamCompanies').value = DEFAULT_COMPANY_LISTS.scam.join('\n');
        document.getElementById('outsourcingCompanies').value = DEFAULT_COMPANY_LISTS.outsourcing.join('\n');
        document.getElementById('trainingCompanies').value = DEFAULT_COMPANY_LISTS.training.join('\n');
        document.getElementById('customCompanies').value = DEFAULT_COMPANY_LISTS.custom.join('\n');

        showNotification('已恢复默认设置！', 'info');
    }
}

function showNotification(message, type = 'success') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;

    // 根据类型设置颜色
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
    } else if (type === 'info') {
        notification.style.background = 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #FF5722 0%, #D32F2F 100%)';
    }

    notification.textContent = message;

    // 添加动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);

    // 添加到页面
    document.body.appendChild(notification);

    // 3秒后自动移除
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}
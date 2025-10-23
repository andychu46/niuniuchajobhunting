// 牛牛查求职助手 - API拦截注入脚本
// 此脚本将被注入到页面中拦截API调用
// CSP兼容版本，使用外部脚本文件而非内联脚本

(function () {
    console.log('[牛牛查求职助手] 🛠️ 开始注入API拦截器 (CSP兼容版)');
    
    // 检查是否已经初始化过
    if (window._niuniuInjectInitialized) {
        console.log('[牛牛查求职助手] ⚠️ 拦截器已初始化，跳过重复初始化');
        return;
    }
    window._niuniuInjectInitialized = true;

    // 保存原始方法
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    // 获取当前网站的API模式
    const currentHost = window.location.hostname;
    let currentPatterns = [];
    let configReceived = false;

    // 检查是否有预加载的配置
    function checkPreloadedConfig() {
        window.addEventListener('message', function(event) {
            if (event.source === window && event.data.type === 'NIUNIU_CONFIG_PRELOAD') {
                if (!configReceived) {
                    currentPatterns = event.data.config.apiPatterns || [];
                    console.log('[牛牛查求职助手] 📥 收到预加载配置，API模式:', currentPatterns);
                    configReceived = true;
                    setupInterceptors();
                }
            }
        });
        
        // 监听正常配置消息
        window.addEventListener('message', function(event) {
            if (event.source === window && event.data.type === 'NIUNIU_CONFIG') {
                if (!configReceived) {
                    currentPatterns = event.data.config.apiPatterns || [];
                    console.log('[牛牛查求职助手] 📥 收到主配置，API模式:', currentPatterns);
                    configReceived = true;
                    setupInterceptors();
                } else {
                    console.log('[牛牛查求职助手] ✅ 配置已接收，忽略重复配置');
                }
            }
        });
    }

    // 等待配置数据从content script传递
    function waitForConfig() {
        return new Promise((resolve) => {
            // 如果已经收到预加载配置，直接使用
            if (configReceived && currentPatterns.length > 0) {
                resolve({ apiPatterns: currentPatterns });
                return;
            }

            // 监听配置消息
            const configListener = (event) => {
                if (event.source === window && 
                    (event.data.type === 'NIUNIU_CONFIG' || event.data.type === 'NIUNIU_CONFIG_PRELOAD')) {
                    window.removeEventListener('message', configListener);
                    currentPatterns = event.data.config.apiPatterns || [];
                    configReceived = true;
                    resolve(event.data.config);
                }
            };
            window.addEventListener('message', configListener);

            // 请求配置
            window.postMessage({ type: 'NIUNIU_REQUEST_CONFIG' }, '*');

            // 超时后使用备用配置
            setTimeout(() => {
                if (!configReceived) {
                    window.removeEventListener('message', configListener);
                    const fallbackPatterns = {
                        'we.51job.com': ['/api/job/search-pc'],
                        'www.zhipin.com': ['/wapi/zpgeek/search/joblist.json', '/wapi/zpgeek/pc/recommend/job/list.json'],
                        'campus.niuqizp.com': []
                    };
                    currentPatterns = fallbackPatterns[currentHost] || [];
                    console.log('[牛牛查求职助手] ⏰ 使用备用配置:', currentPatterns);
                    resolve({ apiPatterns: currentPatterns });
                }
            }, 1000);
        });
    }

    // 初始化配置
    try {
        console.log('[牛牛查求职助手] 🔍 初始化配置系统...');
        
        // 立即设置基础拦截器，防止错过早期API调用
        if (currentHost === 'www.zhipin.com') {
            // 对于BOSS直聘，立即设置拦截器使用默认配置
            currentPatterns = [
                '/wapi/zpgeek/search/joblist.json',
                '/wapi/zpgeek/pc/recommend/job/list.json',
                '/wapi/zpgeek/search/joblist',
                '/wapi/zpgeek/pc/recommend/job/list',
                '/wapi/zpgeek/job/search',
                '/wapi/zpgeek/recommend/',
                '/wapi/zpgeek/geek/job',
                '/wapi/zpgeek/',
                'joblist.json',
                'job/list.json',
                'search/job',
                'recommend/job'
            ];
            console.log('[牛牛查求职助手] 🚀 BOSS直聘立即设置默认拦截器');
            setupInterceptors();
            configReceived = true;
        }
        
        checkPreloadedConfig();
        
        // 延时检查配置接收情况
        setTimeout(() => {
            if (!configReceived) {
                console.log('[牛牛查求职助手] ⏰ 300ms后仍未收到配置，尝试主动请求...');
                waitForConfig().then(config => {
                    if (!configReceived) {
                        currentPatterns = config.apiPatterns || [];
                        console.log('[牛牛查求职助手] 📥 主动请求配置成功，API模式:', currentPatterns);
                        configReceived = true;
                        setupInterceptors();
                    }
                }).catch(err => {
                    console.error('[牛牛查求职助手] ❌ 配置加载失败:', err);
                    // 使用备用配置
                    const fallbackPatterns = {
                        'we.51job.com': ['/api/job/search-pc'],
                        'www.zhipin.com': ['/wapi/zpgeek/search/joblist.json', '/wapi/zpgeek/pc/recommend/job/list.json'],
                        'campus.niuqizp.com': []
                    };
                    currentPatterns = fallbackPatterns[currentHost] || [];
                    console.log('[牛牛查求职助手] 🔄 使用备用配置:', currentPatterns);
                    if (currentPatterns.length > 0) {
                        setupInterceptors();
                    }
                });
            } else {
                console.log('[牛牛查求职助手] ✅ 配置已接收，不需要额外请求');
            }
        }, 300);
        
        // 最终备用检查
        setTimeout(() => {
            if (!configReceived) {
                console.warn('[牛牛查求职助手] ⚠️ 2秒后仍未收到配置，强制使用备用配置');
                const fallbackPatterns = {
                    'we.51job.com': ['/api/job/search-pc'],
                    'www.zhipin.com': ['/wapi/zpgeek/search/joblist.json', '/wapi/zpgeek/pc/recommend/job/list.json'],
                    'campus.niuqizp.com': []
                };
                currentPatterns = fallbackPatterns[currentHost] || [];
                console.log('[牛牛查求职助手] 🚑 强制使用备用配置:', currentPatterns);
                if (currentPatterns.length > 0) {
                    setupInterceptors();
                }
            }
        }, 2000);
        
    } catch (error) {
        console.error('[牛牛查求职助手] ❌ 初始化配置失败:', error);
    }

    function setupInterceptors() {
        // 防止重复设置
        if (window._niuniuInterceptorsSet) {
            console.log('[牛牛查求职助手] ⚠️ API拦截器已设置，跳过重复设置');
            return;
        }
        window._niuniuInterceptorsSet = true;

        console.log('[牛牛查求职助手] 🌐 当前网站:', currentHost);
        console.log('[牛牛查求职助手] 🎯 API模式:', currentPatterns);
        
        // 如果是BOSS直聘，启用详细调试
        const isBossZhipin = currentHost === 'www.zhipin.com';
        if (isBossZhipin) {
            console.log('[牛牛查求职助手] 🔍 BOSS直聘调试模式已启用');
        }
        
        // 保存原始方法（防止重复拦截）
        if (!window._niuniuOriginalFetch) {
            window._niuniuOriginalFetch = originalFetch;
        }
        if (!window._niuniuOriginalXHROpen) {
            window._niuniuOriginalXHROpen = originalXHROpen;
        }
        if (!window._niuniuOriginalXHRSend) {
            window._niuniuOriginalXHRSend = originalXHRSend;
        }
        
         
        // 检查是否是目标API
        function isNiuniuTargetApi(url) {
            if (!url || currentPatterns.length === 0) return false;
            
            // 过滤掉chrome-extension和无效URL
            if (typeof url === 'string' && (
                url.includes('chrome-extension://') ||
                url.includes('invalid/') ||
                url === 'chrome-extension://invalid/' ||
                url.startsWith('chrome-extension://') ||
                url.startsWith('moz-extension://') ||
                url.startsWith('safari-extension://') ||
                url.includes('invalid') ||
                !url.startsWith('http')
            )) {
                return false;
            }

            const isMatch = currentPatterns.some(pattern => url.includes(pattern));
            if (isMatch) {
                console.log('[牛牛查求职助手] 🎯 检测到目标API:', url);
            }
            return isMatch;
        }
        
        // 增强的API检测函数，用于调试
        function logAllApiCalls(url, method = 'GET') {
            // 只记录可能相关的API
            if (typeof url === 'string' && url.startsWith('http') && (
                url.includes('job') ||
                url.includes('search') ||
                url.includes('list') ||
                url.includes('api') ||
                url.includes('wapi') ||
                url.includes('zhipin') ||
                url.includes('51job')
            )) {
                if (isBossZhipin) {
                    console.log(`[牛牛查求职助手] 🔍 API调用: ${method} ${url}`);
                }
            }
        }

        // 拦截fetch API
        if (originalFetch) {
            window.fetch = function (...args) {
                const url = args[0] || '';
                
                // 记录所有API调用用于调试
                logAllApiCalls(url, 'FETCH');
                
                // 更严格地过滤掉无效请求
                if (typeof url === 'string' && (
                    url.includes('chrome-extension://') ||
                    url.includes('invalid/') ||
                    url === 'chrome-extension://invalid/' ||
                    url.startsWith('chrome-extension://') ||
                    url.startsWith('moz-extension://') ||
                    url.startsWith('safari-extension://') ||
                    url.includes('invalid') ||
                    !url.startsWith('http') ||
                    url.length < 10
                )) {
                    // 对于无效URL，直接返回一个拒绝的Promise，避免网络请求
                    return Promise.reject(new TypeError('Network request to invalid URL blocked'));
                }

                // 在调用原始fetch前再次检查URL有效性
                try {
                    return originalFetch.apply(this, args).then(response => {
                        // 检查是否是目标API
                        if (isNiuniuTargetApi(url)) {
                            console.log('[牛牛查求职助手] ✅ 拦截到目标Fetch API:', url);
                            
                            // 克隆响应以避免消费原始响应
                            const responseClone = response.clone();
                            
                            // 处理响应数据
                            responseClone.json().then(data => {
                                console.log('[牛牛查求职助手] ✅ 获取到API数据:', data);
                                
                                // 发送数据到content script
                                window.postMessage({
                                    type: 'NIUNIU_API_DATA',
                                    url: url,
                                    data: data,
                                    timestamp: Date.now()
                                }, '*');
                            }).catch(err => {
                                console.error('[牛牛查求职助手] ❌ 解析API数据失败:', err);
                            });
                        }
                        return response;
                    }).catch(err => {
                        // 静默处理扩展相关的错误
                        if (err.message && (
                            err.message.includes('chrome-extension://') ||
                            err.message.includes('net::ERR_FAILED') ||
                            err.message.includes('Failed to fetch') ||
                            err.message.includes('invalid') ||
                            err.message.includes('Network request to invalid URL blocked')
                        )) {
                            // 静默处理这些错误，不输出到控制台
                            throw err;
                        }
                        console.error('[牛牛查求职助手] ❌ Fetch请求失败:', err);
                        throw err;
                    });
                } catch (err) {
                    // 捕获同步错误
                    if (err.message && (
                        err.message.includes('chrome-extension://') ||
                        err.message.includes('invalid') ||
                        err.message.includes('Network request to invalid URL blocked')
                    )) {
                        return Promise.reject(err);
                    }
                    console.error('[牛牛查求职助手] ❌ Fetch调用失败:', err);
                    return Promise.reject(err);
                }
            };
            console.log('[牛牛查求职助手] Fetch API拦截器已设置');
        }

        // 拦截XMLHttpRequest
        if (originalXHROpen && originalXHRSend) {
            XMLHttpRequest.prototype.open = function (method, url) {
                // 记录所有XHR调用用于调试
                logAllApiCalls(url, `XHR-${method}`);
                
                // 过滤无效URL
                if (typeof url === 'string' && (
                    url.includes('chrome-extension://') ||
                    url.includes('invalid/') ||
                    url === 'chrome-extension://invalid/' ||
                    url.startsWith('chrome-extension://') ||
                    url.startsWith('moz-extension://') ||
                    url.startsWith('safari-extension://') ||
                    url.includes('invalid') ||
                    !url.startsWith('http')
                )) {
                    this._niuniuSkip = true;
                } else {
                    this._niuniuSkip = false;
                }
                
                this._niuniuUrl = url;
                this._niuniuMethod = method;
                return originalXHROpen.apply(this, arguments);
            };

            XMLHttpRequest.prototype.send = function () {
                const self = this;
                const oldOnReadyStateChange = this.onreadystatechange;

                this.onreadystatechange = function () {
                    if (self.readyState === 4 && self.status === 200 && !self._niuniuSkip) {
                        const url = self._niuniuUrl || '';
                        
                        // 检查是否是目标API
                        if (isNiuniuTargetApi(url)) {
                            console.log('[牛牛查求职助手] ✅ 拦截到目标XHR API:', url);
                            try {
                                const responseData = JSON.parse(self.responseText);
                                console.log('[牛牛查求职助手] ✅ 获取到XHR API数据:', responseData);
                                
                                // 发送数据到content script
                                window.postMessage({
                                    type: 'NIUNIU_API_DATA',
                                    url: url,
                                    data: responseData,
                                    timestamp: Date.now()
                                }, '*');
                            } catch (e) {
                                console.error('[牛牛查求职助手] ❌ 解析XHR API数据失败:', e);
                            }
                        }
                    }

                    if (typeof oldOnReadyStateChange === 'function') {
                        oldOnReadyStateChange.apply(this, arguments);
                    }
                };

                return originalXHRSend.apply(this, arguments);
            };
            console.log('[牛牛查求职助手] XMLHttpRequest拦截器已设置');
        }

        console.log('[牛牛查求职助手] API拦截器注入完成');
    }
})();
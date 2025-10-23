(function () {
    'use strict';

    // ==================== 常量定义 ====================
    const SCRIPT_NAME = '牛牛查求职助手';
    let DEBUG = false; // 将从设置中动态加载

    // ==================== 配置初始化 ====================
    // 从统一配置中复制数据，避免直接引用导致的修改问题
    const COMPANY_BLACKLISTS = JSON.parse(JSON.stringify(DEFAULT_COMPANY_BLACKLISTS));
    const siteConfigs = SITE_CONFIGS;
    const initConfig = INIT_CONFIG;

    // ==================== 全局变量 ====================
    const currentHost = window.location.hostname;
    const config = siteConfigs[currentHost];
    let apiData = [];
    let isProcessingJobs = false;  // 添加全局处理状态标志
    let processedJobElements = new Set();  // 记录已处理的元素
    let processCount = 0;  // 处理计数器
    let lastSuccessfulProcess = 0;  // 最后一次成功处理的时间

    const logger = {
        log: (...args) => {
            if (DEBUG) {
                console.log(`[${SCRIPT_NAME}]`, ...args);
            }
        },
        warn: (...args) => console.warn(`[${SCRIPT_NAME}]`, ...args),
        error: (...args) => console.error(`[${SCRIPT_NAME}]`, ...args)
    };

    if (!config) {
        logger.warn('未找到匹配的配置，当前主机名:', currentHost);
        return;
    }

    logger.log('脚本启动，当前主机名:', currentHost);

    // 加载用户设置
    loadUserSettings().then(() => {
        // 立即注入API拦截器，不等待其他初始化
        if (initConfig.enableApiInterception && config.apiPatterns?.length) {
            logger.log('🛠️ 启动API拦截器...');
            injectApiInterceptor();
        } else {
            logger.log('⚠️ API拦截被禁用或当前网站不支持API拦截');
        }
    });

    // ==================== 设置管理 ====================

    async function loadUserSettings() {
        try {
            const settings = await new Promise((resolve) => {
                chrome.storage.sync.get({
                    enableCompanyTags: true,
                    enableApiInterception: true,
                    debugMode: false, // 默认关闭调试模式
                    // 用户自定义公司名单
                    scamCompanies: '',
                    outsourcingCompanies: '',
                    trainingCompanies: '',
                    customCompanies: ''
                }, resolve);
            });

            // 更新全局设置
            updateSettings(settings);

            // 更新公司黑名单
            updateCompanyBlacklists(settings);

            // 测试日志输出（这条日志总是显示，用于确认设置加载）
            console.log(`[${SCRIPT_NAME}] 用户设置已加载，调试模式: ${DEBUG ? '启用' : '关闭'}`);
            logger.log('详细设置信息:', settings);
            return settings;
        } catch (error) {
            logger.error('加载用户设置失败:', error);
            return {};
        }
    }

    function updateSettings(settings) {
        const oldDebug = DEBUG;

        // 更新全局设置
        DEBUG = settings.debugMode;
        initConfig.enableApiInterception = settings.enableApiInterception;

        // 如果调试模式发生变化，记录日志
        if (oldDebug !== DEBUG) {
            if (DEBUG) {
                console.log(`[${SCRIPT_NAME}] 调试模式已启用`);
            } else {
                console.log(`[${SCRIPT_NAME}] 调试模式已关闭`);
            }
        }
    }

    function updateCompanyBlacklists(settings) {
        // 解析用户自定义的公司名单
        const parseCompanyList = (listString) => {
            if (!listString) return [];
            return listString.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
        };

        // 更新各类型公司名单，合并默认名单和用户自定义名单
        if (settings.scamCompanies) {
            const userScamCompanies = parseCompanyList(settings.scamCompanies);
            COMPANY_BLACKLISTS.scam.companies = [
                ...COMPANY_BLACKLISTS.scam.companies,
                ...userScamCompanies
            ];
            logger.log('已加载用户自定义诈骗公司名单:', userScamCompanies.length, '个');
        }

        if (settings.outsourcingCompanies) {
            const userOutsourcingCompanies = parseCompanyList(settings.outsourcingCompanies);
            COMPANY_BLACKLISTS.outsourcing.companies = [
                ...COMPANY_BLACKLISTS.outsourcing.companies,
                ...userOutsourcingCompanies
            ];
            logger.log('已加载用户自定义外包公司名单:', userOutsourcingCompanies.length, '个');
        }

        if (settings.trainingCompanies) {
            const userTrainingCompanies = parseCompanyList(settings.trainingCompanies);
            COMPANY_BLACKLISTS.training.companies = [
                ...COMPANY_BLACKLISTS.training.companies,
                ...userTrainingCompanies
            ];
            logger.log('已加载用户自定义培训公司名单:', userTrainingCompanies.length, '个');
        }

        if (settings.customCompanies) {
            const userCustomCompanies = parseCompanyList(settings.customCompanies);
            COMPANY_BLACKLISTS.custom.companies = [
                ...COMPANY_BLACKLISTS.custom.companies,
                ...userCustomCompanies
            ];
            logger.log('已加载用户自定义警告公司名单:', userCustomCompanies.length, '个');
        }

        // 去重处理
        Object.keys(COMPANY_BLACKLISTS).forEach(type => {
            COMPANY_BLACKLISTS[type].companies = [...new Set(COMPANY_BLACKLISTS[type].companies)];
        });

        logger.log('公司黑名单已更新，总计:',
            Object.values(COMPANY_BLACKLISTS).reduce((total, list) => total + list.companies.length, 0), '个公司');
    }

    // ==================== 核心功能函数 ====================

    function setupGlobalErrorHandling() {
        window.addEventListener('error', function (event) {
            if (event.error && event.error.message &&
                event.error.message.includes('牛牛查')) {
                logger.error('全局错误捕获:', {
                    message: event.error.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    stack: event.error.stack
                });
            }
        });
        window.addEventListener('unhandledrejection', function (event) {
            if (event.reason && event.reason.message &&
                event.reason.message.includes('牛牛查')) {
                logger.error('未处理的Promise拒绝:', event.reason);
            }
        });
        logger.log('全局错误处理器已设置');
    }

    function checkCompanyBlacklist(companyName) {
        if (!companyName) return [];

        const matches = [];
        const normalizedCompanyName = companyName.toLowerCase().replace(/\s+/g, '');

        // 遍历所有黑名单类型
        Object.keys(COMPANY_BLACKLISTS).forEach(function (listType) {
            const blacklist = COMPANY_BLACKLISTS[listType];

            // 模糊匹配公司名称，记录匹配到的关键词
            const matchedKeywords = [];
            blacklist.companies.forEach(function (blacklistedCompany) {
                const normalizedBlacklisted = blacklistedCompany.toLowerCase().replace(/\s+/g, '');

                // 双向模糊匹配
                if (normalizedCompanyName.includes(normalizedBlacklisted) ||
                    normalizedBlacklisted.includes(normalizedCompanyName)) {
                    matchedKeywords.push(blacklistedCompany);
                }
            });

            if (matchedKeywords.length > 0) {
                matches.push({
                    type: listType,
                    name: blacklist.name,
                    emoji: blacklist.emoji,
                    color: blacklist.color,
                    matchedKeywords: matchedKeywords,
                    companyName: companyName
                });
                logger.log('牛牛查求职助手: 发现匹配公司', companyName, '->', blacklist.name);
            }
        });
        return matches;
    }

    function createCompanyTag(matchInfo) {
        const tag = document.createElement('span');
        tag.className = `niuniu_company-tag ${matchInfo.type}`;

        // 显示匹配到的关键词（最多显示2个）
        const displayKeywords = matchInfo.matchedKeywords.slice(0, 2).join('、');
        const hasMoreKeywords = matchInfo.matchedKeywords.length > 2;
        const keywordText = hasMoreKeywords ? `${displayKeywords}等` : displayKeywords;

        tag.textContent = `${matchInfo.emoji} ${matchInfo.name} `;

        // 在title中显示所有匹配关键词
        const allKeywords = matchInfo.matchedKeywords.join('、');
        tag.title = `该公司被标记为：${matchInfo.name}类型\n匹配关键词：${allKeywords}\n公司名称：${matchInfo.companyName}`;

        tag.style.backgroundColor = matchInfo.color;

        // 添加点击事件显示详情
        tag.addEventListener('click', function (e) {
            e.stopPropagation();
            showCompanyTagDetails(matchInfo);
        });

        return tag;
    }

    function showCompanyTagDetails(matchInfo) {
        const allKeywords = matchInfo.matchedKeywords.join('、');
        const message = `
公司名称：${matchInfo.companyName}
公司类型：${matchInfo.name}
匹配关键词：${allKeywords}
标记原因：该公司名称匹配了${matchInfo.name}类型名单中的关键词
建议：请谨慎考虑该职位，建议详细了解公司情况后再做决定

匹配规则：模糊匹配公司名称关键词
名单来源：基于公开信息和用户反馈整理

注意：此标记仅供参考，具体情况请自行判断
        `;

        alert(message);
    }

    function addCompanyTags(companyName) {
        const matches = checkCompanyBlacklist(companyName);

        if (matches.length === 0) {
            return null;
        }

        const tagContainer = document.createElement('div');
        tagContainer.className = 'niuniu_company-tags-container';

        // 添加标签标题
        const tagLabel = document.createElement('span');
        tagLabel.className = 'niuniu_company-tag-label';
        tagLabel.textContent = '🏷️ 公司标签：';
        tagContainer.appendChild(tagLabel);

        matches.forEach(function (match) {
            const tag = createCompanyTag(match);
            tagContainer.appendChild(tag);
        });

        return tagContainer;
    }

    function interceptAPIRequests() {
        try {
            logger.log('开始初始化API拦截器...');

            // 确保没有旧的inject.js引用
            logger.log('使用内联API拦截器，不依赖外部文件');

            // 立即注入API拦截器
            injectApiInterceptor();

            // 监听来自popup的设置更新消息
            chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
                if (request.action === 'settingsUpdated') {
                    console.log(`[${SCRIPT_NAME}] 收到设置更新消息:`, request.settings);
                    // 更新设置和公司名单
                    updateSettings(request.settings);
                    updateCompanyBlacklists(request.settings);

                    // 重新处理页面以应用新的设置
                    setTimeout(() => {
                        processCompanyList();
                    }, 500);
                }
            });

            // 定期检查是否有新的职位数据需要处理（降低频率）
            setInterval(() => {
                if (apiData && apiData.length > 0) {
                    const allJobs = document.querySelectorAll(config.jobListSelector);
                    const unprocessedJobs = Array.from(allJobs).filter(job =>
                        !job.dataset.processed && !isScriptElement(job)
                    );

                    if (unprocessedJobs.length > 0) {
                        logger.log('发现', unprocessedJobs.length, '个未处理的职位');
                        processCompanyList();
                    }
                }
            }, 1000); // 增加到1秒

            // 定期清理已处理元素记录，避免内存泄漏
            setInterval(() => {
                const currentJobs = document.querySelectorAll(config.jobListSelector);
                const currentIds = new Set();

                currentJobs.forEach(job => {
                    currentIds.add(getElementId(job));
                });

                // 清理不再存在的元素记录
                const toDelete = [];
                for (let id of processedJobElements) {
                    if (!currentIds.has(id)) {
                        toDelete.push(id);
                    }
                }

                toDelete.forEach(id => processedJobElements.delete(id));

                if (toDelete.length > 0) {
                    logger.log(`清理了 ${toDelete.length} 个过期的元素记录`);
                }
            }, 30000); // 30秒清理一次

            logger.log('API拦截器初始化完成');
        } catch (error) {
            logger.error('初始化API拦截器失败:', error);
        }
    }

    function injectApiInterceptor() {
        try {
            logger.log('🛠️ 开始注入API拦截器...');
            
            // 检查配置是否存在
            if (!config) {
                logger.error('❌ 网站配置不存在，无法注入API拦截器');
                return;
            }

            if (!config.apiPatterns || config.apiPatterns.length === 0) {
                logger.warn('⚠️ 当前网站没有配置API模式，跳过API拦截');
                return;
            }

            logger.log('📂 使用外部inject.js文件注入API拦截器');
            
            // 先设置页面监听器，确保能够接收配置和数据
            setupMessageListeners();
            
            // 在DOM完全加载后注入脚本
            const injectScript = () => {
                try {
                    // 立即发送预加载配置，确保在脚本加载前就已经可用
                    window.postMessage({
                        type: 'NIUNIU_CONFIG_PRELOAD',
                        config: {
                            apiPatterns: config.apiPatterns
                        }
                    }, '*');
                    logger.log('📦 预加载配置已立即发送');
                    
                    const script = document.createElement('script');
                    script.src = chrome.runtime.getURL('inject.js');
                    script.async = true;
                    script.defer = true;
                    
                    script.onload = function () {
                        logger.log('✅ API拦截脚本已加载');
                        
                        // 脚本加载后多次发送配置确保接收
                        const sendConfig = () => {
                            window.postMessage({
                                type: 'NIUNIU_CONFIG',
                                config: {
                                    apiPatterns: config.apiPatterns
                                }
                            }, '*');
                        };
                        
                        // 立即发送一次
                        sendConfig();
                        
                        // 100ms后再发送一次
                        setTimeout(sendConfig, 100);
                        
                        // 500ms后再发送一次作为最后保障
                        setTimeout(sendConfig, 500);
                        
                        logger.log('✅ 配置数据已多次发送到页面上下文');
                        
                        this.remove();
                    };
                    
                    script.onerror = function (error) {
                        logger.error('❌ API拦截脚本加载失败:', error);
                        this.remove();
                        // 如果外部脚本加载失败，回退到DOM监听方案
                        logger.warn('🔄 回退到DOM监听方案');
                        setupFallbackCapture();
                    };

                    // 尽早注入脚本，使用async加载避免CSP问题
                    const targetElement = document.head || document.documentElement;
                    if (targetElement) {
                        targetElement.appendChild(script);
                        logger.log('✅ API拦截脚本注入请求已发送');
                    } else {
                        logger.error('❌ 无法找到合适的DOM元素来注入脚本');
                        setupFallbackCapture();
                    }
                } catch (err) {
                    logger.error('❌ 注入脚本时出错:', err);
                    setupFallbackCapture();
                }
            };
            
            // 等待DOM准备好再注入
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', injectScript);
            } else {
                // DOM已经加载完成，立即注入
                setTimeout(injectScript, 10);
            }
            
        } catch (error) {
            logger.error('❌ 设置API拦截失败:', error);
            logger.error('错误详情:', error.stack);
            // 如果注入失败，回退到DOM监听方案
            setupFallbackCapture();
        }
    }

    function setupMessageListeners() {
        // 监听来自inject.js的配置请求
        window.addEventListener('message', function(event) {
            if (event.source === window && event.data.type === 'NIUNIU_REQUEST_CONFIG') {
                window.postMessage({
                    type: 'NIUNIU_CONFIG',
                    config: {
                        apiPatterns: config.apiPatterns
                    }
                }, '*');
                logger.log('✅ 响应配置请求');
            }
        });
    }

    function setupFallbackCapture() {
        logger.log('启用回退数据捕获方案');

        // 简化的DOM监听方案作为回退
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const jobElements = node.querySelectorAll ? node.querySelectorAll(config.jobListSelector) : [];
                            if (jobElements.length > 0) {
                                logger.log('回退方案检测到', jobElements.length, '个新职位元素');
                                setTimeout(() => processCompanyList(), 500);
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document, {
            childList: true,
            subtree: true
        });

        // 定期检查作为补充
        let lastJobCount = 0;
        const checkInterval = setInterval(() => {
            try {
                const currentJobs = document.querySelectorAll(config.jobListSelector);
                if (currentJobs.length !== lastJobCount) {
                    logger.log('回退方案检测到职位数量变化:', lastJobCount, '->', currentJobs.length);
                    lastJobCount = currentJobs.length;
                    processCompanyList();
                }
            } catch (error) {
                logger.error('回退方案检查失败:', error);
            }
        }, 3000);

        // 清理定时器
        setTimeout(() => {
            clearInterval(checkInterval);
            observer.disconnect();
        }, 300000);

        logger.log('回退数据捕获方案已设置');
    }

    // 监听来自页面上下文的API数据消息
    window.addEventListener('message', function (event) {
        if (event.source !== window || event.data.type !== 'NIUNIU_API_DATA') {
            return;
        }

        logger.log('✅ 收到API数据消息:', event.data.url);
        logger.log('原始数据:', event.data.data);

        try {
            const processedData = processJobData(event.data.url, event.data.data);
            if (processedData && processedData.length > 0) {
                // 更新全局apiData
                apiData = processedData;
                logger.log('✅ API数据处理成功，数据长度:', apiData.length);
                logger.log('首条数据示例:', apiData[0]);

                // 处理页面，避免重复处理
                setTimeout(() => {
                    if (!isProcessingJobs) {
                        processCompanyList();
                    }
                }, 100);
            } else {
                logger.warn('❌ API数据处理后为空');
                logger.log('原始数据结构:', event.data.data);
            }
        } catch (error) {
            logger.error('❌ 处理API数据时出错:', error);
            logger.log('错误详情:', error.stack);
            logger.log('原始数据:', event.data.data);
        }
    });

    logger.log('🛠️ API拦截器已启动，开始监听消息');

    // 添加全局测试函数，方便调试
    window.niuniuTestApiData = function () {
        console.log(`[${SCRIPT_NAME}] 📊 当前API数据状态:`);
        console.log(`  当前网站: ${currentHost}`);
        console.log(`  API模式:`, config?.apiPatterns);
        console.log(`  已获取的API数据数量:`, apiData ? apiData.length : 0);
        
        if (apiData && apiData.length > 0) {
            console.log(`  首条数据示例:`, apiData[0]);
            console.log(`  末条数据示例:`, apiData[apiData.length - 1]);
        }
        
        // 检查DOM中的职位数量
        const jobElements = document.querySelectorAll(config.jobListSelector);
        console.log(`  DOM中的职位元素数量: ${jobElements.length}`);
        console.log(`  已处理的元素数量: ${processedJobElements.size}`);
        
        return {
            currentHost,
            apiPatterns: config?.apiPatterns,
            apiDataCount: apiData ? apiData.length : 0,
            domJobCount: jobElements.length,
            processedCount: processedJobElements.size,
            apiData: apiData
        };
    };

    // 添加手动触发处理的函数
    window.niuniuManualProcess = function () {
        console.log(`[${SCRIPT_NAME}] 🔄 手动触发处理:`);
        console.log(`  当前网站: ${currentHost}`);
        console.log(`  API数据数量:`, apiData ? apiData.length : 0);
        
        // 强制重新处理
        isProcessingJobs = false;
        processedJobElements.clear();
        processCompanyList();
    };

    // 添加API拦截测试函数
    window.niuniuTestApiInterception = function () {
        console.log(`[${SCRIPT_NAME}] 🔍 测试API拦截功能:`);
        console.log(`  当前网站: ${currentHost}`);
        console.log(`  API模式:`, config?.apiPatterns);
        console.log(`  已获取的API数据数量:`, apiData ? apiData.length : 0);
        
        if (apiData && apiData.length > 0) {
            console.log(`  首条数据示例:`, apiData[0]);
        }

        // 重新注入API拦截器
        if (config && config.apiPatterns && config.apiPatterns.length > 0) {
            console.log('🔄 重新注入API拦截器...');
            injectApiInterceptor();
        } else {
            console.log('⚠️ 当前网站不支持API拦截');
        }
    };
    
    // 添加清理函数
    window.niuniuClearProcessed = function () {
        console.log(`[${SCRIPT_NAME}] 清理已处理记录:`);
        processedJobElements.clear();
        
        // 清理DOM中的已处理标记
        const processedElements = document.querySelectorAll('[data-processed="true"]');
        processedElements.forEach(el => {
            el.removeAttribute('data-processed');
        });
        
        // 清理信息层
        const infoLayers = document.querySelectorAll('.niuniu_job-info-layer');
        infoLayers.forEach(layer => {
            layer.remove();
        });
        
        console.log(`  清理了 ${processedElements.length} 个已处理元素和 ${infoLayers.length} 个信息层`);
    };

    // 定期检查设置是否有变化（仅在调试模式下）
    setInterval(() => {
        if (DEBUG) {
            chrome.storage.sync.get(['debugMode'], (result) => {
                if (result.debugMode !== DEBUG) {
                    console.log(`[${SCRIPT_NAME}] 检测到设置不同步，重新加载设置`);
                    loadUserSettings();
                }
            });
        }
    }, 30000); // 30秒检查一次

    // ==================== 辅助函数 ====================

    function isTargetApi(url) {
        if (!config.apiPatterns || !Array.isArray(config.apiPatterns)) {
            return false;
        }

        return config.apiPatterns.some(pattern => {
            const isMatch = url.includes(pattern);
            if (isMatch) {
                logger.log('API匹配成功:', pattern, '在URL:', url);
            }
            return isMatch;
        });
    }

function processJobData(url, data) {
    try {
        if (currentHost === 'we.51job.com') {
            return process51JobData(url, data);
        } else if (currentHost === 'www.zhipin.com') {
            try {
                let urlObj = url.startsWith('http') ? new URL(url) : new URL(url, window.location.origin);
                const pageParam = urlObj.searchParams.get('page');
                const page = pageParam ? parseInt(pageParam) : 1;

                if (page === 1) {
                    logger.log('检测到第一页数据，清空历史数据');
                    apiData = [];
                }
            } catch (urlError) {
                logger.error('URL解析失败:', urlError);
            }

            return processBossData(url, data);
        }
        logger.warn('未知的网站类型:', currentHost);
        return [];
    } catch (error) {
        logger.error('处理职位数据失败:', error);
        return [];
    }
}

function process51JobData(url, data) {
    logger.log('处理51job数据:', data);

    if (data && data.status === "1" && data.resultbody?.job?.items) {
        logger.log('✅ 成功解析到', data.resultbody.job.items.length, '条51job职位数据');
        return data.resultbody.job.items;
    }

    // 尝试其他可能的数据结构
    if (data && data.resultbody && data.resultbody.job && data.resultbody.job.items) {
        logger.log('✅ 备用解析成功，获得', data.resultbody.job.items.length, '条职位数据');
        return data.resultbody.job.items;
    }

    logger.warn('❌ 51job API数据格式不正确:', data);
    return [];
}

function processBossData(url, data) {
    logger.log('处理BOSS直聘数据:', data);

    // 处理主要的搜索结果API
    if (data && data.message === "Success" && data.zpData && data.zpData.jobList) {
        logger.log('✅ 成功解析到', data.zpData.jobList.length, '条BOSS直聘职位数据');
        let joblist = data.zpData.jobList;
        
        // 处理分页数据的累积（与油猴脚本版本保持一致）
        if (apiData && apiData.length > 0) {
            let currentMaxIndex = Math.max(...apiData.map(item => item.index || 0));
            joblist.forEach((job, idx) => {
                job.index = currentMaxIndex + idx + 1;
            });
            apiData.push(...joblist);
            logger.log('✅ 分页数据累积，当前总数:', apiData.length);
            return apiData;
        } else {
            // 第一页数据
            joblist.forEach((job, idx) => {
                job.index = idx;
            });
            logger.log('✅ 第一页数据初始化，数量:', joblist.length);
            return joblist;
        }
    }

    // 处理其他可能的数据结构
    if (data && data.zpData && data.zpData.jobList) {
        logger.log('✅ 备用解析成功，获得', data.zpData.jobList.length, '条职位数据');
        let joblist = data.zpData.jobList;
        joblist.forEach((job, idx) => {
            job.index = idx;
        });
        return joblist;
    }

    // 处理直接返回jobList的情况
    if (data && Array.isArray(data.jobList)) {
        logger.log('✅ 直接jobList解析成功，获得', data.jobList.length, '条职位数据');
        let joblist = data.jobList;
        joblist.forEach((job, idx) => {
            job.index = idx;
        });
        return joblist;
    }

    // 处理data直接是数组的情况
    if (data && Array.isArray(data)) {
        logger.log('✅ 数组数据解析成功，获得', data.length, '条职位数据');
        data.forEach((job, idx) => {
            job.index = idx;
        });
        return data;
    }

    // 处理嵌套结构
    if (data && data.result && data.result.jobList) {
        logger.log('✅ 嵌套结果解析成功，获得', data.result.jobList.length, '条职位数据');
        let joblist = data.result.jobList;
        joblist.forEach((job, idx) => {
            job.index = idx;
        });
        return joblist;
    }

    logger.warn('❌ BOSS直聘 API数据格式不正确:', data);
    return [];
}

function createCompanyQueryLayer(companyName) {
    const layer = document.createElement('div');
    layer.className = 'niuniu_company-query-layer';

    // 创建主按钮
    const mainBtn = createMainButton(companyName);
    layer.appendChild(mainBtn);

    // 创建弹出层
    const popup = createPopupMenu(companyName);
    layer.appendChild(popup);

    // 绑定事件
    bindPopupEvents(layer, mainBtn, popup, companyName);

    return layer;
}

function createMainButton(companyName) {
    const btn = document.createElement('span');
    btn.className = 'niuniu_company-query-btn';
    btn.textContent = '🔍 牛牛查公司';
    btn.title = '查询公司信息: ' + companyName;
    return btn;
}

function createPopupMenu(companyName) {
    const popup = document.createElement('div');
    popup.className = 'niuniu_query-popup';

    QUERY_SERVICES.forEach(service => {
        const link = document.createElement('a');
        link.href = service.url + encodeURIComponent(companyName);
        link.target = '_blank';
        link.textContent = service.name;
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            window.open(link.href, '_blank');
            hidePopup(popup);
        });
        popup.appendChild(link);
    });

    return popup;
}

function bindPopupEvents(layer, btn, popup, companyName) {
    let hideTimeout;

    // 主按钮点击事件
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.open(QUERY_SERVICES[0].url + encodeURIComponent(companyName), '_blank');
    });

    // 鼠标悬停显示弹出层
    btn.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
        showPopup(popup);
    });

    // 鼠标离开延迟隐藏
    layer.addEventListener('mouseleave', () => {
        hideTimeout = setTimeout(() => hidePopup(popup), 300);
    });

    // 鼠标进入取消隐藏
    layer.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
    });
}

function showPopup(popup) {
    popup.classList.add('show');
}

function hidePopup(popup) {
    popup.classList.remove('show');
}



function calculateDaysDifference(date) {
    try {
        let inputDate = parseDate(date);

        if (!inputDate || isNaN(inputDate.getTime())) {
            logger.warn('无效的日期输入:', date);
            return 0;
        }

        const today = new Date();
        // 标准化时间到当天凌晨
        inputDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = today - inputDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays < 0 ? 0 : diffDays; // 处理未来日期情况
    } catch (error) {
        logger.error('计算日期差值失败:', error);
        return 0;
    }
}

function parseDate(date) {
    if (date instanceof Date) {
        return new Date(date);
    }

    if (typeof date === 'number') {
        return new Date(date);
    }

    if (typeof date === 'string') {
        return parseStringDate(date.trim());
    }

    return null;
}

function parseStringDate(dateStr) {
    if (!dateStr) return null;

    // 尝试直接解析
    let inputDate = new Date(dateStr);
    if (!isNaN(inputDate.getTime())) {
        return inputDate;
    }

    // 尝试提取日期部分
    const datePart = dateStr.split(/[ ,TZ]/)[0].replace(/[^\d-]/g, '');
    inputDate = new Date(datePart);

    if (!isNaN(inputDate.getTime())) {
        return inputDate;
    }

    // 尝试标准化分隔符
    const normalizedDate = datePart.replace(/[\/./]/g, '-');
    inputDate = new Date(normalizedDate);

    if (!isNaN(inputDate.getTime())) {
        return inputDate;
    }

    // 尝试重建日期格式
    return reconstructDate(datePart);
}

function reconstructDate(datePart) {
    const digits = datePart.match(/\d+/g);
    if (!digits || digits.length < 3) {
        return null;
    }

    let year, month, day;

    if (digits[0].length === 4) {
        [year, month, day] = digits;
    } else if (digits[2].length === 4) {
        [month, day, year] = digits;
    } else {
        [year, month, day] = digits;
    }

    const reconstructedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    let inputDate = new Date(reconstructedDate);

    // 如果日期无效，尝试交换月和日
    if (isNaN(inputDate.getTime())) {
        const swappedDate = `${year}-${day.padStart(2, '0')}-${month.padStart(2, '0')}`;
        inputDate = new Date(swappedDate);
    }

    return isNaN(inputDate.getTime()) ? null : inputDate;
}

function getDateStyle(days) {
    if (days <= 7) return DATE_COLORS.fresh;
    if (days <= 14) return DATE_COLORS.recent;
    if (days <= 60) return DATE_COLORS.normal;
    if (days <= 90) return DATE_COLORS.old;
    return DATE_COLORS.expired;
}

function processDetailPage() {
    if (currentHost === 'campus.niuqizp.com') {
        processNiuqizpDetailPage();
    }
}

function processNiuqizpDetailPage() {
    const detailContainer = document.querySelector(config.detailContentSelector);
    if (!detailContainer) {
        logger.warn('未找到详情页容器元素');
        return;
    }
    const jobmetaContainer = document.querySelector(config.detailMoreLayer);

    let companyNameStr = detailContainer.querySelector(config.detailCompanyName).textContent.trim();
    // 去除年份（2025、2026等）或招聘之后的字符
    companyNameStr = companyNameStr.replace(/(202[0-9]|招聘).*$/, '').trim();
    logger.log(`元素 ${companyNameStr}`);

    let jobData = {
        fullCompanyName: companyNameStr,
        jobTitle: null,
        degreeString: null,
        workYearString: null,
        confirmDateString: null,
        updateDateTime: null,
        jobHref: null,
        jobDescribe: null
    }
    const infoLayer = createJobInfoLayer(jobData);
    insertInfoLayer(jobmetaContainer, infoLayer);


    let hrefItems = detailContainer.querySelectorAll(config.detailOutLink);
    logger.log(`链接元素 ${hrefItems.length}`);
    hrefItems.forEach((hrefItem, index) => {
        try {
            var base64Encoded = hrefItem.getAttribute('ref');
            // 进行Base64解码
            var decodedUrl = atob(base64Encoded);

            // 移除原有的事件监听器
            const newHrefItem = hrefItem.cloneNode(true);
            hrefItem.parentNode.replaceChild(newHrefItem, hrefItem);

            // 替换文本内容和href
            newHrefItem.textContent = decodedUrl;
            newHrefItem.style = 'border-left:4px solid #4CAF50;border-radius:6px;padding:4px;margin-left:4px;';
            newHrefItem.href = decodedUrl;

            // 添加新的点击事件（直接打开链接）
            newHrefItem.addEventListener('click', function (e) {
                e.preventDefault();
                window.open(decodedUrl, '_blank');
            });

        } catch (error) {
            logger.error(`链接元素${index} Base64解码失败: ${error}`);
        }
    })
}

function processCompanyList() {
    // 防止并发处理
    if (isProcessingJobs) {
        logger.log('正在处理职位列表，跳过重复调用');
        return;
    }

    isProcessingJobs = true;

    try {
        // 过滤掉我们自己创建的元素
        const allJobItems = document.querySelectorAll(config.jobListSelector);
        const jobItems = Array.from(allJobItems).filter(item => !isScriptElement(item));

        logger.log('DOM找到', allJobItems.length, '个元素，过滤后', jobItems.length, '个职位项目');

        let processedCount = 0;
        let skippedCount = 0;

        jobItems.forEach((jobElement, index) => {
            try {
                // 使用元素的唯一标识符
                const elementId = getElementId(jobElement);

                if (processedJobElements.has(elementId) || shouldSkipElement(jobElement, index)) {
                    skippedCount++;
                    return;
                }

                const jobData = getJobData(index, jobElement);
                if (!jobData) {
                    logger.warn(`第${index}个职位没有数据`);
                    return;
                }

                logger.log(`处理职位 ${index}: ${jobData.fullCompanyName}`);

                const infoLayer = createJobInfoLayer(jobData);
                insertInfoLayer(jobElement, infoLayer);

                markElementAsProcessed(jobElement);
                processedJobElements.add(elementId);
                processedCount++;

                logger.log(`元素 ${index} 处理完成`);
            } catch (error) {
                logger.error(`处理元素 ${index} 时出错:`, error);
            }
        });

        processCount++;

        if (processedCount > 0) {
            lastSuccessfulProcess = Date.now();
            logger.log(`处理完成 #${processCount}: 新处理 ${processedCount} 个，跳过 ${skippedCount} 个`);
        } else {
            logger.log(`处理完成 #${processCount}: 无新职位，跳过 ${skippedCount} 个`);

            // 如果连续多次没有新职位，减少处理频率
            if (processCount % 5 === 0) {
                logger.log('连续多次无新职位，建议检查页面状态');
            }
        }
    } finally {
        isProcessingJobs = false;
    }
}

function getElementId(element) {
    // 生成元素的唯一标识符
    if (element.id) return element.id;

    // 使用元素的文本内容和位置生成ID
    const text = element.textContent.trim().substring(0, 50);
    const rect = element.getBoundingClientRect();
    return `${text}_${rect.top}_${rect.left}`.replace(/\s+/g, '_');
}

function shouldSkipElement(element, index) {
    // 检查是否已标记为处理过
    if (element.dataset.processed) {
        logger.log(`元素 ${index} 已处理过，跳过`);
        return true;
    }

    // 检查是否已经有信息层
    const nextElement = element.nextElementSibling;
    if (nextElement && nextElement.classList.contains('niuniu_job-info-layer')) {
        logger.log(`元素 ${index} 已有信息层，跳过`);
        // 标记为已处理
        element.dataset.processed = 'true';
        return true;
    }

    // 检查是否是我们自己创建的元素
    if (element.classList.contains('niuniu_job-info-layer') ||
        element.querySelector('.niuniu_job-info-layer')) {
        logger.log(`元素 ${index} 是脚本创建的元素，跳过`);
        return true;
    }

    return false;
}

function process51JobListData(data) {
    return {
        fullCompanyName: data['fullCompanyName'],
        jobTitle: data['jobName'],
        degreeString: data['degreeString'],
        workYearString: data['workYearString'],
        confirmDateString: data['confirmDateString'],
        updateDateTime: data['updateDateTime'],
        jobHref: data['jobHref'],
        jobDescribe: data['jobDescribe'],
    };
}

function processBossListData(data) {
    // 处理BOSS直聘数据的多种可能的字段名
    const companyName = data['brandName'] || data['companyName'] || data['company'] || data['companyFullName'] || '未知公司';
    const jobName = data['jobName'] || data['title'] || data['positionName'] || '未知职位';
    const jobDegree = data['jobDegree'] || data['degree'] || data['education'] || '';
    const jobExperience = data['jobExperience'] || data['experience'] || data['workYear'] || '';
    const salaryDesc = data['salaryDesc'] || data['salary'] || '';
    const jobLabels = data['jobLabels'] || data['labels'] || [];
    const skills = data['skills'] || [];
    const updateTime = data['updateTime'] || data['lastUpdateTime'] || data['publishTime'] || '';
    
    return {
        fullCompanyName: companyName,
        jobTitle: jobName,
        degreeString: jobDegree,
        workYearString: jobExperience,
        confirmDateString: updateTime,
        updateDateTime: updateTime,
        jobHref: data['jobUrl'] || data['url'] || '',
        jobDescribe: data['jobDesc'] || data['description'] || '',
        salaryDesc: salaryDesc,
        jobLabels: jobLabels,
        skills: skills,
        // 保留原始数据以便调试
        originalData: data
    };
}

function getJobData(index, jobElement) {
    // 优先使用API数据

    if (apiData && apiData[index]) {
        if (currentHost === 'we.51job.com') {
            return process51JobListData(apiData[index]);
        } else if (currentHost === 'www.zhipin.com') {
            return processBossListData(apiData[index]);
        }
    }

    // 如果API数据不可用，从 DOM 中提取基本信息
    logger.log(`API数据不可用，从 DOM 提取职位 ${index} 的信息`);

    try {
        const companyElement = jobElement.querySelector(config.companyNameSelector);
        const jobTitleElement = jobElement.querySelector(config.jobTitleSelector);

        const companyName = companyElement ? companyElement.textContent.trim() : `公司${index + 1}`;
        const jobTitle = jobTitleElement ? jobTitleElement.textContent.trim() : `职位${index + 1}`;

        // 创建基本数据结构
        return {
            fullCompanyName: companyName,
            jobTitle: jobTitle,
            degreeString: '',
            workYearString: '',
            confirmDateString: null,
            updateDateTime: null,
            jobHref: null,
            jobDescribe: `${companyName} - ${jobTitle}`
        };
    } catch (error) {
        logger.error(`提取职位 ${index} DOM 信息失败:`, error);
        return null;
    }
}

function createJobInfoLayer(jobData) {
    const infoLayer = document.createElement('div');
    infoLayer.className = 'niuniu_job-info-layer';
    infoLayer.dataset.niuniu = 'info-layer';
    infoLayer.dataset.timestamp = Date.now();

    // 第一行：公司查询按钮、学历经验信息和时间信息
    const mainRow = document.createElement('div');
    mainRow.className = 'niuniu_job-info-row';

    // 添加公司查询按钮
    if (jobData.fullCompanyName) {
        const queryLayer = createCompanyQueryLayer(jobData.fullCompanyName);
        mainRow.appendChild(queryLayer);
    }

    // 添加发布时间
    if (jobData.confirmDateString) {
        const daysDiff = calculateDaysDifference(jobData.confirmDateString);
        const createTimeTag = createDateTag('📅 首发', jobData.confirmDateString, daysDiff);
        mainRow.appendChild(createTimeTag);
    }

    // 添加更新时间
    if (jobData.updateDateTime) {
        const updaysDiff = calculateDaysDifference(jobData.updateDateTime);
        const updateInfo = createDateTag('🔄 更新', jobData.updateDateTime, updaysDiff);
        mainRow.appendChild(updateInfo);
    }

    // 添加学历和经验信息
    if (jobData.degreeString || jobData.workYearString) {
        const degreeInfo = createInfoTag(
            `🎓 学历: ${jobData.degreeString || '不限'} | 💼 经验: ${jobData.workYearString || '不限'}`,
            'niuniu_info-tag'
        );
        mainRow.appendChild(degreeInfo);
    }

    // 添加详情链接
    if (jobData.jobHref) {
        const detailLink = createDetailLink(jobData);
        mainRow.appendChild(detailLink);
    }

    infoLayer.appendChild(mainRow);

    // 第二行：公司标签（独立显示）
    if (jobData.fullCompanyName) {
        const companyTags = addCompanyTags(jobData.fullCompanyName);
        if (companyTags) {
            const tagsRow = document.createElement('div');
            tagsRow.className = 'niuniu_company-tags-row';
            tagsRow.appendChild(companyTags);
            infoLayer.appendChild(tagsRow);
        }
    }
    return infoLayer;
}

function createInfoTag(text, className) {
    const tag = document.createElement('span');
    tag.className = className;
    tag.textContent = text;
    return tag;
}

function createDateTag(label, dateString, daysDiff) {
    const tag = document.createElement('span');
    tag.className = 'niuniu_date-tag';
    tag.textContent = `${label}: ${dateString}`;
    tag.title = `${daysDiff}天前`;
    tag.style.background = getDateStyle(daysDiff);
    return tag;
}

function createDetailLink(jobData) {
    const link = document.createElement('a');
    link.className = 'niuniu_link';
    link.textContent = '📝 详情';
    link.href = jobData.jobHref;
    link.target = '_blank';
    link.title = jobData.jobDescribe || '查看详细信息';
    return link;
}

function insertInfoLayer(jobElement, infoLayer) {
    // 检查是否已经存在信息层，避免重复插入
    const existingLayer = jobElement.nextElementSibling;
    if (existingLayer && existingLayer.classList.contains('niuniu_job-info-layer')) {
        logger.log('信息层已存在，跳过插入');
        return;
    }

    // 检查父元素的所有子元素，确保没有重复的信息层
    const parent = jobElement.parentNode;
    const existingLayers = parent.querySelectorAll('.niuniu_job-info-layer');

    // 如果已经有信息层，检查是否是针对当前职位的
    for (let layer of existingLayers) {
        const prevElement = layer.previousElementSibling;
        if (prevElement === jobElement) {
            logger.log('发现重复的信息层，跳过插入');
            return;
        }
    }

    jobElement.parentNode.insertBefore(infoLayer, jobElement.nextSibling);
    logger.log('信息层已插入');
}

function markElementAsProcessed(element) {
    element.dataset.processed = 'true';
}

function initProcessWithRetry(retryCount = 0) {
    try {
        // 设置全局错误处理
        setupGlobalErrorHandling();

        setTimeout(() => {
            const testElement = document.querySelector(config.companyNameSelector);
            if (testElement || retryCount >= initConfig.maxInitialRetries) {
                processPage();
                logger.log(`初始化处理完成，重试次数: ${retryCount}`);
            } else {
                logger.log(`未检测到目标元素，将在${initConfig.retryInterval}ms后重试(${retryCount + 1}/${initConfig.maxInitialRetries})`);
                initProcessWithRetry(retryCount + 1);
            }
        }, initConfig.initialLoadDelay);
    } catch (error) {
        logger.error('初始化处理失败:', error);
    }
}

function processPage() {
    try {
        logger.log('开始处理页面...');

        if (currentHost === 'campus.niuqizp.com') {
            processDetailPage();
        } else {
            processCompanyList();

            // 延迟启动MutationObserver，避免初始化时的干扰
            setTimeout(() => {
                setupMutationObserver();
            }, 3000);
        }

    } catch (error) {
        logger.error('处理页面时发生错误:', error);
    }
}

function isScriptOwnChange(mutation) {
    // 检查添加的节点
    if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (let node of mutation.addedNodes) {
            if (node.nodeType === 1) {
                // 检查是否是我们的元素
                if (isScriptElement(node)) {
                    return true;
                }

                // 检查是否包含我们的元素
                if (node.querySelector && node.querySelector('[class*="niuniu_"]')) {
                    return true;
                }
            }
        }
    }

    // 检查移除的节点
    if (mutation.removedNodes && mutation.removedNodes.length > 0) {
        for (let node of mutation.removedNodes) {
            if (node.nodeType === 1 && isScriptElement(node)) {
                return true;
            }
        }
    }

    // 检查目标元素
    if (mutation.target && mutation.target.nodeType === 1) {
        if (isScriptElement(mutation.target) ||
            mutation.target.closest('[class*="niuniu_"]')) {
            return true;
        }
    }

    return false;
}

function isScriptElement(element) {
    if (!element) return false;

    // 检查类名是否包含脚本标识
    if (element.className) {
        const className = element.className;
        if (typeof className === 'string' && className.includes('niuniu_')) {
            return true;
        }
    }

    // 检查是否有data-niuniu属性
    if (element.dataset && element.dataset.niuniu) {
        return true;
    }

    // 检查ID是否包含脚本标识
    if (element.id && element.id.includes('niuniu_')) {
        return true;
    }

    return false;
}

function setupMutationObserver() {
    logger.log('🚀 设置智能监听策略...');

    // 优先监听翻页元素，避免监听职位容器
    setupPaginationObserver();

    // 监听URL变化
    setupUrlChangeObserver();

    // 作为备用，监听职位容器（但使用更严格的条件）
    //setupJobContainerObserver();

    // 添加Intersection Observer作为补充
    //setupIntersectionObserver();

    // 监听状态报告
    setTimeout(() => {
        reportMonitoringStatus();
    }, 5000);
}

function setupPaginationObserver() {
    if (!config.paginationSelector) {
        logger.log('未配置翻页选择器，跳过翻页监听');
        return;
    }

    const paginationElement = document.querySelector(config.paginationSelector);
    if (!paginationElement) {
        logger.log('未找到翻页元素:', config.paginationSelector);
        return;
    }

    logger.log('✅ 找到翻页元素，开始监听:', config.paginationSelector);

    const paginationObserver = new MutationObserver((mutations) => {
        if (isProcessingJobs) return;

        let hasPageChange = false;

        mutations.forEach(mutation => {
            // 监听翻页元素的变化
            if (mutation.type === 'childList' ||
                (mutation.type === 'attributes' &&
                    (mutation.attributeName === 'class' || mutation.attributeName === 'data-page'))) {
                hasPageChange = true;
            }
        });

        if (hasPageChange) {
            logger.log('🔄 翻页监听：检测到页面变化，延迟处理新职位');
            setTimeout(() => {
                processCompanyList();
            }, 1000); // 等待页面加载完成
        }
    });

    paginationObserver.observe(paginationElement, {
        childList: true,
        attributes: true,
        subtree: true
    });

    logger.log('✅ 翻页监听已启动');

    // 测试翻页元素点击
    const pageLinks = paginationElement.querySelectorAll('a, button, [data-page]');
    if (pageLinks.length > 0) {
        logger.log(`📄 发现 ${pageLinks.length} 个翻页链接/按钮`);

        pageLinks.forEach((link, index) => {
            link.addEventListener('click', () => {
                logger.log(`🖱️ 翻页点击：第 ${index + 1} 个翻页元素被点击`);
                setTimeout(() => {
                    processCompanyList();
                }, 1000);
            });
        });
    }
}

function setupUrlChangeObserver() {
    let currentUrl = window.location.href;

    // 监听浏览器历史变化
    window.addEventListener('popstate', () => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            logger.log('🌐 URL监听：检测到popstate变化，处理新页面');
            setTimeout(() => {
                processCompanyList();
            }, 1000);
        }
    });

    // 监听pushState和replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
        originalPushState.apply(this, args);
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            logger.log('🌐 URL监听：检测到pushState变化，处理新页面');
            setTimeout(() => {
                processCompanyList();
            }, 1500);
        }
    };

    history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            logger.log('🌐 URL监听：检测到replaceState变化，处理新页面');
            setTimeout(() => {
                processCompanyList();
            }, 1500);
        }
    };

    logger.log('✅ URL变化监听已启动');
}

function setupJobContainerObserver() {
    let targetNode = document.querySelector(config.waitForElement);

    if (!targetNode) {
        logger.warn('未找到职位容器元素:', config.waitForElement);
        return;
    }

    logger.log('⚠️ 设置职位容器监听（备用方案）:', config.waitForElement);

    let lastProcessTime = 0;
    const PROCESS_COOLDOWN = 1000; // 1秒冷却时间，避免频繁触发

    const containerObserver = new MutationObserver((mutations) => {
        if (isProcessingJobs) return;

        const now = Date.now();
        if (now - lastProcessTime < PROCESS_COOLDOWN) {
            return;
        }

        let hasSignificantChange = false;

        mutations.forEach(mutation => {
            // 只关注大量新增节点，忽略小的变化
            if (mutation.type === 'childList' &&
                mutation.addedNodes.length > 8 && // 至少8个新节点
                !isScriptOwnChange(mutation)) {
                hasSignificantChange = true;
            }
        });

        if (hasSignificantChange) {
            logger.log('📦 容器监听：检测到显著变化');
            lastProcessTime = now;
            setTimeout(() => {
                processCompanyList();
            }, 2000);
        }
    });

    containerObserver.observe(targetNode, {
        childList: true,
        subtree: false // 只监听直接子元素，减少干扰
    });

    logger.log('✅ 职位容器监听已启动（备用）');
}

function setupIntersectionObserver() {
    if (!window.IntersectionObserver) {
        logger.warn('浏览器不支持IntersectionObserver');
        return;
    }

    const intersectionObserver = new IntersectionObserver((entries) => {
        let hasNewVisibleJobs = false;

        entries.forEach(entry => {
            if (entry.isIntersecting && entry.target.matches(config.jobListSelector)) {
                const elementId = getElementId(entry.target);
                if (!processedJobElements.has(elementId) && !isScriptElement(entry.target)) {
                    hasNewVisibleJobs = true;
                }
            }
        });

        if (hasNewVisibleJobs && !isProcessingJobs) {
            logger.log('IntersectionObserver检测到新的可见职位');
            processCompanyList();
        }
    }, {
        root: null,
        rootMargin: '50px',
        threshold: 0.1
    });

    // 观察现有的职位元素
    const existingJobs = document.querySelectorAll(config.jobListSelector);
    existingJobs.forEach(job => {
        if (!isScriptElement(job)) {
            intersectionObserver.observe(job);
        }
    });

    // 减少检查频率，避免过度处理
    setInterval(() => {
        if (!isProcessingJobs) {
            const allJobs = document.querySelectorAll(config.jobListSelector);
            let newJobsCount = 0;
            allJobs.forEach(job => {
                if (!isScriptElement(job) && !job.dataset.observing) {
                    intersectionObserver.observe(job);
                    job.dataset.observing = 'true';
                    newJobsCount++;
                }
            });
            if (newJobsCount > 0) {
                logger.log(`👁️ IntersectionObserver：添加了 ${newJobsCount} 个新元素的观察`);
            }
        }
    }, 30000); // 30秒检查一次，减少频率

    logger.log('✅ IntersectionObserver监听可见职位');
}

function reportMonitoringStatus() {
    logger.log('📊 监听状态报告:');

    // 检查翻页元素
    const paginationElement = document.querySelector(config.paginationSelector || 'none');
    logger.log(`  📄 翻页监听: ${paginationElement ? '✅ 活跃' : '❌ 未找到元素'}`);

    // 检查URL监听
    logger.log(`  🌐 URL监听: ✅ 活跃`);

    // 检查容器监听
    const containerElement = document.querySelector(config.waitForElement);
    logger.log(`  📦 容器监听: ${containerElement ? '✅ 备用活跃' : '❌ 未找到元素'}`);

    // 检查IntersectionObserver
    logger.log(`  👁️ 可见性监听: ${window.IntersectionObserver ? '✅ 活跃' : '❌ 不支持'}`);

    // 统计信息
    logger.log(`  📈 已处理职位: ${processedJobElements.size} 个`);
    logger.log(`  🔄 处理次数: ${processCount} 次`);

    const currentJobs = document.querySelectorAll(config.jobListSelector);
    const scriptElements = Array.from(currentJobs).filter(job => isScriptElement(job));
    logger.log(`  📋 当前页面: ${currentJobs.length} 个元素 (${scriptElements.length} 个脚本元素)`);
}

// ==================== 初始化 ====================

// 由于使用document_start，需要等待DOM加载完成
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        logger.log('DOM已加载，准备启动脚本...');
        initializeScript();
    });
} else {
    logger.log('DOM已就绪，立即启动脚本...');
    initializeScript();
}

function initializeScript() {
    // 等待jQuery加载
    if (typeof $ === 'undefined') {
        setTimeout(initializeScript, 100);
        return;
    }

    logger.log('jQuery已加载，开始初始化...');

    // 重新加载设置，确保使用最新的设置
    loadUserSettings().then(() => {
        setTimeout(() => {
            initProcessWithRetry();
        }, 1000);
    });
}

}) ();
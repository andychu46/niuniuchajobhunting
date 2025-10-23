// 牛牛查求职助手 - 统一配置文件

// 网站配置对象，存储不同网站的选择器和API信息
const SITE_CONFIGS = {
    'we.51job.com': {
        companyNameSelector: '.joblist-item-bot .bl > a',
        jobListSelector: '.joblist-item > div',
        jobTitleSelector: '.joblist-item-top > .jname',
        hrInfoSelector: '.chat',
        apiPatterns: [
            '/api/job/search-pc'
        ],
        waitForElement: 'div.joblist',
        paginationSelector: '.bottom-page, .p_in, .pagination',
        enableUrlChangeMonitoring: true,
        companyNameFromElement: function (el) { return el.textContent.trim(); }
    },
    'www.zhipin.com': {
        companyNameSelector: '.job-card-footer > .boss-info > .boss-name',
        jobListSelector: '.job-card-box',
        jobTitleSelector: '.job-name',
        hrInfoSelector: '.info-company .info-public, .job-author .name',
        apiPatterns: [
            '/wapi/zpgeek/search/joblist.json',
            '/wapi/zpgeek/pc/recommend/job/list.json'
        ],
        waitForElement: '.recommend-result-job.clearfix',
        paginationSelector: '.recommend-result-job.clearfix',
        enableUrlChangeMonitoring: true,
        companyNameFromElement: function (el) { return el.textContent.trim(); }
    },
    'campus.niuqizp.com': {
        companyNameSelector: '.detail-title-campus',
        jobListSelector: '',
        jobTitleSelector: '.job-name',
        hrInfoSelector: '',
        apiPatterns: [],
        waitForElement: '.job-detail',
        detailContentSelector: '.job-detail',
        detailMoreLayer: '.job-meta',
        detailCompanyName: '.detail-title-campus',
        detailOutLink: 'a.jshow_link_c',
        enableUrlChangeMonitoring: false,
        companyNameFromElement: function (el) { return el.textContent.trim(); }
    }
};

// 默认公司黑名单数据库
const DEFAULT_COMPANY_BLACKLISTS = {
    // 诈骗公司名单
    scam: {
        name: '诈骗',
        emoji: '⚠️',
        color: '#FF5722', // 红色警告
        companies: [
            '华安', '虚假投资', '假冒银行',
            '假冒政府', '假冒公安', '假冒快递', '假冒客服', '刷单诈骗',
            '贷款诈骗', '兼职诈骗', '投资诈骗', '理财诈骗', '炒股诈骗',
            '外汇诈骗', '期货诈骗', '比特币诈骗', '虚拟货币诈骗',
            '网恋诈骗', '交友诈骗', '婚恋诈骗', '征婚诈骗'
        ]
    },

    // 外包公司名单
    outsourcing: {
        name: '外包',
        emoji: '🔄',
        color: '#FF9800', // 橙色提醒
        companies: [
            "软通动力", "中软国际", "中科软文", "博彦科技", "易思博",
            "润和软件", "佰钧成", "睿服科技", "亿达信", "微创软件",
            "招银云创", "拓维云创", "华为od", "德科信息", "外企德科",
            "深劳人力", "拓保软件", "法本信息", "腾云悦智", "腾云忆想",
            "汇合发展", "神州信息", "网新新思", "东华软件", "音佇自联想云领",
            "金证科技", "平安金服", "前海金信", "中盛瑞达", "东软集团",
            "格创东智", "安韦尔", "奥博特", "汉克时代", "易宝软件",
            "讯方技术股份", "四川准达", "诚迈科技", "柯莱特集团", "联愬利泰",
            "神州新桥", "神州数码", "科锐国际麦亚信", "青橄榄", "马衡达",
            "京北方", "四方精创", "宇信科技", "橙色魔方", "华通科技",
            "文思海辉", "海隆软件", "启明软件", "神州信息", "神州数码",
            "神州泰岳", "神州通誉", "亚信联创", "法本信息", "上海中和",
            "纬创软件", "中软国际", "软通动力", "柯莱特", "上海新致软件",
            "上海晟欧", "浪潮软件", "北京汉克时代", "博彦科技", "大连华信",
            "信华信", "华信泛亚信息技术", "同方鼎欣", "易思博", "迪原创新",
            "中讯软件", "睿服科技", "晟峰软件", "卓越际联", "杭州颐和科技",
            "恒生电子", "联和利泰", "阳光雨露", "宏智科技", "华道数据处理",
            "北京中恒博瑞", "江苏欧索软件", "经纬国际", "北京护航", "杭州七凌科技",
            "北京华胜天成", "北京尖峰", "北京开运联合", "亿达信息", "立思辰科技",
            "赛迪通呼叫中心", "盛安德", "泛微软件", "新聚思", "在信汇通",
            "中科创达", "博朗软件", "创博国际", "华拓数码", "大宇宙信息",
            "大展科技", "第一线安莱", "东南融通", "福瑞博德", "富基融通",
            "富士通信息", "某德软件", "广东迅维", "九城关贸", "武汉佰钧",
            "开运联合", "联迪恒星", "联合信息", "凌志软件", "普联软件",
            "千方科技", "日电卓越", "赛科斯", "北明全程物流", "中盈蓝海",
            "上海海隆", "杭州斯凯网络", "四川汉科", "索迪斯", "通动力信息",
            "通邮集团", "万国数据服务", "上海微创软件", "西安诺赛软件", "西安炎兴",
            "新宇软件", "信必优", "信雅达", "药明康德", "音泰思",
            "英极软件开发", "北京永新视博", "北京灵信互动", "中网在线", "中创软件",
            "宇信易诚", "浙大网新"
        ]
    },

    // 培训公司名单
    training: {
        name: '培训',
        emoji: '📚',
        color: '#2196F3', // 蓝色信息
        companies: [
            '达内', '传智播客', '黑马程序员', '尚硅谷', '千锋教育',
            '动力节点', '马士兵教育', '咕泡学院', '拉勾教育', '开课吧',
            '极客时间', '慕课网', '实验楼', 'CSDN学院', '51CTO学院',
            '腾讯课堂', '网易云课堂', '中公教育', '华图教育', '粉笔教育',
            '高顿教育', '尚德机构', '环球网校', '新东方在线', '学而思网校',
            '猿辅导', '作业帮', 'VIPKID', '掌门1对1', '跟谁学',
            '火花思维', '豌豆思维', '编程猫', '小码王', '核桃编程',
            '优就业', 'IT培训', '软件培训', '编程培训', '计算机培训',
            '互联网培训', 'Java培训', 'Python培训', '前端培训', 'UI培训',
            '测试培训', '运维培训', '大数据培训', '人工智能培训', '区块链培训'
        ]
    },

    // 自定义警告名单
    custom: {
        name: '自定义',
        emoji: '🚨',
        color: '#9C27B0', // 紫色自定义
        companies: [
            '996公司', '福报公司', '无薪加班', '克扣工资', '拖欠工资',
            '无五险一金', '试用期陷阱', '霸王条款', '违法解约',
            '虚假宣传', '夸大职位', '低薪高要求', '频繁加班'
        ]
    }
};

// 查询服务配置
const QUERY_SERVICES = [
    { name: '🔍 百度', url: 'https://www.baidu.com/s?wd=' },
    { name: '👁️ 天眼查', url: 'https://www.tianyancha.com/search?key=' },
    { name: '📊 爱企查', url: 'https://aiqicha.baidu.com/s?t=0&q=' },
    { name: '🏢 企查查', url: 'https://www.qcc.com/web/search?key=' }
];

// 日期颜色配置
const DATE_COLORS = {
    fresh: '#4CAF50',    // 7天内-绿色
    recent: '#2196F3',   // 14天内-蓝色  
    normal: '#FFC107',   // 2个月内-黄色
    old: '#F44336',      // 3个月内-红色
    expired: '#9E9E9E'   // 3个月以上-灰色
};

// 初始化配置
const INIT_CONFIG = {
    initialLoadDelay: 1500,     // 初始加载延迟(ms)
    enableApiInterception: true, // 是否启用API拦截
    maxInitialRetries: 3,       // 最大初始重试次数
    retryInterval: 1000         // 重试间隔(ms)
};

// 导出配置（如果在模块环境中）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SITE_CONFIGS,
        DEFAULT_COMPANY_BLACKLISTS,
        QUERY_SERVICES,
        DATE_COLORS,
        INIT_CONFIG
    };
}
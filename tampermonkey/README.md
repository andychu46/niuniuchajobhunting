# 🏷️ 牛牛查求职助手

<p align="center">
  <img src="https://img.shields.io/badge/version-1.1-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/platform-Tampermonkey-orange.svg" alt="Platform">
  <img src="https://img.shields.io/badge/supported-多招聘平台-brightgreen.svg" alt="Support">
</p>

<p align="center">
  <b>智能招聘信息增强工具 - 让求职更安全、更高效</b>
</p>

## 📝 项目简介

牛牛查求职助手是一款专为求职者设计的浏览器油猴脚本，旨在为招聘网站提供强大的信息增强功能。通过智能识别和数据补充，帮助求职者更好地了解公司信息，识别潜在风险，提高求职成功率。

## ✨ 核心功能

### 🏷️ 公司标签系统
- **⚠️ 诈骗公司识别** - 红色警告标签，自动识别已知诈骗公司
- **🔄 外包公司标记** - 橙色提醒标签，帮助了解工作性质
- **📚 培训机构识别** - 蓝色信息标签，识别培训转岗机构
- **🚨 自定义标签** - 紫色标记，支持个性化公司标记

### 🔍 公司信息查询
- **一键查询** - 快速跳转至天眼查、爱企查、企查查等平台
- **多平台支持** - 集成百度搜索、工商信息查询等多个渠道
- **便捷操作** - 鼠标悬停显示查询选项，点击直接跳转

### 📅 职位时间追踪
- **首发时间显示** - 显示职位最初发布时间
- **更新时间追踪** - 跟踪职位信息更新记录
- **颜色编码** - 用不同颜色标识职位新鲜度
  - 🟢 7天内：新鲜职位
  - 🔵 14天内：较新职位
  - 🟡 2个月内：一般职位
  - 🔴 3个月内：较旧职位
  - ⚫ 3个月以上：过期职位

### 💼 职位详情增强
- **学历要求显示** - 自动提取并显示学历要求
- **工作经验标注** - 清晰展示经验要求
- **职位描述预览** - 快速浏览职位详细信息

### 🔗 链接智能解码
- **加密链接解码** - 自动解码Base64等加密链接
- **真实地址显示** - 显示链接的真实目标地址
- **安全访问** - 新窗口打开，保护主页面安全

## 🌍 支持平台

| 平台 | 支持状态 | 功能完整度 |
|------|----------|------------|
| 前程无忧 ([51job.com](https://www.51job.com)) | ✅ 完全支持 | 🌟🌟🌟🌟🌟 |
| BOSS直聘 ([zhipin.com](https://www.zhipin.com)) | ✅ 完全支持 | 🌟🌟🌟🌟🌟 |
| 牛企直聘 ([niuqizp.com](https://www.niuqizp.com)) | ✅ 完全支持 | 🌟🌟🌟🌟⭐ |

## 🚀 快速开始

### 安装步骤

1. **安装Tampermonkey**
   - [Chrome浏览器](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox浏览器](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - [Edge浏览器](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. **安装脚本**
   ```bash
   # 方式一：直接安装（推荐）
   点击：[安装脚本](https://github.com/andychu46/niuniuchajobhunting/raw/main/tampermonkey/%E7%89%9B%E7%89%9B%E6%9F%A5%E6%B1%82%E8%81%8C%E5%8A%A9%E6%89%8B-%E6%8B%9B%E8%81%98%E7%BD%91%E7%AB%99%E4%BF%A1%E6%81%AF%E5%A2%9E%E5%BC%BA%E5%B7%A5%E5%85%B7.user.js)
   
   # 方式二：手动安装
   1. 复制 tampermonkey/牛牛查求职助手-招聘网站信息增强工具.user.js 文件内容
   2. 在Tampermonkey中创建新脚本
   3. 粘贴代码并保存

   # 方式三：脚本站安装
   1. https://www.tampermonkey.net/ ,https://greasyfork.org/ ,https://openuserjs.org/
   2. 搜索"牛牛查求职助手"
   3. 粘贴代码并保存 
   ```

3. **开始使用**
   - 访问支持的招聘网站
   - 脚本将自动运行并显示增强信息
   - 点击右下角的🏷️按钮查看功能介绍

### 使用说明

1. **查看公司标签**
   - 在职位列表中自动显示公司风险标签
   - 点击标签查看详细信息和风险说明

2. **查询公司信息**
   - 点击"🔍 牛牛查公司"按钮
   - 选择查询平台（天眼查、爱企查等）
   - 新窗口打开查询结果

3. **查看职位时间**
   - 职位信息区域显示发布和更新时间
   - 颜色编码帮助识别职位新鲜度

## 🛠️ 开发信息

### 技术栈
- **JavaScript** - 核心脚本语言
- **Tampermonkey API** - 浏览器扩展接口
- **CSS3** - 样式美化
- **DOM操作** - 页面元素增强

### 项目结构
```
niuniuchajobhunting/
├── tampermonkey/
│   └── icons/                                      # 图标
│   └── screenshot/                                 # 截图
│   └── 牛牛查求职助手-招聘网站信息增强工具.user.js    # 正式版本
│   └── README.md                                   # 项目说明
└── README.md                                       # 项目说明
```

### 核心配置

```javascript
// 网站配置
const siteConfigs = {
  'we.51job.com': { /* 51job配置 */ },
  'www.zhipin.com': { /* BOSS直聘配置 */ },
  'campus.niuqizp.com': { /* 牛企直聘配置 */ }
};

// 公司标签数据库
const COMPANY_BLACKLISTS = {
  scam: { /* 诈骗公司名单 */ },
  outsourcing: { /* 外包公司名单 */ },
  training: { /* 培训机构名单 */ },
  custom: { /* 自定义标签 */ }
};
```

## 🔧 自定义配置

### 添加自定义公司标签

您可以编辑脚本中的`COMPANY_BLACKLISTS`对象来添加自定义公司标签：

```javascript
// 在custom分类中添加需要标记的公司
custom: {
    name: '自定义',
    emoji: '🚨',
    color: '#9C27B0',
    companies: [
        '您要标记的公司名称1',
        '您要标记的公司名称2',
        // 更多公司...
    ]
}
```

### 修改查询服务

可以自定义公司查询服务：

```javascript
const QUERY_SERVICES = [
    { name: '🔍 百度', url: 'https://www.baidu.com/s?wd=' },
    { name: '👁️ 天眼查', url: 'https://www.tianyancha.com/search?key=' },
    // 添加更多查询服务...
];
```

## 📊 功能特点

### 🧠 智能识别
- **模糊匹配算法** - 精准识别公司类型，避免漏检
- **多维度匹配** - 支持公司全名、简称、关键词匹配
- **动态更新** - 实时监听页面变化，自动更新信息

### 🎨 用户体验
- **响应式设计** - 适配桌面和移动设备
- **无侵入式** - 不影响原网站功能和布局
- **性能优化** - 高效DOM操作，不影响页面加载速度

### 🔒 隐私安全
- **本地处理** - 所有数据在本地处理，不上传个人信息
- **开源透明** - 代码完全开源，保证安全可靠
- **无广告** - 纯净工具，专注功能实现

## 🤝 贡献指南

欢迎为项目做出贡献！您可以通过以下方式参与：

### 🐛 报告问题
- 在[Issues](https://github.com/andychu46/niuniuchajobhunting/issues)中报告Bug
- 提供详细的复现步骤和环境信息
- 附上错误截图或日志信息

### 💡 功能建议
- 提交新功能建议和改进意见
- 分享使用经验和优化建议
- 建议支持新的招聘平台

### 📝 代码贡献
1. Fork本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

### 📋 公司名单更新
帮助我们完善公司黑名单数据库：
- 提供诈骗公司信息
- 更新外包公司名单
- 补充培训机构信息

## 📄 许可证

本项目采用 [MIT License](LICENSE) 许可证。

## 💬 联系方式

- **作者**: c1gstudio
- **主页**: [https://blog.c1gstudio.com/](https://blog.c1gstudio.com/)
- **项目地址**: [https://github.com/andychu46/niuniuchajobhunting](https://github.com/andychu46/niuniuchajobhunting)
- **问题反馈**: [GitHub Issues](https://github.com/andychu46/niuniuchajobhunting/issues)

## 🙏 致谢

感谢以下项目和服务：
- [Tampermonkey](https://www.tampermonkey.net/) - 强大的用户脚本管理器
- [jQuery](https://jquery.com/) - 高效的JavaScript库
- 各大招聘平台 - 为求职者提供服务平台
- 所有贡献者和用户 - 让项目变得更好

## ⭐ Star History

如果这个项目对您有帮助，请考虑给项目一个Star ⭐，这是对我们最大的鼓励！

---

<p align="center">
  <b>让求职更安全，让选择更明智！</b><br>
  <i>牛牛查求职助手 - 您的智能求职伙伴</i>
</p>
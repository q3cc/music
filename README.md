# 🎵 Moring音乐台

基于 GD Studio 音乐聚合API 的现代化在线音乐播放平台，支持多音乐源搜索与播放。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=flat&logo=javascript&logoColor=%23F7DF1E)

## ✨ 功能特色

- 🔍 **多音乐源聚合搜索** - 支持12个主流音乐平台
- 🎼 **无损音质播放** - 支持999k无损、320k高品质等多种音质
- 📝 **实时歌词显示** - 自动同步歌词高亮显示
- ❤️ **收藏夹功能** - 本地存储个人收藏歌曲
- 📱 **响应式设计** - 完美适配桌面端、平板和手机
- 🎨 **现代化UI** - 玻璃态设计风格，流畅动画效果
- 👥 **一起听功能** - 创建或加入房间与好友同步听歌
- 🎵 **播放列表管理** - 添加、删除、排序播放列表
- ⌨️ **键盘快捷键** - 支持空格播放/暂停等快捷操作
- 🌙 **深色/浅色主题** - 可切换的主题模式

## 🎯 支持的音乐源

| 平台 | 状态 | 备注 |
|------|------|------|
| 网易云音乐 | ✅ | NetEase Cloud Music |
| QQ音乐 | ✅ | Tencent Music |
| 咪咕音乐 | ✅ | Migu Music |
| 酷狗音乐 | ✅ | KuGou Music |
| 酷我音乐 | ✅ | KuWo Music |
| 喜马拉雅 | ✅ | Ximalaya |
| TIDAL | ✅ | TIDAL HiFi |
| Spotify | ✅ | Spotify |
| YouTube Music | ✅ | YouTube Music |
| Qobuz | ✅ | Qobuz |
| JOOX | ✅ | JOOX |
| Deezer | ✅ | Deezer |

## 🚀 快速开始

### 本地运行

1. **克隆项目**
   ```bash
   git clone https://github.com/yourusername/moring-music-platform.git
   cd moring-music-platform
   ```

2. **启动本地服务器**
   
   使用 Python:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```
   
   或使用 Node.js:
   ```bash
   npx http-server
   ```

3. **访问应用**
   
   打开浏览器访问 `http://localhost:8000`

### 在线体验

直接访问：[Moring音乐台在线版本](https://your-domain.com)

## 📱 使用说明

### 基础功能

1. **搜索音乐**
   - 在搜索框输入歌曲名、歌手名或专辑名
   - 选择音乐源和音质
   - 点击搜索或按Enter键

2. **播放控制**
   - 点击歌曲即可播放
   - 使用底部播放器控制播放/暂停、上一首/下一首
   - 拖拽进度条调节播放进度

3. **收藏管理**
   - 点击歌曲旁的心形图标收藏
   - 在"我的收藏"页面查看所有收藏歌曲

### 高级功能

1. **一起听**
   - 创建房间：点击"创建房间"获得6位房间号
   - 加入房间：输入房间号加入好友的房间
   - 房间内音乐播放状态会自动同步

2. **播放列表**
   - 点击右侧播放列表图标打开播放列表
   - 添加歌曲到播放列表
   - 管理播放队列

### 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Space` | 播放/暂停 |
| `←` | 上一首 |
| `→` | 下一首 |
| `↑` | 增加音量 |
| `↓` | 减少音量 |
| `F` | 收藏当前歌曲 |
| `L` | 显示歌词 |
| `Esc` | 关闭弹窗 |

## 🛠️ 技术栈

- **前端框架**: 原生 HTML5 + CSS3 + JavaScript ES6+
- **CSS框架**: 自定义CSS变量系统，玻璃态设计
- **API接口**: GD Studio Music API
- **实时通信**: Socket.io (一起听功能)
- **字体图标**: Font Awesome 6.4.0
- **音频处理**: HTML5 Audio API

## 📁 项目结构

```
moring-music-platform/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── script.js           # 主要逻辑
├── README.md           # 项目说明
├── LICENSE             # 开源协议
└── assets/             # 静态资源
    └── images/         # 图片资源
```

## 🔧 配置说明

### API配置

项目使用 GD Studio Music API，默认配置：

```javascript
const API_BASE_URL = 'https://music-api.gdstudio.xyz/api.php';
```

### 音质设置

支持多种音质选项：

```javascript
const QUALITY_OPTIONS = {
    '999': '无损音质',
    '320': '高品质 (320k)',
    '192': '标准 (192k)', 
    '128': '流畅 (128k)'
};
```

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 使用 2 空格缩进
- 遵循 ES6+ 语法规范
- 添加必要的注释
- 确保代码在主流浏览器中兼容

## 📝 更新日志

### v2.0.0 (2024-01-XX)
- 🎨 全新UI设计，采用玻璃态风格
- ✨ 新增一起听功能
- 📱 优化移动端体验
- 🔧 重构代码架构

### v1.5.0 (2023-12-XX)
- 🔍 新增多音乐源支持
- 📝 添加歌词显示功能
- ❤️ 实现收藏功能

### v1.0.0 (2023-11-XX)
- 🎵 基础播放功能
- 🔍 搜索功能
- 📱 响应式设计

## ⚠️ 免责声明

- 本项目仅供学习交流使用，严禁商业用途
- 音乐资源来源于各大音乐平台，版权归原作者所有
- 使用本项目产生的任何法律后果由使用者自行承担
- 部分音乐源可能不稳定或失效，属正常现象

## 🙏 致谢

- [GD Studio](https://music-api.gdstudio.xyz) - 提供音乐聚合API
- [Meting](https://github.com/metowolf/Meting) - 原始API项目
- [Font Awesome](https://fontawesome.com/) - 图标库
- [Socket.io](https://socket.io/) - 实时通信

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

## 📧 联系我们

- 项目地址：[GitHub Repository](https://github.com/yourusername/moring-music-platform)
- 问题反馈：[Issues](https://github.com/yourusername/moring-music-platform/issues)
- 邮箱：your.email@example.com

---

⭐ 如果这个项目对你有帮助，请给它一个星标！
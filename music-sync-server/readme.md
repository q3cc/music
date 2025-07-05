# 创建项目目录
mkdir music-sync-server
cd music-sync-server

# 创建 package.json 和 server.js 文件
# 将上面的代码复制到对应文件中

# 更新 script.js 中的服务器地址：
socket = io('http://localhost:3000'); // 改为你的服务器地址

# 安装依赖
npm install

# 运行服务器
npm start

# 或者使用开发模式（自动重启）
npm run dev
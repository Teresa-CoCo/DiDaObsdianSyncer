# Obsidian TickTick 同步插件

中文 | [English](README.md)

一款强大的 Obsidian 插件，可无缝同步 Obsidian 笔记和 滴答清单之间的任务。

## 功能特性

- 🔄 **双向同步**：在 Obsidian 笔记和 TickTick 之间同步任务
- 🔐 **OAuth 认证**：使用 TickTick API 进行安全身份验证
- 📝 **任务解析**：自动解析 Obsidian 笔记中的复选框语法任务
- 🏷️ **项目管理**：将 Obsidian 文件夹/标签映射到 TickTick 项目
- ⏰ **自动同步**：配置自动同步时间间隔
- ➕ **快速创建任务**：直接从选中的文本创建任务
- 🎯 **智能映射**：在两个平台之间灵活映射任务

## 安装方法

### 从 Obsidian 社区插件安装

1. 打开 Obsidian 设置
2. 进入社区插件
3. 搜索 "TickTick Sync"
4. 点击安装，然后启用

### 手动安装

1. 下载最新版本
2. 将文件解压到你的仓库目录 `.obsidian/plugins/obsidian-ticktick-sync/`
3. 重新加载 Obsidian
4. 在 设置 → 社区插件 中启用该插件

## 初始设置

1. **身份验证**
   - 打开插件设置
   - 点击"连接到 TickTick"
   - 在浏览器中完成 OAuth 身份验证
   - 返回 Obsidian 确认连接

2. **配置同步设置**
   - 设置首选的同步间隔（或禁用自动同步）
   - 配置 Obsidian 和 TickTick 之间的项目映射
   - 自定义任务解析规则

3. **项目映射**
   - 将 Obsidian 文件夹或标签映射到 TickTick 项目
   - 映射文件夹中的任务将同步到相应的 TickTick 项目
   - 未映射的任务将同步到 TickTick 默认收集箱

## 使用方法

### 手动同步

- 点击左侧边栏的刷新图标
- 或使用命令面板：`Ctrl/Cmd + P` → "TickTick Sync: Sync now"

### 创建任务

**从选中文本创建：**
1. 在笔记中选择文本
2. 右键点击并选择"创建 TickTick 任务"
3. 或使用命令："TickTick Sync: Create task from selection"

**从笔记创建：**
使用标准的 Obsidian 任务语法：
```markdown
- [ ] 任务标题
- [x] 已完成的任务
- [ ] 带截止日期的任务 📅 2026-01-15
```

### 任务格式

笔记中的任务可以包含：
- `- [ ]` - 未完成的任务
- `- [x]` - 已完成的任务
- `📅 YYYY-MM-DD` - 截止日期
- `#标签` - 标签（映射到 TickTick 标签）
- `[[链接]]` - 笔记引用（添加为任务描述）

## 配置选项

### 设置项

| 设置 | 说明 |
|------|------|
| **同步间隔** | 自动同步的频率（单位：分钟，0 表示禁用） |
| **默认项目** | 未映射任务的默认 TickTick 项目 |
| **任务文件夹** | 监控任务的 Obsidian 文件夹 |
| **项目映射** | 将文件夹/标签映射到 TickTick 项目 |
| **启动时同步** | Obsidian 启动时自动同步 |

## 开发

### 前置要求

- Node.js（v16 或更高版本）
- npm 或 yarn

### 从源码构建

```bash
# 克隆仓库
cd obsidian-ticktick-sync

# 安装依赖
npm install

# 构建插件
npm run build

# 开发模式（监听文件变化）
npm run dev
```

### 项目结构

```
obsidian-ticktick-sync/
├── src/
│   ├── api/           # TickTick API 客户端
│   ├── oauth/         # OAuth 身份验证
│   ├── settings/      # 插件设置
│   ├── sync/          # 同步逻辑和任务映射
│   └── utils/         # 工具函数
├── main.ts            # 插件入口
└── manifest.json      # 插件清单
```

## API 集成

本插件使用 TickTick Open API。如需使用自己的 API 凭据：

1. 在 [TickTick 开发者门户](https://developer.dida365.com) 注册
2. 创建应用并获取 Client ID 和 Client Secret
3. 在插件设置中配置

## 隐私与安全

- OAuth 令牌安全存储在 Obsidian 数据目录中
- 除 TickTick 外，不会向第三方服务器发送任务数据
- 所有同步操作均使用安全的 HTTPS 连接
- 您可以随时从 TickTick 设置中撤销访问权限

## 故障排查

### 同步不工作

1. 检查网络连接
2. 验证 TickTick 身份验证是否有效
3. 检查控制台的错误消息（Ctrl/Cmd + Shift + I）
4. 尝试断开并重新连接 TickTick 账户

### 任务未显示

1. 确保任务使用正确的复选框语法 `- [ ]`
2. 检查笔记是否在被监控的文件夹中
3. 验证项目映射配置是否正确
4. 手动触发同步

### 身份验证问题

1. 在设置中清除 OAuth 令牌
2. 重新认证 TickTick
3. 确保未阻止弹出窗口

## 贡献

欢迎贡献！请随时提交 Pull Request。

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

## 致谢

- [Obsidian](https://obsidian.md) - 知识库应用
- [TickTick](https://ticktick.com) / [滴答清单](https://dida365.com) - 任务管理应用
- 所有贡献者和本插件的用户


---

用 ❤️ 制作

# Obsidian TickTick Sync

[中文](README_CN.md) | English

A powerful Obsidian plugin that seamlessly syncs your tasks between Obsidian and Dida365.

## Features

- 🔄 **Bidirectional Sync**: Sync tasks between Obsidian notes and TickTick
- 🔐 **OAuth Authentication**: Secure authentication with TickTick API
- 📝 **Task Parsing**: Automatically parse tasks from Obsidian notes with checkbox syntax
- 🏷️ **Project Management**: Map Obsidian folders/tags to TickTick projects
- ⏰ **Auto Sync**: Configure automatic sync intervals
- ➕ **Quick Task Creation**: Create tasks directly from text selection
- 🎯 **Smart Mapping**: Flexible task mapping between platforms

## Installation

### From Obsidian Community Plugins

1. Open Obsidian Settings
2. Navigate to Community Plugins
3. Search for "TickTick Sync"
4. Click Install and then Enable

### Manual Installation

1. Download the latest release
2. Extract the files to your vault's `.obsidian/plugins/obsidian-ticktick-sync/` directory
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

## Setup

1. **Authentication**
   - Open plugin settings
   - Click "Connect to TickTick"
   - Complete OAuth authentication in your browser
   - Return to Obsidian to confirm connection

2. **Configure Sync Settings**
   - Set your preferred sync interval (or disable auto-sync)
   - Configure project mappings between Obsidian and TickTick
   - Customize task parsing rules

3. **Project Mapping**
   - Map Obsidian folders or tags to TickTick projects
   - Tasks in mapped folders will sync to corresponding TickTick projects
   - Unmapped tasks will sync to your default TickTick inbox

## Usage

### Manual Sync

- Click the refresh icon in the left sidebar
- Or use the command palette: `Ctrl/Cmd + P` → "TickTick Sync: Sync now"

### Creating Tasks

**From Selection:**
1. Select text in your note
2. Right-click and choose "Create TickTick task"
3. Or use command: "TickTick Sync: Create task from selection"

**From Notes:**
Use standard Obsidian task syntax:
```markdown
- [ ] Task title
- [x] Completed task
- [ ] Task with due date 📅 2026-01-15
```

### Task Format

Tasks in your notes can include:
- `- [ ]` - Uncompleted task
- `- [x]` - Completed task
- `📅 YYYY-MM-DD` - Due date
- `#tag` - Tags (mapped to TickTick tags)
- `[[link]]` - Note references (added as task description)

## Configuration

### Settings

| Setting | Description |
|---------|-------------|
| **Sync Interval** | Frequency of automatic sync (in minutes, 0 to disable) |
| **Default Project** | Default TickTick project for unmapped tasks |
| **Task Folder** | Obsidian folder to monitor for tasks |
| **Project Mappings** | Map folders/tags to TickTick projects |
| **Sync on Startup** | Automatically sync when Obsidian starts |

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Building from Source

```bash
# Clone the repository
cd obsidian-ticktick-sync

# Install dependencies
npm install

# Build the plugin
npm run build

# Development mode (watch for changes)
npm run dev
```

### Project Structure

```
obsidian-ticktick-sync/
├── src/
│   ├── api/           # TickTick API client
│   ├── oauth/         # OAuth authentication
│   ├── settings/      # Plugin settings
│   ├── sync/          # Sync logic and task mapping
│   └── utils/         # Utility functions
├── main.ts            # Plugin entry point
└── manifest.json      # Plugin manifest
```

## API Integration

This plugin uses the TickTick Open API. To use your own API credentials:

1. Register at [TickTick Developer Portal](https://developer.dida365.com)
2. Create an application and obtain Client ID and Client Secret
3. Configure in plugin settings

## Privacy & Security

- OAuth tokens are stored securely in Obsidian's data directory
- No task data is sent to third-party servers except TickTick
- All sync operations use secure HTTPS connections
- You can revoke access anytime from TickTick settings

## Troubleshooting

### Sync Not Working

1. Check your internet connection
2. Verify TickTick authentication is valid
3. Check console for error messages (Ctrl/Cmd + Shift + I)
4. Try disconnecting and reconnecting TickTick account

### Tasks Not Appearing

1. Ensure tasks use proper checkbox syntax `- [ ]`
2. Check that the note is in a monitored folder
3. Verify project mappings are configured correctly
4. Manually trigger a sync

### Authentication Issues

1. Clear OAuth tokens in settings
2. Re-authenticate with TickTick
3. Ensure popup windows are not blocked

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Obsidian](https://obsidian.md) - The knowledge base app
- [TickTick](https://ticktick.com) - The task management app
- All contributors and users of this plugin


---

Made with ❤️ for the Obsidian community

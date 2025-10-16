# Voxel Canvas - Three.js

A powerful, browser-based 3D voxel editor built with Three.js. Create, edit, and export 3D voxel art with an intuitive interface supporting multiple languages, AI-powered generation, and various export formats.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Three.js](https://img.shields.io/badge/Three.js-v0.154.0-green.svg)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)

## 🎯 Overview

Voxel Canvas is a feature-rich, client-side 3D voxel editor that runs entirely in your browser. It provides a seamless experience for creating voxel art, from simple pixel-art style creations to complex 3D models. With session persistence, undo/redo functionality, and AI-powered generation capabilities, it's designed for both casual users and serious voxel artists.

## ✨ Features

### Core Functionality
- **3D Voxel Editing**: Paint in 3D space with intuitive mouse controls
- **Two Editing Modes**:
  - **Single Cube Mode**: Place individual voxels freely in 3D space
  - **Grid Mode**: Work with a defined canvas grid (wall) for structured pixel art
- **Color Palette**: Extensive color selection with custom color picker
- **Ghost Cursor**: Visual preview of voxel placement before committing
- **Undo/Redo**: Full undo/redo support with keyboard shortcuts (Ctrl+Z / Ctrl+Y)

### Advanced Features
- **Session Management**: Automatic session persistence with URL-based session tracking
- **Auto-save**: Continuous auto-save of your work to localStorage
- **AI-Powered Generation**: Generate 3D voxel models from text prompts using Google's Gemini API
- **Dynamic Grid Resolution**: Adjustable canvas sizes from 4x4 to 128x128
- **Custom Voxel Dimensions**: Define width, height, and depth of voxels independently

### Export Options
- **3D Model Formats**:
  - GLTF/GLB (recommended for 3D applications)
  - OBJ (widely compatible)
  - STL (for 3D printing)
- **Image Export**:
  - PNG (with transparency)
  - JPG (adjustable quality)
  - Multiple resolution scales (1x, 2x, 4x, 8x)

### Internationalization (i18n)
- **Supported Languages**:
  - English (en-US)
  - Portuguese (pt-BR)
  - Spanish (es-ES)
  - French (fr-FR)
  - German (de-DE)
  - Japanese (ja-JP)
- **Automatic Language Detection**: Detects browser language preference
- **Easy Language Switching**: Runtime language changes without reload

### User Experience
- **Responsive Design**: Works on various screen sizes
- **Dark Theme**: Easy-on-the-eyes dark interface
- **Cookie Consent**: GDPR-compliant cookie consent system
- **Loading Indicators**: Visual feedback during operations
- **Notifications**: Toast-style notifications for user actions

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for CDN resources)
- (Optional) Google Gemini API key for AI generation features

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/gustavodslara/threejs-voxel-canvas.git
   cd threejs-voxel-canvas
   ```

2. **Serve the application**:
   
   You'll need to serve the index.html. I personally recommend Caddy over Nginx, but you can also do:

   **Using Python**:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```

   **Using Node.js**:
   ```bash
   npx serve .
   ```

   **Using VS Code**:
   - Install the "Live Server" extension
   - Right-click on `index.html` and select "Open with Live Server"

3. **Access the application**:
   Open your browser and navigate to `http://localhost:8000`

### Configuration

#### AI Generation Setup (Optional)

To use the AI-powered voxel generation feature:

1. Get a Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. In the application, click the **AI** button in the toolbar
3. Click **Configure API Key**
4. Enter your API key and save
5. The key is stored securely in your browser's localStorage

## 📖 Usage Guide

### Basic Controls

**Mouse Controls**:
- **Left Click**: Place a voxel
- **Right Click**: Remove a voxel
- **Mouse Drag**: Rotate camera (OrbitControls)
- **Mouse Wheel**: Zoom in/out
- **Middle Mouse Button + Drag**: Pan camera

**Keyboard Shortcuts**:
- `Ctrl/Cmd + Z`: Undo
- `Ctrl/Cmd + Y` or `Ctrl/Cmd + Shift + Z`: Redo

### Toolbar Features

- **🎨 Color Palette**: Select from preset colors or use the color picker
- **📐 Grid Mode**: Toggle between single cube and grid wall modes
- **↩️ Undo/Redo**: Manage your edit history
- **🗑️ Clear Canvas**: Remove all voxels
- **💾 Save/Load**: Export and import your work
- **📤 Export**: Export as 3D models or images
- **⚙️ Settings**: Configure grid resolution and voxel dimensions
- **🤖 AI Generation**: Generate voxel art from text descriptions
- **🌐 Language**: Switch between supported languages

### Working with Sessions

- Each session is automatically assigned a unique ID
- Your work is saved automatically to localStorage
- Sessions persist across page refreshes
- The session ID is stored in the URL for easy sharing
- Clear session data using the Clear Canvas button

### AI Voxel Generation

1. Click the **AI** button in the toolbar
2. Enter a descriptive prompt (e.g., "a red sports car", "medieval castle")
3. Adjust dimensions (width, height, depth)
4. Click **Generate**
5. Wait for the AI to process your request
6. The generated voxel model will appear on your canvas

**Tips for better results**:
- Be specific in your descriptions
- Use simple, clear language
- Start with smaller dimensions (8x8x8) for faster generation
- Experiment with different prompts for the same object

## 🏗️ Architecture

### Technology Stack

- **Rendering**: Three.js (v0.154.0)
- **Styling**: Tailwind CSS (CDN)
- **Module System**: ES Modules with Import Maps
- **State Management**: localStorage for session persistence
- **API Integration**: Google Gemini API for AI generation
- **Build System**: None required (client-side only)

### Project Structure

```
threejs-voxel-canvas/
├── index.html                 # Main HTML file
├── LICENSE                    # MIT License
├── README.md                  # This file
└── public/
    ├── assets/
    │   └── images/           # Logo and branding assets
    │       ├── threejs-pixel-canvas-logo.png
    │       ├── pixel-canvas-title.png
    │       └── pixel-canvas-title-square.png
    ├── css/
    │   └── main.css          # Custom styles
    ├── js/
    │   ├── main.js           # Core application logic
    │   └── i18n.js           # Internationalization system
    └── locales/              # Translation files
        ├── en-US.json        # English translations
        ├── pt-BR.json        # Portuguese translations
        ├── es-ES.json        # Spanish translations
        ├── fr-FR.json        # French translations
        ├── de-DE.json        # German translations
        └── ja-JP.json        # Japanese translations
```

### Key Components

- **Session Management** (`js/main.js`): Handles unique session IDs, URL state, and localStorage persistence
- **Voxel Renderer** (`js/main.js`): Three.js scene setup with lighting, shadows, and camera controls
- **Edit History** (`js/main.js`): Undo/redo system using command pattern
- **Export System** (`js/main.js`): Multi-format export using Three.js exporters
- **i18n System** (`js/i18n.js`): Dynamic translation loading and application
- **AI Integration** (`js/main.js`): Gemini API integration for voxel generation
- **Styling** (`css/main.css`): Custom styles complementing Tailwind CSS
- **Assets** (`assets/images/`): Application logos and branding

## 🔧 Development

### Code Organization

The codebase follows a functional programming approach with clear separation of concerns:

- **js/main.js**: Core application logic (1,800+ lines)
  - Session management
  - Three.js scene setup
  - Voxel editing logic
  - Export functionality
  - AI integration
  - Event handlers

- **js/i18n.js**: Internationalization system
  - Translation loading
  - Language detection
  - Dynamic UI updates

- **css/main.css**: Custom styles
  - UI component styling
  - Responsive design adjustments
  - Theme customizations

- **locales/*.json**: Translation files
  - UI text translations
  - Error messages
  - Help text and tooltips

### Adding New Features

1. **New Export Format**:
   - Import the exporter from Three.js addons
   - Add export function in the export menu handler
   - Update UI with new format option

2. **New Language**:
   - Create a new JSON file in `public/locales/`
   - Follow the structure of existing language files
   - Add the locale code to `supportedLocales` in `js/i18n.js`

3. **New Color Presets**:
   - Add color buttons in `index.html`
   - Follow the existing button structure
   - Use `onclick="setColor(event)"` handler

## 🔮 Future Plans

### Migration to Angular

We are planning a major architectural overhaul to migrate this project to Angular. This migration will provide:

#### Benefits
- **Better Maintainability**: Component-based architecture with clear separation of concerns
- **Type Safety**: Full TypeScript support for fewer runtime errors
- **Testing**: Built-in testing framework (Jasmine/Karma)
- **State Management**: Reactive state management with RxJS
- **Scalability**: Better structure for adding complex features
- **Developer Experience**: Superior tooling, debugging, and IDE support

#### Planned Architecture
```
angular-voxel-canvas/
├── src/
│   ├── app/
│   │   ├── core/              # Singleton services
│   │   │   ├── session/
│   │   │   ├── storage/
│   │   │   └── i18n/
│   │   ├── features/          # Feature modules
│   │   │   ├── editor/
│   │   │   ├── export/
│   │   │   ├── ai-generation/
│   │   │   └── settings/
│   │   ├── shared/            # Shared components
│   │   │   ├── components/
│   │   │   ├── directives/
│   │   │   └── pipes/
│   │   └── models/            # TypeScript interfaces
│   ├── assets/
│   └── environments/
```

#### Migration Timeline
- **Phase 1**: Setup Angular project structure (Q1 2026)
- **Phase 2**: Migrate core voxel editor (Q2 2026)
- **Phase 3**: Migrate i18n and UI components (Q2 2026)
- **Phase 4**: Migrate export and AI features (Q3 2026)
- **Phase 5**: Testing, optimization, and deployment (Q4 2026)

### Additional Planned Features
- **Collaborative Editing**: Real-time multiplayer voxel editing
- **Cloud Storage**: Save projects to cloud with user accounts
- **Animation**: Keyframe-based voxel animations
- **Layers**: Multi-layer support for complex projects
- **Templates**: Pre-built templates and starter projects
- **Plugin System**: Extensible architecture for community plugins
- **Mobile Support**: Touch-optimized controls for tablets
- **VR Support**: Virtual reality voxel editing

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Contribution Guidelines

- Follow the existing code style
- Test your changes thoroughly
- Update documentation as needed
- Keep commits focused and atomic
- Write clear commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### MIT License Summary

```
Copyright (c) 2025 Gustavo Lara (gustavodslara)
Cuiabá, Mato Grosso, Brazil

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

## 🙏 Acknowledgments

- **Three.js**: For the amazing 3D rendering library
- **Google Gemini**: For AI-powered generation capabilities
- **Tailwind CSS**: For rapid UI development
- **Contributors**: All contributors who help improve this project

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/gustavodslara/threejs-voxel-canvas/issues)
- **Discussions**: [GitHub Discussions](https://github.com/gustavodslara/threejs-voxel-canvas/discussions)

## 🔗 Links

- **Repository**: [https://github.com/gustavodslara/threejs-voxel-canvas](https://github.com/gustavodslara/threejs-voxel-canvas)
- **Three.js**: [https://threejs.org/](https://threejs.org/)
- **Google Gemini**: [https://ai.google.dev/](https://ai.google.dev/)

---

**Built with ❤️ using Three.js**
# Nezzo Code Studio

## Next-Gen AI-Powered IDE

Nezzo Code Studio ist eine moderne, KI-gestützte Entwicklungsumgebung für Windows.

### Features

- **Moderner Editor** mit Syntax-Highlighting und IntelliSense
- **Integriertes Terminal** mit PowerShell/CMD/Bash Support
- **AI Assistant** mit Multi-Model Unterstützung (ChatGPT, Claude, Gemini, DeepSeek)
- **NC Sprache** - Eine deutsche, anfängerfreundliche Programmiersprache
- **Erweiterungssystem** für Plugins und Themes
- **Datei-Explorer** mit Git Integration

### Installation

```bash
npm install
npm start
```

### NC Sprache Beispiele

```nc
# Hallo Welt
sage("Hallo Welt!")

# Variablen
zahl alter = 25
text name = "Max"

# Bedingungen
wenn alter > 18 {
    sage("Erwachsen")
} sonst {
    sage("Minderjährig")
}

# Schleifen
schleife i von 1 bis 10 {
    sage(i)
}

# Funktionen
funktion begruessung(name) {
    sage("Hallo " + name)
}

begruessung("Welt")
```

### Projektstruktur

```
/src
  /ai          - AI Manager & Integrationen
  /compiler    - NC Compiler & Interpreter
  /core        - Kernfunktionalitäten
  /editor      - Editor Komponenten
  /extensions  - Erweiterungssystem
  /terminal    - Terminal Manager
  /ui          - Benutzeroberfläche
  main.js      - Electron Hauptprozess
```

### Build für Windows

Für den Build wird electron-builder benötigt:

```bash
npm install --save-dev electron electron-builder
npm run build
```

### Lizenz

MIT License - Nezzo Studios 2024

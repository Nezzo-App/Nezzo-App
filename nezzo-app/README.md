# Nezzo App Docker System

Ein vollständiges Docker-System für die Nezzo App Startseite.

## Produkte

- **Nezzo AI** - Künstliche Intelligenz der nächsten Generation
- **Nezzo Chat** - Nahtlose Kommunikation für Teams
- **Nezzo Cloud** - Skalierbare Cloud-Infrastruktur
- **Nezzo Host** - Premium Webhosting & Server
- **Nezzo Vocab** - Intelligente Sprachtechnologie
- **Nezzo Text** - KI-gestütztes Content Creation

## Führungsteam

- **CEO**: LobiGmbh
- **COO**: JoviGmbh

## Schnellstart

```bash
# Docker Container starten
docker-compose up -d

# Webseite öffnen
http://localhost:8080
```

## Struktur

```
nezzo-app/
├── src/
│   ├── index.html    # Hauptseite
│   ├── styles.css    # Stylesheet
│   └── script.js     # JavaScript
├── nginx/
│   └── nginx.conf    # Nginx Konfiguration
├── Dockerfile        # Docker Image
└── docker-compose.yml # Docker Compose
```

## Ports

- **8080**: HTTP Zugriff auf die Webseite

## Technologien

- HTML5
- CSS3 (Modernes Design mit Animationen)
- Vanilla JavaScript
- Nginx Webserver
- Docker & Docker Compose

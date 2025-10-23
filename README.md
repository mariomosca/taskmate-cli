# 🤖 Todoist AI CLI

Una CLI interattiva moderna che integra AI (Claude e Gemini) con Todoist per gestire task attraverso conversazioni naturali.

## ✨ Caratteristiche

- 🗣️ **Conversazioni naturali** con AI per gestire i tuoi task
- 🔄 **Multi-LLM Support** - Claude e Gemini
- 📝 **Integrazione Todoist** completa (CRUD tasks, progetti, labels)
- 💾 **Sessioni persistenti** con history e context
- 📄 **Lettura file Markdown** per context AI
- ⚡ **Comandi slash** per operazioni rapide
- 🎨 **UI moderna** con Rich e prompt interattivi

## 🚀 Installazione

```bash
# Clone del repository
git clone <repository-url>
cd todoist-ai-cli

# Installazione dipendenze
pip install -r requirements.txt

# Configurazione
cp .env.example .env
# Modifica .env con le tue API keys
```

## ⚙️ Configurazione

Crea un file `.env` con le seguenti variabili:

```env
# Todoist
TODOIST_API_TOKEN=your_token_here

# Claude
ANTHROPIC_API_KEY=your_key_here

# Gemini
GOOGLE_API_KEY=your_key_here

# Impostazioni
DEFAULT_LLM=claude
```

## 🎯 Utilizzo

```bash
# Avvia la CLI
python src/main.py

# Esempi di conversazioni
todoist-ai › Dammi i task di oggi
todoist-ai › Aggiungi task: Chiamare Mario domani alle 15
todoist-ai › /read ~/notes/weekly-goals.md
todoist-ai › Suggerisci come organizzare la giornata
```

## 📋 Comandi Slash

- `/help` - Mostra aiuto
- `/tasks` - Lista task di oggi
- `/add <task>` - Quick add task
- `/read <file>` - Leggi file markdown
- `/llm <provider>` - Cambia AI provider
- `/exit` - Esci

## 🏗️ Architettura

```
src/
├── cli/          # UI e REPL loop
├── llm/          # Integrazione AI (Claude/Gemini)
├── todoist/      # API Todoist
├── session/      # Persistenza sessioni
├── markdown/     # Parser markdown
├── config/       # Configurazione
└── utils/        # Utilities
```

## 🧪 Testing

```bash
# Esegui i test
python -m pytest tests/

# Con coverage
python -m pytest tests/ --cov=src
```

## 📄 Licenza

MIT License

## 🤝 Contributi

I contributi sono benvenuti! Apri una issue o una pull request.
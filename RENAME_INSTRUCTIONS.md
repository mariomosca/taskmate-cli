# Istruzioni per Rinominare il Progetto

## Rinominazione Cartella Locale

Per completare il rebrand, è necessario rinominare la cartella del progetto:

```bash
# Naviga alla directory padre
cd /Users/mariomosca/Desktop/Projects/04-Personal-Tools/

# Rinomina la cartella
mv todoist-ai-cli taskmate-cli

# Verifica la rinominazione
ls -la | grep taskmate-cli
```

## Aggiornamento Repository Git (se applicabile)

Se questo progetto è collegato a un repository Git:

### 1. Aggiorna il remote URL (se necessario)
```bash
cd taskmate-cli
git remote -v
# Se il repository è stato rinominato su GitHub/GitLab:
# git remote set-url origin https://github.com/username/taskmate-cli.git
```

### 2. Commit delle modifiche
```bash
git add .
git commit -m "feat: rebrand from todoist-ai-cli to taskmate-cli

- Updated package.json with new name and description
- Modified README.md and documentation
- Updated UI components (SplashScreen, LoadingIndicator)
- Generalized prompt templates
- Added migration guide for existing users
- Configured Jest for ESM support

BREAKING CHANGE: Command changed from 'todoist-ai' to 'taskmate'"
```

### 3. Push delle modifiche
```bash
git push origin main
```

## Pubblicazione su npm (se applicabile)

Se il pacchetto deve essere pubblicato su npm:

```bash
# Verifica che tutto sia corretto
npm run build
npm test

# Pubblica la nuova versione
npm publish
```

## Verifica Post-Rinominazione

Dopo aver rinominato la cartella:

```bash
cd /Users/mariomosca/Desktop/Projects/04-Personal-Tools/taskmate-cli

# Verifica che tutto funzioni
npm install
npm run build
npm test
npm start
```

## Note Importanti

- ✅ Tutti i file di configurazione sono già stati aggiornati
- ✅ Il package.json contiene già il nuovo nome
- ✅ La documentazione è stata aggiornata
- ✅ I test passano correttamente
- ✅ L'applicazione si avvia con il nuovo branding

La rinominazione della cartella è l'ultimo passo per completare il rebrand!
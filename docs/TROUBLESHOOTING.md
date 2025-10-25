# Troubleshooting Guide - TaskMate CLI

## 🚨 Problemi Comuni

### 1. Errori di Autenticazione

#### Todoist API Token Non Valido
**Errore**: `TODOIST_AUTH_ERROR: Invalid token`

**Soluzioni**:
1. Verificare che il token sia corretto:
   ```bash
   echo $TODOIST_API_TOKEN
   ```

2. Ottenere un nuovo token da [Todoist App Settings](https://todoist.com/app/settings/integrations)

3. Aggiornare il file `.env`:
   ```bash
   TODOIST_API_TOKEN=your_new_token_here
   ```

4. Testare la connessione:
   ```bash
   curl -X GET https://api.todoist.com/rest/v2/projects \
     -H "Authorization: Bearer $TODOIST_API_TOKEN"
   ```

#### API Keys AI Non Valide
**Errore**: `AI_API_ERROR: Authentication failed`

**Soluzioni**:
1. **Anthropic (Claude)**:
   - Verificare key: https://console.anthropic.com/
   - Formato corretto: `sk-ant-api03-...`

2. **Google (Gemini)**:
   - Verificare key: https://aistudio.google.com/app/apikey
   - Abilitare Gemini API nel progetto

3. Testare le API:
   ```bash
   # Test Anthropic
   curl -X POST https://api.anthropic.com/v1/messages \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{"model":"claude-3-haiku-20240307","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'

   # Test Google
   curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$GOOGLE_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"Hi"}]}]}'
   ```

### 2. Errori Database

#### Database Non Accessibile
**Errore**: `DATABASE_ERROR: SQLITE_CANTOPEN`

**Soluzioni**:
1. Verificare permessi directory:
   ```bash
   ls -la ./data/
   chmod 755 ./data/
   ```

2. Creare directory se mancante:
   ```bash
   mkdir -p ./data
   ```

3. Verificare spazio disco:
   ```bash
   df -h .
   ```

#### Corruzione Database
**Errore**: `DATABASE_ERROR: database disk image is malformed`

**Soluzioni**:
1. Backup del database corrotto:
   ```bash
   cp ./data/sessions.db ./data/sessions.db.backup
   ```

2. Tentare riparazione:
   ```bash
   sqlite3 ./data/sessions.db ".recover" | sqlite3 ./data/sessions_recovered.db
   ```

3. Se la riparazione fallisce, ricreare database:
   ```bash
   rm ./data/sessions.db
   npm start  # Il database verrà ricreato automaticamente
   ```

### 3. Errori di Performance

#### Applicazione Lenta
**Sintomi**: Comandi che impiegano >5 secondi

**Diagnosi**:
```bash
# Verificare dimensione database
ls -lh ./data/sessions.db

# Verificare numero sessioni/messaggi
sqlite3 ./data/sessions.db "SELECT COUNT(*) FROM sessions;"
sqlite3 ./data/sessions.db "SELECT COUNT(*) FROM messages;"
```

**Soluzioni**:
1. **Pulizia database**:
   ```sql
   -- Eliminare sessioni vecchie (>30 giorni)
   DELETE FROM sessions WHERE created_at < datetime('now', '-30 days');
   
   -- Eliminare messaggi orfani
   DELETE FROM messages WHERE session_id NOT IN (SELECT id FROM sessions);
   
   -- Vacuum database
   VACUUM;
   ```

2. **Ottimizzazione context**:
   - Usare `/clear` per pulire context lungo
   - Creare nuove sessioni per topic diversi
   - Limitare lunghezza messaggi

#### Memory Leaks
**Sintomi**: Uso memoria crescente nel tempo

**Soluzioni**:
1. Riavviare applicazione periodicamente
2. Verificare log per errori:
   ```bash
   tail -f ./logs/app.log
   ```
3. Monitorare uso memoria:
   ```bash
   ps aux | grep node
   ```

### 4. Errori di Rete

#### Timeout API
**Errore**: `Request timeout after 30000ms`

**Soluzioni**:
1. Verificare connessione internet:
   ```bash
   ping api.todoist.com
   ping api.anthropic.com
   ```

2. Verificare proxy/firewall:
   ```bash
   curl -I https://api.todoist.com/rest/v2/projects
   ```

3. Aumentare timeout (temporaneo):
   ```typescript
   // In LLMService.ts
   const timeout = 60000; // 60 secondi invece di 30
   ```

#### Rate Limiting
**Errore**: `429 Too Many Requests`

**Soluzioni**:
1. **Todoist API**: Max 450 requests/15min
   - Implementare backoff exponential
   - Ridurre frequenza richieste

2. **Anthropic API**: Varia per tier
   - Verificare limits: https://console.anthropic.com/settings/limits
   - Upgrade piano se necessario

3. **Google API**: 1500 requests/minute
   - Verificare quota: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas

### 5. Errori UI/UX

#### Caratteri Non Visualizzati Correttamente
**Problema**: Emoji o caratteri speciali non mostrati

**Soluzioni**:
1. Verificare encoding terminale:
   ```bash
   echo $LANG
   export LANG=en_US.UTF-8
   ```

2. Aggiornare font terminale con supporto Unicode

3. Testare con terminale diverso (iTerm2, Hyper, etc.)

#### Layout Rotto
**Problema**: Interfaccia non responsive

**Soluzioni**:
1. Verificare dimensioni terminale:
   ```bash
   tput cols  # Larghezza
   tput lines # Altezza
   ```

2. Ridimensionare finestra terminale (min 80x24)

3. Disabilitare word wrap se problematico

### 6. Errori di Sviluppo

#### TypeScript Errors
**Errore**: `Type 'X' is not assignable to type 'Y'`

**Soluzioni**:
1. Verificare versioni dipendenze:
   ```bash
   npm list typescript
   npm list @types/node
   ```

2. Pulire cache TypeScript:
   ```bash
   npx tsc --build --clean
   rm -rf node_modules/.cache
   ```

3. Rigenerare types:
   ```bash
   npm run type-check
   ```

#### Test Failures
**Errore**: Test che falliscono dopo modifiche

**Soluzioni**:
1. Eseguire test in modalità watch:
   ```bash
   npm test -- --watch
   ```

2. Verificare coverage:
   ```bash
   npm test -- --coverage
   ```

3. Debug test specifico:
   ```bash
   npm test -- --testNamePattern="LLMService"
   ```

### 7. Debugging Avanzato

#### Abilitare Debug Mode
```bash
# Variabili environment per debug
export DEBUG=todoist-ai:*
export LOG_LEVEL=debug
export NODE_ENV=development

# Avviare con debug
npm run dev
```

#### Log Analysis
```bash
# Filtrare errori
grep "ERROR" ./logs/app.log

# Monitorare in tempo reale
tail -f ./logs/app.log | grep -E "(ERROR|WARN)"

# Analizzare performance
grep "PERF" ./logs/app.log | tail -20
```

#### Memory Profiling
```bash
# Avviare con profiling
node --inspect --inspect-brk dist/index.js

# Aprire Chrome DevTools
# chrome://inspect
```

### 8. Recovery Procedures

#### Backup Completo
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/$DATE"

mkdir -p $BACKUP_DIR
cp -r ./data/ $BACKUP_DIR/
cp .env $BACKUP_DIR/
cp package.json $BACKUP_DIR/

echo "Backup creato in $BACKUP_DIR"
```

#### Restore da Backup
```bash
#!/bin/bash
# restore.sh
BACKUP_DIR=$1

if [ -z "$BACKUP_DIR" ]; then
  echo "Usage: ./restore.sh <backup_directory>"
  exit 1
fi

cp -r $BACKUP_DIR/data/ ./
cp $BACKUP_DIR/.env ./

echo "Restore completato da $BACKUP_DIR"
```

#### Reset Completo
```bash
#!/bin/bash
# reset.sh
echo "⚠️  ATTENZIONE: Questo eliminerà tutti i dati!"
read -p "Continuare? (y/N): " confirm

if [ "$confirm" = "y" ]; then
  rm -rf ./data/
  rm -rf ./logs/
  rm -rf node_modules/
  npm install
  echo "✅ Reset completato"
fi
```

### 9. Contatti e Supporto

#### Informazioni Sistema
Prima di richiedere supporto, raccogliere:

```bash
# System info
echo "OS: $(uname -a)"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"
echo "App Version: $(cat package.json | grep version)"

# Environment
echo "TODOIST_API_TOKEN: ${TODOIST_API_TOKEN:0:10}..."
echo "ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:0:10}..."
echo "GOOGLE_API_KEY: ${GOOGLE_API_KEY:0:10}..."

# Database info
sqlite3 ./data/sessions.db "SELECT COUNT(*) as sessions FROM sessions;"
sqlite3 ./data/sessions.db "SELECT COUNT(*) as messages FROM messages;"
```

#### Log Essenziali
```bash
# Ultimi errori
tail -50 ./logs/app.log | grep ERROR

# Performance issues
grep "SLOW" ./logs/app.log | tail -10

# API errors
grep "API_ERROR" ./logs/app.log | tail -10
```

#### GitHub Issues
Quando apri un issue, includi:
1. Versione applicazione
2. Sistema operativo
3. Passi per riprodurre
4. Log errori
5. Configurazione (senza API keys)

#### Community Support
- GitHub Discussions per domande generali
- Stack Overflow con tag `taskmate-cli`
- Discord community (se disponibile)
# Guida alla Migrazione: da Todoist AI CLI a TaskMate CLI

## Panoramica

Todoist AI CLI è stato rinominato in **TaskMate CLI** per riflettere meglio la sua natura di strumento generico per la gestione delle attività. Questa guida ti aiuterà a migrare senza perdere dati o configurazioni.

## Cosa è Cambiato

### Nome del Progetto
- **Prima**: `todoist-ai-cli`
- **Dopo**: `taskmate-cli`

### Comando di Installazione
- **Prima**: `npm install -g todoist-ai-cli`
- **Dopo**: `npm install -g taskmate-cli`

### Comando Eseguibile
- **Prima**: `todoist-ai`
- **Dopo**: `taskmate`

### Interfaccia Utente
- Logo aggiornato da "TODOIST AI" a "TASKMATE"
- Messaggi di caricamento generalizzati
- Prompt e template più generici

## Migrazione Passo-Passo

### 1. Backup dei Dati (Raccomandato)
```bash
# Backup della directory di configurazione
cp -r ~/.config/todoist-ai-cli ~/.config/todoist-ai-cli-backup
```

### 2. Disinstallazione della Versione Precedente
```bash
npm uninstall -g todoist-ai-cli
```

### 3. Installazione della Nuova Versione
```bash
npm install -g taskmate-cli
```

### 4. Migrazione delle Configurazioni
```bash
# Se esiste la directory di configurazione precedente
if [ -d ~/.config/todoist-ai-cli ]; then
    mv ~/.config/todoist-ai-cli ~/.config/taskmate-cli
    echo "Configurazioni migrate con successo!"
fi
```

### 5. Verifica della Migrazione
```bash
taskmate --version
```

## Compatibilità

### Database e Sessioni
- ✅ Tutte le sessioni esistenti sono compatibili
- ✅ Il database locale rimane invariato
- ✅ Le configurazioni API vengono preservate
- ✅ La cronologia dei comandi è mantenuta

### Funzionalità
- ✅ Tutte le funzionalità esistenti rimangono invariate
- ✅ I servizi Todoist continuano a funzionare normalmente
- ✅ L'integrazione con i modelli AI è preservata
- ✅ I template di prompt sono aggiornati ma compatibili

## Script di Migrazione Automatica

Puoi utilizzare questo script per automatizzare la migrazione:

```bash
#!/bin/bash

echo "🔄 Avvio migrazione da Todoist AI CLI a TaskMate CLI..."

# Backup
if [ -d ~/.config/todoist-ai-cli ]; then
    echo "📦 Creazione backup..."
    cp -r ~/.config/todoist-ai-cli ~/.config/todoist-ai-cli-backup
fi

# Disinstallazione
echo "🗑️ Disinstallazione versione precedente..."
npm uninstall -g todoist-ai-cli

# Installazione
echo "📥 Installazione TaskMate CLI..."
npm install -g taskmate-cli

# Migrazione configurazioni
if [ -d ~/.config/todoist-ai-cli ]; then
    echo "⚙️ Migrazione configurazioni..."
    mv ~/.config/todoist-ai-cli ~/.config/taskmate-cli
fi

echo "✅ Migrazione completata!"
echo "🚀 Puoi ora utilizzare il comando 'taskmate' invece di 'todoist-ai'"
```

## Risoluzione Problemi

### Comando Non Trovato
Se ricevi l'errore "command not found: taskmate":
```bash
# Verifica l'installazione
npm list -g taskmate-cli

# Reinstalla se necessario
npm install -g taskmate-cli
```

### Configurazioni Mancanti
Se le configurazioni non vengono migrate automaticamente:
```bash
# Copia manualmente le configurazioni
cp -r ~/.config/todoist-ai-cli-backup ~/.config/taskmate-cli
```

### Database Non Accessibile
Se il database non viene riconosciuto:
```bash
# Verifica la posizione del database
ls -la ~/.config/taskmate-cli/

# Se necessario, copia il database dalla directory di backup
cp ~/.config/todoist-ai-cli-backup/database.db ~/.config/taskmate-cli/
```

## Supporto

Se incontri problemi durante la migrazione:

1. Controlla che la versione di Node.js sia compatibile (>= 16.0.0)
2. Verifica che npm sia aggiornato
3. Consulta i log di errore per dettagli specifici
4. Apri un issue su GitHub se il problema persiste

## Note Importanti

- ⚠️ **Non eliminare** la directory di backup finché non hai verificato che tutto funzioni correttamente
- 🔄 La migrazione è **reversibile**: puoi sempre tornare alla versione precedente utilizzando il backup
- 📊 **Nessun dato viene perso** durante la migrazione se segui questa guida
- 🔧 Le **API keys** e le **configurazioni** rimangono invariate

---

**Versione**: 1.0.0  
**Data**: $(date +%Y-%m-%d)  
**Compatibilità**: TaskMate CLI v0.1.0+
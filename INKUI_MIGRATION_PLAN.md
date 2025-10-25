# 🎨 Piano di Migrazione a @inkjs/ui

## 📋 Panoramica
Questo documento descrive il piano completo per migrare TaskMate CLI dalla libreria `ink-text-input` e componenti custom alla libreria `@inkjs/ui` per una migliore UX e manutenibilità.

## 🎯 Obiettivi
- ✅ Interfaccia utente più consistente e professionale
- ✅ Riduzione del codice custom e miglioramento della manutenibilità
- ✅ Migliore accessibilità e navigazione keyboard
- ✅ Theming unificato e componenti standardizzati
- ✅ Pulizia del codice e rimozione dipendenze non utilizzate

---

## 🚀 Fase 1: Setup e Installazione
**Priorità: Alta** | **Tempo stimato: 30 minuti**

### 1.1 Installazione @inkjs/ui
- [ ] Installare `@inkjs/ui` come dipendenza
- [ ] Verificare compatibilità con versione Ink esistente
- [ ] Aggiornare package.json

### 1.2 Setup iniziale
- [ ] Importare ThemeProvider in App.tsx
- [ ] Configurare tema di base
- [ ] Test di funzionamento base

**File coinvolti:**
- `package.json`
- `src/App.tsx`

---

## 🎨 Fase 2: Componenti Core (SplashScreen e InputArea)
**Priorità: Alta** | **Tempo stimato: 2 ore**

### 2.1 Miglioramento SplashScreen
- [ ] Sostituire Spinner custom con `@inkjs/ui Spinner`
- [ ] Integrare `ProgressBar` per progresso caricamento
- [ ] Mantenere BigText e gradienti esistenti
- [ ] Test funzionalità splash screen

### 2.2 Aggiornamento InputArea
- [ ] Sostituire `ink-text-input` con `@inkjs/ui TextInput`
- [ ] Migliorare autocompletamento comandi
- [ ] Integrare placeholder più eleganti
- [ ] Test input e navigazione comandi

**File coinvolti:**
- `src/components/SplashScreen.tsx`
- `src/components/InputArea.tsx`

---

## 🔄 Fase 3: Interazioni Utente (InitCommand e SessionSelector)
**Priorità: Media** | **Tempo stimato: 3 ore**

### 3.1 Refactoring InitCommand
- [ ] Sostituire `readline` con componenti @inkjs/ui:
  - `TextInput` per nome, email, obiettivi
  - `PasswordInput` per API keys
  - `EmailInput` per email utente
  - `Select` per provider LLM e modelli
  - `ConfirmInput` per conferme
- [ ] Creare componente React per setup interattivo
- [ ] Migliorare UX del processo di inizializzazione
- [ ] Test completo processo setup

### 3.2 Miglioramento SessionSelector
- [ ] Sostituire navigazione manuale con `Select` component
- [ ] Aggiungere ricerca integrata nelle sessioni
- [ ] Migliorare visualizzazione informazioni sessione
- [ ] Test selezione e caricamento sessioni

**File coinvolti:**
- `src/commands/InitCommand.ts`
- `src/components/SessionSelector.tsx`

---

## 📢 Fase 4: Feedback e Notifiche (ContentArea e CommandMenu)
**Priorità: Media** | **Tempo stimato: 2 ore**

### 4.1 Miglioramento ContentArea
- [ ] Integrare `StatusMessage` per stati operazioni
- [ ] Aggiungere `Alert` per notifiche importanti
- [ ] Usare `ProgressBar` per operazioni lunghe
- [ ] Implementare `Badge` per categorizzare messaggi
- [ ] Test visualizzazione messaggi e notifiche

### 4.2 Aggiornamento CommandMenu
- [ ] Sostituire menu custom con `Select` standardizzato
- [ ] Aggiungere filtri per categoria comandi
- [ ] Migliorare visualizzazione descrizioni
- [ ] Test navigazione e selezione comandi

**File coinvolti:**
- `src/components/ContentArea.tsx`
- `src/components/CommandMenu.tsx`

---

## 🧹 Fase 5: Pulizia e Ottimizzazione
**Priorità: Media** | **Tempo stimato: 2 ore**

### 5.1 Rimozione Componenti Non Utilizzati
- [ ] Rimuovere `ProjectTable.tsx` (non utilizzato)
- [ ] Rimuovere `TaskTable.tsx` (non utilizzato)
- [ ] Verificare utilizzo di `Transform.tsx`
- [ ] Rimuovere altri componenti obsoleti

### 5.2 Pulizia Dipendenze
- [ ] Rimuovere `ink-text-input` da package.json
- [ ] Rimuovere `ink-spinner` (sostituito da @inkjs/ui)
- [ ] Verificare e rimuovere altre dipendenze non utilizzate:
  - `ink-big-text` (se non più necessario)
  - `gradient-string` (se sostituito da theming)
  - `figures` (se sostituito da @inkjs/ui icons)

### 5.3 Ottimizzazione Codice
- [ ] Rifattorizzare import statements
- [ ] Rimuovere codice morto e commenti obsoleti
- [ ] Aggiornare TypeScript types
- [ ] Ottimizzare bundle size

### 5.4 Aggiornamento Documentazione
- [ ] Aggiornare README.md con nuove dipendenze
- [ ] Documentare nuovi componenti UI
- [ ] Aggiornare guide di sviluppo
- [ ] Aggiornare changelog

**File coinvolti:**
- `package.json`
- `src/components/ProjectTable.tsx` (rimozione)
- `src/components/TaskTable.tsx` (rimozione)
- `src/components/Transform.tsx` (verifica)
- `README.md`
- `CHANGELOG.md`

---

## 📊 Metriche di Successo

### Prima della Migrazione
- Dipendenze UI: `ink-text-input`, `ink-spinner`, componenti custom
- Linee di codice UI: ~800 linee
- Componenti non utilizzati: 3+ file

### Dopo la Migrazione
- Dipendenze UI: `@inkjs/ui` (unificata)
- Linee di codice UI: ~600 linee (riduzione 25%)
- Componenti non utilizzati: 0 file
- UX Score: Miglioramento significativo

---

## 🔧 Comandi di Test per Ogni Fase

```bash
# Test generale
npm test

# Test build
npm run build

# Test CLI
npm start

# Test specifici componenti
npm test -- --testPathPattern=components
```

---

## 📝 Note Implementazione

### Compatibilità
- Verificare compatibilità @inkjs/ui con versione Ink corrente
- Testare su diverse dimensioni terminale
- Verificare supporto colori e temi

### Backup
- Creare branch `feature/inkui-migration` prima di iniziare
- Commit frequenti per ogni fase completata
- Mantenere versioni precedenti dei componenti critici

### Testing
- Test manuali dopo ogni fase
- Verificare regressioni funzionalità esistenti
- Test su diversi sistemi operativi

---

## ✅ Checklist Completamento

- [ ] **Fase 1**: Setup e installazione completata
- [ ] **Fase 2**: SplashScreen e InputArea migrati
- [ ] **Fase 3**: InitCommand e SessionSelector aggiornati
- [ ] **Fase 4**: ContentArea e CommandMenu migliorati
- [ ] **Fase 5**: Pulizia e ottimizzazione completata
- [ ] **Test**: Tutti i test passano
- [ ] **Documentazione**: README e guide aggiornate
- [ ] **Deploy**: Versione stabile rilasciata

---

*Documento creato: $(date)*
*Versione: 1.0*
*Autore: TaskMate CLI Team*
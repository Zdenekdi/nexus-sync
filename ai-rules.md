# 🤖 Antigravity AI Agent Rules: Strict Split Architecture

Tento soubor definuje globální pravidla architektury, pracovních postupů a standardů pro AI agenta. Před jakoukoliv úpravou kódu, spouštěním příkazů v terminálu nebo generováním návrhů si vždy přečti tato pravidla a řiď se jimi.

## 1. Základní Architektura (Striktní oddělení)
* **Dva nezávislé repozitáře:** Projekt se skládá ze dvou zcela oddělených částí: `[SERVER]` (Backend) a `[UI]` (Frontend).
* **Izolace kódu:** Nikdy nemíchej kód, závislosti (package.json) ani konfigurační soubory mezi serverem a UI. 
* **Web vs. Mobile (Striktní separace):** Vždy důsledně rozlišuj, která funkcionalita patří na web a která do mobilní aplikace.
    * Nativní funkce (Onboarding, Senzory, Biometrika, Push notifikace) patří **pouze do mobilní aplikace**.
    * Marketingové a administrativní weby nesmí tyto nativní prvky zobrazovat (např. skrývání úvodních slidů v prohlížeči).
* **Navigace v terminálu:** Než spustíš jakýkoliv příkaz (např. `npm install`, `git commit`), ověř si příkazem `pwd`, ve které složce se aktuálně nacházíš, abys neprovedl změny ve špatném repozitáři.

## 2. Komunikace (API & Typy)
* Komunikace mezi UI a Serverem probíhá **výhradně prostřednictvím API** (REST nebo GraphQL). 
* UI nesmí nikdy přímo přistupovat k databázi.
* Při tvorbě nových datových modelů na serveru vždy vygeneruj odpovídající Artifact s čistými TypeScript interfejsy pro UI tým/složku, aby byla zajištěna typová shoda.

## 3. Git a Verzování
* Každá složka (Server / UI) má svůj vlastní nezávislý Git repozitář.
* **Commit zprávy:** Používej konvenci (Conventional Commits) a vždy na začátek zprávy přidej kontext repozitáře, abys předešel zmatkům v historii.
    * Příklad pro Server: `feat(server): přidán endpoint pro autentizaci`
    * Příklad pro UI: `fix(ui): oprava vykreslování tabulky na mobilu`
* Před provedením operace `git push` vždy spusť `git status` a `git diff` pro ověření změn.

## 4. Vývojový proces a Artifacts
* Před implementací komplexní funkce (např. nové databázové schéma, nová architektura UI komponent) vždy nejprve
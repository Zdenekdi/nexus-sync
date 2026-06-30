# Příprava aplikace pro Google Play (Android App Bundle)

Tento návod popisuje, jak sestavit aplikaci do formátu **AAB (Android App Bundle)**, který je nutný pro nahrání aplikace do obchodu Google Play.

## 1. Příprava certifikátu (Keystore)

Před vytvořením finálního balíčku potřebuješ platný certifikát (`.jks` nebo `.keystore`), kterým bude aplikace podepsaná. Jelikož certifikát už máš u sebe v PC, stačí ho jen správně nakonfigurovat.

Otevři (nebo vytvoř) soubor `local.properties` uvnitř složky `client/android/` a přidej na jeho konec cesty k tvému klíči (vlož vlastní údaje místo vzorových):

```properties
KEYSTORE_FILE=/cesta/k/tvemu/klici/nexus-release-key.keystore
KEYSTORE_PASSWORD=tvojeHesloProKeystore
KEY_ALIAS=tvujAliasKlice
KEY_PASSWORD=tvojeHesloProKlic
```

*Poznámka:* Pokud preferuješ starší způsob, aplikace stále umí přečíst i samostatný soubor `keystore.properties`.

## 2. Nastavení správné URL k Privacy Policy

Nezapomeň při publikaci do formuláře Google Play Console (v sekci *App content > Privacy policy*) vložit platnou URL adresu, na které poběží právě vytvořená stránka s pravidly o soukromí. 

Například: `https://nexus.tvojedomena.cz/privacy`

## 3. Sestavení App Bundle (AAB)

Máš-li nastavený keystore a jsi ve složce projektu (`client`), spusť následující NPM script:

```bash
npm run build:android:aab
```

Tento skript zařídí vše potřebné:
1. Sestaví nejnovější kód React/Vite aplikace (frontend).
2. Provede synchronizaci assetů do Android projektu pomocí Capacitoru.
3. Přeloží nativní část aplikace (Java) a vytvoří podepsaný **AAB balíček** přes Gradle (`bundleNexusRelayRelease`).

### Kde najdeš výsledek?
Jakmile skript úspěšně doběhne, najdeš finální `.aab` balíček pro nahrání do Google Play v této složce:
`client/android/app/build/outputs/bundle/nexusRelayRelease/`

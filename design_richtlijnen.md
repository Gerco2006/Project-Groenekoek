# TravNL Ontwerp Richtlijnen

Referentiegerichte aanpak gebaseerd op moderne transport en utility-apps (zoals NS Reisplanner, Citymapper en Google Maps Transit), gecombineerd met een moderne stijl met afgeronde hoeken, blur-effecten en glasachtige (glassmorphic) elementen.

## Kernprincipes

- **Duidelijkheid boven alles:** Reisinformatie moet direct scanbaar zijn met een duidelijke hiërarchie.

- **Geleidelijke onthulling:** Inklapbare secties tonen details zonder te overladen.

- **Modern design:** Strak en functioneel ontwerp met moderne blur-effecten en afgeronde vormen.

- **Touch-vriendelijk:** Grote raakvlakken voor mobiel gebruik.

## Typografie

**Primaire lettertype:** Inter of SF Pro Display (via Google Fonts CDN)

**Hiërarchie:**

- Hero/Paginatitels: text-3xl md:text-4xl font-bold

- Sectietitels: text-xl md:text-2xl font-semibold

- Stationsnamen: text-lg font-semibold

- Tijden/Details: text-base font-medium

- Secundaire info: text-sm text-gray-600 dark:text-gray-400

- Perronnummers: text-lg font-bold (opvallende weergave)

## Layoutsysteem

**Afstandseenheden:** Gebruik Tailwind-eenheden 2, 4, 6, 8 en 12 (p-2, m-4, gap-6, py-8, mb-12)

### Containerstructuur:

- Hoofdinhoud: max-w-4xl mx-auto px-4

- Kaarten/resultaten: Volledige breedte binnen container met p-4 tot p-6

- Compact op mobiel, ruimtelijk op desktop

## Componentbibliotheek
### Navigatie

- Onderste tabbar voor mobiel (4 tabs: Planner, Vertrektijden, Meer)

- Bovenste navigatiebalk voor desktop met duidelijke actieve staten

- Iconen van Heroicons (outline = inactief, solid = actief)

- Reisplanner (standaardweergave)

- Stationszoekvelden met automatische suggesties

- Van/Naar velden met omwisselknop

- Datum/tijd selector (standaard: nu, met snelle opties)

- Zoekknop: volledige breedte op mobiel, inline op desktop

- Resultatenlijst met inklapbare kaarten voor reismogelijkheden

### Reiskaarten

- Ingeklapte weergave toont: vertrektijd, aankomsttijd, duur, overstappen

- Kleurenrand per treintype (accent links)

- Uitgeklapt toont: tijdlijn, perrons, looptijden, treindetails

- Elk traject aanklikbaar voor volledige route

- Tijdlijnvisualisatie met stippen en verbindingslijnen

### Vertrektijdenoverzicht

- Stationselector bovenaan met huidige selectie

- Live-updaterende lijst (met refresh-indicator)

- Elke regel toont: tijd, bestemming, perron, type trein, spoorwijzigingen

- Vertragingen duidelijk gemarkeerd

- Filteropties: treintype, richting

### Treindetailweergave

- Treinnummer en type bovenaan met gekleurde badge

- Route-tijdlijn met alle haltes en tijden

- Positie-indicator (indien real-time data)

- Drukte-indicatoren per rijtuigdeel

- Iconen voor faciliteiten (rolstoeltoegankelijk, stiltecoupé, wifi)

### Instellingen/Meer

- Grote sectiekaarten met iconen

- Schakelaar voor donker/licht thema (duidelijk zichtbaar)

- Over-sectie met projectbeschrijving

- GitHub-link voor bijdragen (met extern icoon)

- Versie-informatie

## Visuele stijl
### Glasachtige elementen

- Zoekbalken: backdrop-blur-md met halftransparante achtergrond

- Navigatiebalken: backdrop-blur-lg bg-white/80 dark:bg-gray-900/80

- Zwevende actieknoppen: backdrop-blur-md

### Afgeronde hoeken

- Kaarten: rounded-xl (12px)

- Knoppen: rounded-lg (8px)

- Invoervelden: rounded-lg (8px)

- Badges: rounded-full

- Modals/Overlays: rounded-2xl (16px)

### Schaduwen

- Kaarten: shadow-sm standaard, shadow-md bij hover

- Zwevende elementen: shadow-lg

- Actieve/focus-staten: shadow-outline met merkkleuraccent

### Treintype-indicatoren

- Intercity: Geel accent (linkerrand of badge)

- Sprinter: Blauw accent

- Niet-NS: Groen accent

- Duidelijke kleuronderscheiding met randen en badges

### Interactieve staten

- Inklapbare kaarten: vloeiende animaties (transition-all duration-300)

- Hover: lichte schaal- of achtergrondverandering

- Laden: skeletons met pulse-animatie

- Pull-to-refresh op mobiel

### Responsief gedrag

- Mobiel (basis): Eén kolom, onderste navigatie, kaarten op volledige breedte

- Tablet (md:): Grotere containers, Van/Naar naast elkaar

- Desktop (lg:): max-w-4xl gecentreerd, topnavigatie, meerdere kolommen voor zoekresultaten

### Toegankelijkheid

- ARIA-labels voor alle interactieve elementen

- Focusindicatoren op invoervelden en knoppen

- Voldoende kleurcontrast (minimaal WCAG AA)

- Toetsenbordnavigatie voor inklapbare delen

- Screenreader-updates voor live vertrektijden

### Afbeeldingen

- Hero-sectie: Niet nodig voor deze app – functionaliteit staat centraal met zoekinterface bovenaan

- Aanvullende afbeeldingen:

  - Over/Meer-pagina: Afbeelding van moderne Nederlandse treinen of stations (optioneel achtergrond met tekstoverlay)

  - Lege staten: Vriendelijke illustraties bij “geen resultaten” of “selecteer een station”

  - Treintype-badges: Kleine treiniconen naast labels (icon library)

### Prestatie-optimalisatie

- Laad details pas bij uitklappen

- Virtuele lijsten voor lange vertreklijsten

- Directe visuele feedback (optimistic UI)

- Cache recente zoekopdrachten en stations lokaal
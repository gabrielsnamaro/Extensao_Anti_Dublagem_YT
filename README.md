# AntiDUB - Bloqueador de Dublagem por IA no YouTube

Extensão para Google Chrome (Manifest V3) desenvolvida em Programação Orientada a Objetos (POO) que define automaticamente a faixa de áudio original como padrão em todos os vídeos do YouTube, prevenindo a imposição de dublagens sintéticas de inteligência artificial.

## Estrutura de Pacotes e Arquitetura POO

O projeto é 100% orientado a objetos, seguindo o princípio de **uma classe por arquivo** (com o nome do arquivo exatamente igual ao da classe) e organizado em pacotes modulares sob o diretório `src/`:

```
AntiDUB_Chrome_Extension/
├── icons/
│   ├── icon-16.png, icon-32.png, icon-48.png, icon-128.png
├── src/
│   ├── bridge/
│   │   └── SettingsBridge.js       # Ponte entre chrome.storage e o DOM
│   ├── controllers/
│   │   └── AntiDubController.js    # Orquestrador do ciclo de vida e eventos SPA
│   ├── player/
│   │   └── YouTubePlayerAdapter.js # Adapter para API nativa do player do YouTube
│   ├── popup/
│   │   ├── popup.html              # Interface do popup (Dark Mode)
│   │   ├── popup.css               # Estilização moderna
│   │   └── PopupController.js      # Controlador de eventos e persistência da UI
│   ├── resolvers/
│   │   └── AudioTrackResolver.js   # Orquestrador do Strategy Pattern
│   └── strategies/
│       ├── MetadataStrategy.js       # Resolução via streamingData.adaptiveFormats
│       ├── DeepInspectionStrategy.js # Varredura recursiva de nós e strings
│       ├── EliminationStrategy.js    # Resolução reversa por exclusão de dublagens
│       └── DomMenuStrategy.js        # Varredura do menu de engrenagem no DOM
├── manifest.json                   # Manifesto da extensão (Manifest V3)
└── README.md
```

### Detalhamento dos Módulos

#### `src/bridge/`
- [`SettingsBridge.js`](src/bridge/SettingsBridge.js): Executado em `world: ISOLATED`, escuta alterações no `chrome.storage.local` e transmite via `CustomEvent` para o contexto principal do YouTube.

#### `src/player/`
- [`YouTubePlayerAdapter.js`](src/player/YouTubePlayerAdapter.js): **Adapter Pattern** que isola e padroniza o acesso ao elemento `#movie_player` e suas funções internas (`getAudioTrack`, `getAvailableAudioTracks`, `setAudioTrack`, `isAdShowing`).

#### `src/strategies/`
- [`MetadataStrategy.js`](src/strategies/MetadataStrategy.js): Identifica faixas originais via metadados de streaming.
- [`DeepInspectionStrategy.js`](src/strategies/DeepInspectionStrategy.js): Realiza inspeção profunda em nós internos das faixas procurando referências a `original`.
- [`EliminationStrategy.js`](src/strategies/EliminationStrategy.js): Identifica o áudio original por exclusão, descartando faixas que contenham rótulos de dublagem.
- [`DomMenuStrategy.js`](src/strategies/DomMenuStrategy.js): Inspeciona os nós do menu de configurações (`.ytp-menuitem`) do player buscando o sufixo "original".

#### `src/resolvers/`
- [`AudioTrackResolver.js`](src/resolvers/AudioTrackResolver.js): **Strategy Pattern** que gerencia a cadeia de estratégias de resolução com prioridade e fallback seguro.

#### `src/controllers/`
- [`AntiDubController.js`](src/controllers/AntiDubController.js): **Facade/Controller** que orquestra o ciclo de vida da SPA (`yt-navigate-finish`), detecta comerciais (pre-roll ads) para evitar falsos positivos e efetua a troca automática para o áudio original.

#### `src/popup/`
- [`PopupController.js`](src/popup/PopupController.js): Gerencia as preferências do usuário no popup da extensão.
- [`popup.html`](src/popup/popup.html) / [`popup.css`](src/popup/popup.css): Interface visual compacta no tema escuro do YouTube.

## Como Instalar (Modo Desenvolvedor)

1. Abra o Google Chrome e navegue até `chrome://extensions`.
2. Ative a opção **Modo do desenvolvedor** no canto superior direito.
3. Clique no botão **Carregar sem compactação** (Load unpacked).
4. Selecione esta pasta raiz do projeto (`AntiDUB_Chrome_Extension`).

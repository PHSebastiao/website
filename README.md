# Brejelinha — Landing Page

Landing page estática e minimalista de desenvolvedor.

## Sobre

Sou **Pedro Henrique da Silva Sebastião**, conhecido online como **Brejelinha** ou **Brejela**.
Desenvolvedor FullStack (primariamente web) no [IATec](https://iatec.com/pt/).
Desenvolvo coisas quando dá: bots para Twitch, dashboards e ferramentas web.

## Projeto em destaque

### Botijela

Bot da Twitch para tradução de mensagens e gerenciamento de filas de espectadores.

- [Twitch](https://twitch.tv/botijela)
- [Dashboard](https://botijela.brejelinha.net/)
- [Documentação](https://botijela.brejelinha.net/wiki/)
- [Ko-fi](https://ko-fi.com/botijela)

## Como rodar localmente

Sem build, sem dependências: é HTML, CSS e JS puros. Basta servir a pasta.

```bash
python -m http.server 8000
# abrir http://localhost:8000
```

## Estrutura

```
brejelinha/
├── index.html          # markup completo (ícones sociais em SVG inline)
├── base.css            # tokens (:root), reset, layout, acessibilidade
├── components.css      # hero, janela de código, projeto, contato, rodapé, terminal
├── constellation.css   # camada de fundo (canvas)
├── constellation.js    # plexus: campo de nós em coordenadas do documento
├── main.js             # boot: ano do rodapé, revelação do código, e-mail, terminal
├── robots.txt
├── sitemap.xml
├── favicon.ico         # fallback implícito pedido em /favicon.ico
├── LICENSE
├── README.md
└── assets/
    ├── favicon/        # favicons + site.webmanifest
    └── images/
        ├── avatar-brejelinha.png
        ├── avatar-botijela.jpg
        └── brejelinha_embed.png
```

## Design

O sistema visual vive nos tokens de `base.css` (`:root`): cor, escala tipográfica,
raios e velocidades.

- **Cor:** paleta neutra dominante, com o acento (`--accent`, violeta) reservado para
  links, o CTA primário e o anel de foco. `--steel` faz a estrutura secundária.
- **Tipografia:** uma família (Inter) em 6 tamanhos; Fira Code só em código.
- **Movimento:** nada anima em loop. A barra que desenha sob os links
  (`.link-highlight::after`) e a revelação única do bloco de código são o que resta.
- **Seções:** cada `.section` abre com uma régua de 1px, então todo bloco tem começo
  e fim visíveis.
- **Fundo:** `constellation.js` distribui nós pelo documento inteiro e desenha só a
  faixa visível num canvas do tamanho da viewport, então rola junto com a página sem
  custo proporcional à altura. Derivam a 6–10 px/s; com `prefers-reduced-motion`
  fica um frame estático que ainda acompanha o scroll; a aba oculta pausa o loop.

## Detalhes

- **E-mail:** clicar em `phsilva.sebastiao@gmail.com` copia o endereço (com toast);
  sem clipboard, cai no `mailto:`.
- **Terminal secreto**
- **Fontes:** Inter e Fira Code via Google Fonts; ícones sociais são SVG inline, sem
  CDN de terceiros.

## Conecte-se

- [GitHub @PHSebastiao](https://github.com/PHSebastiao)
- [GitHub @Brejelinha](https://github.com/Brejelinha)
- [Twitch @brejelinha](https://twitch.tv/brejelinha)
- [Bluesky @brejelinha.net](https://bsky.app/profile/brejelinha.net)
- [E-mail: phsilva.sebastiao@gmail.com](mailto:phsilva.sebastiao@gmail.com)

## Licença

[MIT](LICENSE) © 2026 Pedro Henrique da Silva Sebastião (Brejelinha)

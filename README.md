# KIRA SAVE

Plataforma moderna para compartilhamento de saves de jogos.

## Características

- 🎮 Design moderno com tema escuro gaming
- 🌈 Gradientes vibrantes e animações suaves
- 📱 Totalmente responsivo (mobile, tablet, desktop)
- 🔐 Sistema de autenticação com JWT
- 📤 Upload de saves com drag & drop
- ⭐ Sistema de avaliações e favoritos
- 💬 Sistema de comentários
- 🔍 Busca em tempo real com filtros
- 🔔 Sistema de notificações
- 👨‍💼 Painel admin para moderação
- 🚀 Performance otimizada com lazy loading

## Tecnologias

### Backend
- Node.js com Express
- SQLite3
- JWT para autenticação
- Multer para upload de arquivos
- Helmet para segurança
- Rate limiting

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Tailwind CSS
- GSAP para animações
- Font Awesome para ícones
- Google Fonts (Inter, Orbitron, Poppins)

## Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente (opcional):
```bash
cp .env.example .env
```

4. Inicie o servidor:
```bash
npm start
```

Para desenvolvimento:
```bash
npm run dev
```

5. Acesse o site em `http://localhost:3000`

## Estrutura do Projeto

```
kira-save/
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── app.js
│   ├── images/
│   ├── uploads/
│   └── index.html
├── server/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── savesController.js
│   │   ├── userController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── upload.js
│   ├── models/
│   ├── routes/
│   │   ├── index.js
│   │   ├── auth.js
│   │   ├── saves.js
│   │   ├── users.js
│   │   └── admin.js
│   └── utils/
├── server.js
├── package.json
└── .env
```

## Funcionalidades

### Página Inicial
- Hero section com animação de background
- Estatísticas animadas
- Saves em destaque
- Jogos populares

### Página de Saves
- Grid de saves com cards interativos
- Filtros avançados (jogo, plataforma, categoria)
- Ordenação (mais baixados, recentes, avaliados)
- Paginação

### Página de Detalhes
- Informações completas do save
- Galeria de imagens
- Sistema de comentários
- Avaliação por estrelas
- Download com contador

### Página de Upload
- Formulário com drag & drop
- Preview do arquivo
- Upload de múltiplas imagens
- Barra de progresso

### Perfil do Usuário
- Avatar customizável
- Estatísticas pessoais
- Lista de saves postados
- Favoritos e histórico de downloads

### Painel Admin
- Dashboard com estatísticas
- Aprovação/rejeição de saves
- Sistema de denúncias
- Gerenciamento de usuários

## API Endpoints

### Autenticação
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Perfil do usuário

### Saves
- `GET /api/saves` - Listar saves
- `GET /api/saves/:id` - Detalhes do save
- `POST /api/saves` - Criar save
- `GET /api/saves/:id/download` - Download
- `POST /api/saves/:id/rate` - Avaliar
- `POST /api/saves/:id/favorite` - Favoritar
- `POST /api/saves/:id/comments` - Comentar

### Usuários
- `GET /api/users/:id` - Perfil público
- `GET /api/users/:id/saves` - Saves do usuário
- `GET /api/users/:id/favorites` - Favoritos
- `GET /api/users/me/notifications` - Notificações

### Admin
- `GET /api/admin/dashboard` - Dashboard
- `GET /api/admin/saves/pending` - Saves pendentes
- `PUT /api/admin/saves/:id/approve` - Aprovar save
- `PUT /api/admin/saves/:id/reject` - Rejeitar save

## Segurança

- Autenticação JWT
- Helmet para headers de segurança
- Rate limiting
- Validação de inputs
- Sanitização de dados
- Proteção XSS

## Contribuindo

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request.

## Licença

MIT License

## Contato

Para suporte, abra uma issue no repositório.

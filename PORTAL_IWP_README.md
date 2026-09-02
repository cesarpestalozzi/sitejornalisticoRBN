# 📰 PORTAL IWP - Portal de Notícias Profissional

Um portal de notícias moderno, responsivo e otimizado para SEO, desenvolvido com Next.js 16, React 19, TypeScript e Tailwind CSS.

## 🎯 Objetivo

Criar um portal responsivo, rápido e otimizado para SEO, transmitindo seriedade, credibilidade e tecnologia através de uma interface premium, elegante e minimalista.

## 🎨 Identidade Visual

### Cores Principais
- **Vermelho Principal**: #C40000 (marca institucional)
- **Branco**: #FFFFFF (fundo limpo)
- **Cinza Claro**: #F5F5F5 (áreas secundárias)
- **Preto**: #111111 (texto)

### Tipografia
- **Principal**: Inter, Roboto, Source Sans Pro
- **Sem Serifas**: Limpa e moderna
- **Espaçamento**: Generoso e organizado

## 🛠️ Tecnologias

- **Framework**: Next.js 16 (React 19)
- **Linguagem**: TypeScript
- **Estilo**: Tailwind CSS v4
- **Ícones**: Lucide React
- **Animações**: Framer Motion (pronto para integração)
- **Backend**: Supabase + PostgreSQL (pronto para integração)
- **Hospedagem**: Vercel
- **API**: REST

## 📁 Estrutura do Projeto

```
app/
├── components/          # Componentes React reutilizáveis
│   ├── Header.tsx      # Cabeçalho com menu responsivo
│   ├── Hero.tsx        # Grande manchete destacada
│   ├── BreakingNews.tsx # Barra de últimas horas
│   ├── NewsCard.tsx    # Card de notícia
│   ├── NewsGrid.tsx    # Grid de notícias por categoria
│   ├── Columnists.tsx  # Seção de colunistas
│   ├── Videos.tsx      # Seção de vídeos
│   ├── Podcasts.tsx    # Seção de podcasts
│   ├── Sidebar.tsx     # Barra lateral com widgets
│   └── Footer.tsx      # Rodapé completo
├── data/
│   └── mockData.ts     # Dados mock para desenvolvimento
├── types/
│   └── index.ts        # TypeScript interfaces
├── utils/
│   └── dateUtils.ts    # Utilitários de data
├── artigo/[id]/
│   └── page.tsx        # Página individual de artigo
├── categoria/[slug]/
│   └── page.tsx        # Página de categoria
├── admin/              # (Futuro) Painel administrativo
├── globals.css         # Estilos globais
├── layout.tsx          # Layout raiz
└── page.tsx            # Página inicial
```

## 🚀 Recursos Implementados

### ✅ Header e Navegação
- Logo com identidade visual
- Campo de pesquisa responsivo
- Menu de categorias (20+ categorias)
- Menu responsivo para mobile
- Botões Entrar e Assinar
- Data, temperatura e redes sociais

### ✅ Hero Principal
- Grande manchete com imagem
- Notícias secundárias ao lado
- Informações de autor e data
- Botão "Leia mais"

### ✅ Breaking News
- Barra animada vermelha
- "ÚLTIMA HORA" com atualização automática

### ✅ Seções de Notícias
- Grid responsivo (6 notícias por seção)
- Cards com imagem, categoria, título, resumo
- Informações de autor, data e tempo de leitura
- Seções por categoria:
  - Política, Economia, Mundo
  - Tecnologia, Esportes, Entretenimento

### ✅ Sidebar
- Newsletter com inscrição
- Mais Lidas (trending)
- Cotações (USD, EUR, BTC)
- Clima em tempo real
- Espaço para publicidade

### ✅ Colunistas
- Fotos circulares
- Mini biografia
- Link para coluna

### ✅ Multimídia
- Seção de Vídeos com player
- Seção de Podcasts com player
- Miniaturas e categorias

### ✅ Footer Completo
- Logo e descrição
- Links de navegação
- Links legais
- Newsletter
- Redes sociais
- Copyright

### ✅ Página de Artigo
- Layout completo de leitura
- Navegação breadcrumb
- Compartilhamento em redes
- Notícias relacionadas
- Espaço para comentários

### ✅ Página de Categoria
- Filtro por categoria
- Grid de notícias
- Paginação
- Sidebar

## 📱 Responsividade

- ✅ Desktop (1920px+)
- ✅ Laptop (1200px)
- ✅ Tablet (768px)
- ✅ Mobile (375px)

## 🔍 SEO (Pronto para Implementação)

### Meta Tags
- Open Graph
- Twitter Cards
- JSON-LD Schema
- Robots.txt
- Sitemap.xml
- Meta descriptions automáticas

### URLs Amigáveis
- `/categoria/politica`
- `/artigo/[id]`
- `/colunista/[id]`

### Breadcrumbs
- Navegação clara
- Hierarquia de informações

## 🎭 Recursos Extras

- ✅ Dark Mode (estrutura pronta)
- ✅ Lazy Loading (images)
- ✅ Infinite Scroll (estrutura pronta)
- ✅ Compartilhamento em redes sociais
- ✅ Sistema de tags populares
- ✅ Trending Topics

## ⚙️ Instalação e Setup

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### Instalação

```bash
# Clone o repositório
git clone <repo-url>

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.local.example .env.local

# Inicie o servidor de desenvolvimento
npm run dev
```

Acesse `http://localhost:3000` em seu navegador.

### Build para Produção

```bash
npm run build
npm start
```

## 🗄️ Estrutura de Dados (Supabase/PostgreSQL)

### Tabelas Principais

```sql
-- Artigos
CREATE TABLE articles (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  subtitle TEXT,
  content TEXT,
  excerpt VARCHAR(500),
  category_id UUID,
  author_id UUID,
  image_url VARCHAR(500),
  featured BOOLEAN,
  published_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Categorias
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  slug VARCHAR(100) UNIQUE,
  color VARCHAR(7)
);

-- Usuários
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  role ENUM('admin', 'editor', 'journalist', 'columnist'),
  password_hash VARCHAR(255),
  created_at TIMESTAMP
);

-- Comentários
CREATE TABLE comments (
  id UUID PRIMARY KEY,
  article_id UUID,
  user_id UUID,
  content TEXT,
  created_at TIMESTAMP
);
```

## 🔐 Autenticação (Futuro)

- Login com email/senha
- Roles: Admin, Editor, Jornalista, Colunista
- Suporte para OAuth (Google, GitHub)

## 📊 Admin Panel (Futuro)

- Dashboard com estatísticas
- CRUD de artigos
- Agendamento de publicações
- Gerenciamento de usuários
- Upload de imagens/vídeos
- SEO automático
- Analytics integrado

## 📈 Performance

### Otimizações Implementadas
- ✅ Server-side rendering
- ✅ Lazy loading de imagens
- ✅ Code splitting automático
- ✅ CSS purification
- ✅ Minificação de assets

### Métricas Alvo
- Lighthouse Score: 95+
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1

## 🚀 Deployment na Vercel

```bash
# Push para o repositório
git push origin main

# A Vercel detectará a build automaticamente
# Deploy em https://seu-portal-iwp.vercel.app
```

## 📝 Configurações Recomendadas

### Next.js
- SSR e ISR habilitados
- Image optimization
- Font optimization

### Tailwind CSS
- JIT mode ativo
- Purge de CSS não utilizado
- Modo dark theme disponível

### TypeScript
- Strict mode habilitado
- Type checking completo

## 🤝 Contribuição

1. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
2. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
3. Push para a branch (`git push origin feature/AmazingFeature`)
4. Abra um Pull Request

## 📄 Licença

Este projeto está sob licença propriétária. Todos os direitos reservados © 2026 PORTAL IWP.

## 📞 Suporte

Para suporte, envie um email para suporte@portaliwp.com ou abra uma issue no repositório.

---

**Desenvolvido com ❤️ usando Next.js, React e Tailwind CSS**

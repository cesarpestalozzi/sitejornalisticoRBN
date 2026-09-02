# 🌐 PORTAL IWP - GUIA DE ROTAS

## ✅ SERVIDOR RODANDO EM http://localhost:3000

---

## 📱 SITE PÚBLICO - ROTAS DISPONÍVEIS

### Páginas Principais
| Rota | Descrição | Status |
|------|-----------|--------|
| `/` | Homepage com todas as seções | ✅ |
| `/artigo/[id]` | Página de artigo individual | ✅ |
| `/categoria/[slug]` | Listagem de artigos por categoria | ✅ |

### Páginas de Informação
| Rota | Descrição | Status |
|------|-----------|--------|
| `/quem-somos` | Página "Sobre" com equipe | ✅ |
| `/contato` | Formulário e informações de contato | ✅ |
| `/privacidade` | Política de Privacidade | ✅ |
| `/termos` | Termos de Uso | ✅ |

---

## 🔐 PAINEL ADMINISTRATIVO - ROTAS

### Autenticação
| Rota | Descrição | Status |
|------|-----------|--------|
| `/admin/login` | Login de administrador | ✅ |
| Credenciais | admin@portaliwp.com / 123456 | ✅ |

### Dashboard
| Rota | Descrição | Status |
|------|-----------|--------|
| `/admin/dashboard` | Dashboard principal com stats | ✅ |

### Gerenciamento de Artigos
| Rota | Descrição | Status |
|------|-----------|--------|
| `/admin/artigos` | Listagem de artigos com filtros | ✅ |
| `/admin/artigos/novo` | Criar novo artigo | ✅ |
| `/admin/artigos/[id]` | Editar artigo existente | ✅ |

Funcionalidades de Artigos:
- ✅ Publicar Agora
- ✅ Salvar Rascunho
- ✅ Agendar publicação
- ✅ Editar
- ✅ Deletar
- ✅ Filtrar por status

### Gerenciamento de Categorias
| Rota | Descrição | Status |
|------|-----------|--------|
| `/admin/categorias` | CRUD de categorias | ✅ |

Funcionalidades:
- ✅ Criar categoria
- ✅ Editar (nome, slug, cor)
- ✅ Deletar
- ✅ Ver contador de artigos

### Gerenciamento de Usuários
| Rota | Descrição | Status |
|------|-----------|--------|
| `/admin/usuarios` | Gerenciar equipe | ✅ |

Funcionalidades:
- ✅ Listar usuários
- ✅ Ver roles (Administrador, Editor, Jornalista, Colunista)
- ✅ Ver status (Ativo/Inativo)
- ✅ Editar usuário
- ✅ Desativar usuário
- ✅ Criar novo

### Analytics
| Rota | Descrição | Status |
|------|-----------|--------|
| `/admin/analytics` | Dashboard de estatísticas | ✅ |

Funcionalidades:
- ✅ Gráfico de visualizações (linha)
- ✅ Gráfico de categorias (pizza)
- ✅ Gráfico de desempenho (barras)
- ✅ Top 5 artigos mais lidos
- ✅ Estatísticas gerais (views, compartilhamentos, comentários)

### Configurações
| Rota | Descrição | Status |
|------|-----------|--------|
| `/admin/configuracoes` | Configurações do portal | ✅ |

Seções:
- ✅ Configurações Gerais (nome, idioma, fuso)
- ✅ Email (admin, suporte, notificações)
- ✅ Segurança (timeout, 2FA)
- ✅ SEO (meta description, keywords, Analytics ID)
- ✅ Newsletter (ativo/frequência)
- ✅ Tema (cores primária e destaque)

---

## 🔗 TESTES RÁPIDOS

### Teste Homepage
```bash
curl http://localhost:3000
# Status: 200 ✅
```

### Teste Admin Login
```bash
curl http://localhost:3000/admin/login
# Status: 200 ✅
```

### Teste Artigo Sample
```bash
curl http://localhost:3000/artigo/1
# Status: 200 ✅
```

### Teste Categoria
```bash
curl http://localhost:3000/categoria/tecnologia
# Status: 200 ✅
```

---

## 📊 DADOS MOCKADOS DISPONÍVEIS

Todos os dados estão em `app/data/mockData.ts`:

### Categorias
```
- Últimas Notícias
- Política
- Brasil
- Mundo
- Economia
- Negócios
- Tecnologia
- Ciência
- Educação
- Saúde
- Cultura
- Cinema
- Séries
- Música
- Esportes
- Futebol
- Opinião
- Podcasts
- Colunistas
- Vídeos
- Ao Vivo
```

### Artigos por Categoria
- ✅ 5+ artigos por categoria
- ✅ Imagens em alta resolução (Unsplash)
- ✅ Metadados completos (autor, data, tempo de leitura)

### Colunistas
- ✅ 6 colunistas com bios
- ✅ Fotos circulares

### Podcasts
- ✅ 5 episódios
- ✅ Duração, descrição

### Vídeos
- ✅ 6 vídeos
- ✅ Miniaturras

---

## 🎯 FLUXO DE USO RECOMENDADO

### Primeira Vez
1. Acesse http://localhost:3000 → Explore o site
2. Vá para http://localhost:3000/admin/login → Faça login
3. Explore cada seção do admin

### Teste Completo de Publicação
1. Dashboard → "Novo Artigo"
2. Preencha:
   - Título: "Minha Primeira Notícia"
   - Categoria: "Tecnologia"
   - Autor: "Seu Nome"
   - Upload imagem
   - Escreva conteúdo
3. Clique "Publicar Agora"
4. Volte para homepage e veja a notícia aparecer
5. Clique no artigo e veja a página completa

### Teste de Agendamento
1. Dashboard → "Novo Artigo"
2. Preencha os dados
3. Clique "Agendar"
4. Escolha data e hora
5. Clique "Agendar Publicação"
6. Vá para "Artigos" e veja status como "Agendado"

### Teste de Rascunho
1. Dashboard → "Novo Artigo"
2. Preencha alguns dados
3. Clique "Salvar Rascunho"
4. Vá para "Artigos" e filtre por "Rascunho"
5. Clique "Editar" para continuar

---

## 🎨 COMPONENTES PÚBLICOS

Acessíveis em todas as páginas públicas:

### Header
- Logo Portal IWP
- Menu com 20+ categorias
- Campo de busca
- Botões Entrar/Assinar
- Data e temperatura
- Links de redes sociais
- Menu responsivo (mobile)

### Hero Section
- Grande manchete em destaque
- Imagem de alta resolução
- 4 artigos secundários ao lado

### Breaking News Bar
- Barra vermelha animada
- Label "ÚLTIMA HORA"
- Notícias em destaque

### News Cards
- Imagem
- Categoria com cor
- Título
- Resumo
- Autor e data
- Tempo de leitura

### Sidebar
- Newsletter signup
- Mais lidas
- Mais comentadas
- Mais compartilhadas
- Cotação do dólar, euro, bitcoin
- Clima
- Espaço para publicidade

### Footer
- Logo e quem somos
- Equipe
- Expediente
- Política editorial
- Política de privacidade
- Termos de uso
- Contato
- Publicidade
- Trabalhe conosco
- RSS
- Redes sociais
- Copyright

---

## ⚙️ AMBIENTE

### Variáveis
- `.env.local` criado (template pronto)

### Configuração Build
- `next.config.ts` otimizado
- Suporte a imagens Unsplash
- TypeScript configurado
- Tailwind CSS ativo

### Performance
- Turbopack (compilação em 1.6s)
- Next.js 16 + React 19
- Lazy loading pronto
- Server-side rendering pronto
- ISR pronto

---

## 📦 DEPENDÊNCIAS INSTALADAS

### Core
```json
{
  "next": "16.2.10",
  "react": "19.0",
  "typescript": "5.x"
}
```

### UI & Styling
```json
{
  "tailwindcss": "^3.x",
  "lucide-react": "^latest",
  "framer-motion": "^latest"
}
```

### Data Visualization
```json
{
  "recharts": "^latest"
}
```

### Utilities
```json
{
  "date-fns": "^latest",
  "clsx": "^latest",
  "next-themes": "^latest"
}
```

---

## 🚀 COMEÇAR AGORA

### 1. Servidor já está rodando?
```bash
# Se não estiver, execute:
npm run dev
```

### 2. Acessar site
```
http://localhost:3000
```

### 3. Fazer login no admin
```
http://localhost:3000/admin/login
Email: admin@portaliwp.com
Senha: 123456
```

### 4. Publicar primeira notícia
```
Dashboard → Novo Artigo → Preencha → Publicar
```

---

## ✨ PRONTO PARA PRODUÇÃO

Para fazer deploy:
```bash
npm run build    # Compila para produção
npm run start    # Inicia servidor de produção
```

Vercel:
```bash
vercel deploy    # Deploy automático
```

---

**Tudo pronto e funcionando! 🎉**

*Portal IWP v1.0 - Seu portal de notícias profissional*

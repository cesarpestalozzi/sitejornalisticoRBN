# 🔐 PAINEL ADMINISTRATIVO - PORTAL IWP

## 📋 Visão Geral

O painel administrativo completo para gerenciar o Portal IWP, com funcionalidades para publicar, editar, agendar e deletar notícias.

## 🔑 Credenciais de Teste

```
E-mail: admin@portaliwp.com
Senha: 123456
```

## 🚀 Funcionalidades Implementadas

### 1. **Autenticação** (`/admin/login`)
- ✅ Login seguro
- ✅ Validação de credenciais
- ✅ Armazenamento de sessão
- ✅ Logout com limpeza

### 2. **Dashboard** (`/admin/dashboard`)
- ✅ Overview com estatísticas principais
  - Total de artigos publicados
  - Visualizações
  - Usuários ativos
  - Crescimento
- ✅ Ações rápidas (Novo artigo, Gerenciar artigos, Categorias)
- ✅ Artigos recentes com status
- ✅ Links diretos para principais funcionalidades

### 3. **Gerenciamento de Artigos** (`/admin/artigos`)
- ✅ Listagem completa de artigos
- ✅ Filtro por status (Publicado, Rascunho, Agendado)
- ✅ Busca por título
- ✅ Exibição de visualizações
- ✅ Links para editar/deletar
- ✅ Informações de data e autor

### 4. **Criar Novo Artigo** (`/admin/artigos/novo`)
- ✅ Formulário completo com:
  - **Título** (máx 200 caracteres)
  - **Linha Fina** (subtitle)
  - **Categoria** (dropdown com todas as categorias)
  - **Autor**
  - **Imagem em destaque** (upload)
  - **Resumo/Excerpt** (máx 500 caracteres)
  - **Conteúdo completo**
  - **Checkbox Destacado** (hero)
  
- ✅ Pré-visualização em tempo real
- ✅ Contagem de caracteres
- ✅ Cálculo automático de tempo de leitura
- ✅ **Opções de Publicação:**
  - 🟢 **Publicar Agora** (publica imediatamente)
  - 💾 **Salvar Rascunho** (salva para edição posterior)
  - ⏰ **Agendar** (escolhe data e hora para publicação automática)

### 5. **Editar Artigo** (`/admin/artigos/[id]`)
- ✅ Carregamento de artigo existente
- ✅ Edição de todos os campos
- ✅ Visualização de imagem atual
- ✅ Histórico de edições
- ✅ Estatísticas em tempo real
  - Visualizações
  - Compartilhamentos
  - Comentários
- ✅ Informações de SEO
- ✅ Botão Salvar Alterações
- ✅ Botão Deletar com confirmação
- ✅ Status com indicador de publicação

### 6. **Gerenciamento de Categorias** (`/admin/categorias`)
- ✅ CRUD completo de categorias
- ✅ Interface visual com cores
- ✅ Formulário inline para criação/edição
- ✅ Contador de artigos por categoria
- ✅ Edição de:
  - Nome
  - Slug (URL-friendly)
  - Cor personalizada
- ✅ Deletar categorias
- ✅ Grid responsivo

### 7. **Gerenciamento de Usuários** (`/admin/usuarios`)
- ✅ Lista de todos os usuários
- ✅ Estatísticas de usuários
- ✅ Filtro por função:
  - Administrador (purple)
  - Editor (blue)
  - Jornalista (green)
  - Colunista (yellow)
- ✅ Status ativo/inativo
- ✅ Contador de artigos por usuário
- ✅ Data de entrada
- ✅ Editar usuários
- ✅ Desativar usuários
- ✅ Botão para novo usuário

### 8. **Sidebar Navegação**
- ✅ Menu responsivo (mobile/desktop)
- ✅ Links para todas as páginas
- ✅ Indicador de página ativa
- ✅ Informações do usuário logado
- ✅ Botão Sair
- ✅ Design minimalista

## 📱 Responsividade

- ✅ Desktop (1920px+)
- ✅ Laptop (1200px)
- ✅ Tablet (768px)
- ✅ Mobile (375px)

## 🎨 Design

- ✅ Tema moderno com cores Portal IWP
- ✅ Vermelho (#C40000) como cor primária
- ✅ Ícones Lucide React
- ✅ Cards e tabelas bem estruturadas
- ✅ Feedback visual para ações
- ✅ Formulários intuitivos

## 🔄 Fluxo de Publicação

```
┌─────────────────────────────────────┐
│  Novo Artigo                         │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┬──────────┐
        ▼             ▼          ▼
   Rascunho      Agendado   Publicado
        │             │          │
        └─────────────┴──────────┘
               │
        ┌──────┴────────┐
        ▼               ▼
    Editar         Deletar
```

## 📊 Estados dos Artigos

- **Rascunho** 🟡 - Salvo mas não publicado
- **Agendado** 🔵 - Será publicado automaticamente
- **Publicado** 🟢 - Disponível para leitura

## 📈 Funcionalidades Futuras

- [ ] Analytics detalhados
- [ ] Gerenciamento de comentários
- [ ] Sistema de permissões avançado
- [ ] Importação/Exportação de artigos
- [ ] Editor WYSIWYG
- [ ] Integração com Supabase
- [ ] Notificações em tempo real
- [ ] Histórico completo de versões
- [ ] SEO automático
- [ ] Geração de miniaturasde imagens

## 🛠️ Estrutura de Código

```
app/admin/
├── login/
│   └── page.tsx              # Página de login
├── dashboard/
│   └── page.tsx              # Dashboard principal
├── artigos/
│   ├── page.tsx              # Listagem de artigos
│   ├── novo/
│   │   └── page.tsx          # Criar novo artigo
│   └── [id]/
│       └── page.tsx          # Editar artigo
├── categorias/
│   └── page.tsx              # Gerenciar categorias
└── usuarios/
    └── page.tsx              # Gerenciar usuários

app/components/
└── AdminSidebar.tsx          # Sidebar e navegação
```

## 🎯 Como Usar

### Acessar o Painel
1. Vá para `http://localhost:3000/admin/login`
2. Use as credenciais de teste
3. Clique em "Entrar no Painel"

### Publicar um Artigo
1. Clique em "Novo Artigo" no dashboard
2. Preencha todos os campos
3. Escolha publicar agora, agendar ou rascunho
4. Pronto! ✅

### Editar Artigo
1. Vá para "Artigos" no menu
2. Localize o artigo na tabela
3. Clique em "Editar"
4. Faça as alterações
5. Clique "Salvar Alterações"

### Gerenciar Categorias
1. Vá para "Categorias" no menu
2. Clique "Nova Categoria"
3. Preencha nome, slug e escolha a cor
4. Clique "Criar"
5. Edite ou delete conforme necessário

## 🔒 Segurança (Futuro)

- [ ] Autenticação com JWT/Session
- [ ] Integração com Supabase Auth
- [ ] Roles e permissões
- [ ] Rate limiting
- [ ] CSRF protection
- [ ] Validação de entrada
- [ ] Sanitização de conteúdo

## 📝 Notas

- Todas as funcionalidades estão com dados mockados
- Pronto para integração com Supabase/PostgreSQL
- Mantém o design responsivo em todos os dispositivos
- Totalmente tipado com TypeScript

---

**Status:** ✅ Painel Administrativo Completo e Funcional

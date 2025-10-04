# Guia de Criação de Páginas de Blog

Este guia explica como criar novas páginas de blog utilizando os componentes reutilizáveis do Quartier Flow.

## Estrutura de Componentes Reutilizáveis

### Componentes UI (`src/app/_components/ui/`)

#### 1. Section
Wrapper padrão para seções da página.

```tsx
<Section id="optional-id" className="optional-classes">
  {children}
</Section>
```

#### 2. Container
Container responsivo com tamanhos predefinidos.

```tsx
<Container size="sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "5xl" | "6xl" | "7xl">
  {children}
</Container>
```

#### 3. SectionHeader
Cabeçalho de seção com título e subtítulo.

```tsx
<SectionHeader
  title="Título da Seção"
  subtitle="Subtítulo opcional"
  align="left" | "center" | "right"
/>
```

#### 4. Card
Card com estilos padrão da landing page.

```tsx
<Card variant="default" | "ghost" | "bordered" hover={true}>
  {children}
</Card>
```

#### 5. Button
Botão estilizado.

```tsx
<Button
  variant="primary" | "secondary" | "outline"
  size="sm" | "md" | "lg"
  href="/link"
>
  Texto do Botão
</Button>
```

### Layout de Blog (`src/app/_components/layouts/blog-layout.tsx`)

O `BlogLayout` é um componente completo que inclui:
- Header com navegação
- Background gradiente consistente
- Cabeçalho do artigo com meta-informações
- Área de conteúdo com estilos prose otimizados
- Link para voltar ao blog
- Footer

## Como Criar uma Nova Página de Blog

O blog usa **rotas dinâmicas** através de `[slug]`. Todo o conteúdo é gerenciado em um único arquivo.

### 1. Adicionar Novo Post

Edite o arquivo `src/app/blog/[slug]/blog-posts.ts` e adicione um novo objeto ao `blogPosts`:

```tsx
export const blogPosts: Record<string, BlogPost> = {
  // ... posts existentes

  "seu-novo-slug": {
    slug: "seu-novo-slug",
    title: "Título do Artigo",
    subtitle: "Subtítulo do artigo",
    category: "Categoria",
    publishedDate: "3 de outubro de 2025",
    readTime: "8",
    heroImage: suaImagem,
    heroImageAlt: "Descrição da imagem",
    content: {
      sections: [
        {
          type: "h2",
          content: "Primeiro Título",
        },
        {
          type: "p",
          content: "Parágrafo de texto...",
        },
        {
          type: "ul",
          content: [
            "Item 1 da lista",
            "Item 2 da lista",
          ],
        },
        {
          type: "image",
          content: "",
          image: {
            src: minhaImagem,
            alt: "Descrição da imagem",
          },
        },
      ],
    },
  },
};
```

### 2. Importar Imagens

No topo do arquivo `blog-posts.ts`, importe as imagens que você vai usar:

```tsx
import minhaImagem from "~/assets/landing-page/bills-1.jpg";
```

### 3. Estilos Prose Disponíveis

O BlogLayout usa `@tailwindcss/typography` com estilos customizados:

- **Headings**: Automaticamente estilizados com tamanhos responsivos
- **Parágrafos**: Cor cinza-300, espaçamento otimizado
- **Links**: Sublinhado com hover effect
- **Listas**: Espaçamento e cores consistentes
- **Strong/Bold**: Texto branco para destaque

### 4. Usando Imagens

#### Imagem Hero (opcional)
Adicione uma imagem principal no topo do artigo usando as props `heroImage` e `heroImageAlt`:

```tsx
<BlogLayout
  title="Título"
  heroImage={billsImage}
  heroImageAlt="Descrição da imagem"
>
```

#### Imagens Inline
Use o componente `Image` do Next.js dentro do conteúdo:

```tsx
import Image from "next/image";
import myImage from "~/assets/landing-page/meeting-1.jpg";

<Image
  src={myImage}
  alt="Descrição da imagem"
  className="my-8 w-full"
/>
```

#### Imagens Disponíveis
As imagens estão em `src/assets/landing-page/`:

- **bills-1.jpg até bills-4.jpg** - Gestão financeira, contas, orçamentos
- **notes-1.jpg até notes-4.jpg** - Anotações, comunicação, documentos
- **meeting-1.jpg até meeting-4.jpg** - Reuniões, assembleias
- **planning-1.jpg até planning-3.jpg** - Planejamento estratégico
- **hall-1.jpg e hall-2.jpg** - Hall de entrada, áreas comuns

### 3. Tipos de Seções Disponíveis

```tsx
// Título nível 2
{ type: "h2", content: "Título" }

// Título nível 3
{ type: "h3", content: "Subtítulo" }

// Parágrafo
{ type: "p", content: "Texto do parágrafo" }

// Lista não ordenada
{ type: "ul", content: ["Item 1", "Item 2"] }

// Lista ordenada
{ type: "ol", content: ["Passo 1", "Passo 2"] }

// Imagem
{
  type: "image",
  content: "",
  image: {
    src: minhaImagem,
    alt: "Descrição"
  }
}
```

### 4. Acessar a Página

Após adicionar o post em `blog-posts.ts`, a página estará automaticamente disponível em:

```
/blog/seu-novo-slug
```

### 5. Exemplo Completo

Veja os exemplos em `src/app/blog/[slug]/blog-posts.ts`

## 10 Assuntos Sugeridos para Criação

1. **Síndico Transparente, Condomínio Feliz** ✅
   - Slug: `transparencia-condominios`
   - Categoria: Gestão Financeira

2. **Comunicação em Condomínios: 7 Estratégias Comprovadas** ✅
   - Slug: `comunicacao-eficaz-condominios`
   - Categoria: Comunicação

3. **Automatize a Gestão do seu Condomínio** ✅
   - Slug: `automatizar-gestao-condominial`
   - Categoria: Tecnologia

4. **Gestão de Inadimplência: Estratégias Humanizadas** ✅
   - Slug: `reduzir-inadimplencia`
   - Categoria: Gestão Financeira

5. **Descomplicando as Finanças do Condomínio**
   - Slug: `entender-balancete-mensal`
   - Categoria: Gestão Financeira

6. **Assembleia de Condomínio no Século 21**
   - Slug: `assembleias-produtivas`
   - Categoria: Gestão

7. **Manutenção Preventiva: Como Economizar Dinheiro**
   - Slug: `manutencao-preventiva`
   - Categoria: Manutenção

8. **Reservas de Áreas Comuns Sem Estresse**
   - Slug: `reservas-areas-comuns`
   - Categoria: Tecnologia

9. **Lei 14.905/2024: O que Mudou na Gestão**
   - Slug: `lei-14905-mudancas`
   - Categoria: Legislação

10. **LGPD em Condomínios: Guia Prático**
    - Slug: `lgpd-condominios-guia`
    - Categoria: Legislação

## Boas Práticas

1. **SEO**: Use títulos descritivos e headings hierárquicos (h2, h3)
2. **Legibilidade**: Parágrafos curtos (2-4 linhas)
3. **Estrutura**: Divida o conteúdo em seções claras
4. **CTAs**: Inclua chamadas para ação relevantes ao Quartier Flow
5. **Consistência**: Mantenha o tom educativo e informativo
6. **Imagens**: Adicione imagens quando apropriado (use Next.js Image)

## Próximos Passos

- [ ] Criar página index do blog (`/blog/page.tsx`)
- [ ] Implementar listagem de artigos
- [ ] Adicionar filtros por categoria
- [ ] Implementar busca de artigos
- [ ] Adicionar metadata para SEO

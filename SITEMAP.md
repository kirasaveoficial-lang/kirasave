# Sitemap Dinâmico - KIRA SAVE

## 📋 O que é um Sitemap?

Um sitemap é um arquivo XML que lista todas as URLs importantes do seu site. Ele ajuda os motores de busca (Google, Bing, etc.) a descobrir e indexar suas páginas mais eficientemente.

## 🗺️ Sitemap do KIRA SAVE

O sitemap dinâmico é gerado automaticamente em tempo real e inclui:

### **Páginas Incluídas:**

1. **Página Inicial** (`/`)
   - Prioridade: 1.0 (mais importante)
   - Frequência de atualização: Diária
   - Última modificação: Data atual

2. **Página de Saves** (`/saves`)
   - Prioridade: 0.9
   - Frequência de atualização: Diária
   - Última modificação: Data atual

3. **Páginas Individuais de Saves** (`/saves/:id`)
   - Prioridade: 0.8
   - Frequência de atualização: Semanal
   - Última modificação: Baseada em `updated_at` do save
   - Inclui apenas saves com status `approved`

4. **Páginas de Jogos/Categorias** (`/saves?game=:name`)
   - Prioridade: 0.7
   - Frequência de atualização: Semanal
   - Última modificação: Baseada em `updated_at` do jogo

## 🌐 Como Acessar

### **Em Produção (Render):**
```
https://kirasave.online/sitemap.xml
```

### **Em Desenvolvimento (Local):**
```
http://localhost:3000/sitemap.xml
```

## ⚙️ Configuração

### **Variável de Ambiente (Render):**

Configure a variável `BASE_URL` no painel do Render:

1. **Acesse:** Serviço "kira-save" → Environment
2. **Adicione:**
   ```
   BASE_URL=https://kirasave.online
   ```
3. **Clique em:** "Save Changes" e aguarde o redeploy

### **Se não configurar:**
O sitemap usará `https://kirasave.online` como URL base padrão.

## 🔍 Enviar Sitemap para Google

### **Google Search Console:**

1. **Acesse:** https://search.google.com/search-console
2. **Adicione sua propriedade:** `https://kirasave.online`
3. **Verifique a propriedade:** (DNS, HTML file, etc.)
4. **Vá em:** Sitemaps
5. **Adicione:** `sitemap.xml`
6. **Clique em:** Enviar

### **Bing Webmaster Tools:**

1. **Acesse:** https://www.bing.com/webmasters
2. **Adicione seu site**
3. **Vá em:** Sitemaps
4. **Adicione:** `https://kirasave.online/sitemap.xml`
5. **Clique em:** Submit

## 🔄 Atualização Automática

O sitemap é gerado dinamicamente a cada requisição, então:

- ✅ Sempre que um novo save for aprovado, ele aparece automaticamente
- ✅ Sempre que um save for atualizado, a data de modificação muda
- ✅ Sempre que um jogo for adicionado, ele aparece automaticamente
- ✅ Não é necessário regenerar manualmente

## 📊 Estrutura do XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://kirasave.online/</loc>
    <lastmod>2026-10-04</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://kirasave.online/saves</loc>
    <lastmod>2026-10-04</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://kirasave.online/saves/123</loc>
    <lastmod>2026-10-04</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <!-- Mais URLs... -->
</urlset>
```

## 🚀 Robots.txt

Adicione isso ao seu `robots.txt` para indicar onde está o sitemap:

```txt
User-agent: *
Allow: /

Sitemap: https://kirasave.online/sitemap.xml
```

## 📝 Notas Importantes

- O sitemap inclui apenas saves com status `approved`
- Saves pendentes ou rejeitados não aparecem
- A data de modificação é baseada no campo `updated_at` do banco
- O sitemap é compatível com PostgreSQL (produção) e SQLite (desenvolvimento)
- Content-Type é `application/xml` para compatibilidade com motores de busca

## 🔧 Troubleshooting

### **Sitemap vazio:**
- Verifique se há saves aprovados no banco
- Verifique se a conexão com o banco está funcionando

### **URLs incorretas:**
- Configure a variável `BASE_URL` no Render
- Verifique se não tem `/` no final da URL

### **Erro 500:**
- Verifique as logs do servidor
- Verifique se a tabela `saves` e `games` existem

## 📚 Referências

- [Sitemaps.org](https://www.sitemaps.org/)
- [Google Search Console](https://search.google.com/search-console)
- [Bing Webmaster Tools](https://www.bing.com/webmasters)

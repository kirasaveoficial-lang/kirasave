# Cloudinary Setup Guide

## O que é Cloudinary?

Cloudinary é um serviço de armazenamento de mídia em nuvem que oferece:
- ✅ 25GB de armazenamento gratuito
- ✅ CDN incluído (download mais rápido)
- ✅ Transformações de imagem automáticas
- ✅ Funciona localmente e em produção
- ✅ Ideal para armazenar avatares e saves

## Como configurar

### 1. Criar conta gratuita no Cloudinary

1. Acesse: https://cloudinary.com/users/register/free
2. Crie uma conta usando seu email
3. Faça login

### 2. Obter credenciais

1. No painel do Cloudinary, vá em "Dashboard"
2. Anote as seguintes informações:
   - **Cloud Name** (nome da nuvem)
   - **API Key** (chave da API)
   - **API Secret** (segredo da API)

### 3. Configurar no Render

1. Vá no painel do Render
2. No serviço "kira-save", vá em "Environment"
3. Adicione as seguintes variáveis de ambiente:
   ```
   CLOUDINARY_CLOUD_NAME=seu-cloud-name
   CLOUDINARY_API_KEY=sua-api-key
   CLOUDINARY_API_SECRET=sua-api-secret
   ```
4. Clique em "Save Changes"
5. Faça deploy manual

### 4. Funcionamento

- **Em produção (Render):** Usa Cloudinary automaticamente
- **Em desenvolvimento (local):** Usa sistema de arquivos local
- **Arquivos:** Avatares, saves, imagens de saves
- **Downloads:** Permanecem após deploy/restart

## Variáveis de ambiente

- `CLOUDINARY_CLOUD_NAME`: Nome da nuvem Cloudinary
- `CLOUDINARY_API_KEY`: Chave da API
- `CLOUDINARY_API_SECRET`: Segredo da API
- `NODE_ENV=production`: Ativa Cloudinary em produção

## Teste local com Cloudinary

Para testar Cloudinary localmente:

1. No arquivo `.env` (não o `.env.production`), adicione:
   ```
   CLOUDINARY_CLOUD_NAME=seu-cloud-name
   CLOUDINARY_API_KEY=sua-api-key
   CLOUDINARY_API_SECRET=sua-api-secret
   NODE_ENV=production
   ```

2. Reinicie o servidor
3. Os uploads irão para o Cloudinary

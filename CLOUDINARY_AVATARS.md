# Cloudinary Setup para Avatares e Imagens

## O que foi alterado:

- **Saves:** Agora usam links externos (Mediafire, Mega, etc.) - NÃO usa Cloudinary
- **Avatares:** Continuam usando Cloudinary para armazenamento persistente
- **Imagens de saves:** Continuam usando Cloudinary para armazenamento persistente

## Por que Cloudinary para avatares e imagens?

- ✅ **Armazenamento gratuito** (25GB)
- ✅ **Persistente após deploy** - avatares não se perdem
- ✅ **CDN incluído** - carregamento mais rápido
- ✅ **Transformações automáticas** - redimensionamento automático
- ✅ **Funciona local e em produção**

## Como configurar no Render:

### 1. Acesse o painel do Cloudinary
- Dashboard → Ver suas credenciais
- Cloud Name: `k0dmfseu`
- API Key: `186913271941157`
- API Secret: Clique no ícone de olho para ver o secret completo

### 2. Configure no Render
1. Render → Serviço "kira-save" → Environment
2. Adicione as variáveis:
   ```
   CLOUDINARY_CLOUD_NAME=k0dmfseu
   CLOUDINARY_API_KEY=186913271941157
   CLOUDINARY_API_SECRET=seu-secret-completo
   ```
3. Clique em "Save, rebuild, and deploy"

## Funcionamento:

### Em produção (Render):
- **Avatares:** Salvos no Cloudinary
- **Imagens de saves:** Salvos no Cloudinary
- **Saves:** Links externos (Mediafire, Mega, etc.)

### Em desenvolvimento (local):
- **Avatares:** Sistema de arquivos local
- **Imagens de saves:** Sistema de arquivos local
- **Saves:** Links externos (Mediafire, Mega, etc.)

## Verificação:

Após configurar e fazer deploy, verifique as logs do Render:
```
=== CLOUDINARY CONFIG ===
Cloud Name: SET
API Key: SET
API Secret: SET
Cloudinary will be used for avatars and images: true
```

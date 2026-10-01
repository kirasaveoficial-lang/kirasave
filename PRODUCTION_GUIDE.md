# KIRA SAVE - Guia de Produção

## ✅ Configurações Aplicadas

### 1. Segurança
- ✅ JWT_SECRET atualizado para produção
- ✅ NODE_ENV definido como "production"
- ✅ Rate limiting configurado (150 requisições por 15 minutos)
- ✅ Helmet configurado para segurança HTTP
- ✅ CORS habilitado
- ✅ Upload limitado a 20MB

### 2. Anúncios
- ✅ Banner superior (728x90) adicionado
- ✅ Banner inferior (728x90) adicionado
- ✅ Espaço de anúncio na página de detalhes do save (250px altura)
- ✅ CSS classes preparadas para diferentes tamanhos de anúncio

## 📋 Próximos Passos para Ir ao Ar

### 1. Configurar Anúncios

#### Google AdSense
1. Crie uma conta em [Google AdSense](https://www.google.com/adsense/)
2. Adicione seu site
3. Copie o código do AdSense
4. Substitua os placeholders de anúncio com o código real

**Exemplo de implementação:**
```html
<!-- Substitua os divs com classe ad-placeholder -->
<div class="ad-placeholder">
    <ins class="adsbygoogle"
         style="display:block"
         data-ad-client="ca-pub-SEU_ID_PUBLISHER"
         data-ad-slot="SEU_AD_SLOT"
         data-ad-format="auto"></ins>
    <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</div>
```

### 2. Configurar HTTPS

#### Opção A: Cloudflare (Recomendado)
1. Crie conta gratuita em [Cloudflare](https://www.cloudflare.com/)
2. Adicione seu domínio
3. Configure DNS apontando para seu servidor
4. Ative "Always Use HTTPS"
5. Cloudflare fornece SSL gratuito

#### Opção B: Let's Encrypt
```bash
# Certbot para Nginx
sudo certbot --nginx -d seu-dominio.com

# Certbot para Apache
sudo certbot --apache -d seu-dominio.com
```

### 3. Configurar Backup Automático

#### Backup do Banco de Dados
Crie um script `backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp /path/to/database.sqlite /backups/database_$DATE.sqlite
# Manter apenas últimos 7 dias
find /backups -name "database_*.sqlite" -mtime +7 -delete
```

Adicione ao crontab:
```bash
0 2 * * * /path/to/backup.sh
```

### 4. Configurar PM2 (Process Manager)

Instale PM2:
```bash
npm install -g pm2
```

Inicie o servidor:
```bash
pm2 start server.js --name kira-save
pm2 save
pm2 startup
```

### 5. Configurar Firewall

#### UFW (Ubuntu/Debian)
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 6. Monitoramento

#### Opção A: PM2 Plus (Gratuito)
```bash
pm2 link pm2-plus-key secret-key
```

#### Opção B: Uptime Robot
- Crie conta em [UptimeRobot](https://uptimerobot.com/)
- Monitore http://seu-dominio.com

## 🔧 Configurações Avançadas

### Migração para PostgreSQL (Opcional)

Se você tiver muito tráfego, considere migrar de SQLite para PostgreSQL:

1. Instale PostgreSQL no servidor
2. Crie banco de dados
3. Instale `pg` no Node.js:
```bash
npm install pg
```

4. Atualize `server/config/database.js` para usar PostgreSQL

### Compilar Tailwind CSS (Opcional)

Para melhor performance, compile Tailwind CSS localmente:

1. Instale Tailwind CLI:
```bash
npm install -D tailwindcss
npx tailwindcss init
```

2. Configure `tailwind.config.js`
3. Compile CSS:
```bash
npx tailwindcss -i ./src/input.css -o ./public/css/style.css --minify
```

4. Remova CDN do HTML

## 📊 Métricas para Monitorar

- Uptime do servidor
- Tempo de resposta
- Tráfego de rede
- Uso de CPU/RAM
- Número de usuários ativos
- Taxa de conversão de anúncios

## ⚠️ Alertas Importantes

1. **Nunca** envie `.env` para repositórios públicos
2. **Sempre** mantenha backups recentes
3. **Teste** atualizações em ambiente de staging primeiro
4. **Monitore** logs de erro regularmente
5. **Atualize** dependências regularmente

## 📞 Suporte

Em caso de problemas:
- Verifique logs: `pm2 logs kira-save`
- Verifique status: `pm2 status`
- Reinicie: `pm2 restart kira-save`

# LCC TV v2

Protótipo web para TV com Instagram Business Login.

## Já preparado
- Tela TV 16:9 em `/`
- Painel em `/painel.html`
- OAuth do Instagram com `instagram_business_basic`
- Leitura de `/me` e `/me/media`
- Fotos e vídeos; carrosséis ficam preparados para a próxima evolução
- Atualização automática do feed a cada 5 minutos
- URLs de privacidade, termos e exclusão de dados

## Configuração
1. Node.js 18+.
2. Copie `.env.example` para `.env`.
3. Preencha o ID do app, a chave secreta e a URL pública de callback.
4. `npm install` e `npm start`.
5. Cadastre exatamente a URL `/auth/instagram/callback` nas configurações de Business Login do Instagram.

## Segurança
Nunca coloque a chave secreta no HTML. Este protótipo guarda o token em memória; em produção deve usar armazenamento seguro persistente.

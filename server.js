const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();

const PORT = process.env.PORT || 3000;

const APP_ID = process.env.INSTAGRAM_APP_ID;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;

// Aceita os dois nomes para evitar conflito com a variável cadastrada no Render
const REDIRECT_URI =
  process.env.INSTAGRAM_REDIRECT_URI ||
  process.env.REDIRECT_URI;

const HOST = 'https://graph.instagram.com';

// Armazenamento simples em memória
let store = {
  accessToken: null,
  expiresAt: 0,
  username: null
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Arquivos HTML/CSS/JS do projeto
app.use(express.static(__dirname));


// ============================================================
// CONFIGURAÇÃO
// ============================================================

function cfg(res) {
  if (!APP_ID || !APP_SECRET || !REDIRECT_URI) {
    res.status(500).json({
      error: 'Servidor não configurado',
      message:
        'Configure INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET e REDIRECT_URI no Render.'
    });

    return false;
  }

  return true;
}


// ============================================================
// LOGIN COM INSTAGRAM
// ============================================================

app.get('/auth/instagram', (req, res) => {
  if (!cfg(res)) return;

  // Gera um state para segurança
  const state = crypto.randomBytes(24).toString('hex');

  const params = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'instagram_business_basic',
    state: state
  });

  const authUrl =
    'https://www.instagram.com/oauth/authorize?' +
    params.toString();

  console.log('Iniciando login do Instagram...');
  console.log('Redirect URI:', REDIRECT_URI);

  res.redirect(authUrl);
});


// ============================================================
// CALLBACK DO INSTAGRAM
// ============================================================

app.get('/auth/instagram/callback', async (req, res) => {
  if (req.query.error) {
    console.error(
      'Erro retornado pelo Instagram:',
      req.query.error,
      req.query.error_description
    );

    return res
      .status(400)
      .send(
        req.query.error_description ||
        req.query.error ||
        'Erro na autenticação do Instagram.'
      );
  }

  if (!cfg(res)) return;

  const code = req.query.code;

  if (!code) {
    return res.status(400).send(
      'Código de autorização não recebido pelo Instagram.'
    );
  }

  try {
    console.log('Código recebido. Trocando por token...');
console.log('DEBUG APP_ID:', APP_ID);
console.log('DEBUG REDIRECT_URI:', REDIRECT_URI);
console.log('DEBUG CODE recebido:', !!code);

    // --------------------------------------------------------
    // Troca o CODE pelo ACCESS TOKEN
    // --------------------------------------------------------

    const form = new URLSearchParams({
      client_id: APP_ID,
      client_secret: APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      code: code
    });

    const tokenResponse = await fetch(
      'https://api.instagram.com/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: form.toString()
      }
    );

    const tokenData = await tokenResponse.json();

    console.log(
      'Resposta da troca de token:',
      tokenResponse.status
    );

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Falha ao obter token:', tokenData);

      return res.status(400).send(
        'Falha ao trocar o código por token. Verifique os logs do Render.'
      );
    }

    // Guarda o token inicial
    store.accessToken = tokenData.access_token;

    // --------------------------------------------------------
    // Busca os dados básicos da conta
    // --------------------------------------------------------

    const profile = await ig('/me', {
      fields:
        'id,username,name,account_type,profile_picture_url,media_count'
    });

    console.log(
      'Instagram conectado:',
      profile.username
    );

    store.username = profile.username;

    // --------------------------------------------------------
    // Troca por token de longa duração
    // --------------------------------------------------------

    try {
      console.log('Solicitando token de longa duração...');

      const longTokenUrl =
        `${HOST}/access_token` +
        `?grant_type=ig_exchange_token` +
        `&client_secret=${encodeURIComponent(APP_SECRET)}` +
        `&access_token=${encodeURIComponent(store.accessToken)}`;

      const longTokenResponse = await fetch(longTokenUrl);

      const longTokenData =
        await longTokenResponse.json();

      if (
        longTokenResponse.ok &&
        longTokenData.access_token
      ) {
        store.accessToken =
          longTokenData.access_token;

        store.expiresAt =
          Date.now() +
          (longTokenData.expires_in || 5184000) *
            1000;

        console.log(
          'Token de longa duração obtido com sucesso.'
        );
      } else {
        console.warn(
          'Não foi possível trocar para token de longa duração:',
          longTokenData
        );
      }
    } catch (tokenError) {
      console.warn(
        'Erro ao solicitar token de longa duração:',
        tokenError.message
      );
    }

    // --------------------------------------------------------
    // Volta para o painel
    // --------------------------------------------------------

    res.redirect('/painel.html?connected=1');

  } catch (error) {
    console.error(
      'Erro na conexão com o Instagram:',
      error
    );

    res.status(500).send(
      'Erro na conexão com o Instagram. Veja os logs do Render.'
    );
  }
});


// ============================================================
// FUNÇÃO PARA CHAMAR A API DO INSTAGRAM
// ============================================================

async function ig(endpoint, params = {}) {
  if (!store.accessToken) {
    throw new Error('Instagram não conectado');
  }

  const query = new URLSearchParams({
    ...params,
    access_token: store.accessToken
  });

  const response = await fetch(
    `${HOST}${endpoint}?${query.toString()}`
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      'Erro da API do Instagram:',
      data
    );

    throw new Error(
      data?.error?.message ||
      'Erro na API do Instagram'
    );
  }

  return data;
}


// ============================================================
// STATUS DA CONEXÃO
// ============================================================

app.get('/api/status', (req, res) => {
  res.json({
    connected: !!store.accessToken,
    username: store.username,
    expiresAt: store.expiresAt || null
  });
});


// ============================================================
// BUSCAR PUBLICAÇÕES
// ============================================================

app.get('/api/media', async (req, res) => {
  try {
    const fields =
      'id,' +
      'caption,' +
      'media_type,' +
      'media_url,' +
      'thumbnail_url,' +
      'permalink,' +
      'timestamp,' +
      'username,' +
      'like_count,' +
      'comments_count,' +
      'children{media_url,media_type,thumbnail_url}';

    const requestedLimit =
      Number(req.query.limit || 50);

    const limit = Math.min(
      Math.max(requestedLimit, 1),
      100
    );

    const data = await ig('/me/media', {
      fields: fields,
      limit: limit
    });

    res.json(data);

  } catch (error) {
    console.error(
      'Erro ao buscar mídias:',
      error
    );

    res.status(401).json({
      error: error.message
    });
  }
});


// ============================================================
// DESCONECTAR INSTAGRAM
// ============================================================

app.post('/api/disconnect', (req, res) => {
  store = {
    accessToken: null,
    expiresAt: 0,
    username: null
  };

  res.json({
    ok: true
  });
});


// ============================================================
// PÁGINAS LEGAIS
// ============================================================

app.get('/privacy', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'privacy.html')
  );
});

app.get('/terms', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'terms.html')
  );
});

app.get('/data-deletion', (req, res) => {
  res.sendFile(
    path.join(__dirname, 'data-deletion.html')
  );
});


// ============================================================
// INICIAR SERVIDOR
// ============================================================

app.listen(PORT, () => {
  console.log(`LCC TV: http://localhost:${PORT}`);

  console.log(
    'Instagram App ID configurado:',
    !!APP_ID
  );

  console.log(
    'Instagram App Secret configurado:',
    !!APP_SECRET
  );

  console.log(
    'Redirect URI configurada:',
    REDIRECT_URI || 'NÃO CONFIGURADA'
  );
});

const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();

const PORT = process.env.PORT || 3000;

const APP_ID = process.env.INSTAGRAM_APP_ID;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;

const REDIRECT_URI =
  process.env.INSTAGRAM_REDIRECT_URI ||
  process.env.REDIRECT_URI;

const HOST = 'https://graph.instagram.com';

let store = {
  accessToken: null,
  expiresAt: 0,
  username: null,
  profile: null
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
// LOGIN
// ============================================================

app.get('/auth/instagram', (req, res) => {

  if (!cfg(res)) return;

  const state =
    crypto.randomBytes(24).toString('hex');

  const params = new URLSearchParams({

    client_id: APP_ID,

    redirect_uri: REDIRECT_URI,

    response_type: 'code',

    scope: 'instagram_business_basic',

    state,

    enable_fb_login: '0',

    force_authentication: '1'

  });

  const authUrl =
    'https://www.instagram.com/oauth/authorize?' +
    params.toString();

  console.log(
    'Iniciando login do Instagram...'
  );

  console.log(
    'Redirect URI:',
    REDIRECT_URI
  );

  res.redirect(authUrl);
});


// ============================================================
// CALLBACK
// ============================================================

app.get(
  '/auth/instagram/callback',
  async (req, res) => {

    if (req.query.error) {

      return res
        .status(400)
        .send(
          req.query.error_description ||
          req.query.error
        );

    }

    if (!cfg(res)) return;

    const code =
      req.query.code;

    if (!code) {

      return res
        .status(400)
        .send(
          'Código de autorização não recebido.'
        );

    }

    try {

      console.log(
        'Código recebido. Trocando por token...'
      );

      const form =
        new URLSearchParams({

          client_id: APP_ID,

          client_secret:
            APP_SECRET,

          grant_type:
            'authorization_code',

          redirect_uri:
            REDIRECT_URI,

          code

        });


      const tokenResponse =
        await fetch(
          'https://api.instagram.com/oauth/access_token',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/x-www-form-urlencoded'
            },

            body:
              form.toString()
          }
        );


      const tokenData =
        await tokenResponse.json();


      console.log(
        'Resposta da troca de token:',
        tokenResponse.status
      );


      if (
        !tokenResponse.ok ||
        !tokenData.access_token
      ) {

        console.error(
          'Falha ao obter token:',
          tokenData
        );

        return res
          .status(400)
          .send(
            'Falha ao trocar o código por token. Verifique os logs do Render.'
          );

      }


      store.accessToken =
        tokenData.access_token;


      // ======================================================
      // PERFIL
      // ======================================================

      let profile;

      try {

        profile =
          await ig('/me', {

            fields:
              [
                'id',
                'username',
                'name',
                'account_type',
                'profile_picture_url',
                'media_count',
                'followers_count',
                'follows_count',
                'biography',
                'website'
              ].join(',')

          });

      } catch (profileError) {

        console.warn(
          'Perfil completo não disponível. Tentando dados básicos...',
          profileError.message
        );

        profile =
          await ig('/me', {

            fields:
              [
                'id',
                'username',
                'name',
                'account_type',
                'profile_picture_url',
                'media_count'
              ].join(',')

          });

      }


      store.profile =
        profile;

      store.username =
        profile.username;


      console.log(
        'Instagram conectado:',
        profile.username
      );


      // ======================================================
      // TOKEN DE LONGA DURAÇÃO
      // ======================================================

      try {

        console.log(
          'Solicitando token de longa duração...'
        );

        const longTokenUrl =
          `${HOST}/access_token` +
          `?grant_type=ig_exchange_token` +
          `&client_secret=${encodeURIComponent(APP_SECRET)}` +
          `&access_token=${encodeURIComponent(store.accessToken)}`;


        const longTokenResponse =
          await fetch(longTokenUrl);


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
            (longTokenData.expires_in ||
              5184000) *
              1000;

          console.log(
            'Token de longa duração obtido.'
          );

        }

      } catch (error) {

        console.warn(
          'Erro no token longo:',
          error.message
        );

      }


      res.redirect(
        '/painel.html?connected=1'
      );


    } catch (error) {

      console.error(
        'Erro na conexão:',
        error
      );

      res
        .status(500)
        .send(
          'Erro na conexão com o Instagram.'
        );

    }

  }
);


// ============================================================
// FUNÇÃO INSTAGRAM
// ============================================================

async function ig(
  endpoint,
  params = {}
) {

  if (!store.accessToken) {

    throw new Error(
      'Instagram não conectado'
    );

  }


  const query =
    new URLSearchParams({

      ...params,

      access_token:
        store.accessToken

    });


  const response =
    await fetch(
      `${HOST}${endpoint}?${query.toString()}`
    );


  const data =
    await response.json();


  if (!response.ok) {

    console.error(
      'Erro da API:',
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
// STATUS
// ============================================================

app.get(
  '/api/status',
  (req, res) => {

    res.json({

      connected:
        !!store.accessToken,

      username:
        store.username,

      expiresAt:
        store.expiresAt || null,

      profile:
        store.profile || null

    });

  }
);


// ============================================================
// PERFIL
// ============================================================

app.get(
  '/api/profile',
  async (req, res) => {

    try {

      if (!store.accessToken) {

        return res
          .status(401)
          .json({
            error:
              'Instagram não conectado'
          });

      }


      if (store.profile) {

        return res.json(
          store.profile
        );

      }


      const profile =
        await ig('/me', {

          fields:
            [
              'id',
              'username',
              'name',
              'account_type',
              'profile_picture_url',
              'media_count',
              'followers_count',
              'follows_count',
              'biography',
              'website'
            ].join(',')

        });


      store.profile =
        profile;

      store.username =
        profile.username;


      res.json(profile);


    } catch (error) {

      console.error(
        'Erro ao buscar perfil:',
        error
      );

      res
        .status(500)
        .json({
          error:
            error.message
        });

    }

  }
);


// ============================================================
// PUBLICAÇÕES
// ============================================================

app.get(
  '/api/media',
  async (req, res) => {

    try {

      const fields =
        [
          'id',
          'caption',
          'media_type',
          'media_url',
          'thumbnail_url',
          'permalink',
          'timestamp',
          'username',
          'like_count',
          'comments_count',
          'children{media_url,media_type,thumbnail_url}'
        ].join(',');


      const requestedLimit =
        Number(
          req.query.limit || 50
        );


      const limit =
        Math.min(
          Math.max(
            requestedLimit,
            1
          ),
          100
        );


      const data =
        await ig(
          '/me/media',
          {
            fields,
            limit
          }
        );


      res.json(data);


    } catch (error) {

      console.error(
        'Erro ao buscar mídias:',
        error
      );

      res
        .status(401)
        .json({
          error:
            error.message
        });

    }

  }
);


// ============================================================
// DESCONECTAR
// ============================================================

app.post(
  '/api/disconnect',
  (req, res) => {

    store = {

      accessToken: null,

      expiresAt: 0,

      username: null,

      profile: null

    };


    res.json({
      ok: true
    });

  }
);


// ============================================================
// PÁGINAS LEGAIS
// ============================================================

app.get(
  '/privacy',
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        'privacy.html'
      )
    );

  }
);


app.get(
  '/terms',
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        'terms.html'
      )
    );

  }
);


app.get(
  '/data-deletion',
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        'data-deletion.html'
      )
    );

  }
);


// ============================================================
// SERVIDOR
// ============================================================

app.listen(
  PORT,
  () => {

    console.log(
      `Feed TV: http://localhost:${PORT}`
    );

    console.log(
      'Instagram App ID:',
      !!APP_ID
    );

    console.log(
      'Instagram App Secret:',
      !!APP_SECRET
    );

    console.log(
      'Redirect URI:',
      REDIRECT_URI ||
      'NÃO CONFIGURADA'
    );

  }
);

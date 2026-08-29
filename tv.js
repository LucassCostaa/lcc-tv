let media = [];

let profile = null;

let currentIndex = 0;

let timer = null;

let profileContainer = null;


/* ============================================================
   CONFIGURAÇÕES VINDAS DO PAINEL
============================================================ */

const urlParams =
  new URLSearchParams(
    window.location.search
  );


const settings = {

  time:
    Math.max(
      1,
      Number(
        urlParams.get('time') || 10
      )
    ),

  captions:
    urlParams.get('captions') !== '0',

  captionSize:
    Math.max(
      12,
      Math.min(
        48,
        Number(
          urlParams.get('captionSize') || 24
        )
      )
    ),

  orientation:
    urlParams.get('orientation') ||
    'landscape'

};


/* ============================================================
   ELEMENTOS DA TV
============================================================ */

const root =
  document.getElementById(
    'tvRoot'
  );

const cursor =
  document.getElementById(
    'cursor'
  );

const progress =
  document.getElementById(
    'progress'
  );

const count =
  document.getElementById(
    'count'
  );


/* ============================================================
   ORIENTAÇÃO
============================================================ */

if (
  settings.orientation ===
  'portrait'
) {

  document.body.classList.add(
    'portrait'
  );

}


/* ============================================================
   UTILITÁRIO
============================================================ */

function escapeHtml(text) {

  return String(
    text || ''
  ).replace(
    /[&<>"']/g,

    character => ({

      '&': '&amp;',

      '<': '&lt;',

      '>': '&gt;',

      '"': '&quot;',

      "'": '&#039;'

    }[character])

  );

}


/* ============================================================
   CARREGAR PERFIL
============================================================ */

async function loadProfile() {

  try {

    const response =
      await fetch(
        '/api/profile'
      );


    if (!response.ok) {

      throw new Error(
        'Perfil indisponível'
      );

    }


    profile =
      await response.json();


    return true;


  } catch (error) {

    console.error(
      'Erro no perfil:',
      error
    );

    return false;

  }

}


/* ============================================================
   CARREGAR POSTS
============================================================ */

async function loadMedia() {

  try {

    const response =
      await fetch(
        '/api/media?limit=100'
      );


    const data =
      await response.json();


    media =
      (data.data || [])
        .filter(
          item =>
            [
              'IMAGE',
              'VIDEO',
              'CAROUSEL_ALBUM'
            ].includes(
              item.media_type
            )
        );


    return true;


  } catch (error) {

    console.error(
      'Erro nas mídias:',
      error
    );

    return false;

  }

}


/* ============================================================
   INICIAR
============================================================ */

async function start() {

  const profileOK =
    await loadProfile();


  const mediaOK =
    await loadMedia();


  if (
    !profileOK ||
    !mediaOK ||
    !media.length
  ) {

    showEmpty();

    return;

  }


  currentIndex = 0;

  showProfile();

}


/* ============================================================
   MOSTRAR PERFIL
============================================================ */

function showProfile() {

  clearTimeout(timer);

  cursor.style.display =
    'none';


  const name =
    profile?.name ||
    profile?.username ||
    'Instagram';


  const username =
    profile?.username ||
    'instagram';


  const bio =
    profile?.biography ||
    '';


  const avatar =
    profile?.profile_picture_url ||
    '';


  const followers =
    formatNumber(
      profile?.followers_count
    );


  const following =
    formatNumber(
      profile?.follows_count
    );


  const posts =
    formatNumber(
      profile?.media_count ||
      media.length
    );


  root.innerHTML = `

    <section
      class="instagram-screen">


      <div
        class="instagram-scroll"
        id="instagramScroll">


        <!-- PERFIL -->

        <header
          class="instagram-profile-header">


          <div
            class="instagram-avatar">

            ${
              avatar

                ? `

                  <img
                    src="${avatar}"
                    alt="">

                `

                : `

                  <span>

                    ${escapeHtml(
                      username
                        .slice(0, 2)
                        .toUpperCase()
                    )}

                  </span>

                `
            }

          </div>


          <div
            class="instagram-profile-info">


            <div
              class="instagram-name-row">

              <h1>

                ${escapeHtml(
                  name
                )}

              </h1>

              <span
                class="verified-dot">

                ✓

              </span>

            </div>


            <div
              class="instagram-username">

              @${escapeHtml(
                username
              )}

            </div>


            <div
              class="instagram-stats">

              <span>

                <strong>

                  ${posts}

                </strong>

                publicações

              </span>


              <span>

                <strong>

                  ${followers}

                </strong>

                seguidores

              </span>


              <span>

                <strong>

                  ${following}

                </strong>

                seguindo

              </span>

            </div>


            ${
              bio

                ? `

                  <div
                    class="instagram-bio">

                    ${escapeHtml(
                      bio
                    )}

                  </div>

                `

                : ''

            }


          </div>

        </header>


        <!-- DESTAQUES -->

        <div
          class="instagram-highlights">

          ${createHighlights()}

        </div>


        <!-- ABAS -->

        <div
          class="instagram-tabs">

          <span
            class="active">

            ▦

          </span>


          <span>

            ▶

          </span>


          <span>

            ⌁

          </span>

        </div>


        <!-- FEED -->

        <div
          class="instagram-grid"
          id="instagramGrid">

          ${createGrid()}

        </div>


      </div>

    </section>

  `;


  profileContainer =
    document.getElementById(
      'instagramScroll'
    );


  count.textContent =
    `${currentIndex + 1} / ${media.length}`;


  setTimeout(
    () =>
      moveCursorToCurrentPost(),
    1000
  );

}


/* ============================================================
   DESTAQUES
============================================================ */

function createHighlights() {

  const covers =
    media.slice(
      0,
      5
    );


  const labels = [

    'Novidades',

    'Projetos',

    'Produtos',

    'Bastidores',

    'Clientes'

  ];


  return covers
    .map(
      (
        item,
        index
      ) => {

        const src =
          item.media_type ===
          'VIDEO'

            ? item.thumbnail_url

            : item.media_url;


        return `

          <div
            class="highlight">


            <div
              class="highlight-circle">

              <img
                src="${src || ''}"
                alt="">

            </div>


            <span>

              ${labels[index]}

            </span>


          </div>

        `;

      }
    )
    .join('');

}


/* ============================================================
   GRID DO INSTAGRAM
============================================================ */

function createGrid() {

  return media
    .map(
      (
        item,
        index
      ) => {

        const src =
          item.media_type ===
          'VIDEO'

            ? item.thumbnail_url

            : item.media_url;


        const type =
          item.media_type ===
          'VIDEO'

            ? '▶'

            : item.media_type ===
              'CAROUSEL_ALBUM'

              ? '▧'

              : '';


        return `

          <div
            class="instagram-post"
            data-index="${index}">


            <img
              src="${src || ''}"
              alt="">


            ${
              type

                ? `

                  <span
                    class="post-type">

                    ${type}

                  </span>

                `

                : ''

            }


          </div>

        `;

      }
    )
    .join('');

}


/* ============================================================
   CURSOR
============================================================ */

async function moveCursorToCurrentPost() {

  if (
    !profileContainer
  ) {

    return;

  }


  const post =
    document.querySelector(
      `.instagram-post[data-index="${currentIndex}"]`
    );


  if (!post) {

    return;

  }


  await ensurePostVisible(
    post
  );


  const rectangle =
    post.getBoundingClientRect();


  const x =
    rectangle.left +
    rectangle.width *
      0.68;


  const y =
    rectangle.top +
    rectangle.height *
      0.68;


  /*
    Posição inicial do cursor.
    Ele começa longe do post.
  */

  const currentLeft =
    parseFloat(
      cursor.style.left
    ) ||
    window.innerWidth *
      0.82;


  const currentTop =
    parseFloat(
      cursor.style.top
    ) ||
    window.innerHeight *
      0.82;


  cursor.style.left =
    `${currentLeft}px`;


  cursor.style.top =
    `${currentTop}px`;


  cursor.style.display =
    'block';


  await wait(150);


  /*
    AGORA O CURSOR REALMENTE
    SE MOVE ATÉ O POST.
  */

  cursor.style.transition =
    `
      left .75s
      cubic-bezier(.2,.8,.2,1),

      top .75s
      cubic-bezier(.2,.8,.2,1)
    `;


  cursor.style.left =
    `${x}px`;


  cursor.style.top =
    `${y}px`;


  await wait(850);


  /*
    CLIQUE
  */

  cursor.classList.add(
    'clicking'
  );


  await wait(250);


  cursor.classList.remove(
    'clicking'
  );


  cursor.style.display =
    'none';


  openPost(
    media[currentIndex]
  );

}


/* ============================================================
   SCROLL AUTOMÁTICO
============================================================ */

function ensurePostVisible(
  post
) {

  return new Promise(
    resolve => {

      const container =
        profileContainer;


      const top =
        post.offsetTop;


      const bottom =
        top +
        post.offsetHeight;


      const visibleTop =
        container.scrollTop;


      const visibleBottom =
        visibleTop +
        container.clientHeight;


      const margin =
        container.clientHeight *
        0.18;


      /*
        Se já está visível,
        não rola.
      */

      if (

        top >=
          visibleTop + margin &&

        bottom <=
          visibleBottom - margin

      ) {

        resolve();

        return;

      }


      let destination;


      /*
        Scroll para baixo
      */

      if (
        top >
        visibleBottom
      ) {

        destination =
          top -
          container.clientHeight *
            0.18;

      }

      /*
        Scroll para cima
      */

      else {

        destination =
          Math.max(
            0,
            top -
              container.clientHeight *
                0.18
          );

      }


      container.scrollTo({

        top:
          destination,

        behavior:
          'smooth'

      });


      setTimeout(
        resolve,
        850
      );

    }
  );

}


/* ============================================================
   ABRIR POST
============================================================ */

function openPost(
  item
) {

  clearTimeout(timer);


  const children =
    item.children?.data ||
    [];


  let slides = [];


  if (

    item.media_type ===
      'CAROUSEL_ALBUM' &&

    children.length

  ) {

    slides =
      children.map(
        child => ({

          type:
            child.media_type,

          src:
            child.media_url ||
            child.thumbnail_url

        })
      );

  }

  else {

    slides = [

      {

        type:
          item.media_type,

        src:
          item.media_url ||
          item.thumbnail_url

      }

    ];

  }


  showSlide(
    item,
    slides,
    0
  );

}


/* ============================================================
   MOSTRAR POST
============================================================ */

function showSlide(
  item,
  slides,
  slideIndex
) {

  /*
    Terminou o post.
    Volta para o perfil.
  */

  if (
    slideIndex >=
    slides.length
  ) {

    returnToProfile();

    return;

  }


  const slide =
    slides[slideIndex];


  root.innerHTML = `

    <section
      class="instagram-post-viewer">


      <div
        class="viewer-top">


        <div
          class="viewer-account">


          ${
            profile?.profile_picture_url

              ? `

                <img
                  src="${profile.profile_picture_url}"
                  alt="">

              `

              : ''

          }


          <span>

            @${escapeHtml(
              profile?.username ||
              'instagram'
            )}

          </span>


        </div>


        <div>

          ${
            slides.length > 1

              ? `${slideIndex + 1}/${slides.length}`

              : ''

          }

        </div>


      </div>


      <div
        class="viewer-content">


        ${
          slide.type ===
          'VIDEO'

            ? `

              <video
                class="viewer-media"
                autoplay
                playsinline
                muted>
              </video>

            `

            : `

              <img
                class="viewer-media"
                src="${slide.src || ''}"
                alt="">

            `

        }


      </div>


      ${
        settings.captions &&
        item.caption

          ? `

            <div
              class="viewer-caption"
              style="
                font-size:
                ${settings.captionSize}px;
              ">

              ${escapeHtml(
                item.caption
              )}

            </div>

          `

          : ''

      }


    </section>

  `;


  const video =
    document.querySelector(
      '.viewer-media'
    );


  /*
    REEL / VÍDEO
  */

  if (

    video &&
    video.tagName ===
      'VIDEO'

  ) {

    video.src =
      slide.src ||
      '';


    video.play()
      .catch(
        () => {}
      );


    video.onended =
      () => {

        showSlide(
          item,
          slides,
          slideIndex + 1
        );

      };


    return;

  }


  /*
    FOTO
  */

  startProgress(
    settings.time
  );


  timer =
    setTimeout(

      () => {

        showSlide(
          item,
          slides,
          slideIndex + 1
        );

      },

      settings.time *
        1000

    );

}


/* ============================================================
   VOLTAR PARA O PERFIL
============================================================ */

function returnToProfile() {

  clearTimeout(timer);


  currentIndex++;


  if (
    currentIndex >=
    media.length
  ) {

    currentIndex = 0;

  }


  showProfile();

}


/* ============================================================
   PROGRESSO
============================================================ */

function startProgress(
  seconds
) {

  progress.style.transition =
    'none';


  progress.style.width =
    '0%';


  requestAnimationFrame(
    () => {

      progress.style.transition =
        `width ${seconds}s linear`;


      progress.style.width =
        '100%';

    }
  );

}


/* ============================================================
   FORMATAR NÚMEROS
============================================================ */

function formatNumber(
  number
) {

  if (
    number === undefined ||
    number === null
  ) {

    return '—';

  }


  return Number(
    number
  ).toLocaleString(
    'pt-BR'
  );

}


/* ============================================================
   TELA VAZIA
============================================================ */

function showEmpty() {

  root.innerHTML = `

    <div
      class="tv-empty">


      <strong>

        Feed TV

      </strong>


      <span>

        Conecte um Instagram
        pelo painel.

      </span>


      <a
        href="/painel.html">

        Abrir painel

      </a>


    </div>

  `;

}


/* ============================================================
   ESPERA
============================================================ */

function wait(
  milliseconds
) {

  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        milliseconds
      )
  );

}


/* ============================================================
   TECLADO
============================================================ */

document.addEventListener(
  'keydown',
  event => {

    if (
      event.key ===
      'ArrowRight'
    ) {

      currentIndex =
        Math.min(
          currentIndex + 1,
          media.length - 1
        );


      showProfile();

    }


    if (
      event.key ===
      'ArrowLeft'
    ) {

      currentIndex =
        Math.max(
          currentIndex - 1,
          0
        );


      showProfile();

    }


    if (
      event.key.toLowerCase() ===
      'f'
    ) {

      document.documentElement
        .requestFullscreen?.();

    }

  }
);


/* ============================================================
   INICIAR
============================================================ */

start();


/*
  Atualiza o conteúdo
  a cada 5 minutos.
*/

setInterval(

  async () => {

    await loadProfile();

    await loadMedia();

  },

  5 * 60 * 1000

);

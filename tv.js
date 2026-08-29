let media = [];
let index = 0;
let timer = null;

const params = new URLSearchParams(window.location.search);

const settings = {
  orientation:
    params.get("orientation") || "landscape",

  captions:
    params.get("captions") !== "0",

  captionSize:
    Number(params.get("captionSize") || 24),

  time:
    Number(params.get("time") || 10)
};


const root =
  document.getElementById("tvRoot");

const cursor =
  document.getElementById("cursor");

const progress =
  document.getElementById("progress");

const count =
  document.getElementById("count");

const tvHandle =
  document.getElementById("tvHandle");


/* =========================================================
   ORIENTAÇÃO
========================================================= */

if (
  settings.orientation === "portrait"
) {

  document.body.classList.add("portrait");

}


/* =========================================================
   CARREGAR INSTAGRAM
========================================================= */

async function loadInstagram() {

  try {

    const status =
      await fetch("/api/status")
        .then(response =>
          response.json()
        );


    if (!status.connected) {

      showMessage(
        "Instagram não conectado."
      );

      return;

    }


    const username =
      status.username || "instagram";


    tvHandle.textContent =
      "@" + username;


    const response =
      await fetch(
        "/api/media?limit=50"
      );


    const data =
      await response.json();


    media =
      (data.data || [])
        .filter(item =>
          [
            "IMAGE",
            "VIDEO",
            "CAROUSEL_ALBUM"
          ].includes(
            item.media_type
          )
        );


    if (!media.length) {

      showMessage(
        "Nenhum conteúdo disponível."
      );

      return;

    }


    if (
      index >= media.length
    ) {

      index = 0;

    }


    showProfile();


  } catch (error) {

    console.error(
      "Erro ao carregar Instagram:",
      error
    );


    showMessage(
      "Não foi possível carregar o Instagram."
    );

  }

}


/* =========================================================
   MENSAGEM
========================================================= */

function showMessage(message) {

  root.innerHTML = `

    <div style="
      text-align:center;
      color:#aaa;
      font-size:24px;
    ">

      <strong
        style="
          display:block;
          color:white;
          margin-bottom:10px;
        "
      >
        Feed TV
      </strong>

      ${escapeHtml(message)}

    </div>

  `;

}


/* =========================================================
   PERFIL
========================================================= */

function showProfile() {

  clearTimeout(timer);

  cursor.style.display = "none";

  progress.style.width = "0";


  const username =
    tvHandle.textContent
      .replace("@", "");


  /*
    Pegamos os primeiros 8 conteúdos.
  */

  const visible =
    media.slice(0, 8);


  root.innerHTML = `

    <section class="tv-profile">

      <div class="tv-profile-head">

        <div class="tv-profile-avatar">

          ${escapeHtml(
            username
              .slice(0, 3)
              .toUpperCase()
          )}

        </div>


        <div>

          <h1 class="tv-profile-name">

            @${escapeHtml(username)}

          </h1>


          <div class="tv-profile-sub">

            Conteúdo atualizado automaticamente

          </div>

        </div>

      </div>


      <div class="tv-grid">

        ${visible.map(
          (item, position) => {

            const image =
              item.media_type === "VIDEO"
                ? item.thumbnail_url
                : item.media_url;


            return `

              <div
                class="
                  tv-grid-item
                  ${
                    position === 0
                      ? "active"
                      : ""
                  }
                "
                data-position="${position}"
              >

                <img
                  src="${image || ""}"
                  alt=""
                >

              </div>

            `;

          }
        ).join("")}

      </div>

    </section>

  `;


  count.textContent =
    `${index + 1} / ${media.length}`;


  /*
    Dá um pequeno tempo para
    o perfil aparecer antes
    do cursor entrar.
  */

  setTimeout(
    animateCursor,
    900
  );

}


/* =========================================================
   CURSOR
========================================================= */

function animateCursor() {

  const target =
    document.querySelector(
      ".tv-grid-item.active"
    );


  if (!target) {

    showFeature();

    return;

  }


  const rectangle =
    target.getBoundingClientRect();


  cursor.style.left =
    (
      rectangle.left +
      rectangle.width * 0.70
    ) + "px";


  cursor.style.top =
    (
      rectangle.top +
      rectangle.height * 0.70
    ) + "px";


  cursor.style.display =
    "block";


  /*
    Pequena pausa antes
    do clique.
  */

  setTimeout(() => {

    cursor.classList.add(
      "clicking"
    );


    setTimeout(() => {

      cursor.classList.remove(
        "clicking"
      );


      showFeature();

    }, 250);

  }, 700);

}


/* =========================================================
   ABRIR POST
========================================================= */

function showFeature() {

  clearTimeout(timer);

  cursor.style.display = "none";


  const item =
    media[index];


  /*
    Se for carrossel,
    usamos os filhos.
  */

  const children =
    item.children &&
    item.children.data
      ? item.children.data
      : [];


  let slides = [];


  if (
    item.media_type ===
      "CAROUSEL_ALBUM" &&
    children.length
  ) {

    slides =
      children.map(child => ({

        type:
          child.media_type,

        src:
          child.media_url ||
          child.thumbnail_url

      }));

  } else {

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


  playSlide(
    item,
    slides,
    0
  );

}


/* =========================================================
   EXECUTAR SLIDE
========================================================= */

function playSlide(
  item,
  slides,
  slideIndex
) {

  if (
    slideIndex >=
    slides.length
  ) {

    finishFeature();

    return;

  }


  const slide =
    slides[slideIndex];


  root.innerHTML = `

    <section class="tv-feature">

      <div class="feature-meta">

        <span>
          ${escapeHtml(
            tvHandle.textContent
          )}
        </span>


        <span>

          ${
            slides.length > 1
              ? `${slideIndex + 1}/${slides.length}`
              : ""
          }

        </span>

      </div>


      ${
        slide.type === "VIDEO"

          ? `

            <video
              class="feature-media"
              autoplay
              playsinline
              muted
            ></video>

          `

          : `

            <img
              class="feature-media"
              src="${slide.src || ""}"
              alt=""
            >

          `
      }


      ${
        settings.captions &&
        item.caption

          ? `

            <div
              class="feature-caption"
              style="
                font-size:
                  ${settings.captionSize}px
              "
            >

              ${escapeHtml(
                item.caption
              )}

            </div>

          `

          : ""
      }

    </section>

  `;


  const video =
    root.querySelector(
      "video"
    );


  /* =====================================================
     VÍDEO
  ===================================================== */

  if (video) {

    video.src =
      slide.src || "";


    video.play()
      .catch(() => {});


    video.addEventListener(
      "ended",
      () => {

        playSlide(
          item,
          slides,
          slideIndex + 1
        );

      }
    );


    /*
      Segurança:
      caso o vídeo não consiga
      disparar ended.
    */

    video.addEventListener(
      "error",
      () => {

        timer =
          setTimeout(
            () =>
              playSlide(
                item,
                slides,
                slideIndex + 1
              ),
            settings.time * 1000
          );

      }
    );


    return;

  }


  /* =====================================================
     FOTO
  ===================================================== */

  startProgress(
    settings.time
  );


  timer =
    setTimeout(

      () => {

        playSlide(
          item,
          slides,
          slideIndex + 1
        );

      },

      settings.time * 1000

    );

}


/* =========================================================
   FINALIZAR POST
========================================================= */

function finishFeature() {

  clearTimeout(timer);

  progress.style.width =
    "0%";


  /*
    Pequena pausa para
    a transição parecer natural.
  */

  setTimeout(() => {

    index =
      (index + 1) %
      media.length;


    showProfile();

  }, 600);

}


/* =========================================================
   BARRA DE PROGRESSO
========================================================= */

function startProgress(
  seconds
) {

  progress.style.transition =
    "none";

  progress.style.width =
    "0%";


  requestAnimationFrame(() => {

    progress.style.transition =
      `width ${seconds}s linear`;

    progress.style.width =
      "100%";

  });

}


/* =========================================================
   SEGURANÇA
========================================================= */

function escapeHtml(text) {

  return String(text)
    .replace(
      /[&<>"']/g,

      character => ({

        "&":
          "&amp;",

        "<":
          "&lt;",

        ">":
          "&gt;",

        '"':
          "&quot;",

        "'":
          "&#039;"

      }[character])

    );

}


/* =========================================================
   TECLADO
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "ArrowRight"
    ) {

      clearTimeout(timer);

      index =
        (index + 1) %
        media.length;

      showProfile();

    }


    if (
      event.key ===
      "ArrowLeft"
    ) {

      clearTimeout(timer);

      index =
        (
          index -
          1 +
          media.length
        ) %
        media.length;

      showProfile();

    }


    if (
      event.key.toLowerCase() ===
      "f"
    ) {

      document.documentElement
        .requestFullscreen?.();

    }

  }
);


/* =========================================================
   INICIAR
========================================================= */

loadInstagram();


/*
  Atualiza o conteúdo
  periodicamente.
*/

setInterval(
  loadInstagram,
  5 * 60 * 1000
);

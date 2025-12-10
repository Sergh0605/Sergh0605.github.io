(function () {
  'use strict';

  // Список внешних скриптов если нужно, можно оставить пустым []
  Lampa.Utils.putScriptAsync([], function () {

    const API_BASE = 'http://192.168.1.10:3000'; // <- Замените на IP вашего сервера и порт

    // Добавляем пункт в главное меню
    function addMenuItem() {
      // некоторые версии Lampa используют Lampa.Menu.add, некоторые Lampa.Activity.add — пробуем Menu
      try {
        Lampa.Menu.add({
          id: 'my_media',
          title: 'Моя видеотека',
          icon: 'folder',
          action: () => {
            Lampa.Activity.push({
              url: '',
              title: 'Моя видеотека',
              component: 'my_media_main',
              page: 1
            });
          }
        });
      } catch (e) {
        // fallback для других версий
        try {
          Lampa.Activity.add({
            id: 'my_media',
            title: 'Моя видеотека',
            icon: 'folder',
            component: 'my_media_main'
          });
        } catch (err) {
          console.error('Не удалось добавить пункт меню', e, err);
        }
      }
    }

    // Простая helper-функция fetch -> json с обработкой ошибок
    function apiFetch(path) {
      return fetch(API_BASE + path, { cache: 'no-store' })
        .then(r => {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .catch(err => {
          console.error('API fetch error', path, err);
          return null;
        });
    }

    // Компонент отображения (главный экран)
    Lampa.Component.add('my_media_main', {
      render() {
        const wrapper = $('<div class="wrap my-media"><div class="title">Моя видеотека</div><div class="content list"></div></div>');
        const list = wrapper.find('.content');

        // сначала показываем фильмы
        apiFetch('/movies').then(movies => {
          if (!movies) {
            list.append('<div class="row">Ошибка получения /movies</div>');
            return;
          }
          if (movies.length === 0) list.append('<div class="row">Фильмов нет</div>');
          else {
            list.append('<div class="row head">Фильмы</div>');
            movies.forEach(m => {
              const el = $(`<div class="row item" data-url="${API_BASE}/media/Movies/${encodeURIComponent(m)}">${m}</div>`);
              el.on('click', () => playUrl(`${API_BASE}/media/Movies/${encodeURIComponent(m)}`));
              list.append(el);
            });
          }
        });

        // затем сериалы
        apiFetch('/shows').then(shows => {
          if (!shows) {
            list.append('<div class="row">Ошибка получения /shows</div>');
            return;
          }
          if (shows.length === 0) {
            list.append('<div class="row">Сериалов нет</div>');
          } else {
            list.append('<div class="row head">Сериалы</div>');
            shows.forEach(show => {
              const showEl = $(`<div class="row item show" data-show="${encodeURIComponent(show)}">${show}</div>`);
              showEl.on('click', () => openShow(show));
              list.append(showEl);
            });
          }
        });

        return wrapper;
      },

      destroy() {}
    });

    // Открывает список сезонов для шоу
    function openShow(showName) {
      Lampa.Activity.push({
        url: '',
        title: showName,
        component: {
          render() {
            const wrap = $(`<div class="wrap"><div class="title">${showName}</div><div class="content list"></div></div>`);
            const list = wrap.find('.content');

            apiFetch('/shows/' + encodeURIComponent(showName)).then(seasons => {
              if (!seasons) {
                list.append('<div class="row">Ошибка получения сезонов</div>');
                return;
              }
              if (seasons.length === 0) list.append('<div class="row">Сезонов нет</div>');
              else {
                seasons.forEach(s => {
                  const sEl = $(`<div class="row item season" data-season="${encodeURIComponent(s)}">Сезон ${s}</div>`);
                  sEl.on('click', () => openSeason(showName, s));
                  list.append(sEl);
                });
              }
            });

            return wrap;
          },
          destroy() {}
        }
      });
    }

    // Открывает список эпизодов в сезоне
    function openSeason(showName, season) {
      Lampa.Activity.push({
        url: '',
        title: `${showName} — Сезон ${season}`,
        component: {
          render() {
            const wrap = $(`<div class="wrap"><div class="title">${showName} — Сезон ${season}</div><div class="content list"></div></div>`);
            const list = wrap.find('.content');

            apiFetch('/shows/' + encodeURIComponent(showName) + '/' + encodeURIComponent(season)).then(eps => {
              if (!eps) {
                list.append('<div class="row">Ошибка получения эпизодов</div>');
                return;
              }
              if (eps.length === 0) list.append('<div class="row">Эпизодов нет</div>');
              else {
                eps.forEach(ep => {
                  const url = `${API_BASE}/media/Shows/${encodeURIComponent(showName)}/${encodeURIComponent(season)}/${encodeURIComponent(ep)}`;
                  const el = $(`<div class="row item eps" data-url="${url}">${ep}</div>`);
                  el.on('click', () => playUrl(url));
                  list.append(el);
                });
              }
            });

            return wrap;
          },
          destroy() {}
        }
      });
    }

    // Запустить плеер Lampa с URL
    function playUrl(url) {
      // Lampa может ожидать объект с source; пробуем простую подачу
      Lampa.Player.play({
        title: 'Локальное видео',
        url: url,
        // fallback для некоторых версий:
        items: [{ title: 'Видео', url: url }]
      });
    }

    // Ждём готовности приложения и добавляем пункт меню
    Lampa.Listener.follow('app', (e) => {
      if (e.type === 'ready') {
        try {
          addMenuItem();
        } catch (err) {
          console.error('addMenuItem error', err);
        }
      }
    });

  }); // putScriptAsync
})();

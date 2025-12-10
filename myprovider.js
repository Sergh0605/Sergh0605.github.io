(function() {
    'use strict';

    // Настройки плагина
    const PLUGIN_NAME = 'local_media';
    const SERVER_URL = 'http://192.168.1.41:3000';
    
    // Регистрация плагина
    Lampa.Plugin.add({
        component: PLUGIN_NAME,
        name: 'Локальные медиа',
        description: 'Просмотр локальных видеофайлов с вашего сервера',
        version: '1.0.0'
    });

    // Класс компонента
    function Component(object) {
        const comp = this;
        let html, scroll, items = [];
        let network = new Lampa.Reguest();
        let last;

        // Создание интерфейса
        this.create = function() {
            html = Lampa.Template.js('items_line', {
                title: 'Локальные медиа'
            });

            scroll = new Lampa.Scroll({
                horizontal: false,
                mask: true
            });

            loadCatalog();
        };

        // Загрузка каталога с сервера
        function loadCatalog() {
            const loader = Lampa.Template.js('loading');
            html.append(loader);

            network.silent(SERVER_URL + '/catalog.json', (data) => {
                loader.remove();
                
                if (data && data.items && data.items.length) {
                    items = data.items;
                    build();
                } else {
                    html.append(Lampa.Template.js('empty', {
                        title: 'Нет доступных видео',
                        descr: 'Список пуст или сервер недоступен'
                    }));
                }
            }, (error) => {
                loader.remove();
                Lampa.Noty.show('Ошибка загрузки: ' + error.statusText);
                
                html.append(Lampa.Template.js('empty', {
                    title: 'Ошибка подключения',
                    descr: 'Не удалось подключиться к серверу'
                }));
            });
        }

        // Построение списка элементов
        function build() {
            items.forEach((item, index) => {
                const card = Lampa.Template.js('card', {
                    title: item.title.replace('.mp4', '').replace('.mkv', '').replace('.avi', ''),
                    release_year: ''
                });

                card.addClass('card--collection');
                
                // Установка иконки в зависимости от типа
                const icon = item.type === 'show' ? 'icon-tv' : 'icon-play';
                card.find('.card__img').append(`<div class="card__icon ${icon}"></div>`);

                // Обработка клика
                card.on('hover:enter', () => {
                    if (item.type === 'movie') {
                        playVideo(item);
                    } else if (item.type === 'show' && item.seasons) {
                        showSeasons(item);
                    }
                });

                card.on('hover:focus', () => {
                    last = card[0];
                    scroll.update(card, true);
                });

                scroll.append(card);
            });

            html.append(scroll.render());
        }

        // Воспроизведение видео
        function playVideo(item) {
            const videoUrl = SERVER_URL + item.url;
            
            Lampa.Player.play({
                title: item.title,
                url: videoUrl,
                timeline: item.timeline,
                subtitles: item.subtitles || []
            });

            Lampa.Player.playlist([{
                title: item.title,
                url: videoUrl
            }]);
        }

        // Показ сезонов (для сериалов)
        function showSeasons(item) {
            if (!item.seasons || item.seasons.length === 0) {
                Lampa.Noty.show('Нет доступных сезонов');
                return;
            }

            const modal = $('<div class="selectbox-modal"></div>');
            const items_container = $('<div class="selectbox-modal__items"></div>');

            item.seasons.forEach((season) => {
                const season_item = $(`<div class="selectbox-modal__item">${season.title}</div>`);
                
                season_item.on('click', () => {
                    showEpisodes(season, item);
                    modal.remove();
                });

                items_container.append(season_item);
            });

            modal.append(items_container);
            $('body').append(modal);

            // Закрытие по клику вне модала
            modal.on('click', (e) => {
                if (e.target === modal[0]) {
                    modal.remove();
                }
            });
        }

        // Показ эпизодов
        function showEpisodes(season, show) {
            if (!season.episodes || season.episodes.length === 0) {
                Lampa.Noty.show('Нет доступных эпизодов');
                return;
            }

            const modal = $('<div class="selectbox-modal"></div>');
            const items_container = $('<div class="selectbox-modal__items"></div>');

            season.episodes.forEach((episode) => {
                const episode_item = $(`<div class="selectbox-modal__item">${episode.title}</div>`);
                
                episode_item.on('click', () => {
                    playVideo({
                        title: `${show.title} - ${season.title} - ${episode.title}`,
                        url: episode.url
                    });
                    modal.remove();
                });

                items_container.append(episode_item);
            });

            modal.append(items_container);
            $('body').append(modal);

            modal.on('click', (e) => {
                if (e.target === modal[0]) {
                    modal.remove();
                }
            });
        }

        // Уничтожение компонента
        this.destroy = function() {
            network.clear();
            scroll.destroy();
            if (html) html.remove();
            html = null;
        };

        // Рендер компонента
        this.render = function() {
            return html;
        };

        // Методы навигации
        this.start = function() {
            Lampa.Controller.add('content', {
                toggle: () => {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(last, scroll.render());
                },
                left: () => {
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else Lampa.Controller.toggle('menu');
                },
                right: () => {
                    Navigator.move('right');
                },
                up: () => {
                    if (Navigator.canmove('up')) Navigator.move('up');
                    else Lampa.Controller.toggle('head');
                },
                down: () => {
                    Navigator.move('down');
                },
                back: () => {
                    Lampa.Activity.backward();
                }
            });

            Lampa.Controller.toggle('content');
        };

        this.pause = function() {};
        this.stop = function() {};
        this.background = function() {};
    }

    // Добавление пункта в главное меню
    Lampa.Listener.follow('app', (e) => {
        if (e.type === 'ready') {
            // Добавляем пункт меню
            Lampa.Menu.add({
                title: 'Локальные медиа',
                component: PLUGIN_NAME,
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/></svg>'
            });
        }
    });

    // Регистрация компонента
    Lampa.Component.add(PLUGIN_NAME, Component);

    // Установка настроек плагина (опционально)
    Lampa.Settings.listener.follow('open', (e) => {
        if (e.name === 'main') {
            Lampa.SettingsApi.addComponent({
                component: PLUGIN_NAME,
                name: 'Локальные медиа',
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/></svg>'
            });

            Lampa.SettingsApi.addParam({
                component: PLUGIN_NAME,
                param: {
                    name: 'server_url',
                    type: 'input',
                    default: SERVER_URL,
                    placeholder: 'http://192.168.1.41:3000'
                },
                field: {
                    name: 'URL сервера',
                    description: 'Адрес вашего локального сервера'
                },
                onRender: (item) => {
                    item.on('change', (e, value) => {
                        Lampa.Storage.set('local_media_server_url', value);
                    });
                }
            });
        }
    });

})();

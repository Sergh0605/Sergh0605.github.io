(function() {
    'use strict';

    // Настройки плагина
    const PLUGIN_NAME = 'local_media';
    const SERVER_URL = Lampa.Storage.get('local_media_server_url', 'http://10.101.41.173:3000');
    
    // Класс компонента
    function Component(object) {
        const comp = this;
        let html, scroll, items = [];
        let network = new Lampa.Reguest();
        let last;

        // Создание интерфейса
        this.create = function() {
            html = Lampa.Template.get('items_line', {
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
            const loader = $('<div class="broadcast__text">Загрузка...</div>');
            html.append(loader);

            network.silent(SERVER_URL + '/catalog.json', (data) => {
                loader.remove();
                
                if (data && data.items && data.items.length) {
                    items = data.items;
                    build();
                } else {
                    html.append($('<div class="broadcast__text">Нет доступных видео</div>'));
                }
            }, (error) => {
                loader.remove();
                Lampa.Noty.show('Ошибка загрузки: ' + (error.statusText || 'Нет связи с сервером'));
                
                html.append($('<div class="broadcast__text">Ошибка подключения к серверу</div>'));
            });
        }

        // Построение списка элементов
        function build() {
            items.forEach((item, index) => {
                const card = Lampa.Template.get('card', {
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

            const select = [];
            
            item.seasons.forEach((season, index) => {
                select.push({
                    title: season.title,
                    index: index,
                    selected: index === 0
                });
            });

            Lampa.Select.show({
                title: 'Выберите сезон',
                items: select,
                onSelect: (selected) => {
                    showEpisodes(item.seasons[selected.index], item);
                },
                onBack: () => {
                    Lampa.Controller.toggle('content');
                }
            });
        }

        // Показ эпизодов
        function showEpisodes(season, show) {
            if (!season.episodes || season.episodes.length === 0) {
                Lampa.Noty.show('Нет доступных эпизодов');
                return;
            }

            const select = [];
            
            season.episodes.forEach((episode, index) => {
                select.push({
                    title: episode.title,
                    url: episode.url,
                    index: index,
                    selected: index === 0
                });
            });

            Lampa.Select.show({
                title: 'Выберите эпизод',
                items: select,
                onSelect: (selected) => {
                    playVideo({
                        title: `${show.title} - ${season.title} - ${selected.title}`,
                        url: selected.url
                    });
                },
                onBack: () => {
                    showSeasons(show);
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

    // Регистрация компонента
    Lampa.Component.add(PLUGIN_NAME, Component);

    // Добавление пункта в главное меню - ИСПРАВЛЕННАЯ ВЕРСИЯ
    function addMenuItem() {
        const icon = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" stroke-width="2"/>
            <path d="M9 8L15 12L9 16V8Z" fill="currentColor"/>
        </svg>`;

        // Создаем пункт меню
        const menu_item = $('<li class="menu__item selector" data-action="activity">\
            <div class="menu__ico">' + icon + '</div>\
            <div class="menu__text">Локальные медиа</div>\
        </li>');

        // Обработчик клика
        menu_item.on('hover:enter', function() {
            Lampa.Activity.push({
                url: '',
                title: 'Локальные медиа',
                component: PLUGIN_NAME,
                page: 1
            });
        });

        // Добавляем в меню после элемента "Главная" или в начало
        $('.menu .menu__list').eq(0).append(menu_item);
    }

    // Ждем инициализации приложения
    if (window.appready) {
        addMenuItem();
    } else {
        Lampa.Listener.follow('app', function(e) {
            if (e.type == 'ready') {
                addMenuItem();
            }
        });
    }

    // Настройки плагина
    Lampa.Template.add('settings_local_media', `
        <div>
            <div class="settings-param selector" data-type="input" data-name="server_url">
                <div class="settings-param__name">URL сервера</div>
                <div class="settings-param__value"></div>
            </div>
        </div>
    `);

    Lampa.Settings.listener.follow('open', function(e) {
        if (e.name == 'main') {
            // Добавляем раздел в настройки
            Lampa.SettingsApi.addComponent({
                component: 'local_media',
                name: 'Локальные медиа',
                icon: `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" stroke-width="2"/>
                    <path d="M9 8L15 12L9 16V8Z" fill="currentColor"/>
                </svg>`
            });

            // Добавляем параметр
            Lampa.SettingsApi.addParam({
                component: 'local_media',
                param: {
                    name: 'server_url',
                    type: 'input',
                    default: 'http://10.101.41.173:3000'
                },
                field: {
                    name: 'URL сервера',
                    description: 'Адрес вашего локального сервера'
                },
                onRender: function(item) {
                    item.on('change', function(e, value) {
                        Lampa.Storage.set('local_media_server_url', value);
                    });
                }
            });
        }
    });

    // Вывод информации об успешной установке
    console.log('[Local Media] Плагин загружен. Версия 1.0.1');
    console.log('[Local Media] Сервер:', SERVER_URL);
    
    // Показываем уведомление о загрузке
    setTimeout(() => {
        Lampa.Noty.show('Плагин "Локальные медиа" загружен успешно');
    }, 1000);

})();



(() => {

    function addMenuItem() {
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
    }

    // ждём, пока загрузится приложение
    Lampa.Listener.follow('app', (event) => {
        if (event.type === 'ready') {
            addMenuItem();
        }
    });

    // регистрируем компонент
    Lampa.Component.add('my_media_main', {
        render() {
            let html = document.createElement('div');
            html.innerHTML = `<div style="padding:20px;color:white;font-size:40px;">Моя видеотека работает</div>`;
            return $(html);
        },
        destroy() {}
    });

})();

let player = null;
let playerPronto = false;
let fila = [];              // mensagens recebidas antes do player estar pronto
let volumeAtual = 0;
let pausarAoIniciar = false;

function onYouTubeIframeAPIReady() {
    console.log('[Cinema] API do YouTube pronta');
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            rel: 0,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            origin: window.location.origin,
            enablejsapi: 1
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
            onError: (e) => console.log('[Cinema] Erro do player YouTube:', e.data)
        }
    });
}

function onPlayerReady() {
    console.log('[Cinema] Player pronto');
    playerPronto = true;
    player.setVolume(volumeAtual);

    // Modo de teste no browser: .../index.html?v=ID_DO_VIDEO
    const testeId = new URLSearchParams(window.location.search).get('v');
    if (testeId) {
        player.mute();
        player.loadVideoById(testeId);
    }
    fila.forEach(processar);
    fila = [];
}

function onPlayerStateChange(event) {
    // Quando o video realmente comeca, aplica a pausa pedida (para quem entra com o video pausado)
    if (event.data === YT.PlayerState.PLAYING && pausarAoIniciar) {
        pausarAoIniciar = false;
        player.pauseVideo();
    }
}

function processar(msg) {
    switch (msg.action) {
        case 'carregar':
            pausarAoIniciar = !!msg.pausado;
            player.loadVideoById({ videoId: msg.id, startSeconds: msg.tempo || 0 });
            player.unMute();
            player.setVolume(volumeAtual);
            break;

        case 'pausar':
            if (msg.pausado) player.pauseVideo();
            else player.playVideo();
            break;

        case 'sincronizarTempo':
            if (player.getPlayerState() === YT.PlayerState.PLAYING &&
                Math.abs(player.getCurrentTime() - msg.tempo) > 3) {
                player.seekTo(msg.tempo, true);
            }
            break;

        case 'volume':
            volumeAtual = msg.volume;
            player.setVolume(msg.volume);
            break;
    }
}

window.addEventListener('message', function (event) {
    let msg = event.data;
    if (typeof msg === 'string') {
        try { msg = JSON.parse(msg); } catch (e) { return; }
    }
    if (!msg || !msg.action) return;
    console.log('[Cinema] mensagem:', msg);

    if (msg.action === 'volume') volumeAtual = msg.volume;

    if (!playerPronto) {
        fila.push(msg);
    } else {
        processar(msg);
    }
});

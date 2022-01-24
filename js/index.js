const World = require('./world');
const _world = new World();

// init game and start main loop
(function() {
    (async function runGame()
    {
      // init shaku
      await Shaku.init();

      // add shaku's canvas to document and set resolution to 800x600
      document.body.appendChild(Shaku.gfx.canvas);

      // init world
      await _world.init();

      // load font
      let fontTexture = await Shaku.assets.loadFontTexture('assets/DejaVuSansMono.ttf', {fontName: 'DejaVuSansMono', fontSize: 32});

      // done loading
      document.getElementById("loading-msg").innerHTML = "Ready! Click anywhere to begin.";
      document.body.onclick = () => startGame();

      // start the game
      function startGame()
      {
        // hide cover page
        document.body.onclick = null;
        document.getElementById("loading-msg").remove();

        {
          // start world
          _world.start();

          // start timer to update server
          setInterval(() => {
            let player = _world.player;
            socket.emit("update", [Math.round(player.position.x), Math.round(player.position.y), Math.round(player.direction * 1000)]);
          }, 1000 / 24);

          // do a single main loop step and request the next step
          function step() 
          {  
            // start a new frame and clear screen
            Shaku.startFrame();
            Shaku.gfx.clear(Shaku.utils.Color.cornflowerblue);

            // protection against bugs due to low fps
            if (Shaku.gameTime.delta > (1 / 16)) {
              Shaku.endFrame();
              Shaku.requestAnimationFrame(step);
              return;            
            }

            // make fullscreen
            Shaku.gfx.maximizeCanvasSize(false);

            // update and draw world
            _world.step();

            // draw fps
            let fpsString = 'FPS: ' + Shaku.getFpsCount().toString() + '\nAvg Frame Time: ' + (Math.round(Shaku.getAverageFrameTime() * 100) / 100.0) + '\nDraw Calls: ' + Shaku.gfx.drawCallsCount;
            let fps = Shaku.gfx.buildText(fontTexture, fpsString, 32, Shaku.utils.Color.white);
            fps.position.set(12, 20);
            Shaku.gfx.drawGroup(fps, true);

            // end frame and request next step
            Shaku.endFrame();
            Shaku.requestAnimationFrame(step);
          }

          // start main loop
          step();
        }
      }
    })();
})();
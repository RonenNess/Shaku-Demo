const TileType = require('./tile_type');
const ObjectType = require('./object_type');
const Player = require('./player');
const Bird = require('./bird');
const WorldChunk = require('./world_chunk');
const TilesEffect = require('./effects/tiles_effect');
const ObjectsEffect = require('./effects/objects_effect');
const WaterEffect = require('./effects/water_effect');

const MinimapSize = 256;


/**
 * The game world.
 */
class World
{
    /**
     * Init world and load assets.
     */
    async init()
    {
        // load tiles (this will also load related objects).
        this.tileTypes = {};
        this.objectType = {};
        this.loadTileType('forest', 'rough_dirt');
        this.loadTileType('forest', 'dirt');
        this.loadTileType('forest', 'dry_grass');
        this.loadTileType('forest', 'grass');
        this.loadTileType('forest', 'water');

        // load special assets
        Shaku.assets.loadTexture("assets/player.png");
        Shaku.assets.loadTexture("assets/ship_crashed.png")
        Shaku.assets.loadTexture("assets/ship_crashed_top.png")

        // bird texture
        Shaku.assets.loadTexture("assets/bird.png")

        // load water effect texture
        this._waterTopTexture = await Shaku.assets.loadTexture('assets/water_top.png');

        // sound effects
        this._birdsSoundAsset = await Shaku.assets.loadSound("assets/birds.ogg");

        // step sounds
        this._stepSounds = [await Shaku.assets.loadSound("assets/step_1.ogg"), await Shaku.assets.loadSound("assets/step_2.ogg")];

        // create effect to draw with
        this._tilesEffect = Shaku.gfx.createEffect(TilesEffect);
        this._objectsEffect = Shaku.gfx.createEffect(ObjectsEffect);
        this._waterEffect = Shaku.gfx.createEffect(WaterEffect);

        // create texture for minimap
        this._minimap = await Shaku.assets.createRenderTarget(null, MinimapSize, MinimapSize);
        
        // wait for all assets
        await Shaku.assets.waitForAll();

    }

    /**
     * Start the game.
     */
    start()
    {
        // play birds sound
        this._birds = Shaku.sfx.createSound(this._birdsSoundAsset);
        this._birds.loop = true;
        this._birds.volume = 0.45;
        this._birds.play();
        
        // font to use
        this._fontTexture = Shaku.assets.getCached('assets/DejaVuSansMono.ttf');

        // create collision world
        this.collision = Shaku.collision.createWorld(512);

        // create player
        this.player = new Player(this);
        this.player.position.set(-80, 260);
        this._timeForStepSound = 0;

        // other players
        this._others = {};

        // camera position
        this.cameraPosition = new Shaku.utils.Vector2(0, 0);
        this._camera = Shaku.gfx.createCamera();

        // birds
        this._birds = [];

        // generated areas
        this._chunks = {};

        // time for next chunks cleanup
        this._timeForCleanup = 10;
    }

    /**
     * Respond to player updates from server.
     */
    updatePlayer(data)
    {
        // get player
        let player = this._others[data.id];

        // if not found, create player
        if (!player) {
            this._others[data.id] = player = new Player(this);
        }

        // update player
        player.setUpdateFromServer(data.position, data.direction);
    }

    /**
     * Get tile type.
     */
    getTileType(biome, type)
    {
        return this.tileTypes[biome][type];
    }

    /**
     * Get object type.
     */
    getObjectType(biome, type)
    {
        return this.objectType[biome][type];
    }

    /**
     * Load a tile type.
     */
    async loadTileType(biome, type)
    {
        // load tile type
        let tile = new TileType(biome, type);
        await tile.load();
        this.tileTypes[biome] = this.tileTypes[biome] || {};
        this.tileTypes[biome][type] = tile;

        // load objects for tile
        for (let i = 0; i < tile.objects.length; ++i) {
            this.loadObjectType(biome, tile.objects[i].type);
        }
    }

    /**
     * Load an object type.
     */
    async loadObjectType(biome, type)
    {
        if (this.objectType[biome] && this.objectType[biome][type]) {
             return; 
        }

        let objectType = new ObjectType(biome, type);
        await objectType.load();
        this.objectType[biome] = this.objectType[biome] || {};
        this.objectType[biome][type] = objectType;
    }

    /**
     * Perform a step (updates + rendering).
     */
    step()
    {
        // set camera
        this._camera.orthographicOffset(this.cameraPosition);
        Shaku.gfx.applyCamera(this._camera);

        this.drawGroundAndLowObjects();

        this.drawAndUpdateOtherPlayers();

        this.player.step();

        this.drawObjectsTopLayer();

        this.doPlayerSounds();

        this.drawPlayerOverlay();

        this.drawCritters();

        // reset camera and effect
        Shaku.gfx.resetCamera();
        Shaku.gfx.useEffect(null);

        this.doPlayerControls();

        this.cleanupWorldChunks();

        this.drawMinimap();
    }

    /**
     * Draw bottom layer - tiles and objects.
     */
    drawGroundAndLowObjects()
    {
        // calculate visible chunks
        const areaSize = WorldChunk.sizeInPixels;
        const canvasSize = Shaku.gfx.getCanvasSize();
        const minI = Math.floor(this.cameraPosition.x / areaSize) - 1;
        const minJ = Math.floor(this.cameraPosition.y / areaSize) - 1;
        const maxI = minI + Math.ceil(canvasSize.x / areaSize) + 2;
        const maxJ = minJ + Math.floor(canvasSize.y / areaSize) + 3;

        // draw waters
        Shaku.gfx.useEffect(this._waterEffect);
        this._waterEffect.uniforms.waveFactor(Math.sin(Shaku.gameTime.elapsed) * 0.05);
        this._waterEffect.uniforms.timeFactor(Shaku.gameTime.elapsed);
        this._waterEffect.uniforms.topTexture(this._waterTopTexture, 1);
        for (let i = minI; i <= maxI; ++i) {
            for (let j = minJ; j <= maxJ; ++j) {
                let area = this.getArea(i, j);
                area.drawTiles(TileType.Layers.Water);
            }
        }

        // set tiles
        Shaku.gfx.useEffect(this._tilesEffect);
        for (let layer = 0; layer < TileType.Layers.Water; ++layer) {
            for (let i = minI; i <= maxI; ++i) {
                for (let j = minJ; j <= maxJ; ++j) {
                    let area = this.getArea(i, j);
                    area.drawTiles(layer, this._tilesEffect);
                }
            }
        }

        // set objects effect
        Shaku.gfx.useEffect(this._objectsEffect);
        let center = this.cameraPosition.add(Shaku.gfx.getCanvasSize().div(2));
        this._objectsEffect.uniforms.screenCenter(center.x, center.y);
        this._objectsEffect.uniforms.parallaxFactor(0);

        // draw bottom objects
        for (let i = minI; i <= maxI; ++i) {
            for (let j = minJ; j <= maxJ; ++j) {
                let area = this.getArea(i, j);
                area.drawObjects(0);
            }
        }
    }

    /**
     * Draw and update other players.
     */
    drawAndUpdateOtherPlayers()
    {
        for (let playerId in this._others) {
            let currPlayer = this._others[playerId];
            currPlayer.step();
            if (currPlayer.shouldBeRemoved()) {
                currPlayer.destroy();
                delete this._others[playerId];
            }
        }
    }

    /**
     * Draw objects top layer.
     */
    drawObjectsTopLayer()
    {
        // draw objects
        const areaSize = WorldChunk.sizeInPixels;
        const canvasSize = Shaku.gfx.getCanvasSize();
        const minI = Math.floor(this.cameraPosition.x / areaSize) - 1;
        const minJ = Math.floor(this.cameraPosition.y / areaSize) - 1;
        const maxI = minI + Math.ceil(canvasSize.x / areaSize) + 2;
        const maxJ = minJ + Math.floor(canvasSize.y / areaSize) + 3;
        for (let layer = 1; layer < ObjectType.Layers._Count; ++layer) {

            // on middle and top layers, add parallax effect
            if (layer >= ObjectType.Layers.Middle) {
                let factor = (layer === ObjectType.Layers.Top) ? 1.125 : 0.225;
                this._objectsEffect.uniforms.parallaxFactor(factor);
            }

            // draw objects
            for (let i = minI; i <= maxI; ++i) {
                for (let j = minJ; j <= maxJ; ++j) {
                    let area = this.getArea(i, j);
                    area.drawObjects(layer);
                }
            }
        }

        // reset parallax factor
        this._objectsEffect.uniforms.parallaxFactor(0);
    }

    /**
     * Draw player overlay layer.
     */
    drawPlayerOverlay()
    {
        // debug-draw collision
        if (Shaku.input.down('q')) {
            this.collision.debugDraw(null, null, 0.75, this._camera);
        }

        // do player overlay draw
        this.player.overlayDraw();
    }

    /**
     * Draw random birds and critters.
     */
    drawCritters()
    {
        // update and draw birds
        for (let i = this._birds.length - 1; i >= 0; --i) {
            
            if (!this._birds[i]) {
                continue;
            }

            if (this._birds[i].shouldBeRemoved) {
                this._birds.splice(i, 1);
                continue;
            }

            this._birds[i].step();
        }

        // spawn birds
        if (Math.random() < 0.0005) {
            let bird = new Bird(this.player.position);
            this._birds.push(bird);
        }
    }

    /**
     * Do player sounds.
     */
    doPlayerSounds()
    {
        // play walking sounds
        if (this.player.walking && this._timeForStepSound <= 0) {
            let stepSound = this._stepSounds[Math.floor(Math.random() * this._stepSounds.length)];
            Shaku.sfx.play(stepSound, 0.5 + (Math.random() * 0.15), 0.8 + Math.random() * 0.5);
            this._timeForStepSound = 0.45 + Math.random() * 0.1;
        }
        if (this._timeForStepSound > 0) { this._timeForStepSound -= Shaku.gameTime.delta; }
    }

    /**
     * Do player controls.
     */
    doPlayerControls()
    {
        // do controls - rotation
        let screenCenter = Shaku.gfx.getCanvasSize().div(2);
        this.player.direction = screenCenter.radiansTo(Shaku.input.mousePosition);

        // do controls - walking
        this.player.walking = false;
        let moveSpeed = Shaku.gameTime.delta * 125;
        if (Shaku.input.down('left') || Shaku.input.down('a')) { 
            this.player.position.x -= moveSpeed;
            this.player.walking = true;
        }
        if (Shaku.input.down('right') || Shaku.input.down('d')) { 
            this.player.position.x += moveSpeed;
            this.player.walking = true;
        }
        if (Shaku.input.down('up') || Shaku.input.down('w')) { 
            this.player.position.y -= moveSpeed;
            this.player.walking = true;
        }
        if (Shaku.input.down('down') || Shaku.input.down('s')) { 
            this.player.position.y += moveSpeed;
            this.player.walking = true;
        }

        // update camera position
        let targetPosition = this.player.position.sub(Shaku.gfx.getCanvasSize().div(2));
        this.cameraPosition = Shaku.utils.Vector2.lerp(this.cameraPosition, targetPosition, Shaku.gameTime.delta * 5);
    }

    /**
     * Delete world chunks that are too far away
     */
    cleanupWorldChunks()
    {
        this._timeForCleanup -= Shaku.gameTime.delta;
        if (this._timeForCleanup <= 0) {
            this._timeForCleanup = 10;
            const areaSize = WorldChunk.sizeInPixels;
            for (let key in this._chunks) {
                if (this.cameraPosition.distanceTo(this._chunks[key].position) > (areaSize * 15)) {
                    this._chunks[key].destroy();
                    delete this._chunks[key];
                }
            }
        }
    }

    /**
     * Render minimap.
     */
    drawMinimap()
    {
        // set render target and clear
        Shaku.gfx.setRenderTarget(this._minimap);
        Shaku.gfx.clear(Shaku.utils.Color.burlywood);

        // how many chunks to show
        const ChunksCount = 4;

        // get scale and set camera
        const areaSize = WorldChunk.sizeInPixels;
        const scale = MinimapSize / (areaSize * ChunksCount);
        const camera = Shaku.gfx.createCamera(true);
        let cameraPosition = this.player.position.sub((ChunksCount / 2) * areaSize).mul(scale);
        camera.orthographicOffset(cameraPosition);
        Shaku.gfx.applyCamera(camera);
        
        // draw map
        const minI = Math.floor(this.player.position.x / areaSize) - ChunksCount / 2 - 1;
        const minJ = Math.floor(this.player.position.y / areaSize) - ChunksCount / 2 - 1;
        const maxI = minI + ChunksCount + 2;
        const maxJ = minJ + ChunksCount + 2;
        for (let l = 0; l <= 1; ++l) {
            let offsetX = 0;
            let offsetY = 0;
            for (let i = minI; i <= maxI; ++i) {
                for (let j = minJ; j <= maxJ; ++j) {
                    let area = this.getArea(i, j);
                    area.drawMiniMap(scale, l);
                    offsetY++;
                }
                offsetY = 0;
                offsetX++;
            }
        }

        // draw player mark
        Shaku.gfx.resetCamera();
        let markScale = Math.abs(Math.cos(Shaku.gameTime.elapsed));
        Shaku.gfx.fillCircle(new Shaku.utils.Circle(Shaku.gfx.getRenderingSize().mul(0.5), 7), Shaku.utils.Color.red, Shaku.gfx.BlendModes.Opaque, 5);
        Shaku.gfx.fillCircle(new Shaku.utils.Circle(Shaku.gfx.getRenderingSize().mul(0.5), 15 * markScale), new Shaku.utils.Color(1, 0, 0, Math.max(1, 0.5 + markScale)), Shaku.gfx.BlendModes.Additive, 7);

        // draw minimap on screen
        Shaku.gfx.setRenderTarget(null);
        Shaku.gfx.resetCamera();
        const screenSize = Shaku.gfx.getRenderingSize();
        const mapSize = 200;
        Shaku.gfx.cover(this._minimap, 
            new Shaku.utils.Rectangle(screenSize.x - mapSize - 5, 5 + mapSize, mapSize, -mapSize),
            null, null, Shaku.gfx.BlendModes.Opaque);

        // draw coordinates
        let coordsValue = this.player.position.div(areaSize).floor();
        let coords = Shaku.gfx.buildText(this._fontTexture, coordsValue.x + ',' + coordsValue.y, 18, Shaku.utils.Color.black);
        coords.position.set(screenSize.x - mapSize + 5, 20);
        Shaku.gfx.drawGroup(coords, true);
        coords.setColor(Shaku.utils.Color.white);
        coords.position.addSelf(2,2);
        Shaku.gfx.drawGroup(coords, true);
    }

    /**
     * Get area or generate it if needed.
     */
    getArea(x, y)
    {
        let key = x + ',' + y;
        let ret = this._chunks[key];
        if (!ret) {
            this._chunks[key] = ret = new WorldChunk(this, x, y);
        }
        return ret;
    }
}

module.exports = World;
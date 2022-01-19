const TileType = require('./tile_type');
const Area = require('./world_chunk');
const ObjectType = require('./object_type');
const MainEffect = require('./main_effect');
const Player = require('./player');
const Bird = require('./bird');


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

        // sound effects
        this._birdsSoundAsset = await Shaku.assets.loadSound("assets/birds.ogg");

        // step sounds
        this._stepSounds = [await Shaku.assets.loadSound("assets/step_1.ogg"), await Shaku.assets.loadSound("assets/step_2.ogg")];

        // create effect to draw with
        this._effect = Shaku.gfx.createEffect(MainEffect);
        
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
        
        // create collision world
        this.collision = Shaku.collision.createWorld(512);

        // create player
        this.player = new Player(this);
        this.player.position.set(-80, 260);
        this._timeForStepSound = 0;

        // camera position
        this.cameraPosition = new Shaku.utils.Vector2(0, 0);
        this._camera = Shaku.gfx.createCamera();

        // birds
        this._birds = [];

        // generated areas
        this._chunks = {};
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

        // set effect
        Shaku.gfx.useEffect(this._effect);

        let center = this.cameraPosition.add(Shaku.gfx.getCanvasSize().div(2));
        this._effect.uniforms.screenCenter(center.x, center.y);
        this._effect.uniforms.parallaxFactor(0);

        // draw visible areas
        let areaSize = Area.sizeInPixels;
        let canvasSize = Shaku.gfx.getCanvasSize();
        let minI = Math.floor(this.cameraPosition.x / areaSize) - 1;
        let minJ = Math.floor(this.cameraPosition.y / areaSize) - 1;
        let maxI = minI + Math.floor(canvasSize.x / areaSize) + 2;
        let maxJ = minJ + Math.floor(canvasSize.y / areaSize) + 3;
        for (let layer = 0; layer < TileType.Layers._Count; ++layer) {
            for (let i = minI; i <= maxI; ++i) {
                for (let j = minJ; j <= maxJ; ++j) {
                    let area = this.getArea(i, j);
                    area.drawTiles(layer);
                }
            }
        }

        // draw bottom objects
        for (let i = minI; i <= maxI; ++i) {
            for (let j = minJ; j <= maxJ; ++j) {
                let area = this.getArea(i, j);
                area.drawObjects(0);
            }
        }

        // draw player
        this.player.step();

        // play walking sounds
        if (this.player.walking && this._timeForStepSound <= 0) {
            let stepSound = this._stepSounds[Math.floor(Math.random() * this._stepSounds.length)];
            Shaku.sfx.play(stepSound, 0.5 + (Math.random() * 0.15), 0.8 + Math.random() * 0.5);
            this._timeForStepSound = 0.45 + Math.random() * 0.1;
        }
        if (this._timeForStepSound > 0) { this._timeForStepSound -= Shaku.gameTime.delta; }

        // draw objects
        for (let layer = 1; layer < ObjectType.Layers._Count; ++layer) {

            // on middle and top layers, add parallax effect
            if (layer >= ObjectType.Layers.Middle) {
                let factor = (layer === ObjectType.Layers.Top) ? 1.25 : 0.25;
                this._effect.uniforms.parallaxFactor(factor);
            }

            // draw objects
            for (let i = minI; i <= maxI; ++i) {
                for (let j = minJ; j <= maxJ; ++j) {
                    let area = this.getArea(i, j);
                    area.drawObjects(layer);
                }
            }
        }

        // reset parallax
        this._effect.uniforms.parallaxFactor(0);

        // debug-draw collision
        if (Shaku.input.down('q')) {
            this.collision.debugDraw(null, null, 0.75, this._camera);
        }

        // do player overlay draw
        this.player.overlayDraw();

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

        // reset camera and effect
        Shaku.gfx.resetCamera();
        Shaku.gfx.useEffect(null);

        // do controls
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
     * Get area or generate it if needed.
     */
    getArea(x, y)
    {
        let key = x + ',' + y;
        let ret = this._chunks[key];
        if (!ret) {
            this._chunks[key] = ret = new Area(this, x, y);
        }
        return ret;
    }
}

module.exports = World;
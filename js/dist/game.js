(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Game = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

/**
 * Bird object.
 */
class Bird
{
    /**
     * Create the bird.
     */
    constructor(centerPosition)
    {
        let texture = Shaku.assets.getCached("assets/bird.png");
        this._sprite = new Shaku.gfx.Sprite(texture, new Shaku.utils.Rectangle(0, 0, 64, 128));
        this._sprite.size.set(128, 128);
        this._sprite.rotation = Math.random() * Math.PI * 2;
        this._flyVector = Shaku.utils.Vector2.fromRadians(this._sprite.rotation);
        this._sprite.position = centerPosition.sub(this._flyVector.mul(1600)).add(Math.random() * 2000 - 1000, Math.random() * 2000 - 1000);
        this._spawnTime = Shaku.gameTime.elapsed;
    }

    /**
     * Update and draw bird.
     */
    step()
    {
        // update position and animate
        this._sprite.position.addSelf(this._flyVector.mul(Shaku.gameTime.delta * 450));
        this._sprite.sourceRect.x = 64 * (Math.floor(Shaku.gameTime.elapsed * 3.5) % 2);

        // do random rotation
        if (Math.random() < 0.001) {
            this._sprite.rotation += (-0.5 + Math.random()) * Math.PI;
            this._flyVector = Shaku.utils.Vector2.fromRadians(this._sprite.rotation);
        }

        // draw shadow
        this._sprite.color = new Shaku.utils.Color(0,0,0,0.25);
        this._sprite.position.addSelf(45, -85);
        Shaku.gfx.drawSprite(this._sprite);

        // draw bird
        this._sprite.color = Shaku.utils.Color.white;
        this._sprite.position.subSelf(45, -85);
        Shaku.gfx.drawSprite(this._sprite);
    }

    /**
     * Should this bird be removed?
     */
    get shouldBeRemoved()
    {
        return (Shaku.gameTime.elapsed - this._spawnTime) > 25;
    }
}

// export bird
module.exports = Bird;
},{}],2:[function(require,module,exports){
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
        document.body.onclick = null;
        document.getElementById("loading-msg").remove();

        // start world
        _world.start();

        // do a single main loop step and request the next step
        function step() 
        {  
          // start a new frame and clear screen
          Shaku.startFrame();
          Shaku.gfx.clear(Shaku.utils.Color.cornflowerblue);

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
    })();
})();
},{"./world":8}],3:[function(require,module,exports){

/**
 * Define our custom main effect.
 * This effect works like the basic effect, but with 2d parallax.
 */
class MainEffect extends Shaku.gfx.BasicEffect
{
    /**
     * Override the vertex shader for our custom effect.
     */
    get vertexCode()
    {
        const code = `
attribute vec3 position;
attribute vec2 coord;
attribute vec4 color;

uniform mat4 projection;
uniform mat4 world;

uniform vec2 uvOffset;
uniform vec2 uvScale;

uniform vec2 screenCenter;
uniform float parallaxFactor;

varying vec2 v_texCoord;
varying vec4 v_color;

void main(void) {
    
    vec4 absPosition = world * vec4(position, 1.0);
    vec2 paralFactor = (absPosition.xy - screenCenter.xy) * 0.05 * parallaxFactor;
    absPosition.xy += paralFactor;
    gl_Position = (projection * absPosition);
    v_texCoord = uvOffset + (coord * uvScale);
    v_color = color;
}
        `;
        return code;
    }

    /**
     * Override the uniform types dictionary to add our custom uniform type.
     */
    get uniformTypes()
    {
        let ret = super.uniformTypes;
        ret['screenCenter'] = { type: Shaku.gfx.Effect.UniformTypes.Float2 };
        ret['parallaxFactor'] = { type: Shaku.gfx.Effect.UniformTypes.Float };
        return ret;
    }
}


// export main effect
module.exports = MainEffect;

},{}],4:[function(require,module,exports){
const ObjectType = require("./object_type");


/**
 * A world static object.
 */
class StaticObject
{
    /**
     * Create the static object.
     */
    constructor(type, position, objectSpriteGroups, collision)
    {
        this._type = type;
        this.position = position;

        // random scale
        this._scale = 2 + Math.random();

        // init a new sprite
        let initSprite = (sprite, layer) =>
        {
            sprite.position = this.position;
            sprite.rotation = Math.random() * Math.PI * 2;
            sprite.size = sprite.sourceRect.getSize().mul(this._scale);
            objectSpriteGroups[layer].add(sprite);

            // add shadow
            if (layer >= 1) {
                let shadow = sprite.clone();
                shadow.color = new Shaku.utils.Color(0,0,0,0.15);
                shadow.size.y *= 1.15;
                shadow.position.x -= 50;
                shadow.position.y += 25;
                shadow.rotation += 0.15;
                shadow.origin.y = 0.9;
                objectSpriteGroups[layer-1].add(shadow);
            }
        }

        // generate base sprite
        {
            let sprite = type.generateBaseSprite();
            initSprite(sprite, type.layer);
        }

        // generate top sprite
        if (type.gotTopTexture) {
            let sprite = type.generateTopSprite();
            initSprite(sprite, type.layer + 1);
        }

        // add collision shape
        if (type.blockRadius) {
            let absPosition = position.add(objectSpriteGroups[0].position);
            this.collisionBody = new Shaku.collision.CircleShape(new Shaku.utils.Circle(absPosition, type.blockRadius * this._scale));
            this.collisionBody.setDebugColor(Shaku.utils.Color.red);
            collision.addShape(this.collisionBody);
        }
    }
}


// export the object
module.exports = StaticObject;
},{"./object_type":5}],5:[function(require,module,exports){

// store cache for 1 hour
const antiCache = '?q=' + Math.floor(Date.now() / (1000 * 60 * 60));


/**
 * Implement an object type.
 */
class ObjectType
{
    /**
     * Create object type.
     */
    constructor(biome, type)
    {
        this._biome = biome;
        this._type = type;
        this._root = 'assets/biomes/' + biome + '/';
    }

    /**
     * Load the object data.
     */
    async load()
    {              
        // get object data
        let data = (await Shaku.assets.loadJson(this._root + 'objects/' + this._type + '.json' + antiCache)).data;
        this._data = data;

        // pre-load base textures
        for (let i = 0; i < data.textures.length; ++i) {
            data.textures[i].push(await Shaku.assets.loadTexture(this._root + 'objects/' + data.textures[i][0] + antiCache));
        }

        // pre-load top textures
        if (data.textures_top) {
            for (let i = 0; i < data.textures_top.length; ++i) {
                data.textures_top[i].push(await Shaku.assets.loadTexture(this._root + 'objects/' + data.textures_top[i][0] + antiCache));
            }
        }
    }

    /**
     * Get base textures count.
     */
    get texturesCount()
    {
        return this._data.textures.length;
    }

    /**
     * Generate base sprite.
     * If index is not provided, will pick randomly.
     */
    generateBaseSprite(index)
    {
        if (index === undefined) {
            index = Math.floor(Math.random() * this.texturesCount);
        }

        let rect = this._data.textures[index][1];
        return new Shaku.gfx.Sprite(this._data.textures[index][2], new Shaku.utils.Rectangle(rect[0], rect[1], rect[2], rect[3]));
    }

    /**
     * Get top textures count.
     */
    get topTexturesCount()
    {
        return this._data.textures_top ? this._data.textures_top.length : 0;
    }
    
    /**
     * Do we have a top texture?
     */
    get gotTopTexture()
    {
        return this.topTexturesCount > 0;
    }

    /**
     * Generate top sprite.
     * If index is not provided, will pick randomly.
     */
    generateTopSprite(index)
    {
        if (index === undefined) {
            index = Math.floor(Math.random() * this.topTexturesCount);
        }

        let rect = this._data.textures_top[index][1];
        return new Shaku.gfx.Sprite(this._data.textures_top[index][2], new Shaku.utils.Rectangle(rect[0], rect[1], rect[2], rect[3]));
    }
    
    /**
     * Get blocking radius.
     */
    get blockRadius()
    {
        return this._data.block_radius || 0;
    }

    /**
     * Get tile layer.
     */
    get layer()
    {
        return this._data.layer;
    }
}

// object type layers
ObjectType.Layers = {
    Floor: 0,
    Bottom: 1,
    Middle: 2,
    Top: 3,
    _Count: 4
};

// export object type
module.exports = ObjectType;
},{}],6:[function(require,module,exports){

/**
 * Player object.
 */
class Player
{
    /**
     * Create the player.
     */
    constructor(world)
    {
        let texture = Shaku.assets.getCached("assets/player.png");
        this._sprite = new Shaku.gfx.Sprite(texture);
        this._sprite.size.set(160, 160);
        this._sprite.sourceRect = new Shaku.utils.Rectangle(0, 0, 256, 256);
        this._sprite.origin.x = 0.35;
        this.walking = false;

        this.world = world;
        this.collision = new Shaku.collision.CircleShape(new Shaku.utils.Circle(this._sprite.position), 30);
        world.collision.addShape(this.collision);
    }

    /**
     * Get position.
     */
    get position()
    {
        return this._sprite.position;
    }

    /**
     * Set position.
     */
    set position(value)
    {
        this._sprite.position = value;
        return this._sprite.position;
    }

    /**
     * Update collision shape.
     */
    _updateCollision()
    {
        this.collision.setShape(new Shaku.utils.Circle(this.position, 30));
    }

    /**
     * Update and draw player.
     */
    step()
    {
        // set rotation to mouse position
        let center = Shaku.gfx.getCanvasSize().div(2);
        this._sprite.rotation = center.radiansTo(Shaku.input.mousePosition);

        // do walking animation
        if (this.walking) {
            this._sprite.rotation += Math.sin(Shaku.gameTime.elapsed * 8) / 14;
        }

        // update collision shape
        this._updateCollision();

        // do collision detection
        let resolve = 5;
        while (resolve-- >= 0)
        {
            // get collision hit
            let hit = this.world.collision.testCollision(this.collision, true);
            if (!hit) break;

            // repel player
            let repel = this.position.sub(hit.second.getCenter()).normalized();
            this.position.addSelf(repel);
            this._updateCollision();
        }

        // do scaling animation
        let size = 160 +  Math.cos(Shaku.gameTime.elapsed * 2) * 2.25;
        this._sprite.size.set(size, size);

        // draw sprite
        Shaku.gfx.drawSprite(this._sprite);
    }

    /**
     * Do overlay draw to show player through trees.
     */
    overlayDraw()
    {
        this._sprite.color.a = 0.5;
        Shaku.gfx.drawSprite(this._sprite);
        this._sprite.color.a = 1;
    }
}

// export player
module.exports = Player;
},{}],7:[function(require,module,exports){

// store cache for 1 hour
const antiCache = '?q=' + Math.floor(Date.now() / (1000 * 60 * 60));


/**
 * Implement a tile type.
 */
class TileType
{
    /**
     * Create tile type.
     */
    constructor(biome, type)
    {
        this._biome = biome;
        this._type = type;
        this._root = 'assets/biomes/' + biome + '/';
    }

    /**
     * Load the tile data.
     */
    async load()
    {              
        // get tile data
        let data = (await Shaku.assets.loadJson(this._root + 'tiles/' + this._type + '.json' + antiCache)).data;
        this._data = data;

        // load texture
        this.texture = await Shaku.assets.loadTexture(this._root + 'tiles/' + data.texture + antiCache);
    }

    /**
     * Get objects to scatter on this tile type.
     */
    get objects()
    {
        return this._data.objects;
    }

    /**
     * Get a random object to spawn, or null if nothing came up.
     */
    getRandomObjectType(maxAttempts)
    {
        let options = this._data.objects.slice(0);

        while (options.length > 0) {

            let index = Math.floor(Math.random() * options.length);
            let curr = options.splice(index, 1)[0];

            if (Math.random() < curr.spread) {
                return curr.type;
            }

            if (maxAttempts && maxAttempts-- <= 0) {
                return null;
            }

        }
        return null;
    }

    /**
     * Get tile layer.
     */
    get layer()
    {
        return this._data.layer;
    }
}

// actual tile size in pixels, not including mergings
TileType.sizeInPixels = 160;

// tile type layers
TileType.Layers = {
    BaseGround: 0,
    UpperGround: 1,
    Water: 2,
    _Count: 3
};

// export tile type
module.exports = TileType;
},{}],8:[function(require,module,exports){
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
},{"./bird":1,"./main_effect":3,"./object_type":5,"./player":6,"./tile_type":7,"./world_chunk":9}],9:[function(require,module,exports){
const StaticObject = require("./object");
const ObjectType = require("./object_type");
const TileType = require("./tile_type");

/**
 * Represent an area in world.
 */
class Area
{
    /**
     * Create area.
     */
    constructor(world, x, y)
    {
        // biome
        let biome = 'forest';

        // create sprites group for this area
        this._tiles = [];
        for (let i = 0; i <= TileType.Layers._Count; ++i) {
            this._tiles.push(new Shaku.gfx.SpritesGroup());
            this._tiles[i].position.set(x * Area.sizeInPixels, y * Area.sizeInPixels);
        }

        // create tiles sprites
        this._tileTypes = [];
        for (let i = 0; i < Area.sizeInTiles; ++i) {
            this._tileTypes.push([]);
            for (let j = 0; j < Area.sizeInTiles; ++j) {

                // generate noise to choose tile type
                let noise = Perlin.noise((x * Area.sizeInTiles + i) / 50 + 0.5, (y * Area.sizeInTiles + j) / 50 + 0.5, 0) + (Math.random() * 0.06 - 0.03);

                // get type based on noise
                let tileType;
                if (noise < 0.25) tileType = world.getTileType(biome, 'rough_dirt');
                else if (noise < 0.4) tileType = world.getTileType(biome, 'dirt');
                else if (noise < 0.57) tileType = world.getTileType(biome, 'dry_grass');
                else if (noise < 0.82) tileType = world.getTileType(biome, 'grass');
                else tileType = world.getTileType(biome, 'water');
                this._tileTypes[i].push(tileType);

                // create tile sprite
                let sprite = new Shaku.gfx.Sprite(tileType.texture);
                sprite.position.set(i * TileType.sizeInPixels, j * TileType.sizeInPixels);
                sprite.size.copy(tileType.texture.size);
                this._tiles[tileType.layer].add(sprite);

            }
        }

        // sort tile groups by texture
        for (let i = 0; i <= TileType.Layers._Count; ++i) {
            this._tiles[i].sortForBatching();
        }

        // create sprites group for this area objects
        this._objects = [];
        for (let i = 0; i <= ObjectType.Layers._Count; ++i) {
            this._objects.push(new Shaku.gfx.SpritesGroup());
            this._objects[i].position.set(x * Area.sizeInPixels, y * Area.sizeInPixels);
        }

        // objects lists
        this.objects = [[],[],[],[]];

        // special - no objects on center tiles + crashing site
        if (Math.abs(x) < 2 && Math.abs(y) < 2) { 
            if (x === 0 && y === 0) {
                
                let sprite = new Shaku.gfx.Sprite(Shaku.assets.getCached("assets/ship_crashed.png"));
                sprite.size = sprite.texture.size.mul(1);
                this._objects[0].add(sprite);

                sprite = new Shaku.gfx.Sprite(Shaku.assets.getCached("assets/ship_crashed_top.png"));
                sprite.size = sprite.texture.size.mul(1);
                this._objects[1].add(sprite);

                world.collision.addShape(new Shaku.collision.CircleShape(new Shaku.utils.Circle(new Shaku.utils.Vector2(0, 20), 140)));
                world.collision.addShape(new Shaku.collision.CircleShape(new Shaku.utils.Circle(new Shaku.utils.Vector2(100, -60), 80)));
                world.collision.addShape(new Shaku.collision.CircleShape(new Shaku.utils.Circle(new Shaku.utils.Vector2(200, -120), 80)));
                world.collision.addShape(new Shaku.collision.CircleShape(new Shaku.utils.Circle(new Shaku.utils.Vector2(270, -180), 60)));
                world.collision.addShape(new Shaku.collision.CircleShape(new Shaku.utils.Circle(new Shaku.utils.Vector2(330, -200), 30)));
                world.collision.addShape(new Shaku.collision.CircleShape(new Shaku.utils.Circle(new Shaku.utils.Vector2(370, -220), 30)));
                world.collision.addShape(new Shaku.collision.CircleShape(new Shaku.utils.Circle(new Shaku.utils.Vector2(-150, 60), 100)));
                world.collision.addShape(new Shaku.collision.CircleShape(new Shaku.utils.Circle(new Shaku.utils.Vector2(-230, 110), 75)));
            }
            return; 
        }

        // create random objects (iterate tiles)
        for (let i = 0; i < Area.sizeInTiles; ++i) {
            for (let j = 0; j < Area.sizeInTiles; ++j) {

                // get tile type
                let tileType = this._tileTypes[i][j];

                // no objects?
                if (tileType.objects.length === 0) {
                    continue;
                }

                // is this a wall tile?
                let isWall = (Perlin.noise(1000000 - (x * Area.sizeInTiles - j) / 35 + 0.5, 1000000 - (y * Area.sizeInTiles - i) / 35 + 0.5, 0) < 0.5);

                // generate positions to spawn objects at
                let positions = [];
                for (let pi = -1; pi <= 1; pi += 1) {
                    for (let pj = -1; pj <= 1; pj += 1) {
                        let offset = TileType.sizeInPixels / 3.5;
                        let position = new Shaku.utils.Vector2(i * TileType.sizeInPixels, j * TileType.sizeInPixels).add(offset * pi, offset * pj);
                        positions.push(position);
                    }
                }

                // spawn objects
                for (let pi = 0; pi < positions.length; ++pi) {
                    
                    // randomize object type and if null go to next spot
                    let type = tileType.getRandomObjectType(2);

                    // if wall, we are more persist on spawning an object
                    let attemptsLeft = 3;
                    while (isWall && type === null && attemptsLeft-- > 0) {
                        type = tileType.getRandomObjectType();
                    }

                    // skip
                    if (type == null) { continue; }
                    
                    // create object
                    let objType = world.getObjectType(biome, type);
                    let obj = new StaticObject(objType, positions[pi], this._objects, world.collision);
                    this.objects[objType.layer || 0].push(obj);
                }
            }
        }

        // sort object groups by texture
        for (let i = 0; i <= ObjectType.Layers._Count; ++i) {
            this._objects[i].sortForBatching();
        }
    }

    /**
     * Draw area tiles layer.
     */
    drawTiles(layer)
    {
        Shaku.gfx.drawGroup(this._tiles[layer], true, true);
    }

    /**
     * Draw objects.
     */
    drawObjects(layer)
    {
        Shaku.gfx.drawGroup(this._objects[layer], true, true);
    }
}

// set area size in tiles and pixels
Area.sizeInTiles = 3;
Area.sizeInPixels = TileType.sizeInPixels * Area.sizeInTiles;

// export the area
module.exports = Area;
},{"./object":4,"./object_type":5,"./tile_type":7}]},{},[2])(2)
});

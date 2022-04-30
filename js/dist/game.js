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

/**
 * Define our custom main effect to draw objects.
 * This effect works like the basic effect, but with 2d parallax.
 */
class ObjectsEffect extends Shaku.gfx.BasicEffect
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

uniform vec2 screenCenter;
uniform float parallaxFactor;

varying vec2 v_texCoord;
varying vec4 v_color;

void main(void) {
    
    vec4 absPosition = world * vec4(position, 1.0);
    vec2 paralFactor = (absPosition.xy - screenCenter.xy) * 0.05 * parallaxFactor;
    absPosition.xy += paralFactor;
    gl_Position = (projection * absPosition);
    v_texCoord = coord;
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
module.exports = ObjectsEffect;

},{}],3:[function(require,module,exports){

/**
 * Define our custom tiles effect.
 */
class TilesEffect extends Shaku.gfx.BasicEffect
{
    /**
     * Override the vertex shader for our custom effect.
     */
    get vertexCode()
    {
        // vertex shader code
        const code = `
attribute vec3 position;
attribute vec2 coord;
attribute vec4 color;

uniform mat4 projection;
uniform mat4 world;

varying vec2 v_texCoord;
varying vec4 v_color;
varying vec2 v_overlayCoord;

void main(void) {
    gl_Position = projection * world * vec4(position, 1.0);
    v_overlayCoord = position.xy / 1000.0;
    v_texCoord = coord;
    v_color = color;
}
        `;
        return code;
    }

    /**
     * Override the fragment shader for our custom effect.
     */
    get fragmentCode()
    {
        // fragment shader code
        const code = `  
#ifdef GL_ES
    precision highp float;
#endif

uniform sampler2D texture;
uniform sampler2D overlayTexture;

varying vec2 v_texCoord;
varying vec4 v_color;
varying vec2 v_overlayCoord;

void main(void) {

    // get base color
    gl_FragColor = texture2D(texture, v_texCoord) * v_color;
    gl_FragColor.rgb *= gl_FragColor.a;
    
    // get overlay color
    vec4 overlay = texture2D(overlayTexture, v_overlayCoord.xy);
    gl_FragColor.rgb *= (0.25 + overlay.rgb * 0.75);
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
        ret['overlayTexture'] = { type: Shaku.gfx.Effect.UniformTypes.Texture };
        return ret;
    }
}


// export main effect
module.exports = TilesEffect;

},{}],4:[function(require,module,exports){

/**
 * Define our custom water effect.
 */
class WaterEffect extends Shaku.gfx.BasicEffect
{
    /**
     * Override the fragment shader for our custom effect.
     */
    get fragmentCode()
    {
        // fragment shader code
        const code = `  
#ifdef GL_ES
    precision highp float;
#endif

uniform sampler2D texture;
uniform float waveFactor;
uniform float timeFactor;

uniform sampler2D topTexture;

varying vec2 v_texCoord;
varying vec4 v_color;

void main(void) {

    // uv shift factor
    float uvShift = cos(v_texCoord.y * 6.283185307179586 + timeFactor) * waveFactor;

    // get base color
    vec2 textCoord = v_texCoord;
    textCoord.y += uvShift;
    gl_FragColor = texture2D(texture, textCoord) * v_color;
    gl_FragColor.rgb *= gl_FragColor.a;

    // add top overlay
    textCoord = v_texCoord;
    textCoord.x += uvShift;
    vec4 topColor = texture2D(topTexture, textCoord);
    gl_FragColor.rgb += topColor.rgb * (gl_FragColor.a * gl_FragColor.a) * 0.5;
   
    // add specular overlay
    textCoord = 1.0 - v_texCoord * 0.75 + uvShift * 0.25;
    topColor = texture2D(topTexture, textCoord);
    gl_FragColor.rgb += (topColor.r * gl_FragColor.r * 2.5);
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
        ret['topTexture'] = { type: Shaku.gfx.Effect.UniformTypes.Texture };
        ret['waveFactor'] = { type: Shaku.gfx.Effect.UniformTypes.Float };
        ret['timeFactor'] = { type: Shaku.gfx.Effect.UniformTypes.Float };
        return ret;
    }
}


// export main effect
module.exports = WaterEffect;

},{}],5:[function(require,module,exports){
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

          // do a single main loop step and request the next step
          function step() 
          {  
            // start a new frame and clear screen
            Shaku.startFrame();
            Shaku.gfx.clear(Shaku.utils.Color.cornflowerblue);

            // protection against bugs due to low fps
            if (Shaku.gameTime.delta > 1) {
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
            Shaku.gfx.drawGroup(fps);

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
},{"./world":10}],6:[function(require,module,exports){
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
        let srandom = new Shaku.utils.SeededRandom(Math.abs(position.x * 10000000 + position.y * 1.1237));
        this._type = type;
        this.position = position;

        // random scale
        this._scale = 2 + srandom.random();

        // init a new sprite
        this._sprites = [];
        let initSprite = (sprite, layer) =>
        {
            this._sprites.push(sprite);
            sprite.position = this.position;
            sprite.rotation = srandom.random() * Math.PI * 2;
            sprite.size = sprite.sourceRect.getSize().mul(this._scale);
            objectSpriteGroups[layer].add(sprite); 

            // add shadow
            if (layer >= 1) {
                let shadow = sprite.clone();
                shadow.color = new Shaku.utils.Color(0,0,0,0.35);
                shadow.size.y *= 1.15;
                shadow.position.x += 40;
                shadow.position.y -= 55;
                shadow.rotation += 0.15;
                objectSpriteGroups[layer-1].add(shadow);
            }
        }

        // generate base sprite
        {
            let sprite = type.generateBaseSprite(srandom);
            initSprite(sprite, type.layer);
        }

        // generate top sprite
        if (type.gotTopTexture) {
            let sprite = type.generateTopSprite(srandom);
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
},{}],7:[function(require,module,exports){
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
    generateBaseSprite(srandom, index)
    {
        if (index === undefined) {
            index = Math.floor(srandom.random() * this.texturesCount);
        }

        let rect = this._data.textures[index][1];
        if (!rect) {
            throw new Error("Invalid source rect!");
        }
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
    generateTopSprite(srandom, index)
    {
        if (index === undefined) {
            index = Math.floor(srandom.random() * this.topTexturesCount);
        }

        let rect = this._data.textures_top[index][1];
        if (!rect) {
            throw new Error("Invalid source rect!");
        }
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
},{}],8:[function(require,module,exports){

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

        this.lerpToPosition = null;
        this.lerpToDirection = null;
        this._updateTimestamp = (new Date()).getTime();

        this._animFactor = Math.random() * 10;

        this.direction = 0;
    }

    /**
     * Destroy this player object.
     */
    destroy()
    {
        this.collision.remove();
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
     * Get if should remove this player instance because its not being updated from server.
     */
    shouldBeRemoved()
    {
        return ((new Date()).getTime() - this._updateTimestamp) > 10 * 1000;
    }

    /**
     * Apply updates from server.
     */
    setUpdateFromServer(position, direction)
    {
        this.lerpToPosition = position;
        this.lerpToDirection = direction;
        this._updateTimestamp = (new Date()).getTime();
    }

    /**
     * Update and draw player.
     */
    step()
    {
        // set sprite rotation to direction
        this._sprite.rotation = this.direction;

        // do walking animation
        if (this.walking) {
            this._sprite.rotation += Math.sin(Shaku.gameTime.elapsed * 8) / 14;
        }

        // lerp to position / direction
        if (this.lerpToPosition) {
            let targetDistance = this.position.distanceTo(this.lerpToPosition);
            if (targetDistance < 100 && targetDistance > 1)
            {
                this.position = Shaku.utils.Vector2.lerp(this.position, this.lerpToPosition, Shaku.gameTime.delta * 7.5);
            }
            else {
                this.position.copy(this.lerpToPosition.floor());
                this.lerpToPosition = null;
            }
        }
        if (this.lerpToDirection !== null) {
            this.direction = Shaku.utils.MathHelper.lerpRadians(this.direction, this.lerpToDirection, Shaku.gameTime.delta * 12.5);
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
        let size = 160 +  Math.cos(this._animFactor + Shaku.gameTime.elapsed * 2) * 2.25;
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
},{}],9:[function(require,module,exports){

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

        // load top texture
        if (data.overlay_texture) {
            this.overlayTexture = await Shaku.assets.loadTexture(this._root + 'tiles/' + data.overlay_texture + antiCache);
            this.overlayTexture.wrapMode = Shaku.gfx.TextureWrapModes.Repeat;
        }

        // source rect
        if (data.source) {
            this.sourceRect = new Shaku.utils.Rectangle(data.source[0], data.source[1], data.source[2], data.source[3]);
        }
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
    getRandomObjectType(srandom, maxAttempts)
    {
        let options = this._data.objects.slice(0);

        while (options.length > 0) {

            let index = Math.floor(srandom.random() * options.length);
            let curr = options.splice(index, 1)[0];

            if (srandom.random() < curr.spread) {
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
},{}],10:[function(require,module,exports){
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

        // reset walking state and calculate walking speed
        this.player.walking = false;
        let moveSpeed = Shaku.gameTime.delta * 125;

        // do controls - walking with mouse
        if (Shaku.input.down('mouse_left')) {
            this.player.walking = true;
            let walkVector = this.cameraPosition.add(Shaku.input.mousePosition).sub(this.player.position).normalized();
            this.player.position.addSelf(walkVector.mul(moveSpeed, moveSpeed));
        }
        // do controls - walking with keyboard
        else {
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
        Shaku.gfx.drawGroup(coords, false);
        coords.setColor(Shaku.utils.Color.white);
        coords.position.addSelf(2,2);
        Shaku.gfx.drawGroup(coords, false);
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
},{"./bird":1,"./effects/objects_effect":2,"./effects/tiles_effect":3,"./effects/water_effect":4,"./object_type":7,"./player":8,"./tile_type":9,"./world_chunk":11}],11:[function(require,module,exports){
const StaticObject = require("./object");
const ObjectType = require("./object_type");
const TileType = require("./tile_type");


/**
 * Represent an area in world.
 */
class WorldChunk
{
    /**
     * Create area.
     */
    constructor(world, x, y)
    {
        // for randomness
        let srandom = new Shaku.utils.SeededRandom(Math.abs(-37531 + y * 13007053 + x * 3.1237));

        // biome
        let biome = 'forest';

        // base position
        this.position = new Shaku.utils.Vector2(x * WorldChunk.sizeInPixels, y * WorldChunk.sizeInPixels);

        // create sprites group for this area
        this._tileSprites = [];
        for (let i = 0; i <= TileType.Layers._Count; ++i) {
            this._tileSprites.push(new Shaku.gfx.SpritesGroup());
            this._tileSprites[i].position.copy(this.position);
        }

        // create tiles sprites
        let gotWater = false;
        this._tileTypes = [];
        for (let i = 0; i < WorldChunk.sizeInTiles; ++i) {
            this._tileTypes.push([]);
            for (let j = 0; j < WorldChunk.sizeInTiles; ++j) {

                // generate noise to choose tile type
                let noise = Perlin.noise((x * WorldChunk.sizeInTiles + i) / 150 + 0.5, (y * WorldChunk.sizeInTiles + j) / 150 + 0.5, 0) * 1.025 + (srandom.random() * 0.06 - 0.03);
                noise -= Math.sin(x / 150) / 7.5;
                noise += Math.abs(y) / 250;

                // get type based on noise
                let tileType;
                let isWater = false;
                if (noise < 0.255) { tileType = world.getTileType(biome, 'rough_dirt'); }
                else if (noise < 0.365) { tileType = world.getTileType(biome, 'dirt'); }
                else if (noise < 0.545) { tileType = world.getTileType(biome, 'dry_grass'); }
                else {
                    tileType = world.getTileType(biome, 'grass');
                    isWater = (((Perlin.noise((x * WorldChunk.sizeInTiles + i) / 35 + 0.5, (y * WorldChunk.sizeInTiles + j) / 35 + 0.5, 0) + noise / 10) + Math.abs(y) / 350) > 0.815);
                    if (isWater) { 
                        tileType = world.getTileType(biome, 'water'); 
                        gotWater = true; 
                    }
                }
                this._tileTypes[i].push(tileType);

                // create tile sprite
                let sprite = new Shaku.gfx.Sprite(tileType.texture);
                sprite._secondaryTexture = tileType.overlayTexture;
                sprite.position.set(i * TileType.sizeInPixels, j * TileType.sizeInPixels);
                sprite.size.copy(tileType.texture.size);
                sprite.sourceRect = tileType.sourceRect || undefined;
                this._tileSprites[tileType.layer].add(sprite);
            }
        }

        // sort tile groups by texture
        for (let i = 0; i <= TileType.Layers._Count; ++i) {
            this._tileSprites[i].sortForBatching();
        }

        // create sprites group for this area objects
        this._objectsSprites = [];
        for (let i = 0; i <= ObjectType.Layers._Count; ++i) {
            this._objectsSprites.push(new Shaku.gfx.SpritesGroup());
            this._objectsSprites[i].position.copy(this.position);
        }

        // objects lists
        this.objectsByLayer = [[],[],[],[]];
        this.objects = [];

        // special - crashed copter
        if (x === 0 && y === 0) {
                
            let sprite = new Shaku.gfx.Sprite(Shaku.assets.getCached("assets/ship_crashed.png"));
            sprite.size = sprite.texture.size.mul(1);
            this._objectsSprites[0].add(sprite);

            sprite = new Shaku.gfx.Sprite(Shaku.assets.getCached("assets/ship_crashed_top.png"));
            sprite.size = sprite.texture.size.mul(1);
            this._objectsSprites[1].add(sprite);

            world.collision.addShape(new Shaku.collision.CircleShape(new Shaku.utils.Circle(new Shaku.utils.Vector2(0, 20), 140)));
            world.collision.addShape(new Shaku.collision.CircleShape(new Shaku.utils.Circle(new Shaku.utils.Vector2(100, -60), 80)));
            world.collision.addShape(new Shaku.collision.CircleShape(new Shaku.utils.Circle(new Shaku.utils.Vector2(200, -120), 80)));
            world.collision.addShape(new Shaku.collision.CircleShape(new Shaku.utils.Circle(new Shaku.utils.Vector2(270, -180), 60)));
            world.collision.addShape(new Shaku.collision.CircleShape(new Shaku.utils.Circle(new Shaku.utils.Vector2(330, -200), 30)));
            world.collision.addShape(new Shaku.collision.CircleShape(new Shaku.utils.Circle(new Shaku.utils.Vector2(370, -220), 30)));
            world.collision.addShape(new Shaku.collision.CircleShape(new Shaku.utils.Circle(new Shaku.utils.Vector2(-150, 60), 100)));
            world.collision.addShape(new Shaku.collision.CircleShape(new Shaku.utils.Circle(new Shaku.utils.Vector2(-230, 110), 75)));
        }

        // create random objects (iterate tiles)
        for (let i = 0; i < WorldChunk.sizeInTiles; ++i) {
            for (let j = 0; j < WorldChunk.sizeInTiles; ++j) {

                // add empty area around spawn point
                if (Math.abs(x * WorldChunk.sizeInTiles + i) < 4 && Math.abs(y * WorldChunk.sizeInTiles + j) < 4) {
                    continue;
                }

                // get tile type
                let tileType = this._tileTypes[i][j];

                // no objects?
                if (tileType.objects.length === 0) {
                    continue;
                }

                // is this a wall tile?
                let isWall = !gotWater && (Perlin.noise(1000000 - (x * WorldChunk.sizeInTiles - j) / 35 + 0.5, 1000000 - (y * WorldChunk.sizeInTiles - i) / 35 + 0.5, 0) < 0.425);

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
                    
                    // less objects on water
                    if (gotWater && srandom.random() < 0.5) {
                        continue;
                    }

                    // randomize object type and if null go to next spot
                    let type = tileType.getRandomObjectType(srandom, 2);

                    // if wall, we are more persist on spawning an object
                    let attemptsLeft = 3;
                    while (isWall && type === null && attemptsLeft-- > 0) {
                        type = tileType.getRandomObjectType(srandom);
                    }

                    // skip
                    if (type == null) { continue; }
                    
                    // create object
                    let objType = world.getObjectType(biome, type);
                    let obj = new StaticObject(objType, positions[pi], this._objectsSprites, world.collision);
                    this.objectsByLayer[objType.layer || 0].push(obj);
                    this.objects.push(obj);
                }
            }
        }

        // sort object groups by texture
        for (let i = 0; i <= ObjectType.Layers._Count; ++i) {
            this._objectsSprites[i].sortForBatching();
        }
    }

    /**
     * Draw minimap.
     */
    drawMiniMap(sizeFactor, layer)
    {
        function drawGroup(group)
        {
            if (group.count === 0) {
                return;
            }
            let oldScale = group.scale.clone();
            let oldPosition = group.position.clone();
            group.scale.mulSelf(sizeFactor, sizeFactor);
            group.position.mulSelf(sizeFactor, sizeFactor);
            Shaku.gfx.drawGroup(group);
            group.scale.copy(oldScale);
            group.position.copy(oldPosition);
        }
        if (layer === 0) {
            drawGroup(this._tileSprites[TileType.Layers.UpperGround]);
            drawGroup(this._tileSprites[TileType.Layers.Water]);
        }
        else {
            drawGroup(this._objectsSprites[ObjectType.Layers.Bottom]);
            drawGroup(this._objectsSprites[ObjectType.Layers.Middle]);
        }
    }

    /**
     * Draw area tiles layer.
     */
    drawTiles(layer, effect)
    {
        let group = this._tileSprites[layer];
        if (group.count) {
            if (effect) { effect.uniforms.overlayTexture(this._tileSprites[layer]._sprites[0]._secondaryTexture, 1); }
            Shaku.gfx.drawGroup(group, true);
        }
    }

    /**
     * Draw objects.
     */
    drawObjects(layer)
    {
        Shaku.gfx.drawGroup(this._objectsSprites[layer], true);
    }

    /**
     * Destroy the world chunk.
     */
    destroy()
    {
        if (this._minimap) {
            this._minimap.destroy();
        }
    }
}

// set area size in tiles and pixels
WorldChunk.sizeInTiles = 8;
WorldChunk.sizeInPixels = TileType.sizeInPixels * WorldChunk.sizeInTiles;

// minimap chunk size
WorldChunk.minimapSizePixels = 64;

// export the area
module.exports = WorldChunk;
},{"./object":6,"./object_type":7,"./tile_type":9}]},{},[5])(5)
});

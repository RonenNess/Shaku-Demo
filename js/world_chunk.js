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
            Shaku.gfx.drawGroup(group, true);
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
            Shaku.gfx.drawGroup(group, true, false);
        }
    }

    /**
     * Draw objects.
     */
    drawObjects(layer)
    {
        Shaku.gfx.drawGroup(this._objectsSprites[layer], true, false); // <-- TODO BUT WITH CULLING!!!
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
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
                sprite.sourceRect = tileType.sourceRect || undefined;
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
Area.sizeInTiles = 7;
Area.sizeInPixels = TileType.sizeInPixels * Area.sizeInTiles;

// export the area
module.exports = Area;
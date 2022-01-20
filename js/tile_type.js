
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
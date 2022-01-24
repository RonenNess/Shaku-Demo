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
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
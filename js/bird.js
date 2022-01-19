
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
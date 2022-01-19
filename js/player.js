
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
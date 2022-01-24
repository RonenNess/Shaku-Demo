
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
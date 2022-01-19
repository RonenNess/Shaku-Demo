
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

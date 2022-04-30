
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

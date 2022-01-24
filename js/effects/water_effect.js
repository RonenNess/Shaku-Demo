
/**
 * Define our custom water effect.
 */
class WaterEffect extends Shaku.gfx.BasicEffect
{
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
uniform float waveFactor;
uniform float timeFactor;

uniform sampler2D topTexture;

varying vec2 v_texCoord;
varying vec4 v_color;

void main(void) {

    // uv shift factor
    float uvShift = cos(v_texCoord.y * 6.283185307179586 + timeFactor) * waveFactor;

    // get base color
    vec2 textCoord = v_texCoord;
    textCoord.y += uvShift;
    gl_FragColor = texture2D(texture, textCoord) * v_color;
    gl_FragColor.rgb *= gl_FragColor.a;

    // add top overlay
    textCoord = v_texCoord;
    textCoord.x += uvShift;
    vec4 topColor = texture2D(topTexture, textCoord);
    gl_FragColor.rgb += topColor.rgb * (gl_FragColor.a * gl_FragColor.a) * 0.5;
   
    // add specular overlay
    textCoord = 1.0 - v_texCoord * 0.75 + uvShift * 0.25;
    topColor = texture2D(topTexture, textCoord);
    gl_FragColor.rgb += (topColor.r * gl_FragColor.r * 2.5);
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
        ret['topTexture'] = { type: Shaku.gfx.Effect.UniformTypes.Texture };
        ret['waveFactor'] = { type: Shaku.gfx.Effect.UniformTypes.Float };
        ret['timeFactor'] = { type: Shaku.gfx.Effect.UniformTypes.Float };
        return ret;
    }
}


// export main effect
module.exports = WaterEffect;

#version 300 es
precision highp float;

in vec3 v_position;
in vec3 v_normal;
in vec2 v_texcoord;

uniform vec3 u_cameraPos;
uniform sampler2D u_texture;

out vec4 fragColor;

void main() {
    vec3 base = texture(u_texture, v_texcoord * 4.0).rgb * 0.3;
    
    // 四个底袋点光制造的rim light
    vec3 rim = vec3(0.0);
    vec3 positions[4] = vec3[](
        vec3(-3.5,0.5,2.5), vec3(-3.5,0.5,-2.5),
        vec3(3.5,0.5,2.5),  vec3(3.5,0.5,-2.5)
    );
    
    for(int i = 0; i < 4; i++) {
        vec3 L = normalize(positions[i] - v_position);
        float rimFactor = pow(1.0 - max(dot(normalize(v_normal), L), 0.0), 4.0);
        rim += vec3(0.3, 0.8, 1.0) * rimFactor * 3.0;
    }
    
    fragColor = vec4(base + rim + vec3(0.1, 0.3, 0.1), 1.0);
}

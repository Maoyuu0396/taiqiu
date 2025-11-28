#version 300 es
precision highp float;

in vec3 v_position;
in vec3 v_normal;
in vec2 v_texcoord;

uniform vec3 u_cameraPos;
uniform sampler2D u_texture;
uniform float u_hasTexture;
uniform vec4 u_color;

struct Light {
    int type;           // 1=directional, 2=point, 3=spot
    vec3 position;
    vec3 direction;
    vec3 color;
    float cutoff;
};

uniform Light u_lights[6];

out vec4 fragColor;

void main() {
    vec3 albedo = u_hasTexture > 0.5 ? 
                  texture(u_texture, v_texcoord).rgb : u_color.rgb;
    
    vec3 N = normalize(v_normal);
    vec3 V = normalize(u_cameraPos - v_position);
    vec3 finalColor = albedo * 0.1; // ambient

    for(int i = 0; i < 6; i++) {
        if(u_lights[i].color == vec3(0.0)) continue;
        
        vec3 lightDir;
        float attenuation = 1.0;
        
        if(u_lights[i].type == 1) { // directional
            lightDir = normalize(-u_lights[i].direction);
        } else {
            vec3 toLight = u_lights[i].position - v_position;
            float dist = length(toLight);
            lightDir = normalize(toLight);
            attenuation = 1.0 / (dist * dist * 0.1 + 1.0);
            
            if(u_lights[i].type == 3) { // spotlight
                float theta = dot(lightDir, normalize(-u_lights[i].direction));
                if(theta < u_lights[i].cutoff) continue;
                attenuation *= smoothstep(0.0, 1.0, (theta - u_lights[i].cutoff) / (1.0 - u_lights[i].cutoff));
            }
        }
        
        // diffuse
        float diff = max(dot(N, lightDir), 0.0);
        finalColor += albedo * diff * u_lights[i].color * attenuation;
        
        // specular
        vec3 R = reflect(-lightDir, N);
        float spec = pow(max(dot(V, R), 0.0), 32.0);
        finalColor += spec * u_lights[i].color * attenuation;
    }
    
    fragColor = vec4(finalColor, 1.0);
}

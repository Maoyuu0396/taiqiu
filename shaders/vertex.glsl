#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_texcoord;

uniform mat4 u_mvpMatrix;
uniform mat4 u_modelMatrix;
uniform mat3 u_normalMatrix;

out vec3 v_position;
out vec3 v_normal;
out vec2 v_texcoord;

void main() {
    vec4 worldPos = u_modelMatrix * vec4(a_position, 1.0);
    v_position = worldPos.xyz;
    v_normal = normalize(u_normalMatrix * a_normal);
    v_texcoord = a_texcoord;
    gl_Position = u_mvpMatrix * vec4(a_position, 1.0);
}

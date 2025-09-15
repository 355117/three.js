export default /* glsl */`
void main() { // 顶点着色器入口
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); // 标准 MVP 变换
} // main 结束
`;

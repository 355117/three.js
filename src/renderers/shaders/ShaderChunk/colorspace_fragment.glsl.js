export default /* glsl */`
gl_FragColor = linearToOutputTexel( gl_FragColor ); // 将线性色值转换到目标输出色彩空间（如 sRGB）
`;

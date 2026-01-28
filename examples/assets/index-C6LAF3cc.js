var E=Object.defineProperty;var T=(a,e,t)=>e in a?E(a,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):a[e]=t;var o=(a,e,t)=>T(a,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const i of r)if(i.type==="childList")for(const s of i.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function t(r){const i={};return r.integrity&&(i.integrity=r.integrity),r.referrerPolicy&&(i.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?i.credentials="include":r.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(r){if(r.ep)return;r.ep=!0;const i=t(r);fetch(r.href,i)}})();class w{constructor(e){o(this,"gl");o(this,"canvas");o(this,"animationFrameId",null);o(this,"renderCallback",null);this.canvas=e;const t=e.getContext("webgl2",{antialias:!1,depth:!1,stencil:!1,alpha:!1,preserveDrawingBuffer:!1,powerPreference:"high-performance"});if(!t)throw new Error("WebGL 2 is not supported in this browser");this.gl=t,e.addEventListener("webglcontextlost",n=>{n.preventDefault(),this.stop(),console.warn("WebGL context lost")}),e.addEventListener("webglcontextrestored",()=>{console.log("WebGL context restored")})}resize(e,t){const n=window.devicePixelRatio||1;this.canvas.width=e*n,this.canvas.height=t*n,this.canvas.style.width=`${e}px`,this.canvas.style.height=`${t}px`,this.gl.viewport(0,0,this.canvas.width,this.canvas.height)}clear(e=0,t=0,n=0,r=1){this.gl.clearColor(e,t,n,r),this.gl.clear(this.gl.COLOR_BUFFER_BIT)}start(e){if(this.animationFrameId!==null)return;this.renderCallback=e;const t=()=>{this.renderCallback&&this.renderCallback(),this.animationFrameId=requestAnimationFrame(t)};this.animationFrameId=requestAnimationFrame(t)}stop(){this.animationFrameId!==null&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=null),this.renderCallback=null}destroy(){this.stop()}}class d{constructor(e,t,n){o(this,"program");o(this,"gl");o(this,"uniformLocations",new Map);o(this,"warnedUniforms",new Set);this.gl=e;const r=this.compileShader(e.VERTEX_SHADER,t),i=this.compileShader(e.FRAGMENT_SHADER,n);this.program=this.linkProgram(r,i),e.deleteShader(r),e.deleteShader(i)}compileShader(e,t){const n=this.gl.createShader(e);if(!n)throw new Error(`Failed to create ${e===this.gl.VERTEX_SHADER?"vertex":"fragment"} shader`);if(this.gl.shaderSource(n,t),this.gl.compileShader(n),!this.gl.getShaderParameter(n,this.gl.COMPILE_STATUS)){const r=this.gl.getShaderInfoLog(n),s=`Shader compilation error (${e===this.gl.VERTEX_SHADER?"VERTEX":"FRAGMENT"}):
${r}

Shader source:
${t}`;throw this.gl.deleteShader(n),new Error(s)}return n}linkProgram(e,t){const n=this.gl.createProgram();if(!n)throw new Error("Failed to create shader program");if(this.gl.attachShader(n,e),this.gl.attachShader(n,t),this.gl.linkProgram(n),!this.gl.getProgramParameter(n,this.gl.LINK_STATUS)){const r=this.gl.getProgramInfoLog(n);throw this.gl.deleteProgram(n),new Error(`Program linking error:
${r}`)}return n}getUniformLocation(e){if(this.uniformLocations.has(e))return this.uniformLocations.get(e);const t=this.gl.getUniformLocation(this.program,e);return this.uniformLocations.set(e,t),t}warnMissingUniform(e){this.warnedUniforms.has(e)||(this.warnedUniforms.add(e),console.warn(`Uniform "${e}" not found in shader program (may be optimized out)`))}use(){this.gl.useProgram(this.program)}setUniform(e,t){const n=this.getUniformLocation(e);if(n===null){this.warnMissingUniform(e);return}typeof t=="number"?this.gl.uniform1f(n,t):t.length===2?this.gl.uniform2f(n,t[0],t[1]):t.length===3?this.gl.uniform3f(n,t[0],t[1],t[2]):t.length===4&&this.gl.uniform4f(n,t[0],t[1],t[2],t[3])}setUniformInt(e,t){const n=this.getUniformLocation(e);if(n===null){this.warnMissingUniform(e);return}this.gl.uniform1i(n,t)}destroy(){this.gl.deleteProgram(this.program),this.uniformLocations.clear(),this.warnedUniforms.clear()}}class S{constructor(e=-.5,t=0,n=1){o(this,"centerX");o(this,"centerY");o(this,"zoom");this.centerX=e,this.centerY=t,this.zoom=n}pan(e,t,n,r){const i=-e/(this.zoom*n),s=t/(this.zoom*r);this.centerX+=i,this.centerY+=s}zoomAt(e,t,n,r,i){const s=this.centerX+(e/r-.5)/this.zoom,l=this.centerY-(t/i-.5)/this.zoom;this.zoom*=n,this.zoom=Math.max(.1,Math.min(this.zoom,1e15));const v=this.centerX+(e/r-.5)/this.zoom,p=this.centerY-(t/i-.5)/this.zoom;this.centerX+=s-v,this.centerY+=l-p}toFractalCoords(e,t,n,r){const i=this.centerX+(e/n-.5)/this.zoom,s=this.centerY-(t/r-.5)/this.zoom;return[i,s]}toScreenCoords(e,t,n,r){const i=(e-this.centerX)*this.zoom*n+n*.5,s=-(t-this.centerY)*this.zoom*r+r*.5;return[i,s]}reset(){this.centerX=-.5,this.centerY=0,this.zoom=1}}const b=.6;function c(a){return 1+(a-1)*b}class x{constructor(e,t,n){o(this,"canvas");o(this,"viewState");o(this,"onChange");o(this,"isDragging",!1);o(this,"lastX",0);o(this,"lastY",0);o(this,"lastTouchDistance",0);this.canvas=e,this.viewState=t,this.onChange=n,this.setupEventListeners()}setupEventListeners(){this.canvas.addEventListener("mousedown",this.handleMouseDown.bind(this)),this.canvas.addEventListener("mousemove",this.handleMouseMove.bind(this)),this.canvas.addEventListener("mouseup",this.handleMouseUp.bind(this)),this.canvas.addEventListener("mouseleave",this.handleMouseUp.bind(this)),this.canvas.addEventListener("wheel",this.handleWheel.bind(this),{passive:!1}),this.canvas.addEventListener("dblclick",this.handleDoubleClick.bind(this)),this.canvas.addEventListener("touchstart",this.handleTouchStart.bind(this),{passive:!1}),this.canvas.addEventListener("touchmove",this.handleTouchMove.bind(this),{passive:!1}),this.canvas.addEventListener("touchend",this.handleTouchEnd.bind(this)),this.canvas.addEventListener("touchcancel",this.handleTouchEnd.bind(this)),this.canvas.addEventListener("contextmenu",e=>e.preventDefault())}getCanvasRect(){return this.canvas.getBoundingClientRect()}getScreenCoords(e,t){const n=this.getCanvasRect();return[e-n.left,t-n.top]}getCanvasSize(){const e=this.getCanvasRect();return[e.width,e.height]}notifyChange(){this.onChange(this.viewState)}handleMouseDown(e){if(e.button!==0)return;this.isDragging=!0;const[t,n]=this.getScreenCoords(e.clientX,e.clientY);this.lastX=t,this.lastY=n,this.canvas.style.cursor="grabbing"}handleMouseMove(e){if(!this.isDragging)return;const[t,n]=this.getScreenCoords(e.clientX,e.clientY),r=t-this.lastX,i=n-this.lastY,[s,l]=this.getCanvasSize();this.viewState.pan(r,i,s,l),this.notifyChange(),this.lastX=t,this.lastY=n}handleMouseUp(){this.isDragging&&(this.isDragging=!1,this.canvas.style.cursor="grab")}handleWheel(e){e.preventDefault();const[t,n]=this.getScreenCoords(e.clientX,e.clientY),r=e.deltaY>0?.9:1.1,i=c(r),[s,l]=this.getCanvasSize();this.viewState.zoomAt(t,n,i,s,l),this.notifyChange()}handleDoubleClick(e){const[t,n]=this.getScreenCoords(e.clientX,e.clientY),[r,i]=this.getCanvasSize();this.viewState.zoomAt(t,n,c(2),r,i),this.notifyChange()}getTouchDistance(e){if(e.length<2)return 0;const t=e[0].clientX-e[1].clientX,n=e[0].clientY-e[1].clientY;return Math.sqrt(t*t+n*n)}getTouchCenter(e){if(e.length===0)return[0,0];if(e.length===1)return this.getScreenCoords(e[0].clientX,e[0].clientY);const t=(e[0].clientX+e[1].clientX)/2,n=(e[0].clientY+e[1].clientY)/2;return this.getScreenCoords(t,n)}handleTouchStart(e){if(e.touches.length===1){this.isDragging=!0;const[t,n]=this.getScreenCoords(e.touches[0].clientX,e.touches[0].clientY);this.lastX=t,this.lastY=n}else e.touches.length===2&&(this.isDragging=!1,this.lastTouchDistance=this.getTouchDistance(e.touches))}handleTouchMove(e){if(e.preventDefault(),e.touches.length===1&&this.isDragging){const[t,n]=this.getScreenCoords(e.touches[0].clientX,e.touches[0].clientY),r=t-this.lastX,i=n-this.lastY,[s,l]=this.getCanvasSize();this.viewState.pan(r,i,s,l),this.notifyChange(),this.lastX=t,this.lastY=n}else if(e.touches.length===2){const t=this.getTouchDistance(e.touches),n=this.getTouchCenter(e.touches);if(this.lastTouchDistance>0){const r=t/this.lastTouchDistance,i=c(r),[s,l]=this.getCanvasSize();this.viewState.zoomAt(n[0],n[1],i,s,l),this.notifyChange()}this.lastTouchDistance=t}}handleTouchEnd(){this.isDragging=!1,this.lastTouchDistance=0}destroy(){}}const u=`#version 300 es

/**
 * Vertex Shader - Fullscreen Quad
 *
 * "Two triangles. That's it. Even a monkey could understand this."
 * - Skippy the Magnificent
 */

layout(location = 0) in vec2 a_position;

out vec2 v_uv;

void main() {
  // Pass through position as UV coordinates (ranging from 0 to 1)
  v_uv = a_position;
  
  // Map to clip space (-1 to 1)
  gl_Position = vec4(a_position * 2.0 - 1.0, 0.0, 1.0);
}
`,_=`#version 300 es

/**
 * Fragment Shader - Mandelbrot Set Computation
 *
 * "This is where the magic happens. On the GPU. In parallel. For every pixel.
 *  Simultaneously. You're welcome."
 * - Skippy the Magnificent
 */

precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform vec2 u_resolution;      // Canvas size in pixels
uniform vec2 u_center;          // Current view center in fractal coordinates
uniform float u_zoom;           // Current zoom level
uniform int u_maxIterations;    // Iteration limit (quality vs performance)
uniform vec3 u_colorA;          // Color scheme start
uniform vec3 u_colorB;          // Color scheme end
uniform float u_time;           // Time in seconds (for color rotation)

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = v_uv - 0.5;
  uv.x *= aspect;
  vec2 c = u_center + uv / u_zoom;

  vec2 z = vec2(0.0);
  int iterations = 0;
  for (int i = 0; i < 4096; i++) {
    if (i >= u_maxIterations) break;
    float zMagSq = dot(z, z);
    if (zMagSq > 4.0) break;
    z = vec2(z.x * z.x - z.y * z.y + c.x, 2.0 * z.x * z.y + c.y);
    iterations++;
  }

  if (iterations >= u_maxIterations) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float smoothIter = float(iterations) + 1.0 - log2(log2(max(dot(z, z), 4.0)));
    float logZoom = log(max(1.0, u_zoom));
    float zoomFactor = clamp(logZoom / 12.0, 0.0, 1.0);
    float lowCut = mix(28.0, 0.0, zoomFactor);
    float span = max(1.0, float(u_maxIterations) - lowCut);
    float t = clamp((smoothIter - lowCut) / span, 0.0, 1.0);
    t = pow(t, mix(0.88, 1.0, zoomFactor));
    vec3 colorAEff = mix(u_colorA * 0.45, u_colorA, zoomFactor);
    vec3 color = mix(colorAEff, u_colorB, t);
    float edgeGlow = smoothstep(0.4, 1.0, t);
    vec3 edgeColor = vec3(0.5) + 0.5 * vec3(
      sin(u_time * 0.5),
      sin(u_time * 0.5 + 2.094),
      sin(u_time * 0.5 + 4.189)
    );
    edgeColor = max(edgeColor, vec3(0.7));
    color = mix(color, edgeColor, edgeGlow * 0.8);
    color *= 1.0 + 0.5 * edgeGlow * edgeGlow;
    fragColor = vec4(min(color, vec3(1.0)), 1.0);
  }
}
`,R=`#version 300 es

/**
 * Post-process: antialias by averaging colored pixels with non-black neighbors.
 * Black (set) pixels stay black; no bleeding into the set.
 * Only applies when contrast among nearby non-black pixels is high; otherwise pass-through.
 */

precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_tex;
uniform vec2 u_resolution;

const float BLACK_THRESH = 0.02;
const float CONTRAST_THRESH = 0.35;

bool isBlack(vec3 rgb) {
  return max(max(rgb.r, rgb.g), rgb.b) < BLACK_THRESH;
}

float luminance(vec3 rgb) {
  return dot(rgb, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec2 texel = 1.0 / u_resolution;
  vec4 center = texture(u_tex, v_uv);
  vec3 c = center.rgb;

  if (isBlack(c)) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 sum = c;
  float n = 1.0;
  float lumMin = luminance(c);
  float lumMax = lumMin;

  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      if (dx == 0 && dy == 0) continue;
      vec2 uv = v_uv + vec2(float(dx), float(dy)) * texel;
      vec3 s = texture(u_tex, uv).rgb;
      if (!isBlack(s)) {
        sum += s;
        n += 1.0;
        float L = luminance(s);
        lumMin = min(lumMin, L);
        lumMax = max(lumMax, L);
      }
    }
  }

  float contrast = lumMax - lumMin;
  if (contrast < CONTRAST_THRESH) {
    fragColor = vec4(c, 1.0);
  } else {
    fragColor = vec4(sum / n, 1.0);
  }
}
`,g=256,f=4096,y=640,C=1.65;function z(a){const e=Math.max(1,a),t=Math.log10(e),n=g+y*Math.pow(t,C);return Math.round(Math.max(g,Math.min(f,n)))}class A{constructor(e){o(this,"renderer");o(this,"shaderProgram");o(this,"postProcessProgram");o(this,"viewState");o(this,"inputHandler");o(this,"maxIterationsOverride",null);o(this,"debugOverlay",null);o(this,"fbo",null);o(this,"renderTarget",null);o(this,"rtWidth",0);o(this,"rtHeight",0);o(this,"quadBuffer",null);this.renderer=new w(e),this.viewState=new S,this.shaderProgram=new d(this.renderer.gl,u,_),this.postProcessProgram=new d(this.renderer.gl,u,R),this.setupGeometry(),this.setupRenderTarget(),this.inputHandler=new x(e,this.viewState,()=>{this.render()});const t=e.parentElement;t&&(this.debugOverlay=document.createElement("div"),this.debugOverlay.id="zoom-debug",t.appendChild(this.debugOverlay)),window.addEventListener("resize",()=>{this.handleResize()}),this.handleResize()}setupGeometry(){const e=this.renderer.gl,t=new Float32Array([0,0,1,0,0,1,1,0,1,1,0,1]);if(this.quadBuffer=e.createBuffer(),!this.quadBuffer)throw new Error("Failed to create buffer");e.bindBuffer(e.ARRAY_BUFFER,this.quadBuffer),e.bufferData(e.ARRAY_BUFFER,t,e.STATIC_DRAW)}handleResize(){this.renderer.resize(window.innerWidth,window.innerHeight),this.ensureRenderTargetSize(),this.render()}setupRenderTarget(){const e=this.renderer.gl;this.fbo=e.createFramebuffer(),this.renderTarget=e.createTexture()}ensureRenderTargetSize(){const e=this.renderer.gl,t=this.renderer.canvas.width,n=this.renderer.canvas.height;t<1||n<1||t===this.rtWidth&&n===this.rtHeight||(this.rtWidth=t,this.rtHeight=n,e.bindTexture(e.TEXTURE_2D,this.renderTarget),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,t,n,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindTexture(e.TEXTURE_2D,null),e.bindFramebuffer(e.FRAMEBUFFER,this.fbo),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,this.renderTarget,0),e.bindFramebuffer(e.FRAMEBUFFER,null))}render(){const e=this.renderer.gl,t=this.renderer.canvas.width,n=this.renderer.canvas.height,r=this.maxIterationsOverride??z(this.viewState.zoom);if(this.debugOverlay){const s=this.viewState.zoom,l=s>=1e6?s.toExponential(2):s<1?s.toPrecision(4):String(Math.round(s));this.debugOverlay.textContent=`zoom ${l}  ·  iterations ${r}`}e.bindFramebuffer(e.FRAMEBUFFER,this.fbo),e.viewport(0,0,t,n),this.renderer.clear(0,0,0,1),this.shaderProgram.use(),this.shaderProgram.setUniform("u_resolution",[t,n]),this.shaderProgram.setUniform("u_center",[this.viewState.centerX,this.viewState.centerY]),this.shaderProgram.setUniform("u_zoom",this.viewState.zoom),this.shaderProgram.setUniformInt("u_maxIterations",r),this.shaderProgram.setUniform("u_colorA",[0,.1,.3]),this.shaderProgram.setUniform("u_colorB",[.5,.2,.8]),this.shaderProgram.setUniform("u_time",performance.now()*.001),e.bindBuffer(e.ARRAY_BUFFER,this.quadBuffer);const i=0;e.enableVertexAttribArray(i),e.vertexAttribPointer(i,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,t,n),this.renderer.clear(.05,.05,.1,1),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.renderTarget),this.postProcessProgram.use(),this.postProcessProgram.setUniformInt("u_tex",0),this.postProcessProgram.setUniform("u_resolution",[t,n]),e.bindBuffer(e.ARRAY_BUFFER,this.quadBuffer),e.enableVertexAttribArray(i),e.vertexAttribPointer(i,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6)}start(){this.renderer.start(()=>{this.render()})}stop(){this.renderer.stop()}setMaxIterations(e){this.maxIterationsOverride=Math.round(Math.max(1,Math.min(e,f))),this.render()}resetView(){this.viewState.reset(),this.render()}destroy(){this.stop(),this.debugOverlay?.remove(),this.debugOverlay=null,this.inputHandler.destroy(),this.shaderProgram.destroy(),this.postProcessProgram.destroy();const e=this.renderer.gl;this.fbo&&e.deleteFramebuffer(this.fbo),this.renderTarget&&e.deleteTexture(this.renderTarget),this.renderer.destroy(),this.quadBuffer&&e.deleteBuffer(this.quadBuffer)}}console.log("Fractal Explorer - Initializing...");let h=null;function m(){const a=document.getElementById("app");if(!a){console.error("Could not find #app element");return}const e=document.createElement("canvas");e.id="fractal-canvas",a.appendChild(e);try{h=new A(e),h.start(),console.log("Fractal Explorer initialized successfully"),console.log("Controls:"),console.log("  - Drag to pan"),console.log("  - Scroll to zoom"),console.log("  - Double-click to zoom in"),console.log("  - Touch drag to pan (mobile)"),console.log("  - Pinch to zoom (mobile)")}catch(t){console.error("Failed to initialize Fractal Explorer:",t),a.innerHTML=`
      <div style="color: white; text-align: center; padding: 20px; font-family: system-ui, sans-serif;">
        <h1>Initialization Error</h1>
        <p>Failed to initialize the application.</p>
        <pre style="text-align: left; margin-top: 20px; color: #ff6b6b;">${t instanceof Error?t.message:String(t)}</pre>
      </div>
    `}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",m):m();window.addEventListener("beforeunload",()=>{h&&h.destroy()});
//# sourceMappingURL=index-C6LAF3cc.js.map

var _=Object.defineProperty;var z=(n,e,t)=>e in n?_(n,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[e]=t;var a=(n,e,t)=>z(n,typeof e!="symbol"?e+"":e,t);(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))i(r);new MutationObserver(r=>{for(const o of r)if(o.type==="childList")for(const s of o.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&i(s)}).observe(document,{childList:!0,subtree:!0});function t(r){const o={};return r.integrity&&(o.integrity=r.integrity),r.referrerPolicy&&(o.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?o.credentials="include":r.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(r){if(r.ep)return;r.ep=!0;const o=t(r);fetch(r.href,o)}})();class P{constructor(e){a(this,"gl");a(this,"canvas");a(this,"animationFrameId",null);a(this,"renderCallback",null);this.canvas=e;const t=e.getContext("webgl2",{antialias:!1,depth:!1,stencil:!1,alpha:!1,preserveDrawingBuffer:!1,powerPreference:"high-performance"});if(!t)throw new Error("WebGL 2 is not supported in this browser");this.gl=t,e.addEventListener("webglcontextlost",i=>{i.preventDefault(),this.stop(),console.warn("WebGL context lost")}),e.addEventListener("webglcontextrestored",()=>{console.log("WebGL context restored")})}resize(e,t){const i=window.devicePixelRatio||1;this.canvas.width=e*i,this.canvas.height=t*i,this.canvas.style.width=`${e}px`,this.canvas.style.height=`${t}px`,this.gl.viewport(0,0,this.canvas.width,this.canvas.height)}clear(e=0,t=0,i=0,r=1){this.gl.clearColor(e,t,i,r),this.gl.clear(this.gl.COLOR_BUFFER_BIT)}start(e){if(this.animationFrameId!==null)return;this.renderCallback=e;const t=()=>{this.renderCallback&&this.renderCallback(),this.animationFrameId=requestAnimationFrame(t)};this.animationFrameId=requestAnimationFrame(t)}stop(){this.animationFrameId!==null&&(cancelAnimationFrame(this.animationFrameId),this.animationFrameId=null),this.renderCallback=null}destroy(){this.stop()}}class k{constructor(e,t,i){a(this,"program");a(this,"gl");a(this,"uniformLocations",new Map);a(this,"warnedUniforms",new Set);this.gl=e;const r=this.compileShader(e.VERTEX_SHADER,t),o=this.compileShader(e.FRAGMENT_SHADER,i);this.program=this.linkProgram(r,o),e.deleteShader(r),e.deleteShader(o)}compileShader(e,t){const i=this.gl.createShader(e);if(!i)throw new Error(`Failed to create ${e===this.gl.VERTEX_SHADER?"vertex":"fragment"} shader`);if(this.gl.shaderSource(i,t),this.gl.compileShader(i),!this.gl.getShaderParameter(i,this.gl.COMPILE_STATUS)){const r=this.gl.getShaderInfoLog(i),s=`Shader compilation error (${e===this.gl.VERTEX_SHADER?"VERTEX":"FRAGMENT"}):
${r}

Shader source:
${t}`;throw this.gl.deleteShader(i),new Error(s)}return i}linkProgram(e,t){const i=this.gl.createProgram();if(!i)throw new Error("Failed to create shader program");if(this.gl.attachShader(i,e),this.gl.attachShader(i,t),this.gl.linkProgram(i),!this.gl.getProgramParameter(i,this.gl.LINK_STATUS)){const r=this.gl.getProgramInfoLog(i);throw this.gl.deleteProgram(i),new Error(`Program linking error:
${r}`)}return i}getUniformLocation(e){if(this.uniformLocations.has(e))return this.uniformLocations.get(e);const t=this.gl.getUniformLocation(this.program,e);return this.uniformLocations.set(e,t),t}warnMissingUniform(e){this.warnedUniforms.has(e)||(this.warnedUniforms.add(e),console.warn(`Uniform "${e}" not found in shader program (may be optimized out)`))}use(){this.gl.useProgram(this.program)}setUniform(e,t){const i=this.getUniformLocation(e);if(i===null){this.warnMissingUniform(e);return}typeof t=="number"?this.gl.uniform1f(i,t):t.length===2?this.gl.uniform2f(i,t[0],t[1]):t.length===3?this.gl.uniform3f(i,t[0],t[1],t[2]):t.length===4&&this.gl.uniform4f(i,t[0],t[1],t[2],t[3])}setUniformInt(e,t){const i=this.getUniformLocation(e);if(i===null){this.warnMissingUniform(e);return}this.gl.uniform1i(i,t)}destroy(){this.gl.deleteProgram(this.program),this.uniformLocations.clear(),this.warnedUniforms.clear()}}class L{constructor(e=-.5,t=0,i=.4){a(this,"centerX");a(this,"centerY");a(this,"zoom");this.centerX=e,this.centerY=t,this.zoom=i}pan(e,t,i,r){const o=-e/(this.zoom*i),s=t/(this.zoom*r);this.centerX+=o,this.centerY+=s}zoomAt(e,t,i,r,o){const s=this.centerX+(e/r-.5)/this.zoom,c=this.centerY-(t/o-.5)/this.zoom;this.zoom*=i,this.zoom=Math.max(.1,Math.min(this.zoom,1e15));const d=this.centerX+(e/r-.5)/this.zoom,u=this.centerY-(t/o-.5)/this.zoom;this.centerX+=s-d,this.centerY+=c-u}toFractalCoords(e,t,i,r){const o=i/r,s=(e/i-.5)*o,c=t/r-.5,d=this.centerX+s/this.zoom,u=this.centerY-c/this.zoom;return[d,u]}toScreenCoords(e,t,i,r){const o=i/r,s=(e-this.centerX)*this.zoom,c=(t-this.centerY)*this.zoom,d=(s/o+.5)*i,u=(-c+.5)*r;return[d,u]}zoomToPoint(e,t,i,r,o){const[s,c]=this.toFractalCoords(e,t,r,o);this.centerX=s,this.centerY=c,this.zoom*=i,this.zoom=Math.max(.1,Math.min(this.zoom,1e15))}reset(){this.centerX=-.5,this.centerY=0,this.zoom=.4}}const F=.6;function x(n){return 1+(n-1)*F}class B{constructor(e,t,i){a(this,"canvas");a(this,"viewState");a(this,"onChange");a(this,"onIterationAdjust",null);a(this,"onIterationReset",null);a(this,"onPaletteCycle",null);a(this,"onColorOffset",null);a(this,"onColorOffsetReset",null);a(this,"onToggleAA",null);a(this,"onFractalCycle",null);a(this,"onToggleJuliaMode",null);a(this,"onJuliaPick",null);a(this,"onShare",null);a(this,"onLocationSelect",null);a(this,"onToggleHelp",null);a(this,"onToggleScreenshotMode",null);a(this,"isDragging",!1);a(this,"lastX",0);a(this,"lastY",0);a(this,"lastTouchDistance",0);a(this,"juliaPickerMode",!1);this.canvas=e,this.viewState=t,this.onChange=i,this.setupEventListeners()}setIterationAdjustCallback(e){this.onIterationAdjust=e}setIterationResetCallback(e){this.onIterationReset=e}setPaletteCycleCallback(e){this.onPaletteCycle=e}setColorOffsetCallback(e){this.onColorOffset=e}setColorOffsetResetCallback(e){this.onColorOffsetReset=e}setToggleAACallback(e){this.onToggleAA=e}setFractalCycleCallback(e){this.onFractalCycle=e}setToggleJuliaModeCallback(e){this.onToggleJuliaMode=e}setJuliaPickCallback(e){this.onJuliaPick=e}setShareCallback(e){this.onShare=e}setLocationSelectCallback(e){this.onLocationSelect=e}setToggleHelpCallback(e){this.onToggleHelp=e}setToggleScreenshotModeCallback(e){this.onToggleScreenshotMode=e}setJuliaPickerMode(e){this.juliaPickerMode=e,this.canvas.style.cursor=e?"crosshair":"grab"}isJuliaPickerModeActive(){return this.juliaPickerMode}setupEventListeners(){this.canvas.addEventListener("mousedown",this.handleMouseDown.bind(this)),this.canvas.addEventListener("mousemove",this.handleMouseMove.bind(this)),this.canvas.addEventListener("mouseup",this.handleMouseUp.bind(this)),this.canvas.addEventListener("mouseleave",this.handleMouseUp.bind(this)),this.canvas.addEventListener("wheel",this.handleWheel.bind(this),{passive:!1}),this.canvas.addEventListener("dblclick",this.handleDoubleClick.bind(this)),this.canvas.addEventListener("touchstart",this.handleTouchStart.bind(this),{passive:!1}),this.canvas.addEventListener("touchmove",this.handleTouchMove.bind(this),{passive:!1}),this.canvas.addEventListener("touchend",this.handleTouchEnd.bind(this)),this.canvas.addEventListener("touchcancel",this.handleTouchEnd.bind(this)),this.canvas.addEventListener("contextmenu",e=>e.preventDefault()),window.addEventListener("keydown",this.handleKeyDown.bind(this))}getCanvasRect(){return this.canvas.getBoundingClientRect()}getScreenCoords(e,t){const i=this.getCanvasRect();return[e-i.left,t-i.top]}getCanvasSize(){const e=this.getCanvasRect();return[e.width,e.height]}notifyChange(){this.onChange(this.viewState)}handleMouseDown(e){if(e.button!==0)return;const[t,i]=this.getScreenCoords(e.clientX,e.clientY);if(this.juliaPickerMode&&this.onJuliaPick){const[r,o]=this.getCanvasSize(),[s,c]=this.viewState.toFractalCoords(t,i,r,o);this.onJuliaPick(s,c);return}this.isDragging=!0,this.lastX=t,this.lastY=i,this.canvas.style.cursor="grabbing"}handleMouseMove(e){if(!this.isDragging)return;const[t,i]=this.getScreenCoords(e.clientX,e.clientY),r=t-this.lastX,o=i-this.lastY,[s,c]=this.getCanvasSize();this.viewState.pan(r,o,s,c),this.notifyChange(),this.lastX=t,this.lastY=i}handleMouseUp(){this.isDragging&&(this.isDragging=!1,this.canvas.style.cursor="grab")}handleWheel(e){e.preventDefault();const[t,i]=this.getScreenCoords(e.clientX,e.clientY),r=e.deltaY>0?.9:1.1,o=x(r),[s,c]=this.getCanvasSize();this.viewState.zoomAt(t,i,o,s,c),this.notifyChange()}handleDoubleClick(e){const[t,i]=this.getScreenCoords(e.clientX,e.clientY),[r,o]=this.getCanvasSize();this.viewState.zoomToPoint(t,i,x(2),r,o),this.notifyChange()}getTouchDistance(e){if(e.length<2)return 0;const t=e[0].clientX-e[1].clientX,i=e[0].clientY-e[1].clientY;return Math.sqrt(t*t+i*i)}getTouchCenter(e){if(e.length===0)return[0,0];if(e.length===1)return this.getScreenCoords(e[0].clientX,e[0].clientY);const t=(e[0].clientX+e[1].clientX)/2,i=(e[0].clientY+e[1].clientY)/2;return this.getScreenCoords(t,i)}handleTouchStart(e){if(e.touches.length===1){this.isDragging=!0;const[t,i]=this.getScreenCoords(e.touches[0].clientX,e.touches[0].clientY);this.lastX=t,this.lastY=i}else e.touches.length===2&&(this.isDragging=!1,this.lastTouchDistance=this.getTouchDistance(e.touches))}handleTouchMove(e){if(e.preventDefault(),e.touches.length===1&&this.isDragging){const[t,i]=this.getScreenCoords(e.touches[0].clientX,e.touches[0].clientY),r=t-this.lastX,o=i-this.lastY,[s,c]=this.getCanvasSize();this.viewState.pan(r,o,s,c),this.notifyChange(),this.lastX=t,this.lastY=i}else if(e.touches.length===2){const t=this.getTouchDistance(e.touches),i=this.getTouchCenter(e.touches);if(this.lastTouchDistance>0){const r=t/this.lastTouchDistance,o=x(r),[s,c]=this.getCanvasSize();this.viewState.zoomAt(i[0],i[1],o,s,c),this.notifyChange()}this.lastTouchDistance=t}}handleTouchEnd(){this.isDragging=!1,this.lastTouchDistance=0}handleKeyDown(e){if(!(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement))switch(e.key){case"+":case"=":e.preventDefault(),this.onIterationAdjust?.(1);break;case"-":case"_":e.preventDefault(),this.onIterationAdjust?.(-1);break;case"0":e.preventDefault(),this.onIterationReset?.();break;case"c":e.preventDefault(),this.onPaletteCycle?.(1);break;case"C":e.preventDefault(),this.onPaletteCycle?.(-1);break;case"[":case",":e.preventDefault(),this.onColorOffset?.(-.1);break;case"]":case".":e.preventDefault(),this.onColorOffset?.(.1);break;case"{":case"<":e.preventDefault(),this.onColorOffset?.(-.5);break;case"}":case">":e.preventDefault(),this.onColorOffset?.(.5);break;case"r":case"R":e.preventDefault(),this.onColorOffsetReset?.();break;case"a":case"A":e.preventDefault(),this.onToggleAA?.();break;case"f":e.preventDefault(),this.onFractalCycle?.(1);break;case"F":e.preventDefault(),this.onFractalCycle?.(-1);break;case"j":case"J":e.preventDefault(),this.onToggleJuliaMode?.();break;case"s":case"S":e.preventDefault(),this.onShare?.();break;case"1":case"2":case"3":case"4":case"5":case"6":case"7":case"8":case"9":e.preventDefault(),this.onLocationSelect?.(e.key);break;case"h":case"H":e.preventDefault(),this.onToggleHelp?.();break;case" ":e.preventDefault(),this.onToggleScreenshotMode?.();break}}destroy(){}}var l=(n=>(n[n.Mandelbrot=0]="Mandelbrot",n[n.BurningShip=1]="BurningShip",n[n.Julia=2]="Julia",n[n.BurningShipJulia=3]="BurningShipJulia",n))(l||{});const U={0:"Mandelbrot",1:"Burning Ship",2:"Julia",3:"Burning Ship Julia"},h={TYPE:"t",CENTER_X:"x",CENTER_Y:"y",ZOOM:"z",PALETTE:"p",COLOR_OFFSET:"o",JULIA_REAL:"jr",JULIA_IMAG:"ji",ITERATIONS:"i",AA:"aa"};function m(n,e=15){return n===0?"0":Math.abs(n)<1e-10||Math.abs(n)>1e10?n.toExponential(e):parseFloat(n.toPrecision(e)).toString()}function p(n){if(n===null||n==="")return null;const e=parseFloat(n);return isNaN(e)?null:e}function R(n){const e=new URLSearchParams;return e.set(h.TYPE,n.fractalType.toString()),e.set(h.CENTER_X,m(n.centerX)),e.set(h.CENTER_Y,m(n.centerY)),e.set(h.ZOOM,m(n.zoom)),e.set(h.PALETTE,n.paletteIndex.toString()),Math.abs(n.colorOffset)>.001&&e.set(h.COLOR_OFFSET,m(n.colorOffset,4)),(n.fractalType===l.Julia||n.fractalType===l.BurningShipJulia)&&(e.set(h.JULIA_REAL,m(n.juliaC[0])),e.set(h.JULIA_IMAG,m(n.juliaC[1]))),n.maxIterationsOverride!==null&&e.set(h.ITERATIONS,n.maxIterationsOverride.toString()),n.aaEnabled&&e.set(h.AA,"1"),e.toString()}function X(n){const e=new URLSearchParams(n.replace(/^#/,"")),t={},i=p(e.get(h.TYPE));i!==null&&i>=0&&i<=3&&(t.fractalType=i);const r=p(e.get(h.CENTER_X));r!==null&&(t.centerX=r);const o=p(e.get(h.CENTER_Y));o!==null&&(t.centerY=o);const s=p(e.get(h.ZOOM));s!==null&&s>0&&(t.zoom=s);const c=p(e.get(h.PALETTE));c!==null&&c>=0&&c<=11&&(t.paletteIndex=Math.floor(c));const d=p(e.get(h.COLOR_OFFSET));d!==null&&(t.colorOffset=d);const u=p(e.get(h.JULIA_REAL)),y=p(e.get(h.JULIA_IMAG));u!==null&&y!==null&&(t.juliaC=[u,y]);const v=p(e.get(h.ITERATIONS));return v!==null&&v>0&&(t.maxIterationsOverride=Math.floor(v)),e.get(h.AA)==="1"&&(t.aaEnabled=!0),t}function D(n){const e=R(n),t=new URL(window.location.href);return t.hash=e,t.toString()}function N(n){const e=R(n);window.history.replaceState(null,"","#"+e)}function Y(){return X(window.location.hash)}async function J(n){const e=D(n);try{return await navigator.clipboard.writeText(e),!0}catch{const t=document.createElement("textarea");t.value=e,t.style.position="fixed",t.style.left="-9999px",document.body.appendChild(t),t.select();try{return document.execCommand("copy"),!0}catch{return!1}finally{document.body.removeChild(t)}}}const j=[{name:"Seahorse Valley",description:"The iconic seahorse-shaped spirals in the Mandelbrot set",key:"1",state:{fractalType:l.Mandelbrot,centerX:-.747,centerY:.1,zoom:50,paletteIndex:4,colorOffset:0,juliaC:[-.7,.27015],maxIterationsOverride:null,aaEnabled:!1}},{name:"Elephant Valley",description:"Elephant trunk-like spirals on the positive real side",key:"2",state:{fractalType:l.Mandelbrot,centerX:.273833471870982,centerY:.00561979255775977,zoom:80,paletteIndex:10,colorOffset:0,juliaC:[-.7,.27015],maxIterationsOverride:null,aaEnabled:!1}},{name:"Double Spiral Valley",description:"Beautiful double spirals deep in the set",key:"3",state:{fractalType:l.Mandelbrot,centerX:-.743419359336048,centerY:.131251071265607,zoom:1183.1341328454,paletteIndex:4,colorOffset:.3,juliaC:[-.7,.27015],maxIterationsOverride:null,aaEnabled:!1}},{name:"Spiral Galaxy",description:"Galactic spiral arms emerging from chaos",key:"4",state:{fractalType:l.Mandelbrot,centerX:-.761574,centerY:-.0847596,zoom:5e3,paletteIndex:11,colorOffset:0,juliaC:[-.7,.27015],maxIterationsOverride:null,aaEnabled:!1}},{name:"The Armada",description:"Mini ships along the antenna of the Burning Ship fractal",key:"5",state:{fractalType:l.BurningShip,centerX:-1.80173025652805,centerY:.0026088215386122,zoom:9,paletteIndex:11,colorOffset:.3,juliaC:[-.7,.27015],maxIterationsOverride:null,aaEnabled:!1}},{name:"Douady Rabbit",description:"The famous rabbit-eared Julia set",key:"6",state:{fractalType:l.Julia,centerX:0,centerY:0,zoom:.6,paletteIndex:11,colorOffset:.2,juliaC:[-.123,.745],maxIterationsOverride:null,aaEnabled:!1}},{name:"Dragon Julia",description:"Fierce dragon-like Julia set",key:"7",state:{fractalType:l.Julia,centerX:0,centerY:0,zoom:.45,paletteIndex:10,colorOffset:.4,juliaC:[-.8,.156],maxIterationsOverride:null,aaEnabled:!1}},{name:"Lightning Julia",description:"Electric, lightning-like patterns",key:"8",state:{fractalType:l.Julia,centerX:0,centerY:0,zoom:.45,paletteIndex:11,colorOffset:.1,juliaC:[-.7269,.1889],maxIterationsOverride:1e3,aaEnabled:!1}},{name:"Burning Ship Julia",description:"The Burning Ship transformed into Julia form",key:"9",state:{fractalType:l.BurningShipJulia,centerX:.0531593112628493,centerY:-.00735797965780141,zoom:4,paletteIndex:11,colorOffset:.1,juliaC:[-1.59537659751621,.00014862028243811],maxIterationsOverride:null,aaEnabled:!1}}];function H(n){return j.find(e=>e.key===n)}const I=`#version 300 es

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
`,$=`#version 300 es

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
uniform float u_time;           // Time in seconds (for animations)
uniform int u_paletteIndex;     // Which color palette to use (0-7)
uniform float u_colorOffset;    // Offset to shift the color cycle
uniform int u_fractalType;      // 0 = Mandelbrot, 1 = Burning Ship, 2 = Julia, 3 = Burning Ship Julia
uniform vec2 u_juliaC;          // Julia set constant (only used for Julia types)

// Attempt at magnificent color palettes using cosine gradients
// Formula: color = a + b * cos(2π * (c * t + d))
// Each palette defined by vec3 a, b, c, d

vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

vec3 getColor(float t, int paletteIdx, bool isCycling) {
  // For cycling palettes: wrap t to [0, 1] for repeating
  // For monotonic palettes: clamp t to [0, 1] for single gradient
  if (isCycling) {
    t = fract(t);
  } else {
    t = clamp(t, 0.0, 1.0);
  }

  if (paletteIdx == 0) {
    // Classic rainbow - the psychedelic special
    return palette(t,
      vec3(0.5, 0.5, 0.5),
      vec3(0.5, 0.5, 0.5),
      vec3(1.0, 1.0, 1.0),
      vec3(0.0, 0.33, 0.67));
  } else if (paletteIdx == 1) {
    // Blue journey - dark indigo -> teal -> cyan -> bright blue-white
    vec3 c1 = vec3(0.02, 0.01, 0.08);  // deep indigo
    vec3 c2 = vec3(0.05, 0.15, 0.25);  // dark teal
    vec3 c3 = vec3(0.1, 0.4, 0.5);     // teal
    vec3 c4 = vec3(0.3, 0.6, 0.8);     // sky blue
    vec3 c5 = vec3(0.7, 0.9, 1.0);     // bright cyan-white
    if (t < 0.25) return mix(c1, c2, t * 4.0);
    else if (t < 0.5) return mix(c2, c3, (t - 0.25) * 4.0);
    else if (t < 0.75) return mix(c3, c4, (t - 0.5) * 4.0);
    else return mix(c4, c5, (t - 0.75) * 4.0);
  } else if (paletteIdx == 2) {
    // Gold journey - dark brown -> copper -> orange -> gold -> bright yellow
    vec3 c1 = vec3(0.04, 0.02, 0.01);  // near black brown
    vec3 c2 = vec3(0.2, 0.08, 0.02);   // dark copper
    vec3 c3 = vec3(0.5, 0.25, 0.05);   // copper-orange
    vec3 c4 = vec3(0.85, 0.6, 0.2);    // gold
    vec3 c5 = vec3(1.0, 0.95, 0.7);    // bright gold-white
    if (t < 0.25) return mix(c1, c2, t * 4.0);
    else if (t < 0.5) return mix(c2, c3, (t - 0.25) * 4.0);
    else if (t < 0.75) return mix(c3, c4, (t - 0.5) * 4.0);
    else return mix(c4, c5, (t - 0.75) * 4.0);
  } else if (paletteIdx == 3) {
    // Grayscale with subtle blue tint at shadows, warm at highlights
    vec3 c1 = vec3(0.01, 0.01, 0.03);  // near black, hint of blue
    vec3 c2 = vec3(0.15, 0.15, 0.17);  // dark gray, cool
    vec3 c3 = vec3(0.45, 0.45, 0.45);  // mid gray
    vec3 c4 = vec3(0.75, 0.74, 0.72);  // light gray, hint warm
    vec3 c5 = vec3(1.0, 0.98, 0.95);   // warm white
    if (t < 0.25) return mix(c1, c2, t * 4.0);
    else if (t < 0.5) return mix(c2, c3, (t - 0.25) * 4.0);
    else if (t < 0.75) return mix(c3, c4, (t - 0.5) * 4.0);
    else return mix(c4, c5, (t - 0.75) * 4.0);
  } else if (paletteIdx == 4) {
    // Fire - hot hot hot
    return palette(t,
      vec3(0.5, 0.5, 0.5),
      vec3(0.5, 0.5, 0.5),
      vec3(1.0, 1.0, 0.5),
      vec3(0.0, 0.1, 0.2));
  } else if (paletteIdx == 5) {
    // Ice - cool blues and cyans
    return palette(t,
      vec3(0.5, 0.5, 0.5),
      vec3(0.5, 0.5, 0.5),
      vec3(1.0, 0.7, 0.4),
      vec3(0.0, 0.15, 0.20));
  } else if (paletteIdx == 6) {
    // Sepia journey - dark brown -> warm brown -> tan -> cream
    vec3 c1 = vec3(0.03, 0.02, 0.01);  // near black
    vec3 c2 = vec3(0.15, 0.08, 0.03);  // dark brown
    vec3 c3 = vec3(0.4, 0.25, 0.12);   // warm brown
    vec3 c4 = vec3(0.7, 0.55, 0.35);   // tan
    vec3 c5 = vec3(1.0, 0.95, 0.85);   // cream white
    if (t < 0.25) return mix(c1, c2, t * 4.0);
    else if (t < 0.5) return mix(c2, c3, (t - 0.25) * 4.0);
    else if (t < 0.75) return mix(c3, c4, (t - 0.5) * 4.0);
    else return mix(c4, c5, (t - 0.75) * 4.0);
  } else if (paletteIdx == 7) {
    // Ocean journey - abyss -> deep blue -> teal -> seafoam -> bright
    vec3 c1 = vec3(0.0, 0.02, 0.05);   // abyss
    vec3 c2 = vec3(0.02, 0.08, 0.2);   // deep blue
    vec3 c3 = vec3(0.05, 0.3, 0.4);    // ocean teal
    vec3 c4 = vec3(0.2, 0.6, 0.6);     // seafoam
    vec3 c5 = vec3(0.6, 0.95, 0.9);    // bright aqua
    if (t < 0.25) return mix(c1, c2, t * 4.0);
    else if (t < 0.5) return mix(c2, c3, (t - 0.25) * 4.0);
    else if (t < 0.75) return mix(c3, c4, (t - 0.5) * 4.0);
    else return mix(c4, c5, (t - 0.75) * 4.0);
  } else if (paletteIdx == 8) {
    // Purple journey - dark violet -> purple -> magenta -> pink -> bright
    vec3 c1 = vec3(0.03, 0.01, 0.06);  // near black violet
    vec3 c2 = vec3(0.15, 0.05, 0.25);  // dark purple
    vec3 c3 = vec3(0.4, 0.15, 0.5);    // purple
    vec3 c4 = vec3(0.7, 0.4, 0.75);    // orchid
    vec3 c5 = vec3(0.95, 0.8, 1.0);    // bright pink-white
    if (t < 0.25) return mix(c1, c2, t * 4.0);
    else if (t < 0.5) return mix(c2, c3, (t - 0.25) * 4.0);
    else if (t < 0.75) return mix(c3, c4, (t - 0.5) * 4.0);
    else return mix(c4, c5, (t - 0.75) * 4.0);
  } else if (paletteIdx == 9) {
    // Forest journey - dark earth -> forest -> emerald -> lime -> bright
    vec3 c1 = vec3(0.02, 0.03, 0.01);  // dark earth
    vec3 c2 = vec3(0.05, 0.12, 0.04);  // dark forest
    vec3 c3 = vec3(0.1, 0.35, 0.15);   // forest green
    vec3 c4 = vec3(0.3, 0.65, 0.3);    // emerald
    vec3 c5 = vec3(0.7, 0.95, 0.6);    // bright lime
    if (t < 0.25) return mix(c1, c2, t * 4.0);
    else if (t < 0.5) return mix(c2, c3, (t - 0.25) * 4.0);
    else if (t < 0.75) return mix(c3, c4, (t - 0.5) * 4.0);
    else return mix(c4, c5, (t - 0.75) * 4.0);
  } else if (paletteIdx == 10) {
    // Sunset - warm oranges to pinks
    return palette(t,
      vec3(0.5, 0.3, 0.2),
      vec3(0.5, 0.4, 0.3),
      vec3(1.0, 1.0, 0.5),
      vec3(0.0, 0.1, 0.2));
  } else {
    // Electric - vibrant neon (the wild one at the end)
    return palette(t,
      vec3(0.5, 0.5, 0.5),
      vec3(0.6, 0.6, 0.6),
      vec3(1.0, 1.0, 1.0),
      vec3(0.3, 0.2, 0.2));
  }
}

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = v_uv - 0.5;
  uv.x *= aspect;
  vec2 pos = u_center + uv / u_zoom;

  // For Mandelbrot/Burning Ship: z starts at 0, c is pixel position
  // For Julia variants: z starts at pixel position, c is fixed constant
  vec2 z;
  vec2 c;
  bool isJulia = (u_fractalType == 2 || u_fractalType == 3);
  bool isBurningShip = (u_fractalType == 1 || u_fractalType == 3);

  if (isJulia) {
    z = pos;
    c = u_juliaC;
  } else {
    z = vec2(0.0);
    c = pos;
  }

  int iterations = 0;
  // Loop limit must be a compile-time constant in GLSL; 65536 allows high manual overrides
  for (int i = 0; i < 65536; i++) {
    if (i >= u_maxIterations) break;
    float zMagSq = dot(z, z);
    if (zMagSq > 4.0) break;

    // Burning Ship variants: take absolute values before squaring
    if (isBurningShip) {
      // Burning Ship - take absolute values before squaring, negate imaginary for upright ship
      z = vec2(abs(z.x), -abs(z.y));
    }
    z = vec2(z.x * z.x - z.y * z.y + c.x, 2.0 * z.x * z.y + c.y);
    iterations++;
  }

  if (iterations >= u_maxIterations) {
    // Inside the set - pure black
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    // Smooth iteration count for anti-banding
    float smoothIter = float(iterations) + 1.0 - log2(log2(max(dot(z, z), 4.0)));

    // Normalize to [0, 1] based on max iterations
    float normalized = smoothIter / float(u_maxIterations);

    // Determine if this palette is monotonic (single cycle) or cycling (multiple cycles)
    // Monotonic: 1, 2, 3, 6, 7, 8, 9 (Blue, Gold, Grayscale, Sepia, Ocean, Purple, Forest)
    // Cycling: 0, 4, 5, 10, 11 (Rainbow, Fire, Ice, Sunset, Electric)
    bool isMonotonic = (u_paletteIndex >= 1 && u_paletteIndex <= 3) ||
                       (u_paletteIndex >= 6 && u_paletteIndex <= 9);

    float t;
    if (isMonotonic) {
      // Single cycle from 0 to 1 across all iterations
      t = normalized + u_colorOffset;
    } else {
      // Multiple cycles for psychedelic effect (e.g., 8 full cycles)
      float numCycles = 8.0;
      t = normalized * numCycles + u_colorOffset;
    }

    vec3 color = getColor(t, u_paletteIndex, !isMonotonic);

    // Add subtle glow near the boundary
    float edgeFactor = 1.0 - float(iterations) / float(u_maxIterations);
    float glow = pow(edgeFactor, 0.5) * 0.3;
    color = color * (1.0 + glow);

    fragColor = vec4(min(color, vec3(1.0)), 1.0);
  }
}
`,G=`#version 300 es

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
`,V=256,q=512,W=4096,K=640,Z=1.65,O=1.5;function A(n,e=!1){const t=Math.max(1,n),i=Math.log10(t),r=e?q:V,o=r+K*Math.pow(i,Z);return Math.round(Math.max(r,Math.min(W,o)))}const f=class f{constructor(e){a(this,"renderer");a(this,"shaderProgram");a(this,"postProcessProgram");a(this,"viewState");a(this,"inputHandler");a(this,"maxIterationsOverride",null);a(this,"fractalType",l.Mandelbrot);a(this,"juliaC",[-.7,.27015]);a(this,"juliaPickerMode",!1);a(this,"savedViewState",null);a(this,"savedFractalType",null);a(this,"paletteIndex",4);a(this,"colorOffset",0);a(this,"debugOverlay",null);a(this,"shareNotification",null);a(this,"helpOverlay",null);a(this,"helpVisible",!1);a(this,"screenshotMode",!1);a(this,"aaEnabled",!1);a(this,"fbo",null);a(this,"renderTarget",null);a(this,"rtWidth",0);a(this,"rtHeight",0);a(this,"quadBuffer",null);a(this,"handleHashChange",()=>{this.loadBookmark()});a(this,"handleResize",()=>{this.renderer.resize(window.innerWidth,window.innerHeight),this.ensureRenderTargetSize(),this.render()});this.renderer=new P(e),this.viewState=new L,this.shaderProgram=new k(this.renderer.gl,I,$),this.postProcessProgram=new k(this.renderer.gl,I,G),this.setupGeometry(),this.setupRenderTarget(),this.inputHandler=new B(e,this.viewState,()=>{this.render()}),this.inputHandler.setIterationAdjustCallback(i=>{this.adjustMaxIterations(i)}),this.inputHandler.setIterationResetCallback(()=>{this.clearMaxIterationsOverride()}),this.inputHandler.setPaletteCycleCallback(i=>{this.cyclePalette(i)}),this.inputHandler.setColorOffsetCallback(i=>{this.adjustColorOffset(i)}),this.inputHandler.setColorOffsetResetCallback(()=>{this.resetColorOffset()}),this.inputHandler.setToggleAACallback(()=>{this.toggleAA()}),this.inputHandler.setFractalCycleCallback(i=>{this.cycleFractalType(i)}),this.inputHandler.setToggleJuliaModeCallback(()=>{this.toggleJuliaPickerMode()}),this.inputHandler.setJuliaPickCallback((i,r)=>{this.pickJuliaConstant(i,r)});const t=e.parentElement;t&&(this.debugOverlay=document.createElement("div"),this.debugOverlay.id="zoom-debug",t.appendChild(this.debugOverlay),this.shareNotification=document.createElement("div"),this.shareNotification.id="share-notification",this.shareNotification.style.cssText=`
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.85);
        color: #4ade80;
        padding: 16px 32px;
        border-radius: 8px;
        font-family: system-ui, sans-serif;
        font-size: 16px;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      `,t.appendChild(this.shareNotification),this.helpOverlay=document.createElement("div"),this.helpOverlay.id="help-overlay",this.helpOverlay.innerHTML=this.createHelpContent(),this.helpOverlay.style.cssText=`
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.92);
        color: #e5e5e5;
        padding: 24px 32px;
        border-radius: 12px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        z-index: 1001;
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
        max-width: 90vw;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
      `,t.appendChild(this.helpOverlay)),this.inputHandler.setShareCallback(()=>{this.shareBookmark()}),this.inputHandler.setLocationSelectCallback(i=>{this.goToLocation(i)}),this.inputHandler.setToggleHelpCallback(()=>{this.toggleHelp()}),this.inputHandler.setToggleScreenshotModeCallback(()=>{this.toggleScreenshotMode()}),window.addEventListener("resize",this.handleResize),window.addEventListener("hashchange",this.handleHashChange),this.loadBookmark(),this.handleResize()}setupGeometry(){const e=this.renderer.gl,t=new Float32Array([0,0,1,0,0,1,1,0,1,1,0,1]);if(this.quadBuffer=e.createBuffer(),!this.quadBuffer)throw new Error("Failed to create buffer");e.bindBuffer(e.ARRAY_BUFFER,this.quadBuffer),e.bufferData(e.ARRAY_BUFFER,t,e.STATIC_DRAW)}setupRenderTarget(){const e=this.renderer.gl;this.fbo=e.createFramebuffer(),this.renderTarget=e.createTexture()}ensureRenderTargetSize(){const e=this.renderer.gl,t=this.renderer.canvas.width,i=this.renderer.canvas.height;t<1||i<1||t===this.rtWidth&&i===this.rtHeight||(this.rtWidth=t,this.rtHeight=i,e.bindTexture(e.TEXTURE_2D,this.renderTarget),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,t,i,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindTexture(e.TEXTURE_2D,null),e.bindFramebuffer(e.FRAMEBUFFER,this.fbo),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,this.renderTarget,0),e.bindFramebuffer(e.FRAMEBUFFER,null))}render(){const e=this.renderer.gl,t=this.renderer.canvas.width,i=this.renderer.canvas.height,r=this.fractalType===l.Julia||this.fractalType===l.BurningShipJulia,o=this.maxIterationsOverride??A(this.viewState.zoom,r);if(this.debugOverlay){const c=this.viewState.zoom,d=c>=1e6?c.toExponential(2):c<1?c.toPrecision(4):String(Math.round(c)),u=this.maxIterationsOverride!==null?" (manual)":"",y=f.PALETTE_NAMES[this.paletteIndex],v=U[this.fractalType],S=this.aaEnabled?"AA":"",w=this.juliaPickerMode?"🎯 Pick Julia point":"",E=this.fractalType===l.Julia||this.fractalType===l.BurningShipJulia?`c=(${this.juliaC[0].toFixed(4)}, ${this.juliaC[1].toFixed(4)})`:"",C=Math.abs(this.colorOffset)>.001?`offset ${this.colorOffset.toFixed(1)}`:"",g=[v,`zoom ${d}`,`iterations ${o}${u}`,y];C&&g.push(C),E&&g.push(E),S&&g.push(S),w&&g.push(w),g.push("H = help"),this.debugOverlay.textContent=g.join("  ·  ")}this.aaEnabled?e.bindFramebuffer(e.FRAMEBUFFER,this.fbo):e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,t,i),this.renderer.clear(0,0,0,1),this.shaderProgram.use(),this.shaderProgram.setUniform("u_resolution",[t,i]),this.shaderProgram.setUniform("u_center",[this.viewState.centerX,this.viewState.centerY]),this.shaderProgram.setUniform("u_zoom",this.viewState.zoom),this.shaderProgram.setUniformInt("u_maxIterations",o),this.shaderProgram.setUniform("u_time",performance.now()*.001),this.shaderProgram.setUniformInt("u_paletteIndex",this.paletteIndex),this.shaderProgram.setUniform("u_colorOffset",this.colorOffset),this.shaderProgram.setUniformInt("u_fractalType",this.fractalType),this.shaderProgram.setUniform("u_juliaC",this.juliaC),e.bindBuffer(e.ARRAY_BUFFER,this.quadBuffer);const s=0;e.enableVertexAttribArray(s),e.vertexAttribPointer(s,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6),this.aaEnabled&&(e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,t,i),this.renderer.clear(.05,.05,.1,1),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.renderTarget),this.postProcessProgram.use(),this.postProcessProgram.setUniformInt("u_tex",0),this.postProcessProgram.setUniform("u_resolution",[t,i]),e.bindBuffer(e.ARRAY_BUFFER,this.quadBuffer),e.enableVertexAttribArray(s),e.vertexAttribPointer(s,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6))}start(){this.renderer.start(()=>{this.render()})}stop(){this.renderer.stop()}setMaxIterations(e){this.maxIterationsOverride=Math.round(Math.max(1,e)),this.render()}adjustMaxIterations(e){const t=this.fractalType===l.Julia||this.fractalType===l.BurningShipJulia,i=this.maxIterationsOverride??A(this.viewState.zoom,t),r=e>0?i*O:i/O;this.setMaxIterations(r)}clearMaxIterationsOverride(){this.maxIterationsOverride=null,this.render()}toggleAA(){this.aaEnabled=!this.aaEnabled,this.render()}cycleFractalType(e=1){this.fractalType===l.Julia?this.fractalType=l.Mandelbrot:this.fractalType===l.BurningShipJulia&&(this.fractalType=l.BurningShip),this.fractalType=(this.fractalType+e+f.BASE_FRACTAL_TYPE_COUNT)%f.BASE_FRACTAL_TYPE_COUNT,this.juliaPickerMode&&(this.juliaPickerMode=!1,this.inputHandler.setJuliaPickerMode(!1)),this.render()}toggleJuliaPickerMode(){if(this.fractalType===l.Julia||this.fractalType===l.BurningShipJulia){this.exitJuliaMode();return}this.juliaPickerMode=!this.juliaPickerMode,this.inputHandler.setJuliaPickerMode(this.juliaPickerMode),this.render()}pickJuliaConstant(e,t){this.savedViewState={centerX:this.viewState.centerX,centerY:this.viewState.centerY,zoom:this.viewState.zoom},this.savedFractalType=this.fractalType,this.juliaC=[e,t],this.fractalType===l.BurningShip?this.fractalType=l.BurningShipJulia:this.fractalType=l.Julia,this.juliaPickerMode=!1,this.inputHandler.setJuliaPickerMode(!1),this.viewState.centerX=0,this.viewState.centerY=0,this.viewState.zoom=.8,this.render()}exitJuliaMode(){const e=this.fractalType===l.BurningShipJulia?l.BurningShip:l.Mandelbrot;this.savedViewState?(this.viewState.centerX=this.savedViewState.centerX,this.viewState.centerY=this.savedViewState.centerY,this.viewState.zoom=this.savedViewState.zoom,this.savedViewState=null):(this.viewState.centerX=(e===l.BurningShip,-.5),this.viewState.centerY=e===l.BurningShip?-.5:0,this.viewState.zoom=.4),this.savedFractalType!==null?(this.fractalType=this.savedFractalType,this.savedFractalType=null):this.fractalType=e,this.render()}setJuliaConstant(e,t){this.juliaC=[e,t],this.render()}cyclePalette(e=1){this.paletteIndex=(this.paletteIndex+e+f.PALETTE_COUNT)%f.PALETTE_COUNT,this.render()}adjustColorOffset(e){this.colorOffset+=e,this.render()}resetColorOffset(){this.colorOffset=0,this.render()}resetView(){this.viewState.reset(),this.render()}getBookmarkState(){return{fractalType:this.fractalType,centerX:this.viewState.centerX,centerY:this.viewState.centerY,zoom:this.viewState.zoom,paletteIndex:this.paletteIndex,colorOffset:this.colorOffset,juliaC:this.juliaC,maxIterationsOverride:this.maxIterationsOverride,aaEnabled:this.aaEnabled}}applyBookmarkState(e){e.fractalType!==void 0&&(this.fractalType=e.fractalType),e.centerX!==void 0&&(this.viewState.centerX=e.centerX),e.centerY!==void 0&&(this.viewState.centerY=e.centerY),e.zoom!==void 0&&(this.viewState.zoom=e.zoom),e.paletteIndex!==void 0&&(this.paletteIndex=e.paletteIndex),e.colorOffset!==void 0&&(this.colorOffset=e.colorOffset),e.juliaC!==void 0&&(this.juliaC=e.juliaC),e.maxIterationsOverride!==void 0&&(this.maxIterationsOverride=e.maxIterationsOverride),e.aaEnabled!==void 0&&(this.aaEnabled=e.aaEnabled),this.render()}loadBookmark(){const e=Y();Object.keys(e).length>0&&(this.applyBookmarkState(e),console.log("Loaded fractal state from URL"))}updateUrlBookmark(){N(this.getBookmarkState())}goToLocation(e){const t=H(e);t&&(this.applyBookmarkState(t.state),this.updateUrlBookmark(),this.showLocationNotification(t.name))}showLocationNotification(e){this.shareNotification&&(this.shareNotification.textContent=`📍 ${e}`,this.shareNotification.style.color="#60a5fa",this.shareNotification.style.opacity="1",setTimeout(()=>{this.shareNotification&&(this.shareNotification.style.opacity="0")},1500))}async shareBookmark(){const e=await J(this.getBookmarkState());this.showShareNotification(e),e&&this.updateUrlBookmark()}showShareNotification(e){this.shareNotification&&(this.shareNotification.textContent=e?"📋 Link copied to clipboard!":"❌ Failed to copy link",this.shareNotification.style.color=e?"#4ade80":"#f87171",this.shareNotification.style.opacity="1",setTimeout(()=>{this.shareNotification&&(this.shareNotification.style.opacity="0")},2e3))}toggleHelp(){this.helpVisible=!this.helpVisible,this.helpOverlay&&(this.helpOverlay.style.opacity=this.helpVisible?"1":"0",this.helpOverlay.style.pointerEvents=this.helpVisible?"auto":"none")}toggleScreenshotMode(){this.screenshotMode=!this.screenshotMode,this.screenshotMode&&this.helpVisible&&(this.helpVisible=!1,this.helpOverlay&&(this.helpOverlay.style.opacity="0",this.helpOverlay.style.pointerEvents="none")),this.debugOverlay&&(this.debugOverlay.style.display=this.screenshotMode?"none":"block"),this.shareNotification&&(this.shareNotification.textContent=this.screenshotMode?"📷 Screenshot mode (Space to exit)":"📷 UI restored",this.shareNotification.style.color="#60a5fa",this.shareNotification.style.opacity="1",setTimeout(()=>{this.shareNotification&&(this.shareNotification.style.opacity="0")},1e3))}createHelpContent(){return`
      <h2 style="margin: 0 0 16px 0; color: #60a5fa; font-size: 20px; font-weight: 600;">
        🌀 Fractal Explorer - Keyboard Shortcuts
      </h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 32px;">
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Navigation</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow("Drag","Pan view")}
            ${this.helpRow("Scroll","Zoom in/out")}
            ${this.helpRow("Double-click","Zoom in at point")}
            ${this.helpRow("1-9","Famous locations")}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Iterations</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow("+/-","Adjust iterations")}
            ${this.helpRow("0","Reset to auto")}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Colors</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow("C / Shift+C","Cycle palettes")}
            ${this.helpRow(", / .","Shift colors (fine)")}
            ${this.helpRow("< / >","Shift colors (coarse)")}
            ${this.helpRow("R","Reset color offset")}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Fractal Type</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow("F / Shift+F","Cycle fractals")}
            ${this.helpRow("J","Julia picker mode")}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Display</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow("A","Toggle antialiasing")}
            ${this.helpRow("H","Toggle this help")}
            ${this.helpRow("Space","Screenshot mode")}
          </div>
        </div>
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 8px 0; color: #a78bfa; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Share</h3>
          <div style="display: grid; gap: 4px;">
            ${this.helpRow("S","Copy bookmark URL")}
          </div>
        </div>
      </div>
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); color: #888; font-size: 12px; text-align: center;">
        Press <kbd style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-family: inherit;">H</kbd> to close
      </div>
    `}helpRow(e,t){return`
      <div style="display: flex; align-items: baseline; gap: 8px;">
        <kbd style="background: rgba(255,255,255,0.1); color: #f0f0f0; padding: 2px 8px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 12px; min-width: 60px; text-align: center;">${e}</kbd>
        <span style="color: #ccc;">${t}</span>
      </div>
    `}destroy(){this.stop(),window.removeEventListener("resize",this.handleResize),window.removeEventListener("hashchange",this.handleHashChange),this.debugOverlay?.remove(),this.debugOverlay=null,this.shareNotification?.remove(),this.shareNotification=null,this.helpOverlay?.remove(),this.helpOverlay=null,this.inputHandler.destroy(),this.shaderProgram.destroy(),this.postProcessProgram.destroy();const e=this.renderer.gl;this.fbo&&e.deleteFramebuffer(this.fbo),this.renderTarget&&e.deleteTexture(this.renderTarget),this.renderer.destroy(),this.quadBuffer&&e.deleteBuffer(this.quadBuffer)}};a(f,"BASE_FRACTAL_TYPE_COUNT",2),a(f,"PALETTE_COUNT",12),a(f,"PALETTE_NAMES",["Rainbow","Blue","Gold","Grayscale","Fire","Ice","Sepia","Ocean","Purple","Forest","Sunset","Electric"]);let T=f;console.log("Fractal Explorer - Initializing...");let b=null;function M(){const n=document.getElementById("app");if(!n){console.error("Could not find #app element");return}const e=document.createElement("canvas");e.id="fractal-canvas",n.appendChild(e);try{b=new T(e),b.start(),console.log("Fractal Explorer initialized successfully"),console.log("Controls:"),console.log("  - Drag to pan"),console.log("  - Scroll to zoom"),console.log("  - Double-click to zoom in"),console.log("  - Touch drag to pan (mobile)"),console.log("  - Pinch to zoom (mobile)"),console.log("  - + / - to adjust max iterations"),console.log("  - 0 to reset iterations to auto-scaling"),console.log("  - c / C to cycle color palettes (forward/backward)"),console.log("  - , / . to shift colors (fine)"),console.log("  - < / > to shift colors (coarse)"),console.log("  - a to toggle antialiasing"),console.log("  - s to share/copy bookmark URL"),console.log("  - 1-9 to visit famous locations"),console.log("  - h to toggle help overlay"),console.log("  - Space to toggle screenshot mode")}catch(t){console.error("Failed to initialize Fractal Explorer:",t),n.innerHTML=`
      <div style="color: white; text-align: center; padding: 20px; font-family: system-ui, sans-serif;">
        <h1>Initialization Error</h1>
        <p>Failed to initialize the application.</p>
        <pre style="text-align: left; margin-top: 20px; color: #ff6b6b;">${t instanceof Error?t.message:String(t)}</pre>
      </div>
    `}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",M):M();window.addEventListener("beforeunload",()=>{b&&b.destroy()});
//# sourceMappingURL=index-WNzsr3jQ.js.map

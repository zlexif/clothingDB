'use client';

import { useEffect, useRef } from 'react';
import { cn } from '../../../lib/utils';

type Glow = [x: number, y: number, sx: number, sy: number, k: number];

export interface DitherProps {
  mode: 'field' | 'image';
  ramp: string[];
  cell?: number;
  glows?: Glow[];
  sun?: [x: number, y: number, r: number];
  motif?: 'noise' | 'folds' | 'threads';
  sunRamp?: string[];
  src?: string;
  tone?: [lo: number, hi: number, gamma: number];
  animate?: boolean;
  className?: string;
}

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uTime;uniform float uCell;uniform int uMode;uniform int uMotif;
uniform vec3 uRamp[6];uniform int uN;
uniform vec4 uGlowA;uniform float uGlowAk;uniform vec4 uGlowB;uniform float uGlowBk;
uniform vec3 uSun;uniform vec3 uSunRamp[3];
uniform sampler2D uTex;uniform vec2 uTexSize;uniform vec3 uTone;

float b2(vec2 a){a=floor(a);return fract(dot(a,vec2(.5,a.y*.75)));}
float b4(vec2 a){return b2(.5*a)*.25+b2(a);}
float b8(vec2 a){return b4(.5*a)*.25+b2(a);}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vnoise(p);p=p*2.03+17.1;a*=.5;}return v;}
vec3 ramp(float t,float th){
  float s=t*float(uN-1);float k=floor(s)+step(th,fract(s));
  vec3 c=uRamp[0];
  for(int i=1;i<6;i++){if(float(i)<=k&&i<uN)c=uRamp[i];}
  return c;}
float blob(vec2 uv,vec4 g){vec2 d=(uv-g.xy)/g.zw;return exp(-dot(d,d));}

void main(){
  vec2 cellId=floor(gl_FragCoord.xy/uCell);
  vec2 uv=(cellId+.5)*uCell/uRes;uv.y=1.-uv.y;
  float aspect=uRes.x/uRes.y;
  vec3 col;
  if(uMode==0){
    vec2 p=vec2(uv.x*aspect,uv.y);
    float n=fbm(p*2.6+vec2(uTime*.025,uTime*.011));
    float g=uGlowAk*blob(uv,uGlowA)+uGlowBk*blob(uv,uGlowB);
    if(uMotif==1){
      vec2 q=p+.45*vec2(fbm(p*1.2+uTime*.012),fbm(p*1.2+5.2-uTime*.01));
      float a=q.x*11.-q.y*6.+2.2*sin(q.y*3.1+q.x*1.3);
      float lit=pow(.5+.5*cos(a+.9),2.2);
      float level=clamp(g*(.03+1.25*lit*(.55+.5*n)),0.,1.);
      col=ramp(level,b8(cellId));
    }else if(uMotif==2){
      float a=(p.y+.22*sin(p.x*1.8+uTime*.04)+.18*fbm(p*1.6))*34.;
      float line=1.-smoothstep(.0,.25,abs(fract(a)-.5)*2.-.6);
      float level=pow(clamp(g*(.04+1.05*line*(.4+.7*n)),0.,1.),1.5);
      col=ramp(level,b8(cellId));
    }else{
      float level=pow(clamp(g*(.1+1.1*n),0.,1.),1.7);
      col=ramp(level,hash(cellId));
    }
    if(uSun.z>0.){
      vec2 p=vec2(uv.x*aspect,uv.y),c=vec2(uSun.x*aspect,uSun.y);
      float d=distance(p,c);
      vec2 sc=floor(gl_FragCoord.xy/(uCell*4.));
      float th=b8(sc);
      float fill=smoothstep(uSun.z*1.12,uSun.z*.35,d)*.92;
      if(fill>th){
        float s=clamp(.5+.5*((c.x-p.x)+(c.y-p.y))/(1.3*uSun.z),0.,1.);
        float k=s*2.;float lv=floor(k)+step(th,fract(k));
        vec3 sc0=uSunRamp[0];
        if(lv>=1.)sc0=uSunRamp[1];
        if(lv>=2.)sc0=uSunRamp[2];
        col=sc0;
      }
    }
  }else{
    vec2 ts=uTexSize;float sa=aspect,ta=ts.x/ts.y;vec2 t=uv;
    if(sa>ta){t.y=.5+(t.y-.5)*ta/sa;}else{t.x=.5+(t.x-.5)*sa/ta;}
    vec3 s=texture2D(uTex,t).rgb;
    float l=dot(s,vec3(.299,.587,.114));
    l=pow(clamp((l-uTone.x)/(uTone.y-uTone.x),0.,1.),uTone.z);
    col=ramp(l,b8(cellId));
  }
  gl_FragColor=vec4(col,1.);
}`;

const hex = (h: string): [number, number, number] => {
  const v = parseInt(h.replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};

export function Dither({
  mode,
  ramp,
  cell = 1,
  glows = [],
  sun,
  motif = 'noise',
  sunRamp = ['#9a2400', '#ff4d00', '#ff7a1a'],
  src,
  tone = [0.1, 0.85, 1.2],
  animate = mode === 'field',
  className,
}: DitherProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify({ mode, ramp, cell, glows, sun, motif, sunRamp, src, tone, animate });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) return;

    const compile = (type: number, code: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, code);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error('dither: compile', gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('dither: shader failed', gl.getProgramInfoLog(prog));
      return;
    }
    // biome-ignore lint/correctness/useHookAtTopLevel: a WebGL call, not a React hook
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const rampFlat = new Float32Array(18);
    for (const [i, h] of ramp.slice(0, 6).entries()) rampFlat.set(hex(h), i * 3);
    gl.uniform3fv(u('uRamp'), rampFlat);
    gl.uniform1i(u('uN'), Math.min(6, ramp.length));
    gl.uniform1i(u('uMode'), mode === 'field' ? 0 : 1);
    gl.uniform1i(u('uMotif'), motif === 'folds' ? 1 : motif === 'threads' ? 2 : 0);
    const [ga, gb] = [glows[0] ?? [0, 0, 1, 1, 0], glows[1] ?? [0, 0, 1, 1, 0]];
    gl.uniform4f(u('uGlowA'), ga[0], ga[1], ga[2], ga[3]);
    gl.uniform1f(u('uGlowAk'), ga[4]);
    gl.uniform4f(u('uGlowB'), gb[0], gb[1], gb[2], gb[3]);
    gl.uniform1f(u('uGlowBk'), gb[4]);
    gl.uniform3f(u('uSun'), sun?.[0] ?? 0, sun?.[1] ?? 0, sun?.[2] ?? 0);
    const sunFlat = new Float32Array(9);
    for (const [i, h] of sunRamp.slice(0, 3).entries()) sunFlat.set(hex(h), i * 3);
    gl.uniform3fv(u('uSunRamp'), sunFlat);
    gl.uniform3f(u('uTone'), tone[0], tone[1], tone[2]);

    let ready = mode === 'field';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    let raf = 0;
    let visible = true;
    let last = 0;

    const draw = (now: number) => {
      if (!ready) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u('uRes'), w, h);
      gl.uniform1f(u('uCell'), Math.max(1, Math.round(cell * dpr)));
      gl.uniform1f(u('uTime'), (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now: number) => {
      raf = 0;
      if (now - last > 40) {
        last = now;
        draw(now);
      }
      if (visible) raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (animate && !reduce) {
        if (!raf && visible) raf = requestAnimationFrame(loop);
      } else draw(performance.now());
    };

    if (mode === 'image' && src) {
      const img = new Image();
      img.onload = () => {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        gl.uniform1i(u('uTex'), 0);
        gl.uniform2f(u('uTexSize'), img.naturalWidth, img.naturalHeight);
        ready = true;
        kick();
      };
      img.src = src;
    }

    const ro = new ResizeObserver(() => draw(performance.now()));
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) kick();
    });
    io.observe(canvas);
    kick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [key]);

  // biome-ignore lint/a11y/noAriaHiddenOnFocusable: a decorative canvas, never focusable
  return <canvas ref={ref} aria-hidden="true" className={cn('block h-full w-full', className)} />;
}

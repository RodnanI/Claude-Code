/* =====================================================================
   LIMINAL — level.poolrooms.js
   Level 37 · "Poolrooms"

   Warm, shin-deep water. White ceramic everywhere. Arched openings that
   lead to more arched openings. No light fittings, and yet.
   ===================================================================== */
(function(){
"use strict";

const TXX=LIMINAL.tex;

function base(c,S,seed,rgb,amt,scale,oct,warp){
  const per=Math.max(2,S/scale);
  TXX.pixels(c,(x,y)=>{
    let sx=x/scale, sy=y/scale;
    if(warp){
      sx+=TXX.fbm(x/(scale*3),y/(scale*3),per/3,seed+91,2)*warp;
      sy+=TXX.fbm(x/(scale*3)+5,y/(scale*3)+5,per/3,seed+92,2)*warp;
    }
    const n=TXX.fbm(sx,sy,per,seed,oct);
    const k=1+(n-0.5)*amt;
    return [rgb[0]*k,rgb[1]*k,rgb[2]*k];
  });
}

/* square ceramic tiling with recessed grout, per-tile colour drift */
function ceramic(c,S,rng,TX,n,rgb,groutRGB,drift,gloss){
  base(c,S,17,rgb,0.05,S/7,3,0);
  const cell=S/n;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){
    const k=1+(TX.ihash(i,j,7)-0.5)*drift;
    const r=rgb[0]*k,g=rgb[1]*k,b=rgb[2]*k;
    c.fillStyle=`rgb(${r|0},${g|0},${b|0})`;
    c.fillRect(i*cell+1,j*cell+1,cell-2,cell-2);
    // a soft highlight along the top-left of each tile reads as glaze
    const gr=c.createLinearGradient(i*cell,j*cell,i*cell+cell,j*cell+cell);
    gr.addColorStop(0,`rgba(255,255,255,${0.16*gloss})`);
    gr.addColorStop(0.45,'rgba(255,255,255,0)');
    gr.addColorStop(1,`rgba(0,0,0,${0.07*gloss})`);
    c.fillStyle=gr;c.fillRect(i*cell+1,j*cell+1,cell-2,cell-2);
  }
  // grout
  c.strokeStyle=`rgba(${groutRGB[0]},${groutRGB[1]},${groutRGB[2]},0.85)`;
  c.lineWidth=Math.max(1.2,S/220);
  TX.grid(c,cell,`rgba(${groutRGB[0]},${groutRGB[1]},${groutRGB[2]},0.85)`,c.lineWidth,0);
  // grime settling in the joints
  c.globalCompositeOperation='multiply';
  TX.stains(c,rng,4,TX.rgba(176,186,180),0.30,0.08,0.26);
  c.globalCompositeOperation='source-over';
  TX.grain(c,0.028,1,29);
}

const MATS={
  wallTile:{tile:1.0,bump:0.5,specular:0.30,shininess:70,draw(c,S,rng,TX){
    ceramic(c,S,rng,TX,6,[226,229,222],[176,180,172],0.06,1.0);
    TX.streaks(c,rng,12,TX.rgba(150,160,152),3,0.16);
  }},
  wallTrim:{tile:1.0,bump:0.45,specular:0.34,shininess:80,draw(c,S,rng,TX){
    ceramic(c,S,rng,TX,6,[122,166,163],[92,124,122],0.08,1.1);
  }},
  floorTile:{tile:0.75,bump:0.45,specular:0.42,shininess:96,draw(c,S,rng,TX){
    ceramic(c,S,rng,TX,4,[214,219,213],[166,172,166],0.05,0.85);
    TX.stains(c,rng,5,TX.rgba(150,164,158),0.24,0.06,0.22);
  }},
  poolTile:{tile:1.0,bump:0.4,specular:0.5,shininess:110,draw(c,S,rng,TX){
    ceramic(c,S,rng,TX,8,[150,196,192],[104,142,140],0.08,1.2);
  }},
  poolEdge:{tile:1.0,bump:0.35,specular:0.4,shininess:90,draw(c,S,rng,TX){
    ceramic(c,S,rng,TX,4,[236,238,232],[184,188,180],0.04,1.0);
  }},
  ceilTile:{tile:0.8,bump:0.3,specular:0.16,shininess:40,draw(c,S,rng,TX){
    ceramic(c,S,rng,TX,5,[218,222,218],[180,184,180],0.05,0.6);
    TX.stains(c,rng,3,TX.rgba(168,178,172),0.22,0.08,0.24);
  }},
  skylight:{tile:1.0,emissive:[1.85,1.95,1.92],specular:0,draw(c,S,rng,TX){
    const g=c.createLinearGradient(0,0,S,S);
    g.addColorStop(0,'#eef4f2');g.addColorStop(0.5,'#ffffff');g.addColorStop(1,'#e6eeec');
    c.fillStyle=g;c.fillRect(0,0,S,S);
    c.strokeStyle='rgba(150,168,164,0.5)';c.lineWidth=Math.max(1,S/128);
    TX.grid(c,S/3,'rgba(150,168,164,0.5)',c.lineWidth,0);
  }},
  water:{tile:0.22,blend:true,alpha:0.60,wave:1.4,specular:1.0,shininess:210,fresnel:0.55,bump:0,
    scroll:[0.004,0.006],draw(c,S,rng,TX){
      base(c,S,31,[38,92,96],0.55,S/12,4,0.5);
      c.globalCompositeOperation='screen';
      TX.stains(c,rng,7,TX.rgba(70,140,140),0.45,0.08,0.28);
      c.globalCompositeOperation='source-over';
      TX.grain(c,0.05,2,37);
    }},
  caustics:{tile:0.30,blend:true,alpha:0.42,emissive:[0.55,0.72,0.70],specular:0,scroll:[0.009,0.012],
    draw(c,S,rng,TX){
      // ridged noise makes the classic bright web of light
      TXX.pixels(c,(x,y)=>{
        const per=S/26;
        let n=TX.fbm(x/26,y/26,per,53,3);
        n=1-Math.abs(n-0.5)*2;
        n=Math.pow(TX.clamp(n,0,1),7);
        const v=n*255;
        return [v*0.85,v,v*0.98];
      });
    }},
  metal:{tile:0.8,bump:0.2,specular:0.7,shininess:120,draw(c,S,rng,TX){
    base(c,S,41,[178,184,186],0.10,S/5,3,0);
    c.globalAlpha=0.09;
    for(let y=0;y<S;y++){ c.fillStyle=rng()>0.5?'#fff':'#000'; c.fillRect(0,y,S,1); }
    c.globalAlpha=1;
    TX.grain(c,0.03,1,43);
  }},
  drain:{tile:1.0,specular:0.3,shininess:60,draw(c,S,rng,TX){
    TX.fill(c,'#8d9490');
    c.fillStyle='#12181a';
    for(let i=0;i<7;i++) c.fillRect(S*0.14,S*(0.14+i*0.11),S*0.72,S*0.045);
    c.strokeStyle='rgba(60,70,70,0.8)';c.lineWidth=Math.max(1,S/64);
    c.strokeRect(S*0.06,S*0.06,S*0.88,S*0.88);
  }},
  void:{tile:1,specular:0,draw(c){ TXX.fill(c,'#060809'); }}
};

/* --------------------------------------------------------------- helpers */
/* wall with a round-headed opening punched through it */
function archWall(W,x0,z0,x1,z1,h,T,mat,openW,openH,openAt){
  const horiz=Math.abs(x1-x0)>Math.abs(z1-z0);
  const L=horiz?(x1-x0):(z1-z0);
  const put=(a0,a1,y0,y1)=>{
    if(a1-a0<=0.001||y1-y0<=0.001) return;
    if(horiz) W.box(x0+a0,y0,z0-T/2,a1-a0,y1-y0,T,mat,{uvScale:1});
    else      W.box(x0-T/2,y0,z0+a0,T,y1-y0,a1-a0,mat,{uvScale:1});
  };
  if(!openW){ put(0,L,0,h); return null; }
  const mid=openAt!==undefined?openAt:L/2;
  const hw=openW/2, r=hw, springs=openH-r;
  put(0,mid-hw,0,h);
  put(mid+hw,L,0,h);
  // spandrels: the round head, stepped in bands fine enough to read as a curve
  const N=16;
  for(let i=0;i<N;i++){
    const ya=springs+r*(i/N), yb=springs+r*((i+1)/N);
    const t=(i+1)/N;
    const w=Math.sqrt(Math.max(0,1-t*t))*r;
    put(mid-hw,mid-w,ya,yb);
    put(mid+w,mid+hw,ya,yb);
  }
  put(mid-hw,mid+hw,openH,h);
  return {mid,hw};
}

function pillar(W,cx,cz,y0,h,w,mat,trim){
  W.box(cx-w/2,y0,cz-w/2,w,h,w,mat,{uvScale:1});
  W.box(cx-w/2-0.06,y0,cz-w/2-0.06,w+0.12,0.18,w+0.12,trim,{solid:false,uvScale:1.4});
  W.box(cx-w/2-0.08,y0+h-0.22,cz-w/2-0.08,w+0.16,0.22,w+0.16,trim,{solid:false,uvScale:1.4});
}

/* ==================================================================== level */
LIMINAL.registerLevel({
  id:'poolrooms',
  name:'Level 37',
  subtitle:'The Poolrooms',
  badge:'wet',
  accent:'#6fd3cf',
  tags:['tile','water','arches','bright','echoing'],
  size:'66 × 66 m',
  lighting:'skylights · no fittings',
  defaultSeed:37,
  description:'Shin-deep water over white ceramic, warm as a bath and never draining. '+
              'Light arrives from panels in the ceiling that are not connected to anything. '+
              'Sound goes a long way in here and always comes back.',

  preview(g,w,h){
    const grd=g.createLinearGradient(0,0,0,h);
    grd.addColorStop(0,'#dfe9e6');grd.addColorStop(0.52,'#b9cfcc');grd.addColorStop(1,'#3d7d7c');
    g.fillStyle=grd;g.fillRect(0,0,w,h);
    // arches receding
    for(let i=5;i>=1;i--){
      const k=i/5, ww=w*0.78*k, hh=h*0.86*k, cx=w*0.5, cy=h*0.52;
      g.fillStyle=`rgba(${222-i*14},${230-i*10},${226-i*10},1)`;
      g.beginPath();
      const l=cx-ww/2,r2=cx+ww/2,b=cy+hh/2,t=cy-hh/2+ww/2;
      g.moveTo(l,b);g.lineTo(l,t);g.arc(cx,t,ww/2,Math.PI,0);g.lineTo(r2,b);g.closePath();g.fill();
      g.strokeStyle='rgba(120,150,150,0.4)';g.lineWidth=1;g.stroke();
    }
    // water
    g.fillStyle='rgba(58,132,134,0.72)';g.fillRect(0,h*0.70,w,h*0.30);
    g.fillStyle='rgba(190,235,232,0.28)';
    for(let i=0;i<16;i++){
      const y=h*(0.71+Math.random()*0.28);
      g.fillRect(Math.random()*w,y,w*(0.03+Math.random()*0.10),1.5);
    }
    const v=g.createRadialGradient(w*0.5,h*0.5,0,w*0.5,h*0.5,w*0.6);
    v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(10,30,30,0.55)');
    g.fillStyle=v;g.fillRect(0,0,w,h);
  },

  /* ------------------------------------------------------------------ build */
  build(W,ctx){
    const TX=ctx.TX, rng=W.rng, seed=ctx.seed;
    const G=11, C=6.0, T=0.30;
    const WX=G*C, WZ=G*C;
    const DEEP=0.36;                 // wading depth — always steppable
    const WATER=-0.07;               // surface height inside a basin

    const M={};
    for(const k in MATS) M[k]=W.material(k,MATS[k]);

    /* --- room character --- */
    const kind=[],hgt=[];
    for(let x=0;x<G;x++){ kind[x]=[];hgt[x]=[]; }
    for(let y=0;y<G;y++)for(let x=0;x<G;x++){
      const n=TX.fbm(x*0.22,y*0.22,999,seed,3);
      const m=TX.fbm(x*0.15+13,y*0.15+7,999,seed+3,2);
      let k;
      if(n<0.40) k='pool';
      else if(n>0.68) k=(m<0.5)?'colonnade':'hall';
      else k=(m<0.30)?'pool':'deck';
      kind[x][y]=k;
      hgt[x][y]= k==='hall'?6.2 : k==='colonnade'?5.2 : 4.4;
    }
    // a dry ring around the edge so the border reads as a rim, not a cut
    for(let i=0;i<G;i++){ if(kind[i][0]==='pool')kind[i][0]='deck'; if(kind[i][G-1]==='pool')kind[i][G-1]='deck';
                          if(kind[0][i]==='pool')kind[0][i]='deck'; if(kind[G-1][i]==='pool')kind[G-1][i]='deck'; }

    const isPool=(x,y)=>x>=0&&y>=0&&x<G&&y<G&&kind[x][y]==='pool';
    const floorY=(x,y)=>isPool(x,y)?-DEEP:0;

    /* --- walls: every partition carries an arch, so it is all connected --- */
    const VW=[],HW=[];
    for(let x=0;x<=G;x++) VW[x]=new Uint8Array(G);
    for(let x=0;x<G;x++) HW[x]=new Uint8Array(G+1);
    for(let y=0;y<G;y++)for(let x=1;x<G;x++) if(rng()<0.42) VW[x][y]=1;
    for(let y=1;y<G;y++)for(let x=0;x<G;x++) if(rng()<0.42) HW[x][y]=1;
    for(let y=0;y<G;y++){ VW[0][y]=2; VW[G][y]=2; }   // 2 = solid outer wall
    for(let x=0;x<G;x++){ HW[x][0]=2; HW[x][G]=2; }

    /* --- spawn / exit --- */
    let sx=1,sy=1;
    for(let i=0;i<200;i++){ const x=1+(rng()*(G-2)|0),y=1+(rng()*(G-2)|0); if(kind[x][y]!=='pool'){sx=x;sy=y;break;} }
    W.spawn(sx*C+C/2,0.05,sy*C+C/2,rng()*Math.PI*2);
    const ex=G-2, ey=G-2;

    W.setStepMaterial((x,z,y)=>{
      const cx=Math.max(0,Math.min(G-1,Math.floor(x/C))), cy=Math.max(0,Math.min(G-1,Math.floor(z/C)));
      return isPool(cx,cy)?'water':'tile';
    });

    /* ================================================== cells */
    for(let cy=0;cy<G;cy++)for(let cx=0;cx<G;cx++){
      const k=kind[cx][cy], h=hgt[cx][cy];
      const x0=cx*C, z0=cy*C, mx=x0+C/2, mz=z0+C/2;
      const fy=floorY(cx,cy);

      /* floor + its slab */
      W.floor(x0,z0,x0+C,z0+C,fy,k==='pool'?M.poolTile:M.floorTile,{uvScale:1});
      W.solid(x0,fy-1,z0,C,1,C);

      /* the lip where a basin meets the deck */
      if(k==='pool'){
        const sides=[[1,0],[-1,0],[0,1],[0,-1]];
        for(const [dx,dy] of sides){
          if(isPool(cx+dx,cy+dy)) continue;
          // vertical face of the step, plus a rounded-off edge tile on the deck
          if(dx){
            const x=dx>0?x0+C:x0;
            W.quad([x,fy,z0+(dx>0?C:0)],[x,fy,z0+(dx>0?0:C)],[x,0,z0+(dx>0?0:C)],[x,0,z0+(dx>0?C:0)],
                   M.poolEdge,{uvScale:1.6});
            W.box(dx>0?x-0.001:x-0.14,0,z0,0.141,0.03,C,M.poolEdge,{solid:false,uvScale:1.6});
          } else {
            const z=dy>0?z0+C:z0;
            W.quad([x0+(dy>0?0:C),fy,z],[x0+(dy>0?C:0),fy,z],[x0+(dy>0?C:0),0,z],[x0+(dy>0?0:C),0,z],
                   M.poolEdge,{uvScale:1.6});
            W.box(x0,0,dy>0?z-0.001:z-0.14,C,0.03,0.141,M.poolEdge,{solid:false,uvScale:1.6});
          }
        }
        /* caustics on the basin floor, then the surface over it */
        W.floor(x0+0.02,z0+0.02,x0+C-0.02,z0+C-0.02,fy+0.012,M.caustics,{uvScale:1});
        W.floor(x0,z0,x0+C,z0+C,WATER,M.water,{uvScale:1});
        /* drain */
        if(rng()<0.4) W.floor(mx-0.22,mz-0.22,mx+0.22,mz+0.22,fy+0.006,M.drain,{uvScale:1});
        /* a rail to climb out by */
        if(rng()<0.3){
          const rx=x0+0.5, rz=mz;
          W.box(rx-0.04,0,rz-0.5,0.08,0.95,0.08,M.metal,{solid:false,uvScale:3});
          W.box(rx-0.04,0,rz+0.42,0.08,0.95,0.08,M.metal,{solid:false,uvScale:3});
          W.box(rx-0.04,0.87,rz-0.5,0.08,0.08,1,M.metal,{solid:false,uvScale:3});
        }
      }

      /* ceiling */
      W.ceiling(x0,z0,x0+C,z0+C,h,M.ceilTile,{uvScale:1});
      W.solid(x0,h,z0,C,0.4,C);

      /* skylight panels — the only light in the level */
      const lit = k==='hall'? true : rng()<0.62;
      if(lit){
        const pw=k==='hall'?3.0:2.0;
        W.ceiling(mx-pw/2,mz-pw/2,mx+pw/2,mz+pw/2,h-0.06,M.skylight,{uvScale:0.5});
        W.box(mx-pw/2-0.1,h-0.10,mz-pw/2-0.1,pw+0.2,0.10,pw+0.2,M.wallTile,{solid:false,uvScale:1});
        W.light({x:mx,y:h-0.5,z:mz,r:0.94,g:1.0,b:0.99,
                 radius:k==='hall'?22:17,intensity:k==='hall'?2.0:1.7,flicker:0});
        // a weak bounce light near the floor keeps the underside of things readable
        W.light({x:mx,y:0.9,z:mz,r:0.55,g:0.80,b:0.80,radius:9,intensity:0.24,shadow:false});
      }

      /* columns */
      if(k==='colonnade'){
        for(let i=0;i<4;i++){
          const px=x0+C*(i%2?0.72:0.28), pz=z0+C*(i<2?0.28:0.72);
          pillar(W,px,pz,fy,h-fy,0.62,M.wallTile,M.wallTrim);
        }
      } else if(k==='hall'&&rng()<0.4){
        pillar(W,mx,mz,fy,h-fy,0.8,M.wallTile,M.wallTrim);
      }

      /* a tiled bench along one wall */
      if(k==='deck'&&rng()<0.3){
        const bl=2.2;
        W.box(x0+0.35,0,mz-bl/2,0.55,0.45,bl,M.wallTrim,{uvScale:1.4});
      }
    }

    /* ================================================== walls */
    const buildRun=(x0,z0,x1,z1,h)=>{
      const openW=2.4+rng()*0.8, openH=2.5+rng()*0.5;
      const op=archWall(W,x0,z0,x1,z1,h,T,M.wallTile,openW,openH,undefined);
      // bands of colour at splash height and at the cornice — broken by the
      // opening, since a stripe painted across thin air gives the game away
      const horiz=Math.abs(x1-x0)>Math.abs(z1-z0);
      const L=horiz?(x1-x0):(z1-z0);
      const segs=op?[[0,op.mid-op.hw],[op.mid+op.hw,L]]:[[0,L]];
      for(const [a0,a1] of segs){
        if(a1-a0<0.02) continue;
        if(horiz){
          W.box(x0+a0,1.05,z0-T/2-0.02,a1-a0,0.30,T+0.04,M.wallTrim,{solid:false,uvScale:1});
          W.box(x0+a0,h-0.26,z0-T/2-0.02,a1-a0,0.26,T+0.04,M.wallTrim,{solid:false,uvScale:1});
        } else {
          W.box(x0-T/2-0.02,1.05,z0+a0,T+0.04,0.30,a1-a0,M.wallTrim,{solid:false,uvScale:1});
          W.box(x0-T/2-0.02,h-0.26,z0+a0,T+0.04,0.26,a1-a0,M.wallTrim,{solid:false,uvScale:1});
        }
      }
      // jambs down each side of the opening, stopping at the springing line
      if(op){
        const jh=openH-op.hw, jw=0.13;
        for(const s of [-1,1]){
          const a=op.mid+s*op.hw-(s<0?jw:0);
          if(horiz) W.box(x0+a,0,z0-T/2-0.03,jw,jh,T+0.06,M.wallTrim,{solid:false,uvScale:1.4});
          else      W.box(x0-T/2-0.03,0,z0+a,T+0.06,jh,jw,M.wallTrim,{solid:false,uvScale:1.4});
        }
      }
    };
    for(let y=0;y<G;y++)for(let x=0;x<=G;x++){
      if(!VW[x][y]) continue;
      const h=Math.max(hgt[Math.max(0,x-1)][y],hgt[Math.min(G-1,x)][y]);
      if(VW[x][y]===2) archWall(W,x*C,y*C,x*C,(y+1)*C,h,T,M.wallTile,0,0);
      else buildRun(x*C,y*C,x*C,(y+1)*C,h);
    }
    for(let y=0;y<=G;y++)for(let x=0;x<G;x++){
      if(!HW[x][y]) continue;
      const h=Math.max(hgt[x][Math.max(0,y-1)],hgt[x][Math.min(G-1,y)]);
      if(HW[x][y]===2) archWall(W,x*C,y*C,(x+1)*C,y*C,h,T,M.wallTile,0,0);
      else buildRun(x*C,y*C,(x+1)*C,y*C,h);
    }

    /* ================================================== the way out */
    const gx=ex*C+C/2, gz=ey*C+C/2;
    W.box(gx-0.95,0,gz-0.3,1.9,2.6,0.6,M.void,{solid:false});
    W.box(gx-1.1,0,gz-0.36,0.15,2.85,0.72,M.wallTrim,{solid:false,uvScale:1.2});
    W.box(gx+0.95,0,gz-0.36,0.15,2.85,0.72,M.wallTrim,{solid:false,uvScale:1.2});
    W.box(gx-1.1,2.6,gz-0.36,2.2,0.25,0.72,M.wallTrim,{solid:false,uvScale:1.2});
    W.light({x:gx,y:2.1,z:gz+0.6,r:0.72,g:1.0,b:0.95,radius:9,intensity:1.7});
    W.goal({x:gx,y:1,z:gz+0.2,r:1.25,
      title:'The water ended',
      text:'Past the arch the tiles stopped and there was carpet, and the carpet was dry. '+
           'You will be thinking about the sound of it for a while.'});

    /* ================================================== atmosphere */
    W.environment({
      fogColor:[0.185,0.285,0.295],
      fogDensity:0.020,
      ambient:[0.105,0.135,0.140],
      exposure:1.0,
      lift:[0.004,0.010,0.010],
      gain:[0.95,1.01,1.02],
      sat:1.06,
      bloomThresh:0.72,
      aoStrength:0.9
    });
    W.ambience({
      hum:0.10, humFreq:50, drone:0.16, droneFreq:52,
      water:0.85, tone:0.05, toneCut:900, toneLow:60,
      reverb:0.62, drips:true, eventGap:8
    });
  }
});
})();

/* =====================================================================
   LIMINAL — level.backrooms.js
   Level 0 · "The Lobby"

   The yellow rooms. Mono-yellow wallpaper, damp carpet, a ceiling of
   stained acoustic tile and 120 Hz of fluorescent hum forever.

   Everything below is generated: the layout, the textures, the lighting
   and the props. Nothing is loaded from disk.
   ===================================================================== */
(function(){
"use strict";

/* ---------------------------------------------------------------- paint */
/* Lay down a tiling fbm base colour, then decorate on top with 2D canvas ops. */
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

const MATS={
  /* ------------------------------------------------ mono-yellow wallpaper */
  wallpaper:{tile:0.5,bump:0.35,specular:0.04,shininess:18,draw(c,S,rng,TX){
    base(c,S,11,[201,178,101],0.20,S/9,4,0.4);
    // fine vertical weave
    c.globalAlpha=0.05;
    for(let x=0;x<S;x+=2){
      c.fillStyle=(x%4)?'#000':'#fff';
      c.fillRect(x,0,1,S);
    }
    c.globalAlpha=1;
    // wallpaper strips — a faint seam every half texture (≈1 m)
    c.strokeStyle='rgba(120,102,58,0.30)';c.lineWidth=1;
    c.beginPath();c.moveTo(S*0.5,0);c.lineTo(S*0.5,S);c.moveTo(0.5,0);c.lineTo(0.5,S);c.stroke();
    c.strokeStyle='rgba(238,226,180,0.14)';
    c.beginPath();c.moveTo(S*0.5+1.5,0);c.lineTo(S*0.5+1.5,S);c.stroke();
    // damp shadows and old water marks
    TX.stains(c,rng,5,TX.rgba(96,80,42),0.30,0.07,0.26);
    TX.stains(c,rng,3,TX.rgba(58,52,30),0.22,0.04,0.13);
    // scuffs
    c.strokeStyle='rgba(70,60,34,0.20)';
    for(let i=0;i<26;i++){
      const x=rng()*S,y=rng()*S,l=4+rng()*26,a=(rng()-0.5)*0.6;
      c.lineWidth=0.6+rng()*1.4;
      c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);c.stroke();
    }
    TX.grain(c,0.045,1.4,7);
  }},

  /* ------------------------------------------------------ mouldy wallpaper */
  mould:{tile:0.5,bump:0.5,specular:0.06,shininess:14,draw(c,S,rng,TX){
    MATS.wallpaper.draw(c,S,rng,TX);
    // creeping growth, not polka dots: a few broad fields, then fine specks
    c.globalCompositeOperation='multiply';
    TX.stains(c,rng,3,TX.rgba(80,88,58),0.55,0.22,0.46);
    TX.stains(c,rng,5,TX.rgba(66,76,48),0.42,0.06,0.20);
    TX.stains(c,rng,9,TX.rgba(48,44,32),0.30,0.02,0.07);
    c.globalCompositeOperation='source-over';
    // dark runs down from the ceiling line
    TX.streaks(c,rng,26,TX.rgba(40,44,28),3,0.26);
    TX.grain(c,0.07,1.2,13);
    TX.grain(c,0.05,3.0,17);
  }},

  /* ----------------------------------------------------------- damp carpet */
  carpet:{tile:0.34,bump:0.85,specular:0.03,shininess:8,draw(c,S,rng,TX){
    base(c,S,23,[139,124,68],0.34,S/26,5,0);
    // fibre: two scales of fine noise
    TX.grain(c,0.16,1.0,31);
    TX.grain(c,0.10,3.5,37);
    // trodden paths and damp patches
    c.globalCompositeOperation='multiply';
    TX.stains(c,rng,7,TX.rgba(112,100,58),0.55,0.10,0.32);
    TX.stains(c,rng,4,TX.rgba(72,64,38),0.55,0.05,0.16);
    c.globalCompositeOperation='source-over';
    TX.stains(c,rng,3,TX.rgba(178,164,104),0.20,0.08,0.22);
    TX.grain(c,0.05,1.0,41);
  }},

  /* ------------------------------------------------------ acoustic ceiling */
  ceiltile:{tile:1/2.4,bump:0.30,specular:0.02,shininess:10,draw(c,S,rng,TX){
    base(c,S,47,[205,199,178],0.10,S/12,3,0);
    // pitted acoustic surface
    c.fillStyle='rgba(120,116,104,0.5)';
    for(let i=0;i<S*14;i++){
      const x=rng()*S,y=rng()*S,r=0.5+rng()*1.1;
      c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
    }
    // 4x4 grid of 600 mm tiles inside a 2.4 m texture
    const cell=S/4;
    c.strokeStyle='rgba(72,70,62,0.75)';c.lineWidth=Math.max(1,S/256*1.6);
    TX.grid(c,cell,'rgba(72,70,62,0.75)',c.lineWidth,0);
    c.strokeStyle='rgba(232,228,212,0.35)';
    TX.grid(c,cell,'rgba(232,228,212,0.35)',1,1.5);
    // water damage: an irregular field with a tide line at its edge
    TX.stains(c,rng,2,TX.rgba(132,102,54),0.42,0.10,0.24);
    if(rng()<0.75){
      const gx=(rng()*4|0)*cell, gy=(rng()*4|0)*cell;
      TX.blot(c,gx+cell*(0.3+rng()*0.4),gy+cell*(0.3+rng()*0.4),cell*(0.2+rng()*0.22),[
        [0,'rgba(150,116,62,0.20)'],[0.74,'rgba(126,94,48,0.26)'],
        [0.93,'rgba(104,76,38,0.40)'],[1,'rgba(104,76,38,0)']]);
    }
    TX.grain(c,0.035,1.2,53);
  }},

  /* --------------------------------------------------------------- skirting */
  baseboard:{tile:0.5,bump:0.25,specular:0.10,shininess:34,draw(c,S,rng,TX){
    base(c,S,59,[104,88,50],0.18,S/6,3,0.2);
    c.globalAlpha=0.10;
    for(let y=0;y<S;y+=3){ c.fillStyle=(y%6)?'#000':'#fff'; c.fillRect(0,y,S,1); }
    c.globalAlpha=1;
    TX.stains(c,rng,4,TX.rgba(50,42,26),0.4,0.05,0.2);
    TX.grain(c,0.05,1,61);
  }},

  /* -------------------------------------------------------------- concrete */
  concrete:{tile:0.28,bump:0.4,specular:0.05,shininess:16,draw(c,S,rng,TX){
    base(c,S,67,[126,124,119],0.22,S/18,5,0.3);
    // aggregate speckle
    for(let i=0;i<S*10;i++){
      const x=rng()*S,y=rng()*S,r=0.4+rng()*1.4,v=rng();
      c.fillStyle=v>0.5?'rgba(160,158,152,0.5)':'rgba(78,76,72,0.5)';
      c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
    }
    // cracks
    c.strokeStyle='rgba(64,62,58,0.55)';
    for(let i=0;i<5;i++){
      let x=rng()*S,y=rng()*S,a=rng()*6.28;
      c.lineWidth=0.6+rng();
      c.beginPath();c.moveTo(x,y);
      for(let k=0;k<12;k++){ a+=(rng()-0.5)*1.1; x+=Math.cos(a)*S/28; y+=Math.sin(a)*S/28; c.lineTo(x,y); }
      c.stroke();
    }
    TX.stains(c,rng,5,TX.rgba(84,82,78),0.3,0.06,0.24);
    TX.grain(c,0.05,1,71);
  }},

  /* ----------------------------------------------------------- steel/vents */
  metal:{tile:0.6,bump:0.2,specular:0.55,shininess:62,draw(c,S,rng,TX){
    base(c,S,79,[146,146,150],0.12,S/5,3,0);
    c.globalAlpha=0.10;
    for(let y=0;y<S;y++){ c.fillStyle=rng()>0.5?'#fff':'#000'; c.fillRect(0,y,S,1); }
    c.globalAlpha=1;
    TX.stains(c,rng,4,TX.rgba(96,84,64),0.28,0.05,0.18);
    TX.grain(c,0.03,1,83);
  }},

  /* ---------------------------------------------------- fluorescent diffuser */
  tube:{tile:0.5,emissive:[2.6,2.5,2.05],specular:0,draw(c,S,rng,TX){
    const g=c.createLinearGradient(0,0,0,S);
    g.addColorStop(0,'#c9c8bd');g.addColorStop(0.16,'#ffffff');
    g.addColorStop(0.5,'#fffdf2');g.addColorStop(0.84,'#ffffff');g.addColorStop(1,'#c9c8bd');
    c.fillStyle=g;c.fillRect(0,0,S,S);
    // prismatic diffuser ribs
    c.globalAlpha=0.13;
    for(let x=0;x<S;x+=Math.max(2,S/64)){ c.fillStyle='#8f8f86'; c.fillRect(x,0,1,S); }
    c.globalAlpha=1;
    // dead flies, because of course
    c.fillStyle='rgba(60,56,44,0.55)';
    for(let i=0;i<7;i++){
      const x=rng()*S,y=S*(0.3+rng()*0.4);
      c.beginPath();c.ellipse(x,y,1.6+rng()*2.2,1+rng(),rng()*3,0,Math.PI*2);c.fill();
    }
  }},

  /* ------------------------------------------------------------- cardboard */
  cardboard:{tile:0.7,bump:0.4,specular:0.05,shininess:12,draw(c,S,rng,TX){
    base(c,S,97,[158,126,84],0.16,S/10,4,0.2);
    c.globalAlpha=0.09;
    for(let x=0;x<S;x+=4){ c.fillStyle='#000'; c.fillRect(x,0,2,S); }
    c.globalAlpha=1;
    // packing tape
    c.fillStyle='rgba(206,192,166,0.42)';
    c.fillRect(0,S*0.46,S,S*0.08);
    c.strokeStyle='rgba(120,100,72,0.35)';c.lineWidth=1;
    c.strokeRect(0,S*0.46,S,S*0.08);
    TX.stains(c,rng,4,TX.rgba(96,72,44),0.3,0.05,0.2);
    TX.grain(c,0.05,1,101);
  }},

  /* ------------------------------------------------------------------ wood */
  wood:{tile:0.55,bump:0.35,specular:0.10,shininess:28,draw(c,S,rng,TX){
    base(c,S,103,[142,116,76],0.24,S/3,4,1.6);
    c.globalAlpha=0.14;
    for(let y=0;y<S;y+=2){
      c.fillStyle=TXX.fbm(y/9,0,S/9,7,2)>0.5?'#4a3a22':'#c2a173';
      c.fillRect(0,y,S,1);
    }
    c.globalAlpha=1;
    TX.grain(c,0.06,1,107);
  }},

  /* -------------------------------------------------------- standing water */
  water:{tile:0.25,blend:true,alpha:0.62,wave:1,specular:0.9,shininess:180,fresnel:0.35,bump:0,
    draw(c,S,rng,TX){
      base(c,S,109,[26,28,24],0.6,S/14,4,0.4);
      c.globalCompositeOperation='screen';
      TX.stains(c,rng,8,TX.rgba(48,52,44),0.5,0.06,0.24);
      c.globalCompositeOperation='source-over';
      TX.grain(c,0.05,2,113);
    }},

  /* ---------------------------------------------------------------- signage */
  exitsign:{tile:1,emissive:[1.5,2.2,1.5],specular:0,draw(c,S,rng,TX){
    TX.fill(c,'#0d1a10');
    c.fillStyle='#39d16a';
    c.fillRect(S*0.06,S*0.20,S*0.88,S*0.60);
    c.fillStyle='#07120a';
    c.font=`bold ${Math.floor(S*0.34)}px monospace`;
    c.textAlign='center';c.textBaseline='middle';
    c.fillText('EXIT',S*0.5,S*0.52);
    TX.grain(c,0.05,1,127);
  }},

  /* ----------------------------------------------------------- the doorway */
  void:{tile:0.5,specular:0,draw(c,S){ TXX.fill(c,'#050505'); }}
};

/* ------------------------------------------------------------- geometry aid */
/* rotated box — props read as hand-placed instead of grid-snapped */
function rbox(W,cx,y0,cz,w,h,d,yaw,mat,opt){
  const co=Math.cos(yaw),si=Math.sin(yaw);
  const P=(sx,sz)=>[cx+(sx*w*0.5)*co-(sz*d*0.5)*si, 0, cz+(sx*w*0.5)*si+(sz*d*0.5)*co];
  const p=[P(1,-1),P(-1,-1),P(-1,1),P(1,1)];
  const y1=y0+h;
  const o=Object.assign({uvMode:'local'},opt||{});
  for(let i=0;i<4;i++){
    const a=p[i],b=p[(i+1)%4];
    W.quad([a[0],y0,a[2]],[b[0],y0,b[2]],[b[0],y1,b[2]],[a[0],y1,a[2]],mat,o);
  }
  const t=[P(-1,1),P(1,1),P(1,-1),P(-1,-1)];
  W.quad([t[0][0],y1,t[0][2]],[t[1][0],y1,t[1][2]],[t[2][0],y1,t[2][2]],[t[3][0],y1,t[3][2]],mat,o);
  if(opt&&opt.solid===false) return;
  const rad=Math.max(w,d)*0.5;
  W.solid(cx-rad,y0,cz-rad,rad*2,h,rad*2);
}
/* four-sided tapered prism — traffic cones, stacked debris */
function taper(W,cx,y0,cz,wb,wt,h,mat,opt){
  const o=Object.assign({uvMode:'local'},opt||{});
  const B=[[1,-1],[-1,-1],[-1,1],[1,1]];
  for(let i=0;i<4;i++){
    const a=B[i],b=B[(i+1)%4];
    W.quad([cx+a[0]*wb/2,y0,cz+a[1]*wb/2],[cx+b[0]*wb/2,y0,cz+b[1]*wb/2],
           [cx+b[0]*wt/2,y0+h,cz+b[1]*wt/2],[cx+a[0]*wt/2,y0+h,cz+a[1]*wt/2],mat,o);
  }
  W.quad([cx-wt/2,y0+h,cz+wt/2],[cx+wt/2,y0+h,cz+wt/2],[cx+wt/2,y0+h,cz-wt/2],[cx-wt/2,y0+h,cz-wt/2],mat,o);
}

/* ==================================================================== level */
LIMINAL.registerLevel({
  id:'backrooms',
  name:'Level 0',
  subtitle:'The Lobby',
  badge:'classic',
  accent:'#e6cf5a',
  tags:['yellow rooms','maze','fluorescent','damp carpet','no-clip'],
  size:'72 × 72 m',
  lighting:'fluorescent · flickering',
  defaultSeed:1337,
  description:'Mono-yellow wallpaper, the stink of old moist carpet, endless background '+
              'noise of fluorescent lights at maximum hum-buzz and approximately six hundred '+
              'million square miles of randomly segmented empty rooms. Somewhere in here a '+
              'doorway is lit green.',

  preview(g,w,h){
    const grd=g.createLinearGradient(0,0,0,h);
    grd.addColorStop(0,'#b7a45f');grd.addColorStop(0.62,'#8e7f45');grd.addColorStop(1,'#6d6134');
    g.fillStyle=grd;g.fillRect(0,0,w,h);
    // receding room
    const cx=w*0.52,cy=h*0.46;
    for(let i=6;i>=1;i--){
      const k=i/6, ww=w*0.92*k, hh=h*0.88*k;
      g.fillStyle=`rgba(${190-i*12},${172-i*12},${96-i*6},1)`;
      g.fillRect(cx-ww/2,cy-hh/2,ww,hh);
      g.strokeStyle='rgba(60,52,26,0.45)';g.lineWidth=1;
      g.strokeRect(cx-ww/2,cy-hh/2,ww,hh);
      // ceiling strip
      g.fillStyle=`rgba(255,253,230,${0.25+k*0.7})`;
      g.fillRect(cx-ww*0.07,cy-hh/2+hh*0.03,ww*0.14,Math.max(1,hh*0.018));
    }
    g.fillStyle='rgba(120,106,58,0.55)';g.fillRect(0,h*0.80,w,h*0.20);
    const v=g.createRadialGradient(cx,cy,0,cx,cy,w*0.62);
    v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,0.78)');
    g.fillStyle=v;g.fillRect(0,0,w,h);
  },

  /* ------------------------------------------------------------------ build */
  build(W,ctx){
    const TX=ctx.TX;
    const rng=W.rng;
    const GW=18, GH=18, C=4.0;          // 18×18 cells of 4 m
    const T=0.18;                        // wall thickness
    const WX=GW*C, WZ=GH*C;
    const seed=ctx.seed;

    /* --- materials --- */
    const M={};
    for(const k in MATS) M[k]=W.material(k,MATS[k]);

    /* --- zoning: soft blobs of character across the grid --- */
    const ZH={standard:3.0,open:4.25,tight:2.35,damp:2.85,storage:3.65};
    const zone=[],hgt=[];
    for(let x=0;x<GW;x++){ zone[x]=[];hgt[x]=[]; }
    for(let y=0;y<GH;y++)for(let x=0;x<GW;x++){
      const n=TX.fbm(x*0.17,y*0.17,999,seed,3);
      const m=TX.fbm(x*0.11+31,y*0.11+17,999,seed+5,2);
      let z;
      if(n<0.36) z='open';
      else if(n>0.63) z=(m<0.46)?'tight':'storage';
      else z=(m<0.27)?'damp':'standard';
      zone[x][y]=z; hgt[x][y]=ZH[z];
    }

    /* --- walls: straight runs, the way partition walls actually go up --- */
    const VW=[],HW=[],VD=[],HD=[];        // walls + doorway flags
    for(let x=0;x<=GW;x++){ VW[x]=new Uint8Array(GH); VD[x]=new Uint8Array(GH); }
    for(let x=0;x<GW;x++){ HW[x]=new Uint8Array(GH+1); HD[x]=new Uint8Array(GH+1); }
    for(let y=0;y<GH;y++){ VW[0][y]=1; VW[GW][y]=1; }
    for(let x=0;x<GW;x++){ HW[x][0]=1; HW[x][GH]=1; }

    const densityFor=z=>z==='open'?0.28:z==='tight'?1.5:z==='storage'?0.85:1.0;
    const runs=Math.round(GW*GH*0.62);
    for(let i=0;i<runs;i++){
      const vert=rng()<0.5;
      const len=1+(rng()*rng()*5|0);
      if(vert){
        const gx=1+(rng()*(GW-1)|0), y0=rng()*GH|0;
        for(let k=0;k<len;k++){
          const y=y0+k; if(y>=GH) break;
          const z=zone[Math.min(gx,GW-1)][y];
          if(rng()<densityFor(z)*0.62) VW[gx][y]=1;
        }
      } else {
        const gy=1+(rng()*(GH-1)|0), x0=rng()*GW|0;
        for(let k=0;k<len;k++){
          const x=x0+k; if(x>=GW) break;
          const z=zone[x][Math.min(gy,GH-1)];
          if(rng()<densityFor(z)*0.62) HW[x][gy]=1;
        }
      }
    }

    /* --- guarantee the whole floor is reachable --- */
    const idx=(x,y)=>y*GW+x;
    const open=(x,y,d)=>{ // d: 0=+x 1=-x 2=+z 3=-z
      if(d===0) return x+1<GW&&!VW[x+1][y];
      if(d===1) return x-1>=0&&!VW[x][y];
      if(d===2) return y+1<GH&&!HW[x][y+1];
      return y-1>=0&&!HW[x][y];
    };
    for(let guard=0;guard<400;guard++){
      const seen=new Uint8Array(GW*GH);
      const st=[[GW>>1,GH>>1]]; seen[idx(GW>>1,GH>>1)]=1;
      let n=1;
      while(st.length){
        const [x,y]=st.pop();
        const nb=[[1,0,0],[-1,0,1],[0,1,2],[0,-1,3]];
        for(const [dx,dy,d] of nb){
          const nx=x+dx,ny=y+dy;
          if(nx<0||ny<0||nx>=GW||ny>=GH) continue;
          if(seen[idx(nx,ny)]) continue;
          if(!open(x,y,d)) continue;
          seen[idx(nx,ny)]=1;n++;st.push([nx,ny]);
        }
      }
      if(n===GW*GH) break;
      // punch a hole between a seen cell and an unseen neighbour
      let done=false;
      for(let y=0;y<GH&&!done;y++)for(let x=0;x<GW&&!done;x++){
        if(!seen[idx(x,y)]) continue;
        if(x+1<GW&&!seen[idx(x+1,y)]){ VW[x+1][y]=0; done=true; }
        else if(x-1>=0&&!seen[idx(x-1,y)]){ VW[x][y]=0; done=true; }
        else if(y+1<GH&&!seen[idx(x,y+1)]){ HW[x][y+1]=0; done=true; }
        else if(y-1>=0&&!seen[idx(x,y-1)]){ HW[x][y]=0; done=true; }
      }
      if(!done) break;
    }

    /* --- some walls get a doorway instead of being solid --- */
    for(let y=0;y<GH;y++)for(let x=1;x<GW;x++) if(VW[x][y]&&rng()<0.20) VD[x][y]=1;
    for(let y=1;y<GH;y++)for(let x=0;x<GW;x++) if(HW[x][y]&&rng()<0.20) HD[x][y]=1;

    /* --- pick spawn and exit: far apart, both in walkable cells --- */
    const sx=2+(rng()*3|0), sy=2+(rng()*3|0);
    const ex=GW-3-(rng()*3|0), ey=GH-3-(rng()*3|0);
    W.spawn(sx*C+C/2, 0.02, sy*C+C/2, rng()*Math.PI*2);
    // the exit room stays open on both sides so the green glow carries
    VW[ex][ey]=0; VW[ex+1][ey]=0; HW[ex][ey]=0; HW[ex][ey+1]=0;

    /* --- per-cell footstep material --- */
    const stepMat=[];
    for(let x=0;x<GW;x++) stepMat[x]=new Array(GH).fill('carpet');
    W.setStepMaterial((x,z)=>{
      const cx=clampi(Math.floor(x/C),0,GW-1), cy=clampi(Math.floor(z/C),0,GH-1);
      return stepMat[cx][cy];
    });
    function clampi(v,a,b){return v<a?a:v>b?b:v;}

    /* --- ground and lid collision --- */
    W.solid(-2,-1.2,-2,WX+4,1.2,WZ+4);

    /* ================================================== cells */
    const hasLight=[],pillar=[];
    for(let x=0;x<GW;x++){ hasLight[x]=new Uint8Array(GH); pillar[x]=new Uint8Array(GH); }

    for(let cy=0;cy<GH;cy++)for(let cx=0;cx<GW;cx++){
      const z=zone[cx][cy], h=hgt[cx][cy];
      const x0=cx*C, z0=cy*C, mx=x0+C/2, mz=z0+C/2;
      const damp=z==='damp', store=z==='storage';

      /* floor */
      const fmat = store?M.concrete:M.carpet;
      const tintK = damp?0.62:(0.86+rng()*0.24);
      W.floor(x0,z0,x0+C,z0+C,0,fmat,{tint:[tintK,tintK*(damp?0.98:1),tintK*(damp?0.92:1)]});
      stepMat[cx][cy]=store?'concrete':'carpet';

      /* ceiling + its occluder */
      W.ceiling(x0,z0,x0+C,z0+C,h,M.ceiltile,{tint:[0.94+rng()*0.12,0.94+rng()*0.1,0.9+rng()*0.1]});
      W.solid(x0,h,z0,C,0.35,C);

      /* light fixtures */
      const pLight = z==='open'?0.72:z==='tight'?0.62:z==='damp'?0.44:z==='storage'?0.66:0.86;
      if(rng()<pLight){
        hasLight[cx][cy]=1;
        const dead = damp? rng()<0.40 : rng()<0.08;
        const fw=1.30, fd=0.66;
        // housing
        W.box(mx-fw/2,h-0.11,mz-fd/2,fw,0.11,fd,M.metal,{solid:false,uvScale:1.2});
        // diffuser, just below the housing
        W.ceiling(mx-fw/2+0.05,mz-fd/2+0.05,mx+fw/2-0.05,mz+fd/2-0.05,h-0.115,M.tube,
                  {tint:dead?[0.10,0.10,0.11]:[1,1,1],uvScale:0.8});
        if(!dead){
          W.light({x:mx,y:h-0.32,z:mz,r:1.0,g:0.975,b:0.83,
                   radius:z==='open'?15.0:12.5,
                   intensity:z==='tight'?1.7:2.0,
                   flicker:rng()<(damp?0.55:0.22)?(0.55+rng()*0.45):0});
        }
      }

      /* ---------------- decoration ---------------- */
      // support pillars in the open halls
      if(z==='open'&&!hasLight[cx][cy]&&rng()<0.34){
        pillar[cx][cy]=1;
        const pw=0.55;
        W.box(mx-pw/2,0,mz-pw/2,pw,h,pw,M.wallpaper,{uvScale:1});
        W.box(mx-pw/2-0.05,0,mz-pw/2-0.05,pw+0.1,0.14,pw+0.1,M.baseboard,{solid:false,uvScale:1.6});
        W.box(mx-pw/2-0.05,h-0.16,mz-pw/2-0.05,pw+0.1,0.16,pw+0.1,M.baseboard,{solid:false,uvScale:1.6});
      }

      // damp rooms: standing water, mould, dripping
      if(damp&&rng()<0.72){
        const pw=1.2+rng()*2.0, pd=1.2+rng()*2.0;
        const px=x0+0.6+rng()*(C-pw-1.2), pz=z0+0.6+rng()*(C-pd-1.2);
        W.floor(px,pz,px+pw,pz+pd,0.012,M.water,{uvScale:0.9});
        stepMat[cx][cy]='water';
      }
      if(damp&&rng()<0.5){
        // a ceiling tile has given up
        const tx=x0+0.8+rng()*(C-2), tz=z0+0.8+rng()*(C-2);
        W.box(tx,0.015,tz,0.58,0.03,0.58,M.ceiltile,{solid:false,uvScale:0.9,tint:[0.6,0.58,0.52]});
        W.ceiling(tx,tz,tx+0.6,tz+0.6,h-0.02,M.void,{uvScale:1});
      }

      // storage: boxes, pallets, a shelf
      if(store){
        const stacks=1+(rng()*3|0);
        for(let s=0;s<stacks;s++){
          const bx=x0+0.7+rng()*(C-1.4), bz=z0+0.7+rng()*(C-1.4);
          let y=0;
          const n=1+(rng()*3|0);
          for(let k=0;k<n;k++){
            const bw=0.5+rng()*0.45, bh=0.32+rng()*0.28, bd=0.5+rng()*0.45;
            rbox(W,bx+(rng()-0.5)*0.16,y,bz+(rng()-0.5)*0.16,bw,bh,bd,rng()*Math.PI,M.cardboard,{uvScale:1.4});
            y+=bh;
          }
        }
        if(rng()<0.55){
          const px=x0+0.8+rng()*(C-2.2), pz=z0+0.8+rng()*(C-2.2);
          for(let k=0;k<5;k++)
            W.box(px,0.06,pz+k*0.24,1.2,0.05,0.14,M.wood,{solid:false,uvScale:1.6});
          W.box(px,0,pz,1.2,0.06,1.1,M.wood,{uvScale:1.6});
        }
      }

      // stray objects in the ordinary rooms
      if(z==='standard'&&rng()<0.14){
        const ox=x0+0.9+rng()*(C-1.8), oz=z0+0.9+rng()*(C-1.8);
        if(rng()<0.5){
          // a chair nobody sat in
          const yaw=rng()*Math.PI*2;
          rbox(W,ox,0.44,oz,0.46,0.06,0.46,yaw,M.wood,{uvScale:2});
          rbox(W,ox,0.5,oz-0.2,0.44,0.5,0.06,yaw,M.wood,{uvScale:2,solid:false});
          for(let k=0;k<4;k++){
            const a=yaw+Math.PI/4+k*Math.PI/2;
            rbox(W,ox+Math.cos(a)*0.18,0,oz+Math.sin(a)*0.18,0.05,0.44,0.05,yaw,M.metal,{uvScale:3,solid:false});
          }
        } else {
          taper(W,ox,0,oz,0.34,0.09,0.52,M.metal,{tint:[1.6,0.7,0.3]});
          W.box(ox-0.22,0,oz-0.22,0.44,0.03,0.44,M.metal,{solid:false,tint:[1.6,0.7,0.3],uvScale:2});
          W.solid(ox-0.2,0,oz-0.2,0.4,0.5,0.4);
        }
      }

      // ceiling services in the low rooms
      if(z==='tight'&&rng()<0.5){
        const py=h-0.22, along=rng()<0.5;
        if(along) W.box(x0,py,mz-0.06,C,0.12,0.12,M.metal,{solid:false,uvScale:2.2});
        else      W.box(mx-0.06,py,z0,0.12,0.12,C,M.metal,{solid:false,uvScale:2.2});
        if(rng()<0.4){
          const cx2=mx+(rng()-0.5)*1.4;
          W.box(cx2-0.03,py-0.5,mz-0.03,0.06,0.5,0.06,M.metal,{solid:false,uvScale:4});
        }
      }
    }

    /* ============================================ bulkheads between heights */
    for(let cy=0;cy<GH;cy++)for(let cx=0;cx<GW;cx++){
      const h=hgt[cx][cy];
      if(cx+1<GW&&!VW[cx+1][cy]){
        const h2=hgt[cx+1][cy];
        if(Math.abs(h2-h)>0.01){
          const lo=Math.min(h,h2),hi=Math.max(h,h2),x=(cx+1)*C;
          W.quad([x,lo,cy*C],[x,lo,(cy+1)*C],[x,hi,(cy+1)*C],[x,hi,cy*C],M.wallpaper,{double:true,uvScale:1});
        }
      }
      if(cy+1<GH&&!HW[cx][cy+1]){
        const h2=hgt[cx][cy+1];
        if(Math.abs(h2-h)>0.01){
          const lo=Math.min(h,h2),hi=Math.max(h,h2),z=(cy+1)*C;
          W.quad([cx*C,lo,z],[(cx+1)*C,lo,z],[(cx+1)*C,hi,z],[cx*C,hi,z],M.wallpaper,{double:true,uvScale:1});
        }
      }
    }

    /* ==================================================== walls */
    const wallMatFor=(zx,zy)=> (zone[clampi(zx,0,GW-1)][clampi(zy,0,GH-1)]==='damp'&&rng()<0.7)?M.mould:M.wallpaper;

    function buildWall(ax,az,bx,bz,h,door,mat){
      // ax/az -> bx/bz is the wall centreline; T thick, extended to close corners
      const horiz=Math.abs(bx-ax)>Math.abs(bz-az);
      const x0=Math.min(ax,bx)-(horiz?T/2:T/2), x1=Math.max(ax,bx)+(horiz?T/2:T/2);
      const z0=Math.min(az,bz)-T/2, z1=Math.max(az,bz)+T/2;
      const put=(a0,a1)=>{
        if(horiz) W.box(a0,0,z0,a1-a0,h,z1-z0,mat,{uvScale:1});
        else      W.box(x0,0,a0,x1-x0,h,a1-a0,mat,{uvScale:1});
        // skirting on both faces
        if(horiz){
          W.box(a0,0,z0-0.05,a1-a0,0.15,0.05,M.baseboard,{solid:false,uvScale:2});
          W.box(a0,0,z1,a1-a0,0.15,0.05,M.baseboard,{solid:false,uvScale:2});
        } else {
          W.box(x0-0.05,0,a0,0.05,0.15,a1-a0,M.baseboard,{solid:false,uvScale:2});
          W.box(x1,0,a0,0.05,0.15,a1-a0,M.baseboard,{solid:false,uvScale:2});
        }
      };
      const s=horiz?x0:z0, e=horiz?x1:z1;
      if(!door){ put(s,e); return; }
      const mid=(s+e)/2, gap=1.12, top=2.12;
      put(s,mid-gap/2); put(mid+gap/2,e);
      // header over the opening
      if(horiz) W.box(mid-gap/2,top,z0,gap,h-top,z1-z0,mat,{uvScale:1});
      else      W.box(x0,top,mid-gap/2,x1-x0,h-top,gap,mat,{uvScale:1});
      // frame
      const fm=M.baseboard;
      if(horiz){
        W.box(mid-gap/2-0.06,0,z0-0.03,0.06,top+0.08,z1-z0+0.06,fm,{solid:false,uvScale:2});
        W.box(mid+gap/2,0,z0-0.03,0.06,top+0.08,z1-z0+0.06,fm,{solid:false,uvScale:2});
        W.box(mid-gap/2-0.06,top,z0-0.03,gap+0.12,0.08,z1-z0+0.06,fm,{solid:false,uvScale:2});
      } else {
        W.box(x0-0.03,0,mid-gap/2-0.06,x1-x0+0.06,top+0.08,0.06,fm,{solid:false,uvScale:2});
        W.box(x0-0.03,0,mid+gap/2,x1-x0+0.06,top+0.08,0.06,fm,{solid:false,uvScale:2});
        W.box(x0-0.03,top,mid-gap/2-0.06,x1-x0+0.06,0.08,gap+0.12,fm,{solid:false,uvScale:2});
      }
    }

    for(let y=0;y<GH;y++)for(let x=0;x<=GW;x++){
      if(!VW[x][y]) continue;
      const h=Math.max(hgt[clampi(x-1,0,GW-1)][y],hgt[clampi(x,0,GW-1)][y]);
      buildWall(x*C,y*C,x*C,(y+1)*C,h,VD[x][y]&&x>0&&x<GW,wallMatFor(x,y));
    }
    for(let y=0;y<=GH;y++)for(let x=0;x<GW;x++){
      if(!HW[x][y]) continue;
      const h=Math.max(hgt[x][clampi(y-1,0,GH-1)],hgt[x][clampi(y,0,GH-1)]);
      buildWall(x*C,y*C,(x+1)*C,y*C,h,HD[x][y]&&y>0&&y<GH,wallMatFor(x,y));
    }

    /* ============================================== wall-mounted detail */
    for(let i=0;i<46;i++){
      const x=1+(rng()*(GW-1)|0), y=rng()*GH|0;
      if(!VW[x][y]||VD[x][y]) continue;
      const wx=x*C, wz=y*C+0.8+rng()*(C-1.6);
      const side=rng()<0.5?1:-1;
      const kind=rng();
      if(kind<0.45){
        // return-air grille
        const gh=0.34,gw=0.5,gy=1.25+rng()*0.9;
        W.box(wx+side*(T/2),gy,wz-gw/2,0.03,gh,gw,M.metal,{solid:false,uvScale:2.4});
      } else if(kind<0.72){
        // damage — a hole punched in the drywall
        W.box(wx+side*(T/2)-0.005,0.55+rng()*0.7,wz-0.16,0.02,0.26,0.32,M.void,{solid:false});
      } else {
        // socket
        W.box(wx+side*(T/2),0.28,wz-0.05,0.02,0.13,0.10,M.metal,{solid:false,uvScale:6});
      }
    }

    /* ==================================================== the way out */
    const gx=ex*C+C/2, gz=ey*C+C/2;
    const dw=1.25,dh=2.15;
    // dark recess
    W.box(gx-dw/2,0,gz-0.55,dw,dh,0.5,M.void,{solid:false});
    W.box(gx-dw/2-0.1,0,gz-0.6,0.1,dh+0.12,0.62,M.baseboard,{solid:false,uvScale:2});
    W.box(gx+dw/2,0,gz-0.6,0.1,dh+0.12,0.62,M.baseboard,{solid:false,uvScale:2});
    W.box(gx-dw/2-0.1,dh,gz-0.6,dw+0.2,0.12,0.62,M.baseboard,{solid:false,uvScale:2});
    // sign above it
    W.box(gx-0.28,dh+0.30,gz-0.16,0.56,0.26,0.07,M.exitsign,{solid:false,uvScale:1});
    W.light({x:gx,y:dh+0.36,z:gz+0.35,r:0.30,g:1.0,b:0.42,radius:6.5,intensity:1.35,flicker:0.15});
    W.light({x:gx,y:1.4,z:gz-0.2,r:0.22,g:0.9,b:0.35,radius:4.0,intensity:0.7});
    W.goal({x:gx,y:1,z:gz-0.1,r:1.15,
      title:'A way out',
      text:'The door opened onto a stairwell, and the stairwell smelled of rain. '+
           'You have left Level 0. It has not left you.'});

    /* ==================================================== atmosphere */
    W.environment({
      fogColor:[0.075,0.068,0.044],
      fogDensity:0.034,
      ambient:[0.115,0.105,0.075],
      exposure:1.0,
      lift:[0.010,0.008,0.002],
      gain:[1.05,1.00,0.88],
      sat:0.94,
      bloomThresh:0.62,
      aoStrength:1.0
    });
    W.ambience({
      hum:0.85, humFreq:60, drone:0.30, droneFreq:38,
      tone:0.055, toneCut:400, toneLow:45,
      reverb:0.30, drips:true, eventGap:11
    });
  }
});
})();

/* =====================================================================
   LIMINAL — level.carpark.js
   Level 12 · "The Car Park"

   Two and a half metres of headroom, forty thousand square metres of
   floor, and sodium light every twelve metres whether it is needed or
   not. Ramps down to a level that is the same, ramps up to a level
   that is the same.

   The ceiling is the point. Everything is wide and nothing is tall.
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

const MATS={
  /* the deck: power-floated, oil-dropped, tyre-polished in the lanes */
  deck:{tile:0.18,bump:0.30,specular:0.24,shininess:50,draw(c,S,rng,TX){
    base(c,S,13,[118,116,112],0.14,S/12,4,0.3);
    // a construction joint down the middle of the texture
    c.strokeStyle='rgba(78,76,74,0.8)';c.lineWidth=Math.max(1.4,S/220);
    c.beginPath();c.moveTo(0,S*0.5);c.lineTo(S,S*0.5);c.stroke();
    c.strokeStyle='rgba(150,148,144,0.25)';c.lineWidth=1;
    c.beginPath();c.moveTo(0,S*0.5+2);c.lineTo(S,S*0.5+2);c.stroke();
    // oil: dark, slightly iridescent, in the middle of where a car stood
    c.globalCompositeOperation='multiply';
    TX.stains(c,rng,4,TX.rgba(52,50,52),0.55,0.03,0.11);
    TX.stains(c,rng,5,TX.rgba(96,94,92),0.35,0.08,0.24);
    c.globalCompositeOperation='source-over';
    TX.stains(c,rng,2,TX.rgba(96,110,104),0.14,0.02,0.06);
    TX.grain(c,0.045,1.2,17);
  }},
  bay:{tile:0.7,bump:0.15,specular:0.2,shininess:40,draw(c,S,rng,TX){
    base(c,S,19,[212,208,196],0.10,S/8,3,0.2);
    // paint that has been driven over for twenty years
    c.globalCompositeOperation='destination-out';
    TX.stains(c,rng,12,'rgba(0,0,0,ALPHA)',0.85,0.03,0.16);
    c.globalCompositeOperation='destination-over';
    TXX.fill(c,'#6f6d69');
    c.globalCompositeOperation='source-over';
    TX.grain(c,0.05,1,23);
  }},
  bayRed:{tile:0.7,bump:0.15,specular:0.2,shininess:40,draw(c,S,rng,TX){
    base(c,S,29,[168,74,60],0.14,S/8,3,0.2);
    c.globalCompositeOperation='destination-out';
    TX.stains(c,rng,10,'rgba(0,0,0,ALPHA)',0.8,0.03,0.15);
    c.globalCompositeOperation='destination-over';
    TXX.fill(c,'#6f6d69');
    c.globalCompositeOperation='source-over';
    TX.grain(c,0.05,1,31);
  }},
  /* fair-faced concrete, but the cheap kind: patch repairs and old paint */
  wall:{tile:0.28,bump:0.45,specular:0.05,shininess:14,draw(c,S,rng,TX){
    base(c,S,37,[144,142,136],0.18,S/9,4,0.35);
    // shutter panel joints on a 1.2 m module
    c.strokeStyle='rgba(96,94,90,0.55)';
    TX.grid(c,S/2,'rgba(96,94,90,0.55)',Math.max(1.2,S/280),0);
    // tie holes
    for(let j=0;j<2;j++)for(let i=0;i<2;i++){
      const x=(i+0.5)*S/2, y=(j+0.5)*S/2;
      c.fillStyle='rgba(70,68,66,0.6)';
      c.beginPath();c.arc(x,y,S*0.012,0,Math.PI*2);c.fill();
    }
    TX.streaks(c,rng,14,TX.rgba(104,102,96),5,0.20);
    TX.stains(c,rng,4,TX.rgba(122,116,100),0.28,0.08,0.26);
    TX.grain(c,0.05,1.2,41);
  }},
  /* the soffit: coffers, services, and the water that comes through them */
  soffit:{tile:0.3,bump:0.35,specular:0.04,shininess:12,draw(c,S,rng,TX){
    base(c,S,43,[130,128,124],0.14,S/10,4,0.25);
    c.strokeStyle='rgba(88,86,84,0.6)';
    TX.grid(c,S/2,'rgba(88,86,84,0.6)',Math.max(1.4,S/240),0);
    // efflorescence: white bloom around every leak
    TX.stains(c,rng,4,TX.rgba(214,212,204),0.36,0.05,0.20);
    TX.stains(c,rng,3,TX.rgba(122,104,74),0.34,0.06,0.20);
    TX.blot(c,S*0.4,S*0.6,S*0.18,[[0,'rgba(150,132,92,0.28)'],[0.7,'rgba(120,104,70,0.20)'],
                                  [0.95,'rgba(90,78,52,0.34)'],[1,'rgba(90,78,52,0)']]);
    TX.grain(c,0.045,1.2,47);
  }},
  kerb:{tile:0.8,bump:0.3,specular:0.12,shininess:30,draw(c,S,rng,TX){
    base(c,S,53,[176,172,164],0.12,S/7,3,0.2);
    c.fillStyle='rgba(70,70,68,0.35)';c.fillRect(0,S*0.78,S,S*0.22);
    TX.stains(c,rng,4,TX.rgba(120,116,110),0.3,0.05,0.18);
    TX.grain(c,0.05,1,59);
  }},
  hazard:{tile:1.0,bump:0.2,specular:0.25,shininess:50,draw(c,S,rng,TX){
    TXX.fill(c,'#c8ac2e');
    c.fillStyle='#2b2a26';
    c.save();
    for(let i=-1;i<8;i++){
      c.beginPath();
      c.moveTo(i*S/4,0);c.lineTo(i*S/4+S/8,0);c.lineTo(i*S/4+S/8+S,S);c.lineTo(i*S/4+S,S);
      c.closePath();c.fill();
    }
    c.restore();
    c.globalCompositeOperation='destination-out';
    TX.stains(c,rng,9,'rgba(0,0,0,ALPHA)',0.7,0.03,0.14);
    c.globalCompositeOperation='destination-over';
    TXX.fill(c,'#75736e');
    c.globalCompositeOperation='source-over';
    TX.grain(c,0.05,1,61);
  }},
  pipe:{tile:0.6,bump:0.25,specular:0.4,shininess:90,draw(c,S,rng,TX){
    base(c,S,67,[128,80,58],0.16,S/6,3,0.2);
    TX.streaks(c,rng,12,TX.rgba(86,48,30),3,0.26);
    TX.grain(c,0.04,1,71);
  }},
  duct:{tile:0.6,bump:0.3,specular:0.35,shininess:80,draw(c,S,rng,TX){
    base(c,S,73,[150,152,154],0.12,S/6,3,0);
    c.globalAlpha=0.16;
    for(let x=0;x<S;x+=S/8){c.fillStyle='#000';c.fillRect(x,0,Math.max(2,S/80),S);}
    c.globalAlpha=1;
    TX.grain(c,0.04,1,79);
  }},
  sodium:{tile:1.0,emissive:[3.4,2.1,0.75],specular:0,draw(c,S,rng,TX){
    const g=c.createLinearGradient(0,0,0,S);
    g.addColorStop(0,'#ffe9b4');g.addColorStop(0.5,'#ffd07a');g.addColorStop(1,'#c07a1e');
    c.fillStyle=g;c.fillRect(0,0,S,S);
    c.fillStyle='rgba(60,40,10,0.35)';
    for(let i=0;i<5;i++) c.fillRect(0,S*(0.1+i*0.2),S,S*0.02);
  }},
  dead:{tile:1.0,emissive:[0.05,0.045,0.035],specular:0.1,draw(c,S,rng,TX){
    base(c,S,83,[88,84,74],0.2,S/6,3,0);
    c.fillStyle='rgba(30,26,20,0.5)';c.fillRect(0,S*0.35,S,S*0.3);
  }},
  sign:{tile:1.0,emissive:[0.42,0.50,0.44],bump:0.1,specular:0.2,draw(c,S,rng,TX){
    TXX.fill(c,'#1b4630');
    c.fillStyle='#dfe8dd';
    c.fillRect(S*0.08,S*0.10,S*0.84,S*0.06);
    for(let i=0;i<3;i++) c.fillRect(S*0.12,S*(0.30+i*0.18),S*(0.30+TX.ihash(i,1,2)*0.42),S*0.075);
    c.beginPath();c.moveTo(S*0.80,S*0.36);c.lineTo(S*0.92,S*0.52);c.lineTo(S*0.80,S*0.68);
    c.closePath();c.fill();
  }},
  exitSign:{tile:1.0,emissive:[0.55,2.4,0.85],specular:0,draw(c,S,rng,TX){
    TXX.fill(c,'#0d2415');
    c.fillStyle='#6effa8';
    c.fillRect(S*0.10,S*0.34,S*0.16,S*0.32);
    c.fillRect(S*0.10,S*0.34,S*0.34,S*0.08);
    c.fillRect(S*0.10,S*0.60,S*0.34,S*0.06);
    c.fillRect(S*0.56,S*0.42,S*0.30,S*0.16);
    c.beginPath();c.moveTo(S*0.86,S*0.30);c.lineTo(S*0.96,S*0.50);c.lineTo(S*0.86,S*0.70);
    c.closePath();c.fill();
  }},
  liftDoor:{tile:0.6,bump:0.15,specular:0.6,shininess:150,draw(c,S,rng,TX){
    base(c,S,89,[152,156,158],0.08,S/5,3,0);
    c.globalAlpha=0.10;
    for(let y=0;y<S;y++){c.fillStyle=rng()>0.5?'#fff':'#000';c.fillRect(0,y,S,1);}
    c.globalAlpha=1;
    c.fillStyle='rgba(50,54,56,0.85)';c.fillRect(S*0.49,0,S*0.02,S);
    TX.grain(c,0.03,1,97);
  }},
  voidM:{tile:1,specular:0,draw(c){ TXX.fill(c,'#050506'); }}
};

/* ==================================================================== level */
LIMINAL.registerLevel({
  id:'carpark',
  name:'Level 12',
  subtitle:'The Car Park',
  badge:'empty',
  accent:'#e0a83c',
  tags:['concrete','sodium','low ceiling','ramps','sub-level'],
  size:'84 × 84 m · two decks',
  lighting:'sodium · every twelfth bay',
  defaultSeed:12,
  description:'Sub-level P3, or possibly P4 — the ramp signs disagree. Two and a half metres of '+
              'headroom in every direction and not one vehicle. The bays are all marked, which '+
              'means somebody expected this to be full.',

  preview(g,w,h){
    g.fillStyle='#161310';g.fillRect(0,0,w,h);
    // low ceiling, wide floor, sodium pools receding
    const hz=h*0.44;
    const fl=g.createLinearGradient(0,hz,0,h);
    fl.addColorStop(0,'#3a3630');fl.addColorStop(1,'#6a6156');
    g.fillStyle=fl;g.fillRect(0,hz,w,h-hz);
    const cl=g.createLinearGradient(0,0,0,hz);
    cl.addColorStop(0,'#413b33');cl.addColorStop(1,'#2a2620');
    g.fillStyle=cl;g.fillRect(0,0,w,hz);
    // columns in perspective
    for(let i=6;i>=0;i--){
      const t=i/6, k=Math.pow(1-t,1.4)*0.9+0.1;
      for(const s of [-1,1]){
        const x=w*0.5+s*w*(0.10+0.42*k);
        const cw=w*0.055*k, ch=(h*0.30)*k;
        g.fillStyle=`rgb(${58+40*(1-t)},${54+36*(1-t)},${48+28*(1-t)})`;
        g.fillRect(x-cw/2,hz-ch*0.6,cw,ch);
      }
      // a sodium pool on the deck
      const y=hz+(h-hz)*Math.pow(t,0.8)*0.9;
      const grd=g.createRadialGradient(w*0.5,y,0,w*0.5,y,w*0.34*k+8);
      grd.addColorStop(0,`rgba(255,196,96,${0.34*(1-t)+0.10})`);
      grd.addColorStop(1,'rgba(255,196,96,0)');
      g.fillStyle=grd;g.fillRect(0,hz,w,h-hz);
      // the fitting itself
      g.fillStyle=`rgba(255,226,160,${0.85-t*0.5})`;
      g.fillRect(w*0.5-w*0.045*k,hz-h*0.30*k*0.60-3,w*0.09*k,Math.max(2,3*k));
    }
    // bay markings
    g.strokeStyle='rgba(214,208,190,0.30)';g.lineWidth=1;
    for(let i=0;i<7;i++){
      const t=i/7, y=hz+(h-hz)*Math.pow(t+0.06,0.7);
      g.beginPath();g.moveTo(w*0.5-w*0.9*t-20,y);g.lineTo(w*0.5-w*0.30*t-6,y);g.stroke();
      g.beginPath();g.moveTo(w*0.5+w*0.9*t+20,y);g.lineTo(w*0.5+w*0.30*t+6,y);g.stroke();
    }
    const v=g.createRadialGradient(w*0.5,hz,0,w*0.5,hz,w*0.65);
    v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,0.72)');
    g.fillStyle=v;g.fillRect(0,0,w,h);
  },

  /* ------------------------------------------------------------------ build */
  build(W,ctx){
    const TX=ctx.TX, rng=W.rng;
    const M={}; for(const k in MATS) M[k]=W.material(k,MATS[k]);

    const SIZE=84;
    const H=2.42;              // clear headroom. This is the whole level.
    const COL=7.2;             // column grid
    const DROP=-3.3;           // the lower deck
    const T=0.4;

    W.spawn(SIZE*0.5,0.05,SIZE-4.5,Math.PI);
    W.setStepMaterial(()=>'concrete');

    /* the ramp is a strip down the -x side of the plan, from z=14 to z=44 */
    const RX0=0, RX1=7, RZ0=14, RZ1=42;   // aligned to the 7 m slab grid
    const onRamp=(x,z,pad=0)=>x>RX0-pad&&x<RX1+pad&&z>RZ0-pad&&z<RZ1+pad;
    const rampY=(z)=>DROP*TX.clamp((z-RZ0)/(RZ1-RZ0),0,1);

    /* ============================================== upper deck */
    for(let z=0;z<SIZE;z+=7) for(let x=0;x<SIZE;x+=7){
      if(x+7>RX0&&x<RX1&&z+7>RZ0&&z<RZ1) continue;    // the ramp void
      W.floor(x,z,x+7,z+7,0,M.deck,{uvScale:1,tess:2.4});
      W.ceiling(x,z,x+7,z+7,H,M.soffit,{uvScale:1,tess:2.4});
      // the slab under each panel — emitted here rather than as one big volume,
      // so the ramp void stays a void and you can actually walk down it
      W.solid(x,-1.2,z,7,1.2,7);
    }
    W.solid(0,H,0,SIZE,0.9,SIZE);

    /* perimeter, with the long horizontal slot every car park has */
    const wallRun=(x0,z0,x1,z1)=>{
      const horiz=Math.abs(x1-x0)>Math.abs(z1-z0);
      const L=horiz?Math.abs(x1-x0):Math.abs(z1-z0);
      const sx=horiz?L:T, sz=horiz?T:L;
      W.box(Math.min(x0,x1),-4.6,Math.min(z0,z1),sx,1.05+4.6,sz,M.wall,{uvScale:1,tess:3});
      W.box(Math.min(x0,x1),1.72,Math.min(z0,z1),sx,H-1.72+0.9,sz,M.wall,{uvScale:1,tess:3});
      // the slot is glazed with nothing; behind it, black
      W.box(Math.min(x0,x1)+(horiz?0:0.12),1.05,Math.min(z0,z1)+(horiz?0.12:0),
            horiz?sx:0.16,0.67,horiz?0.16:sz,M.voidM,{solid:false,tess:3});
      W.solid(Math.min(x0,x1),1.05,Math.min(z0,z1),sx,0.67,sz);
    };
    wallRun(-T,-T,-T,SIZE+T); wallRun(SIZE,-T,SIZE,SIZE+T);
    wallRun(-T,-T,SIZE+T,-T); wallRun(-T,SIZE,SIZE+T,SIZE);

    /* ============================================== columns and bays */
    const cols=[];
    for(let x=COL*0.5;x<SIZE;x+=COL) for(let z=COL*0.5;z<SIZE;z+=COL){
      if(onRamp(x,z)) continue;
      cols.push([x,z]);
      W.box(x-0.36,0,z-0.36,0.72,H,0.72,M.wall,{uvScale:1,tess:1.4});
      // the flared head every flat-slab car park has
      W.box(x-0.62,H-0.34,z-0.62,1.24,0.34,1.24,M.soffit,{uvScale:1.4,solid:false,tess:1.4});
      // and the yellow band at bumper height, worn through
      W.box(x-0.39,0.40,z-0.39,0.78,0.30,0.78,M.hazard,{uvScale:1.6,solid:false,tess:1.4});
      // the letter-and-number nobody reads
      if(rng()<0.5) W.box(x-0.30,1.45,z-0.40,0.60,0.42,0.02,M.bay,{uvScale:1.2,solid:false});
    }

    /* bay markings: two rows against each run of columns, aisle down the middle */
    const stripe=(x,z,dir,mat)=>{
      if(dir==='z') W.floor(x-0.06,z,x+0.06,z+4.8,0.004,mat,{uvScale:1,solid:false,tess:2});
      else          W.floor(x,z-0.06,x+4.8,z+0.06,0.004,mat,{uvScale:1,solid:false,tess:2});
    };
    for(let z=COL*0.5;z<SIZE-4;z+=COL){
      for(let x=2;x<SIZE-5;x+=2.5){
        if(onRamp(x,z,3)) continue;
        const disabled=(((x/2.5)|0)+((z/COL)|0))%17===0;
        stripe(x,z-2.4,'z',disabled?M.bayRed:M.bay);
        if(disabled){
          W.floor(x+0.1,z-2.3,x+2.4,z+2.3,0.003,M.bayRed,{uvScale:1,solid:false,tess:2.5});
        }
      }
    }
    // the aisle centre line, dashed
    for(let z=1;z<SIZE;z+=2.4)
      W.floor(SIZE*0.5-0.07,z,SIZE*0.5+0.07,z+1.2,0.004,M.bay,{uvScale:1,solid:false,tess:2});

    /* ============================================== services under the soffit */
    for(let z=COL*0.5;z<SIZE;z+=COL*2){
      W.box(1,H-0.30,z-0.09,SIZE-2,0.18,0.18,M.pipe,{uvScale:1,solid:false,tess:4});
      W.box(1,H-0.46,z+0.22,SIZE-2,0.30,0.44,M.duct,{uvScale:1,solid:false,tess:4});
      for(let x=4;x<SIZE;x+=6)
        W.box(x-0.03,H-0.30,z-0.03,0.06,0.30,0.06,M.duct,{uvScale:3,solid:false,tess:2});
    }

    /* ============================================== lighting */
    /* One twin fitting per column bay, and a fifth of them are gone. Sodium
       falls off fast, so the deck reads as a field of separate pools. */
    for(const [x,z] of cols){
      const alive=TX.ihash((x/COL)|0,(z/COL)|0,11)>0.2;
      const mat=alive?M.sodium:M.dead;
      W.box(x-1.05,H-0.16,z-0.13,2.10,0.10,0.26,mat,{uvScale:1,solid:false,tess:3});
      W.box(x-1.12,H-0.20,z-0.18,2.24,0.06,0.36,M.duct,{uvScale:1.4,solid:false,tess:3});
      if(!alive) continue;
      W.light({x,y:H-0.32,z,r:1.0,g:0.70,b:0.31,radius:12.5,intensity:1.25,
               flicker:TX.ihash((x/COL)|0,(z/COL)|0,29)<0.12?0.42:0.03,shadow:true});
    }

    /* ============================================== the ramp down */
    const RSTEP=1.5;
    for(let z=RZ0;z<RZ1;z+=RSTEP){
      const y0=rampY(z), y1=rampY(z+RSTEP);
      W.quad([RX0,y0,z+RSTEP],[RX1,y0,z+RSTEP],[RX1,y1,z],[RX0,y1,z],M.deck,{uvScale:1,tess:2});
      W.solid(RX0,Math.min(y0,y1)-1.1,z,RX1-RX0,1.1,RSTEP);
      // hazard stripes up the kerbs
      W.box(RX0,Math.min(y0,y1),z,0.24,0.26,RSTEP,M.hazard,{uvScale:1.6,tess:2});
      W.box(RX1-0.24,Math.min(y0,y1),z,0.24,0.26,RSTEP,M.hazard,{uvScale:1.6,tess:2});
      // the ramp keeps its own ceiling all the way down
      W.ceiling(RX0-0.4,z,RX1+0.4,z+RSTEP,Math.max(y0,y1)+H,M.soffit,{uvScale:1,tess:2});
      W.solid(RX0-0.4,Math.max(y0,y1)+H,z,RX1-RX0+0.8,0.6,RSTEP);
      // and its own walls
      W.box(RX0-0.4,Math.min(y0,y1)-0.6,z,0.4,H+1.2,RSTEP,M.wall,{uvScale:1,tess:2});
      W.box(RX1,Math.min(y0,y1)-0.6,z,0.4,H+1.2,RSTEP,M.wall,{uvScale:1,tess:2});
      if(((z-RZ0)/RSTEP)%4===0){
        W.box(RX0+2.7,Math.max(y0,y1)+H-0.16,z+0.4,1.6,0.10,0.24,M.sodium,{uvScale:1,solid:false,tess:2});
        W.light({x:RX0+3.5,y:Math.max(y0,y1)+H-0.34,z:z+0.5,r:1.0,g:0.70,b:0.31,
                 radius:11,intensity:1.15,shadow:true});
      }
    }
    // the sign over the head of the ramp, and the arrow you have to trust
    W.box(RX0-0.2,H-1.05,RZ0-0.55,RX1-RX0+0.4,0.62,0.06,M.sign,{uvScale:0.5,solid:false});
    W.light({x:(RX0+RX1)/2,y:H-1.3,z:RZ0-1.2,r:0.6,g:1.0,b:0.75,radius:5,intensity:0.55,shadow:false});

    /* ============================================== the lower deck landing */
    const LZ0=RZ1, LZ1=RZ1+16, LX0=0, LX1=22;
    for(let z=LZ0;z<LZ1;z+=5.5) for(let x=LX0;x<LX1;x+=5.2){
      W.floor(x,z,Math.min(x+5.2,LX1),Math.min(z+5.5,LZ1),DROP,M.deck,{uvScale:1,tess:2.4});
      W.ceiling(x,z,Math.min(x+5.2,LX1),Math.min(z+5.5,LZ1),DROP+H,M.soffit,{uvScale:1,tess:2.4});
    }
    W.solid(LX0,DROP-1.2,LZ0,LX1-LX0,1.2,LZ1-LZ0);
    W.solid(LX0,DROP+H,LZ0,LX1-LX0,0.8,LZ1-LZ0);
    W.box(LX0-0.4,DROP-0.6,LZ0,0.4,H+1.2,LZ1-LZ0,M.wall,{uvScale:1,tess:3});
    W.box(LX1,DROP-0.6,LZ0,0.4,H+1.2,LZ1-LZ0,M.wall,{uvScale:1,tess:3});
    W.box(LX0-0.4,DROP-0.6,LZ1,LX1-LX0+0.8,H+1.2,0.4,M.wall,{uvScale:1,tess:3});
    W.box(RX1+0.4,DROP-0.6,LZ0,LX1-RX1-0.4,H+1.2,0.4,M.wall,{uvScale:1,tess:3});
    for(let x=LX0+3;x<LX1;x+=7) for(let z=LZ0+3;z<LZ1;z+=7){
      W.box(x-0.36,DROP,z-0.36,0.72,H,0.72,M.wall,{uvScale:1,tess:1.4});
      W.box(x-0.62,DROP+H-0.34,z-0.62,1.24,0.34,1.24,M.soffit,{uvScale:1.4,solid:false,tess:1.4});
      W.box(x-0.39,DROP+0.40,z-0.39,0.78,0.30,0.78,M.hazard,{uvScale:1.6,solid:false,tess:1.4});
      const alive=TX.ihash((x/7)|0,(z/7)|0,13)>0.35;
      W.box(x-1.05,DROP+H-0.16,z-0.13,2.10,0.10,0.26,alive?M.sodium:M.dead,
            {uvScale:1,solid:false,tess:3});
      if(alive) W.light({x,y:DROP+H-0.32,z,r:1.0,g:0.70,b:0.31,radius:12,intensity:1.1,
                         flicker:0.05,shadow:true});
    }
    // a drainage channel, running with something
    for(let z=LZ0;z<LZ1;z+=4)
      W.floor(LX1-3.2,z,LX1-2.9,z+4,DROP-0.03,M.voidM,{uvScale:1,solid:false,tess:4});

    /* ============================================== the lift lobby, and out */
    const gx=LX1-1.0, gz=LZ0+6.0;
    W.box(gx-0.22,DROP,gz-2.4,0.22,2.30,4.8,M.wall,{uvScale:1,tess:2});
    W.box(gx-0.30,DROP,gz-1.05,0.14,2.15,2.10,M.liftDoor,{uvScale:0.7,solid:false,tess:2});
    W.box(gx-0.34,DROP,gz-1.25,0.16,2.42,0.22,M.duct,{uvScale:1.4,solid:false,tess:2});
    W.box(gx-0.34,DROP,gz+1.05,0.16,2.42,0.22,M.duct,{uvScale:1.4,solid:false,tess:2});
    W.box(gx-0.34,DROP+2.15,gz-1.25,0.16,0.27,2.50,M.duct,{uvScale:1.4,solid:false,tess:2});
    W.box(gx-0.36,DROP+1.9,gz-0.45,0.06,0.22,0.90,M.exitSign,{uvScale:1,solid:false});
    W.light({x:gx-1.4,y:DROP+2.0,z:gz,r:0.45,g:1.0,b:0.60,radius:6,intensity:1.0,shadow:false});
    W.light({x:gx-2.2,y:DROP+1.9,z:gz,r:1.0,g:0.94,b:0.86,radius:8,intensity:0.75});
    W.goal({x:gx-1.1,y:DROP+1,z:gz,r:1.35,
      title:'The lift was already open',
      text:'Level P3, said the panel, and then Level P4, and then nothing. The doors closed on '+
           'a room with a floor you could stand on and a ceiling you could touch, and for a '+
           'moment that was the best either of them had ever been.'});

    /* ============================================== atmosphere */
    W.environment({
      fogColor:[0.075,0.055,0.033],
      fogDensity:0.030,
      ambient:[0.038,0.033,0.028],
      exposure:1.0,
      lift:[0.006,0.004,0.003],
      gain:[1.08,0.98,0.86],
      sat:0.90,
      bloomThresh:0.70,
      aoStrength:1.15
    });
    W.ambience({
      hum:0.34, humFreq:50, drone:0.30, droneFreq:44,
      water:0.10, tone:0.085, toneCut:260, toneLow:32,
      reverb:0.58, drips:true, eventGap:9
    });
  }
});
})();

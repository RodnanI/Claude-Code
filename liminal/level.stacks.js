/* =====================================================================
   LIMINAL — level.stacks.js
   Level 76 · "The Stacks"

   A high-bay warehouse with the lights on a timer that expired. Aisles
   three metres wide between racking thirty metres tall, and the racking
   is full, and none of it is for you.

   The horror here is entirely proportional: a 3 m gap between two 30 m
   walls, repeated until the fog closes it.
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
  /* power-floated slab, saw-cut into bays, tyre-polished down the middle */
  slab:{tile:0.16,bump:0.28,specular:0.34,shininess:70,draw(c,S,rng,TX){
    base(c,S,11,[124,124,122],0.13,S/11,4,0.25);
    // saw cuts on a 6 m grid — the texture is ≈6 m across
    c.strokeStyle='rgba(84,84,82,0.85)';
    TX.grid(c,S,'rgba(84,84,82,0.85)',Math.max(1.6,S/200),0);
    // burnish, dust, and the rubber scuffs of things that used to move
    c.globalAlpha=0.055;
    for(let i=0;i<40;i++){
      const y=rng()*S;
      c.strokeStyle=rng()>0.45?'#ffffff':'#26262a';
      c.lineWidth=1+rng()*4;
      c.beginPath();
      for(let x=0;x<=S;x+=S/12) c.lineTo(x,y+TX.fbm(x/50,i,S/50,7,2)*S*0.02);
      c.stroke();
    }
    c.globalAlpha=1;
    TX.stains(c,rng,5,TX.rgba(150,148,142),0.22,0.10,0.30);
    TX.stains(c,rng,4,TX.rgba(56,56,58),0.28,0.03,0.12);
    TX.grain(c,0.04,1.2,13);
  }},
  paint:{tile:0.7,bump:0.2,specular:0.3,shininess:60,draw(c,S,rng,TX){
    base(c,S,17,[192,164,58],0.14,S/8,3,0.2);
    c.globalCompositeOperation='destination-out';
    TX.stains(c,rng,10,'rgba(0,0,0,ALPHA)',0.7,0.03,0.13);
    c.globalCompositeOperation='destination-over';
    TXX.fill(c,'#77776f');
    c.globalCompositeOperation='source-over';
    TX.grain(c,0.05,1,19);
  }},
  /* orange racking steel, chipped and rusting at every impact point */
  rack:{tile:0.55,bump:0.35,specular:0.4,shininess:90,draw(c,S,rng,TX){
    base(c,S,23,[168,86,32],0.16,S/7,3,0.2);
    // perforation down the upright
    c.fillStyle='rgba(40,22,12,0.75)';
    for(let i=0;i<12;i++) c.fillRect(S*0.44,S*(0.03+i*0.083),S*0.12,S*0.028);
    TX.streaks(c,rng,10,TX.rgba(96,52,22),3,0.24);
    TX.stains(c,rng,5,TX.rgba(74,50,30),0.4,0.03,0.12);
    TX.grain(c,0.04,1,29);
  }},
  beam:{tile:0.55,bump:0.3,specular:0.45,shininess:100,draw(c,S,rng,TX){
    base(c,S,31,[42,74,150],0.14,S/7,3,0.15);
    c.fillStyle='rgba(255,255,255,0.10)';c.fillRect(0,0,S,S*0.10);
    c.fillStyle='rgba(0,0,0,0.20)';c.fillRect(0,S*0.90,S,S*0.10);
    TX.stains(c,rng,4,TX.rgba(110,64,34),0.4,0.02,0.10);
    TX.grain(c,0.04,1,37);
  }},
  deck:{tile:0.5,bump:0.35,specular:0.25,shininess:60,draw(c,S,rng,TX){
    base(c,S,41,[96,98,100],0.14,S/8,3,0);
    c.globalAlpha=0.14;
    for(let x=0;x<S;x+=6){c.fillStyle='#000';c.fillRect(x,0,2,S);}
    c.globalAlpha=1;
    TX.grain(c,0.05,1,43);
  }},
  /* shrink-wrapped pallets: cardboard under milky plastic */
  wrap:{tile:0.45,bump:0.5,specular:0.28,shininess:50,draw(c,S,rng,TX){
    base(c,S,47,[158,138,108],0.20,S/9,4,0.3);
    // box edges under the film
    c.strokeStyle='rgba(96,78,54,0.55)';c.lineWidth=Math.max(1,S/220);
    for(let i=0;i<5;i++){
      const y=S*(0.1+i*0.2);
      c.beginPath();c.moveTo(0,y);c.lineTo(S,y);c.stroke();
      const x=S*((TX.ihash(i,2,3)*0.6)+0.2);
      c.beginPath();c.moveTo(x,y);c.lineTo(x,y+S*0.2);c.stroke();
    }
    // the film itself: vertical sheen and creases
    c.globalAlpha=0.20;
    for(let i=0;i<24;i++){
      const x=rng()*S;
      const g=c.createLinearGradient(x,0,x+S*0.04,0);
      g.addColorStop(0,'rgba(255,255,255,0)');
      g.addColorStop(0.5,'rgba(236,240,244,0.8)');
      g.addColorStop(1,'rgba(255,255,255,0)');
      c.fillStyle=g;c.fillRect(x,0,S*0.04,S);
    }
    c.globalAlpha=1;
    TX.stains(c,rng,4,TX.rgba(122,106,80),0.25,0.05,0.18);
    TX.grain(c,0.035,1.2,53);
  }},
  drum:{tile:0.6,bump:0.4,specular:0.4,shininess:90,draw(c,S,rng,TX){
    base(c,S,59,[62,78,74],0.16,S/7,3,0.2);
    c.fillStyle='rgba(20,26,24,0.45)';
    for(let i=0;i<3;i++) c.fillRect(0,S*(0.18+i*0.30),S,S*0.045);
    TX.streaks(c,rng,10,TX.rgba(112,66,34),3,0.26);
    TX.grain(c,0.04,1,61);
  }},
  /* the deck plate and the dark above it */
  roof:{tile:0.28,bump:0.25,specular:0.06,shininess:20,draw(c,S,rng,TX){
    base(c,S,67,[54,55,58],0.16,S/9,3,0);
    c.globalAlpha=0.20;
    for(let x=0;x<S;x+=S/8){c.fillStyle='#000';c.fillRect(x,0,Math.max(2,S/90),S);
                            c.fillStyle='rgba(150,152,156,0.5)';c.fillRect(x+3,0,1,S);}
    c.globalAlpha=1;
    TX.stains(c,rng,4,TX.rgba(40,42,44),0.4,0.10,0.30);
  }},
  wallPanel:{tile:0.22,bump:0.3,specular:0.12,shininess:30,draw(c,S,rng,TX){
    base(c,S,71,[142,144,142],0.12,S/8,3,0.2);
    c.globalAlpha=0.22;
    for(let y=0;y<S;y+=S/6){
      c.fillStyle='#000';c.fillRect(0,y,S,Math.max(2,S/120));
      c.fillStyle='rgba(220,222,220,0.6)';c.fillRect(0,y+3,S,1);
    }
    c.globalAlpha=1;
    TX.streaks(c,rng,10,TX.rgba(104,106,104),4,0.16);
    TX.grain(c,0.04,1.2,73);
  }},
  bay:{tile:1.0,emissive:[3.2,3.0,2.4],specular:0,draw(c,S,rng,TX){
    const g=c.createRadialGradient(S/2,S/2,0,S/2,S/2,S*0.62);
    g.addColorStop(0,'#ffffff');g.addColorStop(0.5,'#f3ecd8');g.addColorStop(1,'#8e8a76');
    c.fillStyle=g;c.fillRect(0,0,S,S);
  }},
  exitSign:{tile:1.0,emissive:[0.55,2.4,0.85],specular:0,draw(c,S,rng,TX){
    TXX.fill(c,'#0d2415');
    c.fillStyle='#6effa8';
    c.fillRect(S*0.10,S*0.34,S*0.16,S*0.32);
    c.fillRect(S*0.10,S*0.34,S*0.34,S*0.08);
    c.fillRect(S*0.10,S*0.60,S*0.34,S*0.06);
    c.fillRect(S*0.10,S*0.46,S*0.26,S*0.06);
    c.fillRect(S*0.56,S*0.42,S*0.30,S*0.16);
    c.beginPath();c.moveTo(S*0.86,S*0.30);c.lineTo(S*0.96,S*0.50);c.lineTo(S*0.86,S*0.70);
    c.closePath();c.fill();
  }},
  door:{tile:0.5,bump:0.25,specular:0.25,shininess:60,draw(c,S,rng,TX){
    base(c,S,79,[106,112,116],0.12,S/7,3,0);
    c.strokeStyle='rgba(58,64,68,0.8)';c.lineWidth=Math.max(1.5,S/80);
    c.strokeRect(S*0.08,S*0.05,S*0.84,S*0.90);
    c.fillStyle='rgba(180,186,190,0.5)';c.fillRect(S*0.72,S*0.46,S*0.10,S*0.05);
    TX.grain(c,0.04,1,83);
  }},
  voidM:{tile:1,specular:0,draw(c){ TXX.fill(c,'#050506'); }}
};

/* ==================================================================== level */
LIMINAL.registerLevel({
  id:'stacks',
  name:'Level 76',
  subtitle:'The Stacks',
  badge:'vast',
  accent:'#c46a24',
  tags:['megastructure','racking','high bay','sodium','inventory'],
  size:'76 × 76 × 32 m',
  lighting:'high bay · every fourth fitting',
  defaultSeed:76,
  description:'Aisle after aisle of pallet racking thirty metres tall, loaded to the top with '+
              'stock that has no labels. The high-bay lights come on a bay ahead of you and go '+
              'off a bay behind, which means something in here knows where you are.',

  preview(g,w,h){
    g.fillStyle='#0b0b0c';g.fillRect(0,0,w,h);
    const cx=w*0.5, cy=h*0.56;
    // one aisle in one-point perspective
    for(let i=10;i>=0;i--){
      const t=i/10, k=Math.pow(1-t,1.5)*0.94+0.06;
      const x0=cx-w*0.46*k, x1=cx+w*0.46*k;
      const top=cy-h*0.62*k, bot=cy+h*0.44*k;
      const lum=18+ (1-t)*36;
      g.fillStyle=`rgb(${lum+52},${lum+26},${lum+10})`;
      g.fillRect(x0,top,w*0.13*k,bot-top);
      g.fillRect(x1-w*0.13*k,top,w*0.13*k,bot-top);
      // beam levels
      g.fillStyle=`rgba(${40+lum},${64+lum},${120+lum},0.9)`;
      for(let b=0;b<7;b++){
        const y=top+(bot-top)*(0.06+b*0.135);
        g.fillRect(x0,y,w*0.13*k,Math.max(1,2.6*k));
        g.fillRect(x1-w*0.13*k,y,w*0.13*k,Math.max(1,2.6*k));
      }
      // floor
      g.fillStyle=`rgb(${28+(1-t)*44},${28+(1-t)*44},${29+(1-t)*44})`;
      g.fillRect(x0,bot,x1-x0,h);
      // a lamp in this bay
      if(i%2===0){
        const ly=top+ (bot-top)*0.02;
        const grd=g.createRadialGradient(cx,ly,0,cx,ly,w*0.28*k);
        grd.addColorStop(0,`rgba(255,236,190,${0.55*(1-t)+0.12})`);
        grd.addColorStop(1,'rgba(255,236,190,0)');
        g.fillStyle=grd;g.fillRect(x0,top,x1-x0,bot-top);
      }
    }
    g.fillStyle='rgba(230,178,60,0.55)';
    g.fillRect(cx-w*0.30,h*0.86,w*0.60,3);
    const v=g.createRadialGradient(cx,cy,0,cx,cy,w*0.62);
    v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,0.72)');
    g.fillStyle=v;g.fillRect(0,0,w,h);
  },

  /* ------------------------------------------------------------------ build */
  build(W,ctx){
    const TX=ctx.TX, rng=W.rng;
    const M={}; for(const k in MATS) M[k]=W.material(k,MATS[k]);

    const SIZE=76;            // square building
    const RH=30;              // racking height
    const ROOF=32.5;
    const AISLE=3.2;          // the gap you walk down
    const RACK=1.15;          // depth of one run of racking
    const PITCH=AISLE+RACK*2; // aisle + a run each side
    const BAY=4.2;            // bay length along the aisle
    const LEVELS=6;           // beam levels per upright
    const LH=RH/LEVELS;

    /* aisles run along +z; runs of racking sit back-to-back between them */
    const runsX=[];
    for(let x=5;x<SIZE-6;x+=PITCH) runsX.push(x);

    W.spawn(runsX[1]+RACK+AISLE*0.5,0.05,4.5,0);
    W.setStepMaterial(()=>'concrete');

    /* ============================================== slab, envelope, roof */
    for(let z=0;z<SIZE;z+=12) for(let x=0;x<SIZE;x+=12)
      W.floor(x,z,x+12,z+12,0,M.slab,{uvScale:1,tess:3});
    W.solid(0,-1.2,0,SIZE,1.2,SIZE);

    W.box(-0.5,0,-0.5,0.5,ROOF,SIZE+1,M.wallPanel,{uvScale:1,tess:4});
    W.box(SIZE,0,-0.5,0.5,ROOF,SIZE+1,M.wallPanel,{uvScale:1,tess:4});
    W.box(-0.5,0,-0.5,SIZE+1,ROOF,0.5,M.wallPanel,{uvScale:1,tess:4});
    W.box(-0.5,0,SIZE,SIZE+1,ROOF,0.5,M.wallPanel,{uvScale:1,tess:4});
    for(let z=0;z<SIZE;z+=16) for(let x=0;x<SIZE;x+=16)
      W.ceiling(x,z,x+16,z+16,ROOF,M.roof,{uvScale:1,tess:4});
    W.solid(0,ROOF,0,SIZE,0.6,SIZE);
    /* roof structure: lattice trusses on a 12 m grid, hanging into the dark */
    for(let x=6;x<SIZE;x+=12){
      W.box(x-0.30,ROOF-1.9,0,0.60,0.25,SIZE,M.deck,{uvScale:1,solid:false,tess:6});
      W.box(x-0.30,ROOF-0.45,0,0.60,0.25,SIZE,M.deck,{uvScale:1,solid:false,tess:6});
      for(let z=0;z<SIZE;z+=3.2)
        W.box(x-0.14,ROOF-1.9,z,0.28,1.5,0.16,M.deck,{uvScale:2,solid:false,tess:4});
    }

    /* ============================================== racking */
    const uprightAt=[];       // remember where the aisles are, for the lights
    for(let r=0;r<runsX.length;r++){
      const x0=runsX[r];
      // two back-to-back runs make one block; the aisle is to the +x side
      for(const side of [0,1]){
        const bx=x0+side*RACK;
        for(let z=1;z<SIZE-3.5;z+=BAY){
          const zl=Math.min(BAY,SIZE-3.5-z);
          if(zl<1) break;
          // uprights, front and back
          for(const dz of [0,zl]){
            W.box(bx+0.04,0,z+dz-0.05,0.10,RH,0.10,M.rack,{uvScale:2,tess:40});
            W.box(bx+RACK-0.14,0,z+dz-0.05,0.10,RH,0.10,M.rack,{uvScale:2,tess:40});
            // the bracing between them
            for(let k=0;k<LEVELS;k++){
              const y=(k+0.5)*(RH/LEVELS);
              W.box(bx+0.10,y,z+dz-0.035,RACK-0.24,0.055,0.07,M.rack,{uvScale:3,solid:false,tess:4});
            }
          }
          // beam levels and the pallets sitting on them
          for(let l=1;l<=LEVELS;l++){
            const y=l*LH;
            W.box(bx+0.02,y,z-0.06,0.12,0.16,zl+0.12,M.beam,{uvScale:2,solid:false,tess:9});
            W.box(bx+RACK-0.16,y,z-0.06,0.12,0.16,zl+0.12,M.beam,{uvScale:2,solid:false,tess:9});
            // timber decking
            W.floor(bx+0.06,z,bx+RACK-0.06,z+zl,y+0.17,M.deck,{uvScale:1,solid:false,tess:9});
            const roll=TX.ihash(r*13+side,l*7+((z/BAY)|0),5);
            if(roll<0.06) continue;                  // an empty position
            const kind=roll<0.72?'wrap':(roll<0.88?'drum':'wrap');
            const hgt=Math.min(LH-0.30,1.5+roll*1.6);
            if(kind==='wrap'){
              const inset=0.03+roll*0.06;
              W.box(bx+inset,y+0.19,z+0.06,RACK-inset*2,hgt,zl-0.12,M.wrap,{uvScale:1,solid:false,tess:9});
              // the pallet under it
              W.box(bx+0.05,y+0.17,z+0.06,RACK-0.10,0.12,zl-0.16,M.deck,{uvScale:2,solid:false,tess:9});
            } else {
              for(let d=0;d<2;d++){
                const dx=bx+RACK*(d?0.68:0.32);
                W.box(dx-0.30,y+0.19,z+zl*0.5-0.30,0.60,0.88,0.60,M.drum,{uvScale:1.4,solid:false,tess:4});
              }
            }
          }
          // the whole block is one collision volume — cheaper, and you cannot
          // walk into a rack leg you did not see
          if(side===0) W.solid(bx,0,z-0.06,RACK*2,RH,zl+0.12);
        }
      }
      uprightAt.push(x0+RACK*2+AISLE*0.5);
    }

    /* ============================================== floor markings */
    for(const ax of uprightAt){
      for(let z=1;z<SIZE-3;z+=1.6){
        W.floor(ax-1.35,z,ax-1.25,z+0.9,0.004,M.paint,{uvScale:1,solid:false,tess:4});
        W.floor(ax+1.25,z,ax+1.35,z+0.9,0.004,M.paint,{uvScale:1,solid:false,tess:4});
      }
    }
    // the cross aisle at the near end
    W.floor(1,SIZE-3.4,SIZE-1,SIZE-3.28,0.004,M.paint,{uvScale:1,solid:false,tess:6});
    W.floor(1,1.2,SIZE-1,1.32,0.004,M.paint,{uvScale:1,solid:false,tess:6});

    /* ============================================== lighting */
    /* One high bay per aisle every 18 m, and only three quarters of them are
       alive. The rest are fittings that exist so you can see they are off. */
    for(let a=0;a<uprightAt.length;a++){
      const ax=uprightAt[a];
      for(let z=7;z<SIZE;z+=18){
        const on = TX.ihash(a,(z/18)|0,3)>0.24;
        W.box(ax-0.45,ROOF-2.6,z-0.45,0.9,0.55,0.9,M.deck,{uvScale:1.4,solid:false});
        W.box(ax-0.05,ROOF-3.2,z-0.05,0.10,0.62,0.10,M.deck,{uvScale:3,solid:false});
        if(!on) continue;
        W.floor(ax-0.38,z-0.38,ax+0.38,z+0.38,ROOF-2.63,M.bay,{uvScale:1,solid:false});
        const flick=rng()<0.18?0.30:0.03;
        W.light({x:ax,y:ROOF-3.1,z,r:1.0,g:0.94,b:0.78,
                 radius:42,intensity:2.6,flicker:flick,shadow:true});
        // A fitting thirty metres up puts almost nothing on the floor once it
        // has attenuated, so the same source is carried down the aisle as two
        // more lights. Without them the walking surface is a black slot.
        W.light({x:ax,y:11,z,r:1.0,g:0.93,b:0.76,radius:22,intensity:1.05,
                 flicker:flick,shadow:false});
        W.light({x:ax,y:2.6,z,r:0.96,g:0.90,b:0.74,radius:13,intensity:0.55,
                 flicker:flick,shadow:false});
      }
    }
    // cross-aisle strip lights at both ends
    for(let x=6;x<SIZE;x+=12){
      for(const z of [2.2,SIZE-2.4]){
        W.box(x-0.8,ROOF-4.2,z-0.14,1.6,0.16,0.28,M.bay,{uvScale:1,solid:false});
        W.light({x,y:ROOF-4.6,z,r:1.0,g:0.97,b:0.90,radius:20,intensity:0.75,shadow:true});
      }
    }

    /* ============================================== the odd human thing */
    // a pallet truck, abandoned mid-aisle
    {
      const ax=uprightAt[Math.min(2,uprightAt.length-1)], z=SIZE*0.42;
      W.box(ax-0.42,0,z-0.75,0.84,0.14,1.5,M.beam,{uvScale:1.6});
      W.box(ax-0.06,0.14,z+0.62,0.12,1.05,0.12,M.rack,{uvScale:3,solid:false});
      W.box(ax-0.20,1.10,z+0.50,0.40,0.09,0.28,M.rack,{uvScale:2,solid:false});
    }
    // a stack of empty pallets, chest high
    for(let i=0;i<9;i++){
      const ax=uprightAt[Math.min(1,uprightAt.length-1)];
      W.box(ax-0.6,i*0.145,SIZE*0.68,1.2,0.13,0.8,M.deck,{uvScale:2,solid:i===0});
    }
    // and a mesh cage of returns nobody processed
    {
      const ax=uprightAt[uprightAt.length-1], z=SIZE*0.24;
      W.box(ax-0.55,0,z-0.4,1.1,1.05,0.8,M.wrap,{uvScale:1.2});
      W.box(ax-0.58,0,z-0.43,1.16,0.10,0.86,M.rack,{uvScale:2,solid:false});
    }

    /* ============================================== the way out */
    const gx=uprightAt[0], gz=SIZE-1.0;
    W.box(gx-0.95,0,gz-0.10,1.9,2.15,0.22,M.door,{uvScale:0.6,solid:false});
    W.box(gx-1.12,0,gz-0.16,0.18,2.40,0.34,M.rack,{uvScale:1.4,solid:false});
    W.box(gx+0.94,0,gz-0.16,0.18,2.40,0.34,M.rack,{uvScale:1.4,solid:false});
    W.box(gx-1.12,2.15,gz-0.16,2.24,0.25,0.34,M.rack,{uvScale:1.4,solid:false});
    W.box(gx-0.42,2.55,gz-0.22,0.84,0.34,0.10,M.exitSign,{uvScale:1,solid:false});
    W.light({x:gx,y:2.6,z:gz-0.9,r:0.42,g:1.0,b:0.58,radius:7,intensity:1.1,shadow:false});
    W.light({x:gx,y:2.0,z:gz-2.4,r:1.0,g:0.95,b:0.85,radius:9,intensity:0.7});
    W.goal({x:gx,y:1,z:gz-0.7,r:1.35,
      title:'Personnel door',
      text:'A normal door, in a normal frame, at a normal height, and after twenty minutes of '+
           'thirty-metre walls it was the strangest thing in the building. The bar gave under '+
           'your hip on the first push. Behind it the lights were already off.'});

    /* ============================================== atmosphere */
    W.environment({
      fogColor:[0.055,0.053,0.050],
      fogDensity:0.022,
      ambient:[0.040,0.038,0.036],
      exposure:1.02,
      lift:[0.004,0.004,0.004],
      gain:[1.04,1.00,0.94],
      sat:0.94,
      bloomThresh:0.72,
      aoStrength:1.15
    });
    W.ambience({
      hum:0.30, humFreq:50, drone:0.24, droneFreq:38,
      water:0.05, tone:0.06, toneCut:300, toneLow:38,
      reverb:0.70, drips:true, eventGap:10
    });
  }
});
})();

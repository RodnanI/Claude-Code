/* =====================================================================
   LIMINAL — level.concourse.js
   Level 21 · "The Concourse"

   A shopping centre after the shopping. Terrazzo, dead ficus, a fountain
   with the pumps off, and eighty metres of shutter. The barrel vault
   overhead still lets in whatever counts as daylight here, and the
   escalators still run, up, both of them.

   Muzak is playing. You cannot find the speaker.
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
  /* 400 mm polished tiles laid on the diagonal, because it was the eighties */
  floorTile:{tile:0.55,bump:0.25,specular:0.55,shininess:150,draw(c,S,rng,TX){
    base(c,S,11,[196,186,170],0.09,S/10,3,0.2);
    const n=4, cell=S/n;
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const k=1+(TX.ihash(i,j,3)-0.5)*0.09;
      const warm=TX.ihash(i,j,5)<0.22;
      const rgb=warm?[186,166,140]:[198,192,178];
      c.fillStyle=`rgb(${(rgb[0]*k)|0},${(rgb[1]*k)|0},${(rgb[2]*k)|0})`;
      c.fillRect(i*cell+1,j*cell+1,cell-2,cell-2);
      const g=c.createLinearGradient(i*cell,j*cell,i*cell+cell,j*cell+cell);
      g.addColorStop(0,'rgba(255,255,255,0.14)');
      g.addColorStop(0.5,'rgba(255,255,255,0)');
      g.addColorStop(1,'rgba(0,0,0,0.06)');
      c.fillStyle=g;c.fillRect(i*cell+1,j*cell+1,cell-2,cell-2);
    }
    TX.grid(c,cell,'rgba(150,142,128,0.8)',Math.max(1,S/240),0);
    // the wear pattern down the middle of a walked route
    TX.stains(c,rng,4,TX.rgba(168,160,146),0.22,0.12,0.34);
    TX.grain(c,0.022,1,13);
  }},
  floorInlay:{tile:0.55,bump:0.25,specular:0.55,shininess:150,draw(c,S,rng,TX){
    base(c,S,17,[122,104,86],0.10,S/9,3,0.2);
    TX.grid(c,S/4,'rgba(88,74,60,0.8)',Math.max(1,S/240),0);
    TX.grain(c,0.025,1,19);
  }},
  /* the shutter: corrugated, half of them down and all of them the same */
  shutter:{tile:0.5,bump:0.55,specular:0.35,shininess:80,draw(c,S,rng,TX){
    base(c,S,23,[140,142,144],0.09,S/7,3,0);
    // the corrugation, as light and shade rather than geometry
    for(let y=0;y<S;y+=S/22){
      const g=c.createLinearGradient(0,y,0,y+S/22);
      g.addColorStop(0,'rgba(255,255,255,0.22)');
      g.addColorStop(0.4,'rgba(0,0,0,0.02)');
      g.addColorStop(1,'rgba(0,0,0,0.26)');
      c.fillStyle=g;c.fillRect(0,y,S,S/22+1);
    }
    TX.streaks(c,rng,10,TX.rgba(96,98,100),4,0.14);
    TX.stains(c,rng,4,TX.rgba(110,104,92),0.24,0.05,0.18);
    TX.grain(c,0.03,1,29);
  }},
  /* a unit with the shutter up and nothing behind it */
  shopVoid:{tile:0.6,bump:0.1,specular:0.05,shininess:12,emissive:[0.035,0.033,0.030],
    draw(c,S,rng,TX){
      base(c,S,31,[34,33,32],0.35,S/6,4,0.3);
      TX.stains(c,rng,3,TX.rgba(58,54,48),0.3,0.10,0.30);
    }},
  fascia:{tile:0.45,bump:0.2,specular:0.15,shininess:40,draw(c,S,rng,TX){
    base(c,S,37,[204,198,186],0.10,S/8,3,0.2);
    // where a sign used to be bolted on
    c.fillStyle='rgba(160,152,138,0.55)';
    c.fillRect(S*0.18,S*0.24,S*0.64,S*0.44);
    c.fillStyle='rgba(120,112,100,0.5)';
    for(let i=0;i<6;i++) c.fillRect(S*(0.22+i*0.12),S*0.30,S*0.02,S*0.02);
    TX.streaks(c,rng,8,TX.rgba(158,150,136),4,0.12);
    TX.grain(c,0.03,1.2,41);
  }},
  plaster:{tile:0.4,bump:0.3,specular:0.06,shininess:18,draw(c,S,rng,TX){
    base(c,S,43,[210,204,190],0.11,S/7,4,0.3);
    TX.streaks(c,rng,12,TX.rgba(170,162,146),5,0.10);
    TX.stains(c,rng,3,TX.rgba(178,168,146),0.20,0.08,0.24);
    TX.grain(c,0.03,1.2,47);
  }},
  /* the vault: painted steel ribs and a lot of dirty polycarbonate */
  glazing:{tile:0.35,emissive:[1.30,1.33,1.36],specular:0,blend:false,draw(c,S,rng,TX){
    base(c,S,53,[224,228,232],0.14,S/6,3,0.3);
    // the twin-wall structure of the sheet, and forty years of grime in it
    c.globalAlpha=0.28;
    for(let x=0;x<S;x+=S/10){c.fillStyle='#9aa4ac';c.fillRect(x,0,Math.max(1.5,S/150),S);}
    c.globalAlpha=1;
    TX.stains(c,rng,6,TX.rgba(150,152,146),0.30,0.10,0.32);
    TX.streaks(c,rng,10,TX.rgba(140,144,140),5,0.16);
  }},
  rib:{tile:0.6,bump:0.25,specular:0.4,shininess:100,draw(c,S,rng,TX){
    base(c,S,59,[122,126,128],0.13,S/6,3,0);
    TX.stains(c,rng,4,TX.rgba(120,74,42),0.35,0.02,0.10);
    TX.grain(c,0.035,1,61);
  }},
  /* fittings and furniture */
  rail:{tile:0.8,bump:0.15,specular:0.72,shininess:170,draw(c,S,rng,TX){
    base(c,S,67,[172,176,180],0.10,S/5,3,0);
    c.globalAlpha=0.08;
    for(let y=0;y<S;y++){c.fillStyle=rng()>0.5?'#fff':'#000';c.fillRect(0,y,S,1);}
    c.globalAlpha=1;
    TX.grain(c,0.025,1,71);
  }},
  glass:{tile:0.5,blend:true,alpha:0.20,specular:0.9,shininess:230,fresnel:0.7,bump:0,
    draw(c,S,rng,TX){
      base(c,S,73,[188,198,204],0.20,S/5,3,0.2);
      TX.streaks(c,rng,8,TX.rgba(230,238,242),6,0.20);
    }},
  tread:{tile:1.0,bump:0.55,specular:0.45,shininess:110,draw(c,S,rng,TX){
    base(c,S,79,[126,128,128],0.12,S/6,3,0);
    c.fillStyle='rgba(40,42,42,0.55)';
    for(let i=0;i<10;i++) c.fillRect(S*(0.04+i*0.096),0,S*0.035,S);
    c.fillStyle='rgba(200,180,70,0.65)';c.fillRect(0,0,S*0.03,S);
    TX.grain(c,0.04,1,83);
  }},
  planter:{tile:0.6,bump:0.35,specular:0.2,shininess:40,draw(c,S,rng,TX){
    base(c,S,89,[132,116,96],0.16,S/8,4,0.3);
    TX.grid(c,S/3,'rgba(96,84,68,0.5)',Math.max(1,S/260),0);
    TX.stains(c,rng,4,TX.rgba(108,96,78),0.3,0.06,0.20);
    TX.grain(c,0.05,1.2,97);
  }},
  soil:{tile:0.6,bump:0.7,specular:0.03,shininess:8,draw(c,S,rng,TX){
    base(c,S,101,[54,46,38],0.42,S/16,5,0);
    TX.grain(c,0.16,1,103);
  }},
  bark:{tile:0.9,bump:0.6,specular:0.05,shininess:12,draw(c,S,rng,TX){
    base(c,S,107,[92,80,64],0.30,S/14,4,0.6);
    TX.streaks(c,rng,20,TX.rgba(52,44,34),2,0.30);
  }},
  leaf:{tile:0.5,bump:0.3,specular:0.12,shininess:22,draw(c,S,rng,TX){
    base(c,S,109,[86,88,52],0.38,S/12,4,0.5);
    TX.stains(c,rng,7,TX.rgba(96,78,40),0.4,0.05,0.2);
  }},
  water:{tile:0.28,blend:true,alpha:0.42,wave:0.5,specular:1.0,shininess:200,fresnel:0.6,bump:0,
    scroll:[0.0015,0.0015],draw(c,S,rng,TX){
      base(c,S,113,[58,74,72],0.40,S/12,4,0.4);
      TX.grain(c,0.04,2,127);
    }},
  copper:{tile:0.7,bump:0.3,specular:0.5,shininess:110,draw(c,S,rng,TX){
    base(c,S,131,[104,124,108],0.22,S/7,4,0.4);
    TX.streaks(c,rng,12,TX.rgba(78,102,88),3,0.28);
    TX.stains(c,rng,4,TX.rgba(140,110,66),0.3,0.04,0.14);
  }},
  bench:{tile:0.7,bump:0.4,specular:0.15,shininess:30,draw(c,S,rng,TX){
    base(c,S,137,[112,92,66],0.24,S/12,4,0.2);
    c.globalAlpha=0.20;
    for(let y=0;y<S;y+=S/6){c.fillStyle='#000';c.fillRect(0,y,S,Math.max(2,S/140));}
    c.globalAlpha=1;
    TX.grain(c,0.06,1,139);
  }},
  bin:{tile:0.8,bump:0.3,specular:0.45,shininess:100,draw(c,S,rng,TX){
    base(c,S,149,[94,96,98],0.14,S/6,3,0);
    c.fillStyle='rgba(30,32,34,0.5)';c.fillRect(0,0,S,S*0.14);
    TX.grain(c,0.04,1,151);
  }},
  strip:{tile:1.0,emissive:[2.3,2.25,2.10],specular:0,draw(c,S,rng,TX){
    const g=c.createLinearGradient(0,0,0,S);
    g.addColorStop(0,'#f6f2e6');g.addColorStop(0.5,'#ffffff');g.addColorStop(1,'#e6e1d2');
    c.fillStyle=g;c.fillRect(0,0,S,S);
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
  voidM:{tile:1,specular:0,draw(c){ TXX.fill(c,'#060607'); }}
};

/* ==================================================================== level */
LIMINAL.registerLevel({
  id:'concourse',
  name:'Level 21',
  subtitle:'The Concourse',
  badge:'closed',
  accent:'#d8c9a6',
  tags:['mall','terrazzo','shutters','skylight','muzak'],
  size:'26 × 108 m · two levels',
  lighting:'roof glazing · half the strips',
  defaultSeed:21,
  description:'A shopping centre with the shopping removed. Every unit is shuttered except '+
              'the ones that are not, and those are worse. The fountain is dry, the ficus are '+
              'dead, and the escalators both go up.',

  preview(g,w,h){
    const grd=g.createLinearGradient(0,0,0,h);
    grd.addColorStop(0,'#e6e2d4');grd.addColorStop(0.34,'#cfc7b4');grd.addColorStop(1,'#8d8578');
    g.fillStyle=grd;g.fillRect(0,0,w,h);
    // barrel vault as nested arcs
    for(let i=8;i>=0;i--){
      const k=0.12+i/8*0.9;
      const cx=w*0.5, cy=h*0.50, ww=w*1.05*k, hh=h*0.80*k;
      g.fillStyle=`rgba(${232-i*7},${230-i*7},${218-i*7},1)`;
      g.beginPath();
      g.moveTo(cx-ww/2,cy+hh*0.44);
      g.lineTo(cx-ww/2,cy-hh*0.06);
      g.arc(cx,cy-hh*0.06,ww/2,Math.PI,0);
      g.lineTo(cx+ww/2,cy+hh*0.44);
      g.closePath();g.fill();
      // the balcony line each side
      g.fillStyle=`rgba(${150-i*6},${146-i*6},${136-i*6},0.9)`;
      g.fillRect(cx-ww/2,cy+hh*0.10,ww*0.16,4*k+1);
      g.fillRect(cx+ww/2-ww*0.16,cy+hh*0.10,ww*0.16,4*k+1);
      // shutters
      g.fillStyle=`rgba(${118-i*4},${120-i*4},${122-i*4},0.95)`;
      g.fillRect(cx-ww/2,cy+hh*0.16,ww*0.10,hh*0.28);
      g.fillRect(cx+ww/2-ww*0.10,cy+hh*0.16,ww*0.10,hh*0.28);
    }
    // floor
    g.fillStyle='#b9b0a0';g.fillRect(0,h*0.72,w,h*0.28);
    g.strokeStyle='rgba(150,142,128,0.6)';g.lineWidth=1;
    for(let i=1;i<7;i++){const y=h*(0.72+i*0.042);g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
    // the dead tree
    g.strokeStyle='#5a4c3c';g.lineWidth=3;
    g.beginPath();g.moveTo(w*0.30,h*0.86);g.lineTo(w*0.31,h*0.62);g.stroke();
    g.fillStyle='rgba(86,88,54,0.85)';
    g.beginPath();g.ellipse?g.ellipse(w*0.31,h*0.60,w*0.06,h*0.05,0,0,Math.PI*2):g.arc(w*0.31,h*0.60,w*0.05,0,Math.PI*2);
    g.fill();
    const v=g.createRadialGradient(w*0.5,h*0.45,0,w*0.5,h*0.45,w*0.62);
    v.addColorStop(0,'rgba(255,255,255,0.12)');v.addColorStop(1,'rgba(30,28,24,0.55)');
    g.fillStyle=v;g.fillRect(0,0,w,h);
  },

  /* ------------------------------------------------------------------ build */
  build(W,ctx){
    const TX=ctx.TX, rng=W.rng;
    const M={}; for(const k in MATS) M[k]=W.material(k,MATS[k]);

    const LEN=108;            // the mall runs along +z
    const MALL=13;            // clear width of the walking street
    const SHOP=6.5;           // depth of the units each side
    const X0=SHOP, X1=SHOP+MALL;     // the street, in x
    const WID=SHOP*2+MALL;
    const H1=4.6;             // first floor level
    const H2=9.4;             // springing of the vault
    const VR=MALL/2;          // vault radius

    W.spawn((X0+X1)/2,0.05,4,0);
    W.setStepMaterial((x,z,y)=>{
      const f=(x>X0+4&&x<X1-4&&z>50&&z<58);
      return f?'water':'tile';
    });

    /* ============================================== the street */
    for(let z=0;z<LEN;z+=6) for(let x=0;x<WID;x+=6.5){
      W.floor(x,z,Math.min(x+6.5,WID),Math.min(z+6,LEN),0,
              (x>=X0&&x<X1)?M.floorTile:M.floorTile,{uvScale:1,tess:2.2});
      W.solid(x,-1.1,z,6.5,1.1,6);
    }
    // an inlaid band down the centre, the only thing telling you which way is on
    for(let z=0;z<LEN;z+=6)
      W.floor((X0+X1)/2-1.1,z,(X0+X1)/2+1.1,z+6,0.004,M.floorInlay,{uvScale:1,solid:false,tess:2.2});

    /* ============================================== shop fronts, both sides */
    /* Each 4 m bay is a shutter, a shutter that is up, or a glazed front with
       nothing behind it. The fascia band above runs unbroken, which is what
       makes eighty metres of it read as one thing. */
    const frontage=(side)=>{
      const xf=side?X1:X0;                 // face of the shopfront line
      const nx=side?1:-1;                  // into the unit
      for(let z=1;z<LEN-1;z+=4){
        const zl=Math.min(4,LEN-1-z);
        const roll=TX.ihash(side,(z/4)|0,7);
        // the unit itself: a box of dark, so an open front has depth
        // the unit interior. Its mall-facing face is skipped — it sits in the
        // same plane as the shutter and the two of them z-fight otherwise.
        W.box(side?xf:xf-SHOP,0,z,SHOP,H1-0.5,zl,M.shopVoid,
              {uvScale:1,solid:false,tess:3,skip:side?'-x':'+x'});
        W.solid(side?xf+0.5:xf-SHOP,0,z,SHOP-0.5,H1,zl);
        if(roll<0.62){
          // shutter down
          W.box(xf-(side?0:0.12),0,z+0.06,0.12,H1-0.85,zl-0.12,M.shutter,{uvScale:1,tess:3});
          // the shutter box above it
          W.box(xf-(side?0:0.24),H1-0.85,z,0.24,0.28,zl,M.rail,{uvScale:1.4,solid:false,tess:3});
        } else if(roll<0.80){
          // shutter up: a glazed front, mostly reflection
          W.box(xf-(side?0:0.08),0,z+0.06,0.08,H1-0.9,zl-0.12,M.glass,{uvScale:1,solid:false,tess:3});
          W.box(xf-(side?0:0.14),0,z+0.02,0.14,H1-0.9,0.10,M.rail,{uvScale:2,solid:false,tess:3});
          W.box(xf-(side?0:0.14),0,z+zl-0.12,0.14,H1-0.9,0.10,M.rail,{uvScale:2,solid:false,tess:3});
          W.solid(xf-(side?0:0.1),0,z,0.1,H1-0.9,zl);
          // the light left on in an empty unit
          if(roll>0.74){
            W.box(xf+nx*1.6-0.5,H1-1.0,z+zl*0.5-0.06,1.0,0.10,0.12,M.strip,{uvScale:1,solid:false});
            W.light({x:xf+nx*1.9,y:H1-1.3,z:z+zl*0.5,r:0.92,g:0.96,b:1.0,
                     radius:9,intensity:0.8,flicker:0.10,shadow:true});
          }
        } else {
          // open to the mall, and empty. The worst kind.
          W.box(xf-(side?0:0.16),H1-1.15,z,0.16,0.30,zl,M.rail,{uvScale:1.4,solid:false,tess:3});
          W.light({x:xf+nx*2.2,y:H1-1.6,z:z+zl*0.5,r:0.75,g:0.74,b:0.70,
                   radius:7,intensity:0.28,shadow:true});
        }
        // fascia over everything, unbroken
        W.box(xf-(side?0:0.30),H1-0.85,z,0.30,0.85,zl,M.fascia,{uvScale:1,tess:3});
      }
      // the back wall of the units, and the flank of the building
      W.box(side?X1+SHOP:-0.4,0,0,0.4,H2+VR+1,LEN,M.plaster,{uvScale:1,tess:4});
    };
    frontage(0); frontage(1);
    W.box(-0.4,0,-0.4,WID+0.8,H2+VR+1,0.4,M.plaster,{uvScale:1,tess:4});
    W.box(-0.4,0,LEN,WID+0.8,H2+VR+1,0.4,M.plaster,{uvScale:1,tess:4});

    /* Where each escalator arrives on the gallery above. Declared before the
       gallery is built, because the balustrade has to leave a hole for it. */
    const LANDINGS=[
      {side:0, x0:8.6,  x1:11.2, z0:33.4, z1:36.0},
      {side:1, x0:14.8, x1:17.4, z0:70.2, z1:72.8}
    ];

    /* ============================================== the first floor gallery */
    const gallery=(side)=>{
      const inner=side?X1-3.4:X0+3.4;      // the edge of the void
      const outer=side?X1+SHOP:X0-SHOP;
      const a=Math.min(inner,outer), b=Math.max(inner,outer);
      for(let z=0;z<LEN;z+=6){
        W.floor(a,z,b,Math.min(z+6,LEN),H1,M.floorTile,{uvScale:1,tess:2.4});
        W.solid(a,H1-0.5,z,b-a,0.5,6);
        // the soffit over the ground-floor units
        W.ceiling(a,z,b,Math.min(z+6,LEN),H1-0.55,M.plaster,{uvScale:1,tess:2.4});
      }
      // fascia runs unbroken; the balustrade above it opens where an escalator
      // arrives, otherwise you would ride one up and have nowhere to get off
      const ex=inner;
      W.box(ex-(side?0:0.28),H1-0.5,0,0.28,0.55,LEN,M.fascia,{uvScale:1,solid:false,tess:4});
      for(let z=0;z<LEN;z+=2){
        const zl=Math.min(2,LEN-z);
        if(LANDINGS.some(L=>L.side===side&&z+zl>L.z0-0.4&&z<L.z1+0.4)) continue;
        W.box(ex-(side?0:0.10),H1,z,0.10,1.05,zl,M.glass,{uvScale:1,solid:false,tess:4});
        W.box(ex-(side?0:0.14),H1+1.02,z,0.14,0.09,zl,M.rail,{uvScale:2,solid:false,tess:4});
        W.solid(ex-(side?0:0.16),H1,z,0.16,1.1,zl);
      }
      // and the same frontage logic again, one floor up
      for(let z=1;z<LEN-1;z+=4){
        const zl=Math.min(4,LEN-1-z);
        const xf=side?X1+3.0:X0-3.0;
        const roll=TX.ihash(side+2,(z/4)|0,11);
        W.box(side?xf:xf-3.5,H1,z,3.5,H2-H1-0.9,zl,M.shopVoid,
              {uvScale:1,solid:false,tess:3,skip:side?'-x':'+x'});
        W.solid(side?xf+0.4:xf-3.5,H1,z,3.1,H2-H1,zl);
        if(roll<0.7) W.box(xf-(side?0:0.12),H1,z+0.06,0.12,H2-H1-1.35,zl-0.12,M.shutter,{uvScale:1,tess:3});
        W.box(xf-(side?0:0.30),H2-H1-1.35+H1,z,0.30,0.85,zl,M.fascia,{uvScale:1,tess:3});
      }
    };
    gallery(0); gallery(1);

    /* ============================================== the vault */
    /* A half-cylinder over the street, in 12 facets, with a rib on every joint
       and a strip of glazing along the crown. */
    const FAC=12, cxm=(X0+X1)/2;
    for(let i=0;i<FAC;i++){
      const a0=Math.PI*(i/FAC), a1=Math.PI*((i+1)/FAC);
      const p=(a)=>[cxm-Math.cos(a)*VR, H2+Math.sin(a)*VR];
      const [xa,ya]=p(a0), [xb,yb]=p(a1);
      const crown=Math.abs(i-(FAC-1)/2)<1.6;
      for(let z=0;z<LEN;z+=9){
        const z1=Math.min(z+9,LEN);
        // wound so the face looks down into the mall, not out through the roof
        W.quad([xa,ya,z1],[xa,ya,z],[xb,yb,z],[xb,yb,z1],
               crown?M.glazing:M.plaster,{uvScale:1,uvMode:'local',tess:3,solid:false});
      }
      // the rib on this joint, every 6 m
      for(let z=0;z<LEN;z+=6)
        W.box(xa-0.13,ya-0.13,z-0.13,0.26,0.26,0.26,M.rib,{uvScale:2,solid:false});
    }
    // arch ribs across the vault every 6 m — thin boxes chorded round the arc
    for(let z=3;z<LEN;z+=6){
      for(let i=0;i<FAC;i++){
        const a=Math.PI*((i+0.5)/FAC);
        const x=cxm-Math.cos(a)*VR, y=H2+Math.sin(a)*VR;
        W.box(x-0.12,y-0.12,z-0.10,0.24,0.24,0.20,M.rib,{uvScale:2,solid:false});
      }
    }
    // close the volume so light and the player stay inside it
    W.solid(X0,H2,0,MALL,VR+1.2,LEN);
    W.solid(X0-0.2,H2-3,0,0.4,3.2,LEN);
    W.solid(X1-0.2,H2-3,0,0.4,3.2,LEN);
    for(let z=0;z<LEN;z+=6)
      W.ceiling(X0-SHOP,z,X0,Math.min(z+6,LEN),H2,M.plaster,{uvScale:1,tess:3});
    for(let z=0;z<LEN;z+=6)
      W.ceiling(X1,z,X1+SHOP,Math.min(z+6,LEN),H2,M.plaster,{uvScale:1,tess:3});

    /* daylight down the vault, plus the strips that still work */
    for(let z=5;z<LEN;z+=11){
      W.light({x:cxm,y:H2+VR-1.2,z,r:0.94,g:0.96,b:1.0,radius:26,intensity:0.62,shadow:false});
      W.light({x:cxm,y:2.6,z,r:0.90,g:0.92,b:0.96,radius:13,intensity:0.16,shadow:false});
    }
    for(const side of [0,1]){
      const x=side?X1-1.4:X0+1.4;
      for(let z=3;z<LEN;z+=7){
        const on=TX.ihash(side,(z/7)|0,17)>0.42;
        W.box(x-0.09,H1-0.62,z-0.85,0.18,0.09,1.70,on?M.strip:M.rail,{uvScale:1,solid:false,tess:2});
        if(on) W.light({x,y:H1-0.85,z,r:1.0,g:0.98,b:0.92,radius:9,intensity:0.85,
                        flicker:TX.ihash(side,(z/7)|0,19)<0.15?0.35:0.02,shadow:true});
      }
    }

    /* ============================================== the fountain */
    const fz=54, F=3.4;
    W.box(cxm-F,0,fz-F,F*2,0.52,F*2,M.planter,{uvScale:1.4,tess:2});
    W.floor(cxm-F+0.30,fz-F+0.30,cxm+F-0.30,fz+F-0.30,0.14,M.floorInlay,{uvScale:1,solid:false,tess:2});
    W.floor(cxm-F+0.30,fz-F+0.30,cxm+F-0.30,fz+F-0.30,0.20,M.water,{uvScale:1,solid:false,tess:2});
    // the sculpture in the middle, which is either abstract or unfinished
    W.box(cxm-0.55,0.14,fz-0.55,1.10,1.30,1.10,M.copper,{uvScale:1.4,tess:1.5});
    W.box(cxm-0.30,1.44,fz-0.30,0.60,1.10,0.60,M.copper,{uvScale:1.6,solid:false,tess:1.5});
    W.box(cxm-0.14,2.54,fz-0.14,0.28,0.85,0.28,M.copper,{uvScale:2,solid:false,tess:1.5});
    W.light({x:cxm,y:0.6,z:fz,r:0.70,g:0.88,b:0.86,radius:8,intensity:0.35,shadow:false});
    // coins nobody will collect
    for(let i=0;i<14;i++){
      const a=rng()*Math.PI*2, r=1.4+rng()*1.5;
      W.box(cxm+Math.cos(a)*r-0.02,0.15,fz+Math.sin(a)*r-0.02,0.04,0.006,0.04,
            M.copper,{uvScale:4,solid:false});
    }

    /* ============================================== planters, benches, bins */
    for(let z=8;z<LEN-6;z+=13){
      const side=((z/13)|0)%2;
      const px=side?cxm+3.6:cxm-3.6;
      if(Math.abs(z-fz)<6) continue;
      W.box(px-1.0,0,z-1.0,2.0,0.60,2.0,M.planter,{uvScale:1.4,tess:1.6});
      W.floor(px-0.85,z-0.85,px+0.85,z+0.85,0.58,M.soil,{uvScale:1,solid:false,tess:1.6});
      const th=2.4+rng()*1.6;
      W.box(px-0.10,0.58,z-0.10,0.20,th,0.20,M.bark,{uvScale:2,solid:false,tess:2});
      for(let k=0;k<3;k++){
        const sp=0.95-k*0.20;
        W.box(px-sp/2,0.58+th*(0.62+k*0.14),z-sp/2,sp,0.09,sp,M.leaf,{uvScale:1.2,solid:false,tess:1.2});
      }
      // a bench back to back with it
      const bx=side?px-1.8:px+1.8;
      W.box(bx-0.28,0.30,z-1.1,0.56,0.10,2.2,M.bench,{uvScale:1.6,tess:1.6});
      W.box(bx-0.22,0,z-1.0,0.10,0.30,0.14,M.rail,{uvScale:3,solid:false});
      W.box(bx-0.22,0,z+0.86,0.10,0.30,0.14,M.rail,{uvScale:3,solid:false});
      // and a bin, chained to nothing
      W.box(bx-0.22,0,z+1.5,0.44,0.82,0.44,M.bin,{uvScale:1.6,tess:1.6});
    }

    /* ============================================== the escalators (both up) */
    const esc=(x0,z0,dir)=>{
      const RISE=H1, RUN=7.6, steps=22;
      for(let i=0;i<steps;i++){
        const t=i/steps, z=z0+dir*RUN*t, y=RISE*t;
        W.box(x0-0.55,y,Math.min(z,z+dir*RUN/steps),1.10,0.22,RUN/steps+0.02,
              M.tread,{uvScale:1.4,tess:2});
        W.solid(x0-0.55,y-0.5,Math.min(z,z+dir*RUN/steps),1.10,0.55,RUN/steps+0.02);
      }
      // the balustrades, as a chorded ramp of short boxes
      for(const s of [-1,1]){
        for(let i=0;i<steps;i++){
          const t=i/steps, z=z0+dir*RUN*t, y=RISE*t;
          W.box(x0+s*0.60-0.06,y+0.22,Math.min(z,z+dir*RUN/steps),0.12,1.02,RUN/steps+0.02,
                M.glass,{uvScale:1,solid:false,tess:2});
          W.box(x0+s*0.60-0.09,y+1.20,Math.min(z,z+dir*RUN/steps),0.18,0.10,RUN/steps+0.02,
                M.rail,{uvScale:2,solid:false,tess:2});
        }
      }
      // the comb plate and the machine underneath
      W.box(x0-0.62,-0.02,z0-dir*0.5,1.24,0.10,0.5,M.rail,{uvScale:1.4,solid:false});
      W.box(x0-0.62,RISE-0.02,z0+dir*(RUN+0.1),1.24,0.10,0.5,M.rail,{uvScale:1.4,solid:false});
      W.light({x:x0,y:RISE*0.5+1.4,z:z0+dir*RUN*0.5,r:0.95,g:0.96,b:0.92,
               radius:9,intensity:0.5,shadow:false});
    };
    esc(cxm-2.6,26,1);
    esc(cxm+2.6,80,-1);
    // the landing each one steps you onto, bridging back to the gallery deck
    for(const L of LANDINGS){
      for(let z=L.z0;z<L.z1;z+=1.3)
        W.floor(L.x0,z,L.x1,Math.min(z+1.3,L.z1),H1,M.floorTile,{uvScale:1,tess:1.4});
      W.solid(L.x0,H1-0.4,L.z0,L.x1-L.x0,0.4,L.z1-L.z0);
      // a rail round the open side of it
      for(const zz of [L.z0-0.06,L.z1-0.06])
        W.box(L.x0,H1,zz,L.x1-L.x0,1.05,0.12,M.glass,{uvScale:1,tess:1.6});
      W.light({x:(L.x0+L.x1)/2,y:H1+1.9,z:(L.z0+L.z1)/2,r:0.95,g:0.96,b:0.94,
               radius:8,intensity:0.55,shadow:true});
    }

    /* ============================================== the way out */
    const gz=LEN-2.0;
    W.box(cxm-1.9,0,gz-0.15,3.8,2.5,0.3,M.voidM,{solid:false});
    W.box(cxm-2.15,0,gz-0.25,0.25,2.85,0.5,M.rail,{uvScale:1.4,solid:false});
    W.box(cxm+1.90,0,gz-0.25,0.25,2.85,0.5,M.rail,{uvScale:1.4,solid:false});
    W.box(cxm-2.15,2.50,gz-0.25,4.30,0.35,0.5,M.rail,{uvScale:1.4,solid:false});
    W.box(cxm-0.45,2.62,gz-0.30,0.90,0.26,0.10,M.exitSign,{uvScale:1,solid:false});
    W.light({x:cxm,y:2.4,z:gz-1.3,r:0.50,g:1.0,b:0.66,radius:8,intensity:1.1,shadow:false});
    W.goal({x:cxm,y:1,z:gz-0.6,r:1.5,
      title:'The doors at the end',
      text:'Automatic, and they opened for you, which meant something in the building was still '+
           'being paid for. The muzak carried on behind you for four more bars and then the '+
           'doors closed and it did not stop, it just got quieter.'});

    /* ============================================== atmosphere */
    W.environment({
      fogColor:[0.245,0.235,0.215],
      fogDensity:0.014,
      ambient:[0.075,0.073,0.068],
      exposure:0.96,
      lift:[0.006,0.006,0.005],
      gain:[1.04,1.01,0.95],
      sat:0.90,
      bloomThresh:0.78,
      aoStrength:1.05
    });
    W.ambience({
      hum:0.16, humFreq:50, drone:0.20, droneFreq:36,
      water:0.20, tone:0.07, toneCut:420, toneLow:40,
      reverb:0.72, drips:true, eventGap:12
    });
  }
});
})();

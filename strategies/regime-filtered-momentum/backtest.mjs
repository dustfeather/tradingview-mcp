// External net engine for #2 (regime-filtered-momentum).
// Authoritative net P&L for the gates — TV's data_get_strategy_results/data_get_trades
// read path is broken ("No strategy found on chart" though the tester computes), so we
// replicate the exact strategy.pine logic over Bybit public klines and fold in exact
// friction + signed funding. Run: `bun backtest.mjs`  (or node with global fetch).
//
// Change WINDOW to switch gates:
//   Gate A  IS  = [2023-01-01, 2024-07-01)
//   Gate B  OOS = [2024-07-01, 2026-01-01)
// Sweep grids (Phase 3): edit L / TAU_E / TAU_X / AMULT.
//
// Gate A result (2026-06-07, IS, gated L=20, τ0.35/0.25, 0.085%/side):
//   ALL n=118 PF 1.44 net/t +0.424% | LONG n=61 PF 2.27 +1.250% | SHORT n=57 PF 0.51 -0.460%
//   Ablation: gated +0.424%/t > ungated +0.164%/t  -> gate adds value.

const SYM='BTCUSDT', BASE='https://api.bybit.com';
const L=20, TAU_E=0.35, TAU_X=0.25, AMULT=2.5, FRIC=0.00085; // per side
const D=86400000;
const WIN_START=Date.UTC(2023,0,1), WIN_END=Date.UTC(2024,6,1); // [start, end)
const WARM=WIN_START - 35*D; // L=20 4H bars + daily ATR(14)+1 warmup

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function getJSON(u){for(let i=0;i<5;i++){try{const r=await fetch(u);const j=await r.json();if(j.retCode===0)return j;}catch(e){}await sleep(300);}throw new Error('fail '+u);}

async function klines(interval,startMs,endMs){
  let all=[],cur=endMs;
  while(cur>startMs){
    const j=await getJSON(`${BASE}/v5/market/kline?category=linear&symbol=${SYM}&interval=${interval}&end=${cur}&limit=1000`);
    const list=j.result.list; if(!list.length)break;
    for(const k of list){const t=+k[0]; if(t>=startMs&&t<=endMs)all.push({t,o:+k[1],h:+k[2],l:+k[3],c:+k[4]});}
    const oldest=+list[list.length-1][0]; if(oldest<=startMs)break; cur=oldest-1; await sleep(120);
  }
  all.sort((a,b)=>a.t-b.t); const o=[];let last=-1;for(const b of all){if(b.t!==last){o.push(b);last=b.t;}}return o;
}
async function funding(startMs,endMs){
  let all=[],cur=endMs;
  while(cur>startMs){
    const j=await getJSON(`${BASE}/v5/market/funding/history?category=linear&symbol=${SYM}&endTime=${cur}&limit=200`);
    const list=j.result.list; if(!list.length)break;
    for(const f of list){const t=+f.fundingRateTimestamp; if(t>=startMs&&t<=endMs)all.push({t,r:+f.fundingRate});}
    const oldest=+list[list.length-1].fundingRateTimestamp; if(oldest<=startMs)break; cur=oldest-1; await sleep(120);
  }
  all.sort((a,b)=>a.t-b.t); const o=[];let last=-1;for(const f of all){if(f.t!==last){o.push(f);last=f.t;}}return o;
}

function dailyATR(days,len){
  const atr=new Map(); let prevClose=null,rma=null,trs=[];
  for(let i=0;i<days.length;i++){const d=days[i];let tr;
    if(prevClose===null)tr=d.h-d.l; else tr=Math.max(d.h-d.l,Math.abs(d.h-prevClose),Math.abs(d.l-prevClose));
    if(i<len){trs.push(tr); if(i===len-1)rma=trs.reduce((a,b)=>a+b,0)/len;} else rma=(rma*(len-1)+tr)/len;
    if(rma!==null)atr.set(Math.floor(d.t/D),rma); prevClose=d.c;
  } return atr;
}

const bars=await klines(240,WARM,WIN_END), days=await klines('D',WARM,WIN_END), fund=await funding(WARM,WIN_END);
const atrMap=dailyATR(days,14);
const priorDayATR=t=>{let k=Math.floor(t/D)-1;for(let i=0;i<5;i++){if(atrMap.has(k))return atrMap.get(k);k--;}return null;};
const fsum=(a,b)=>{let s=0;for(const f of fund)if(f.t>a&&f.t<=b)s+=f.r;return s;};

const er=[],mom=[];
for(let i=0;i<bars.length;i++){
  if(i<L){er.push(null);mom.push(null);continue;}
  const net=Math.abs(bars[i].c-bars[i-L].c);let path=0;for(let j=i-L+1;j<=i;j++)path+=Math.abs(bars[j].c-bars[j-1].c);
  er.push(path!==0?net/path:0);mom.push(Math.sign(bars[i].c-bars[i-L].c));
}

function sim(gated){
  let pos=0,entryPx=0,entryT=0,stop=null,inReg=false,trades=[];
  for(let i=L+1;i<bars.length;i++){
    const b=bars[i],t=b.t,inWin=t>=WIN_START&&t<WIN_END;
    if(er[i]>TAU_E)inReg=true; else if(er[i]<TAU_X)inReg=false;
    if(pos!==0){
      let stopped=false,exPx=b.c;
      if(pos>0&&b.l<=stop){stopped=true;exPx=stop;} if(pos<0&&b.h>=stop){stopped=true;exPx=stop;}
      const collapse=gated&&er[i]<TAU_X, flip=mom[i]!==0&&mom[i]!==pos, forceFlat=!inWin;
      if(stopped||collapse||flip||forceFlat){
        const px=stopped?exPx:b.c, grossFrac=pos*(px/entryPx-1), fundFrac=(pos>0?1:-1)*fsum(entryT,t);
        trades.push({side:pos>0?'L':'S',gross:grossFrac,fund:fundFrac,net:grossFrac-2*FRIC-fundFrac,
          reason:stopped?'stop':collapse?'regime':flip?'flip':'win'});
        pos=0;stop=null;continue;
      }
    }
    if(pos===0&&inWin&&mom[i]!==0){
      const enter=gated?(er[i]>TAU_E&&er[i-1]<=TAU_E):true;
      if(enter){pos=mom[i];entryPx=b.c;entryT=t;const a=priorDayATR(t)||0;stop=pos>0?entryPx-AMULT*a:entryPx+AMULT*a;}
    }
  }
  return trades;
}
function stats(T,leg){const t=leg?T.filter(x=>x.side===leg):T;if(!t.length)return{n:0};
  const nets=t.map(x=>x.net),pos=nets.filter(x=>x>0).reduce((a,b)=>a+b,0),neg=nets.filter(x=>x<0).reduce((a,b)=>a+b,0);
  return{n:t.length,pf:+(neg!==0?pos/Math.abs(neg):Infinity).toFixed(3),
    expPct:+(nets.reduce((a,b)=>a+b,0)/t.length*100).toFixed(4),wrPct:+(t.filter(x=>x.net>0).length/t.length*100).toFixed(1)};}
const fmt=s=>s.n?`n=${s.n} PF=${s.pf} net/t=${s.expPct}% win=${s.wrPct}%`:'n=0';
const G=sim(true),U=sim(false);
console.log(`WINDOW ${new Date(WIN_START).toISOString().slice(0,10)}..${new Date(WIN_END).toISOString().slice(0,10)}  L=${L} τ=${TAU_E}/${TAU_X}`);
for(const[k,leg]of[['ALL',null],['LONG','L'],['SHORT','S']])console.log(`gated ${k.padEnd(5)}`,fmt(stats(G,leg)));
for(const[k,leg]of[['ALL',null],['LONG','L'],['SHORT','S']])console.log(`ungated ${k.padEnd(5)}`,fmt(stats(U,leg)));
console.log('ablation:',stats(G).expPct,'vs',stats(U).expPct,'->',stats(G).expPct>stats(U).expPct?'gate ADDS':'gate NULL');
